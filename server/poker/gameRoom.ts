/**
 * EPIC Poker - Game Room Manager
 * Manages active game tables via Socket.IO
 */

import { Server as SocketServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import {
  GameState,
  PlayerAction,
  createGameState,
  startHand,
  processAction,
  getPlayerView,
} from "./engine";
import * as db from "../db";

interface RoomPlayer {
  oduserId: number;
  odisplayName: string;
  avatarUrl: string | null;
  seatIndex: number;
  chips: number;
  socketId: string | null;
}

interface GameRoom {
  tournamentId: number;
  tableId: string;
  players: RoomPlayer[];
  gameState: GameState | null;
  isStarted: boolean;
  hostUserId: number;
  blinds: { smallBlind: number; bigBlind: number; ante: number };
  turnTimerInterval: NodeJS.Timeout | null;
  nextHandTimer: NodeJS.Timeout | null;
  gameStartedAt: number | null; // timestamp when game started (for blind level timer)
  decisionTime: number; // seconds per turn
  inactiveKickMinutes: number; // 0 = disabled
  lastActivityMap: Map<number, number>; // userId -> last action timestamp
  _prevCommunityCardCount?: number; // tracks community card count for deal audio events
}

// Active game rooms
const rooms = new Map<string, GameRoom>();
let io: SocketServer | null = null;

export function getIO(): SocketServer | null {
  return io;
}

export function initializeSocketIO(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io/",
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on("join_table", (data: { tableId: string; userId: number; displayName: string; avatarUrl: string | null }) => {
      handleJoinTable(socket, data);
    });

    socket.on("take_seat", (data: { tableId: string; userId: number; seatIndex: number }) => {
      handleTakeSeat(socket, data);
    });

    socket.on("start_game", (data: { tableId: string; userId: number }) => {
      handleStartGame(socket, data);
    });

    socket.on("player_action", (data: { tableId: string; userId: number; action: PlayerAction; amount?: number }) => {
      handlePlayerAction(socket, data);
    });

    socket.on("next_hand", (data: { tableId: string; userId: number }) => {
      handleNextHand(socket, data);
    });

    socket.on("leave_table", (data: { tableId: string; userId: number }) => {
      handleLeaveTable(socket, data);
    });

    socket.on("chat_message", (data: { tableId: string; userId: number; displayName: string; message: string }) => {
      handleChatMessage(socket, data);
    });

    socket.on("disconnect", () => {
      handleDisconnect(socket);
    });
  });

  return io;
}

// Create or get a game room for a tournament
export function getOrCreateRoom(
  tournamentId: number,
  tableId: string,
  hostUserId: number,
  blinds: { smallBlind: number; bigBlind: number; ante: number },
  startingChips: number,
  decisionTime: number = 30,
  inactiveKickMinutes: number = 0
): GameRoom {
  if (rooms.has(tableId)) {
    return rooms.get(tableId)!;
  }

  const room: GameRoom = {
    tournamentId,
    tableId,
    players: [],
    gameState: null,
    isStarted: false,
    hostUserId,
    blinds,
    turnTimerInterval: null,
    nextHandTimer: null,
    gameStartedAt: null,
    decisionTime,
    inactiveKickMinutes,
    lastActivityMap: new Map(),
  };

  rooms.set(tableId, room);
  return room;
}

export function getRoom(tableId: string): GameRoom | undefined {
  return rooms.get(tableId);
}

export function getRoomByTournament(tournamentId: number): GameRoom | undefined {
  const allRooms = Array.from(rooms.values());
  for (const room of allRooms) {
    if (room.tournamentId === tournamentId) return room;
  }
  return undefined;
}

function handleJoinTable(socket: Socket, data: { tableId: string; userId: number; displayName: string; avatarUrl: string | null }) {
  const room = rooms.get(data.tableId);
  if (!room) {
    socket.emit("error", { message: "Table not found" });
    return;
  }

  socket.join(data.tableId);

  // Track activity on join
  room.lastActivityMap.set(data.userId, Date.now());

  // Update socket ID for existing player
  const existingPlayer = room.players.find(p => p.oduserId === data.userId);
  if (existingPlayer) {
    existingPlayer.socketId = socket.id;
    if (room.gameState) {
      const playerState = room.gameState.players.find(p => p.oduserId === data.userId);
      if (playerState) playerState.isConnected = true;
    }
  }

  // Send current state to the joining player
  if (room.gameState) {
    const playerSeat = room.players.find(p => p.oduserId === data.userId)?.seatIndex ?? -1;
    socket.emit("game_state", { ...getPlayerView(room.gameState, playerSeat), gameStartedAt: room.gameStartedAt });
  }

  // Send room info
  socket.emit("room_info", {
    tableId: room.tableId,
    tournamentId: room.tournamentId,
    players: room.players.map(p => ({
      userId: p.oduserId,
      displayName: p.odisplayName,
      avatarUrl: p.avatarUrl,
      seatIndex: p.seatIndex,
      chips: p.chips,
      isConnected: p.socketId !== null,
    })),
    isStarted: room.isStarted,
    hostUserId: room.hostUserId,
    gameStartedAt: room.gameStartedAt,
    decisionTime: room.decisionTime,
  });

  // Notify others
  socket.to(data.tableId).emit("player_joined", {
    userId: data.userId,
    displayName: data.displayName,
    avatarUrl: data.avatarUrl,
  });
}

function handleTakeSeat(socket: Socket, data: { tableId: string; userId: number; seatIndex: number }) {
  const room = rooms.get(data.tableId);
  if (!room) {
    socket.emit("error", { message: "Table not found" });
    return;
  }

  if (room.isStarted) {
    socket.emit("error", { message: "Game already started" });
    return;
  }

  // Check if seat is taken
  const seatTaken = room.players.find(p => p.seatIndex === data.seatIndex);
  if (seatTaken) {
    socket.emit("error", { message: "Seat already taken" });
    return;
  }

  // Check if player already has a seat
  const existingPlayer = room.players.find(p => p.oduserId === data.userId);
  if (existingPlayer) {
    // Move seat
    existingPlayer.seatIndex = data.seatIndex;
  } else {
    // Get player info from socket data or use defaults
    room.players.push({
      oduserId: data.userId,
      odisplayName: `Player ${data.userId}`,
      avatarUrl: null,
      seatIndex: data.seatIndex,
      chips: 0, // Will be set when game starts
      socketId: socket.id,
    });
  }

  // Broadcast updated seats
  io?.to(data.tableId).emit("seats_updated", {
    players: room.players.map(p => ({
      userId: p.oduserId,
      displayName: p.odisplayName,
      avatarUrl: p.avatarUrl,
      seatIndex: p.seatIndex,
      isConnected: p.socketId !== null,
    })),
  });
}

function handleStartGame(socket: Socket, data: { tableId: string; userId: number }) {
  const room = rooms.get(data.tableId);
  if (!room) {
    socket.emit("error", { message: "Table not found" });
    return;
  }

  if (room.hostUserId !== data.userId) {
    socket.emit("error", { message: "Only the host can start the game" });
    return;
  }

  if (room.players.length < 2) {
    socket.emit("error", { message: "Need at least 2 players to start" });
    return;
  }

  if (room.isStarted) {
    socket.emit("error", { message: "Game already started" });
    return;
  }

  room.isStarted = true;
  room.gameStartedAt = Date.now();

  // Audit log: game started
  const hostPlayer = room.players.find(p => p.oduserId === data.userId);
  db.addAuditLog({
    tournamentId: room.tournamentId,
    userId: data.userId,
    userName: hostPlayer?.odisplayName || 'Host',
    action: 'started_game',
  }).catch(() => {});

  // Initialize game state
  const startingChips = room.blinds.bigBlind * 100; // Default 100 BB
  const players = room.players.map(p => ({
    userId: p.oduserId,
    displayName: p.odisplayName,
    avatarUrl: p.avatarUrl,
    seatIndex: p.seatIndex,
    chips: p.chips > 0 ? p.chips : startingChips,
  }));

  // Set chips on room players
  for (const p of room.players) {
    if (p.chips <= 0) p.chips = startingChips;
  }

  const dealerSeat = room.players[0].seatIndex;
  room.gameState = createGameState(room.tournamentId, room.tableId, players, room.blinds, dealerSeat);
  
  // Start first hand
  room.gameState = startHand(room.gameState);

  // Emit deal event for audio sync
  io?.to(room.tableId).emit("deal_cards_event", { type: 'hole_cards' });

  // Send personalized state to each player
  broadcastGameState(room);

  // Start turn timer
  startTurnTimer(room);
}

function handlePlayerAction(socket: Socket, data: { tableId: string; userId: number; action: PlayerAction; amount?: number }) {
  const room = rooms.get(data.tableId);
  if (!room || !room.gameState) {
    socket.emit("error", { message: "No active game" });
    return;
  }

  const player = room.gameState.players.find(p => p.oduserId === data.userId);
  if (!player) {
    socket.emit("error", { message: "You are not in this game" });
    return;
  }

  // Track player activity for inactive kick
  room.lastActivityMap.set(data.userId, Date.now());

  const result = processAction(room.gameState, player.seatIndex, data.action, data.amount);
  
  if (result.error) {
    socket.emit("error", { message: result.error });
    return;
  }

  room.gameState = result.state;

  // Log action to audit log
  if (room.tournamentId) {
    const actionDesc = data.amount ? `${data.action} ${data.amount}` : data.action;
    db.addAuditLog({
      tournamentId: room.tournamentId,
      userId: data.userId,
      userName: player.odisplayName,
      action: actionDesc,
      handNumber: room.gameState.handNumber || undefined,
    }).catch(() => {});
  }

  // Emit dedicated action event for audio sync (fires before game_state so sound plays at exact visual moment)
  const actionPlayer = room.gameState.players.find(p => p.oduserId === data.userId);
  const emittedAction = actionPlayer?.lastAction || data.action;
  io?.to(room.tableId).emit("player_action_event", {
    userId: data.userId,
    displayName: actionPlayer?.odisplayName || '',
    action: emittedAction,
    amount: data.amount,
  });

  // Broadcast updated state
  broadcastGameState(room);

  // Reset turn timer
  if (room.gameState.phase === 'betting') {
    startTurnTimer(room);
  } else {
    clearTurnTimer(room);
    // Auto-advance to next hand after delay
    if (room.gameState.phase === 'hand_complete') {
      scheduleNextHand(room);
    }
  }
}

function handleNextHand(socket: Socket, data: { tableId: string; userId: number }) {
  const room = rooms.get(data.tableId);
  if (!room || !room.gameState) return;

  if (room.gameState.phase !== 'hand_complete') return;

  // Check if enough players have chips
  const playersWithChips = room.gameState.players.filter(p => p.chips > 0);
  if (playersWithChips.length < 2) {
    // Build final standings sorted by chips (winner first)
    const allPlayers = [...room.gameState.players].sort((a, b) => b.chips - a.chips);
    const standings = allPlayers.map((p, i) => ({
      userId: p.oduserId,
      displayName: p.odisplayName,
      avatarUrl: p.avatarUrl,
      chips: p.chips,
      placement: i + 1,
    }));
    io?.to(data.tableId).emit("game_over", {
      winner: playersWithChips[0]?.odisplayName || "Unknown",
      standings,
      tournamentName: room.tableId,
      playerCount: allPlayers.length,
    });
    return;
  }

  room.gameState = startHand(room.gameState);
  broadcastGameState(room);
  startTurnTimer(room);
}

function handleLeaveTable(socket: Socket, data: { tableId: string; userId: number }) {
  const room = rooms.get(data.tableId);
  if (!room) return;

  const playerIndex = room.players.findIndex(p => p.oduserId === data.userId);
  const leavingPlayer = playerIndex !== -1 ? room.players[playerIndex] : null;
  if (playerIndex !== -1) {
    room.players.splice(playerIndex, 1);
  }

  // Audit log: player left
  if (leavingPlayer && room.tournamentId) {
    db.addAuditLog({
      tournamentId: room.tournamentId,
      userId: data.userId,
      userName: leavingPlayer.odisplayName,
      action: 'left_table',
    }).catch(() => {});
  }

  socket.leave(data.tableId);
  io?.to(data.tableId).emit("player_left", { userId: data.userId });

  // If no players, clean up room
  if (room.players.length === 0) {
    clearTurnTimer(room);
    rooms.delete(data.tableId);
  }
}

function handleDisconnect(socket: Socket) {
  // Find which room this socket was in
  const entries = Array.from(rooms.entries());
  for (const [tableId, room] of entries) {
    const player = room.players.find((p: RoomPlayer) => p.socketId === socket.id);
    if (player) {
      player.socketId = null;
      if (room.gameState) {
        const gamePlayer = room.gameState.players.find((p: any) => p.oduserId === player.oduserId);
        if (gamePlayer) gamePlayer.isConnected = false;
      }
      io?.to(tableId).emit("player_disconnected", { userId: player.oduserId });
    }
  }
}

function broadcastGameState(room: GameRoom) {
  if (!room.gameState || !io) return;

  // Emit community card deal event when board cards are newly added (flop/turn/river)
  const communityCount = room.gameState.communityCards?.length || 0;
  const prevCount = room._prevCommunityCardCount || 0;
  if (communityCount > prevCount) {
    const dealType = communityCount === 3 ? 'flop' : communityCount === 4 ? 'turn' : 'river';
    io.to(room.tableId).emit("deal_cards_event", { type: dealType, count: communityCount });
  }
  room._prevCommunityCardCount = communityCount;

  // Send personalized view to each player
  for (const player of room.players) {
    if (player.socketId) {
      const view = getPlayerView(room.gameState, player.seatIndex);
      io.to(player.socketId).emit("game_state", { ...view, gameStartedAt: room.gameStartedAt });
    }
  }

  // Send spectator view (no hole cards) to the room for observers
  const spectatorView = getPlayerView(room.gameState, -1);
  io.to(room.tableId).emit("spectator_state", { ...spectatorView, gameStartedAt: room.gameStartedAt });
}

function startTurnTimer(room: GameRoom) {
  clearTurnTimer(room);

  if (!room.gameState || room.gameState.phase !== 'betting') return;

  let timeLeft = room.decisionTime; // Use configurable decision time
  room.gameState.turnTimer = timeLeft;
  room.gameState.turnStartTime = Date.now();

  // Emit turn_start event so client can play chime
  const currentSeat = room.gameState.currentPlayerSeat;
  const currentPlayer = room.gameState.players.find(p => p.seatIndex === currentSeat);
  if (currentPlayer) {
    io?.to(room.tableId).emit("turn_start", { userId: currentPlayer.oduserId, seatIndex: currentSeat, timeLeft });
  }

  room.turnTimerInterval = setInterval(() => {
    timeLeft--;
    
    if (timeLeft <= 0) {
      // Auto-fold on timeout
      clearTurnTimer(room);
      if (room.gameState && room.gameState.phase === 'betting') {
        const cp = room.gameState.players.find(p => p.seatIndex === room.gameState!.currentPlayerSeat);
        if (cp) {
          // Auto-check if possible, otherwise fold
          const canCheck = cp.currentBet >= room.gameState.currentBet;
          const action: PlayerAction = canCheck ? 'check' : 'fold';
          const result = processAction(room.gameState, cp.seatIndex, action);
          room.gameState = result.state;
          // Emit action event for audio sync (same as manual actions)
          const autoPlayer = room.gameState.players.find(p => p.oduserId === cp.oduserId);
          io?.to(room.tableId).emit("player_action_event", {
            userId: cp.oduserId,
            displayName: cp.odisplayName,
            action: autoPlayer?.lastAction || action,
          });
          broadcastGameState(room);
          if (room.gameState.phase === 'betting') {
            startTurnTimer(room);
          } else if (room.gameState.phase === 'hand_complete') {
            scheduleNextHand(room);
          }
        }
      }
    } else {
      // Broadcast timer update
      io?.to(room.tableId).emit("timer_update", { timeLeft });
      // Emit low_time_warning when 5 seconds or less remain
      if (timeLeft <= 5) {
        io?.to(room.tableId).emit("low_time_warning", { timeLeft, userId: currentPlayer?.oduserId });
      }
    }
  }, 1000);
}

function clearTurnTimer(room: GameRoom) {
  if (room.turnTimerInterval) {
    clearInterval(room.turnTimerInterval);
    room.turnTimerInterval = null;
  }
}

function clearNextHandTimer(room: GameRoom) {
  if (room.nextHandTimer) {
    clearTimeout(room.nextHandTimer);
    room.nextHandTimer = null;
  }
}

// Auto-advance to next hand after 4 seconds with countdown
function scheduleNextHand(room: GameRoom) {
  clearNextHandTimer(room);

  const DELAY_SECONDS = 4;

  // Emit countdown event so clients can show "Next hand in X..."
  io?.to(room.tableId).emit("next_hand_countdown", { seconds: DELAY_SECONDS });

  room.nextHandTimer = setTimeout(() => {
    room.nextHandTimer = null;
    if (!room.gameState || room.gameState.phase !== 'hand_complete') return;

    // Check if enough players have chips to continue
    const playersWithChips = room.gameState.players.filter(p => p.chips > 0);
    if (playersWithChips.length < 2) {
      // Game over — build final standings
      const allPlayers = [...room.gameState.players].sort((a, b) => b.chips - a.chips);
      const standings = allPlayers.map((p, i) => ({
        userId: p.oduserId,
        displayName: p.odisplayName,
        avatarUrl: p.avatarUrl,
        chips: p.chips,
        placement: i + 1,
      }));
      io?.to(room.tableId).emit("game_over", {
        winner: playersWithChips[0]?.odisplayName || "Unknown",
        standings,
        tournamentName: room.tableId,
        playerCount: allPlayers.length,
      });
      return;
    }

    // Start next hand
    room.gameState = startHand(room.gameState);
    // Emit deal event for audio sync
    io?.to(room.tableId).emit("deal_cards_event", { type: 'hole_cards' });
    broadcastGameState(room);
    startTurnTimer(room);
  }, DELAY_SECONDS * 1000);
}

function handleChatMessage(socket: Socket, data: { tableId: string; userId: number; displayName: string; message: string }) {
  const room = rooms.get(data.tableId);
  if (!room) return;

  // Validate sender is actually in this room
  const player = room.players.find(p => p.oduserId === data.userId && p.socketId === socket.id);
  if (!player) return; // Reject messages from non-participants or spoofed senders

  // Sanitize message (limit length)
  const message = data.message.trim().slice(0, 200);
  if (!message) return;

  // Broadcast using trusted player info from room state
  io?.to(data.tableId).emit("chat_message", {
    userId: player.oduserId,
    displayName: player.odisplayName,
    message,
    timestamp: Date.now(),
  });
}

// Inactive player kick check — runs every 60 seconds
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room, tableId) => {
    if (room.inactiveKickMinutes <= 0 || !room.isStarted) return;
    const kickThreshold = room.inactiveKickMinutes * 60 * 1000;

    const toKick: RoomPlayer[] = [];
    for (const player of room.players) {
      const lastActivity = room.lastActivityMap.get(player.oduserId) || 0;
      if (lastActivity > 0 && (now - lastActivity) > kickThreshold) {
        toKick.push(player);
      }
    }
    for (const player of toKick) {
      room.players = room.players.filter((p: RoomPlayer) => p.oduserId !== player.oduserId);
      room.lastActivityMap.delete(player.oduserId);
      io?.to(tableId).emit("player_kicked_inactive", {
        userId: player.oduserId,
        displayName: player.odisplayName,
      });
    }
  });
}, 60000);
