/**
 * EPIC Poker Engine - Texas Hold'em No Limit
 * Core game logic: deck, dealing, hand evaluation, betting rounds
 */

// Card representation
export type Suit = 'h' | 'd' | 'c' | 's'; // hearts, diamonds, clubs, spades
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type Card = `${Rank}${Suit}`;

export const SUITS: Suit[] = ['h', 'd', 'c', 's'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export type HandRank =
  | 'high_card'
  | 'pair'
  | 'two_pair'
  | 'three_of_a_kind'
  | 'straight'
  | 'flush'
  | 'full_house'
  | 'four_of_a_kind'
  | 'straight_flush'
  | 'royal_flush';

export const HAND_RANK_VALUES: Record<HandRank, number> = {
  'high_card': 1,
  'pair': 2,
  'two_pair': 3,
  'three_of_a_kind': 4,
  'straight': 5,
  'flush': 6,
  'full_house': 7,
  'four_of_a_kind': 8,
  'straight_flush': 9,
  'royal_flush': 10,
};

export interface HandResult {
  rank: HandRank;
  rankValue: number;
  kickers: number[]; // sorted descending for comparison
  bestCards: Card[];
  description: string;
}

// Deck management
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}` as Card);
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Hand evaluation
function getCardRank(card: Card): Rank {
  return card[0] as Rank;
}

function getCardSuit(card: Card): Suit {
  return card[1] as Suit;
}

function getRankValue(card: Card): number {
  return RANK_VALUES[getCardRank(card)];
}

// Get all 5-card combinations from 7 cards
function getCombinations(cards: Card[], size: number): Card[][] {
  const result: Card[][] = [];
  function combine(start: number, combo: Card[]) {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < cards.length; i++) {
      combo.push(cards[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }
  combine(0, []);
  return result;
}

function evaluateFiveCards(cards: Card[]): HandResult {
  const values = cards.map(c => getRankValue(c)).sort((a, b) => b - a);
  const suits = cards.map(c => getCardSuit(c));
  
  const isFlush = suits.every(s => s === suits[0]);
  
  // Check straight
  let isStraight = false;
  let straightHigh = 0;
  
  const uniqueValues = Array.from(new Set(values)).sort((a, b) => b - a);
  if (uniqueValues.length >= 5) {
    // Normal straight check
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
      if (uniqueValues[i] - uniqueValues[i + 4] === 4) {
        isStraight = true;
        straightHigh = uniqueValues[i];
        break;
      }
    }
    // Wheel (A-2-3-4-5)
    if (!isStraight && uniqueValues.includes(14) && uniqueValues.includes(2) && 
        uniqueValues.includes(3) && uniqueValues.includes(4) && uniqueValues.includes(5)) {
      isStraight = true;
      straightHigh = 5; // 5-high straight
    }
  }
  
  // Count ranks
  const rankCounts: Record<number, number> = {};
  for (const v of values) {
    rankCounts[v] = (rankCounts[v] || 0) + 1;
  }
  
  const counts = Object.entries(rankCounts)
    .map(([rank, count]) => ({ rank: parseInt(rank), count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
  
  // Determine hand rank
  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      return { rank: 'royal_flush', rankValue: 10, kickers: [14], bestCards: cards, description: 'Royal Flush' };
    }
    return { rank: 'straight_flush', rankValue: 9, kickers: [straightHigh], bestCards: cards, description: `Straight Flush, ${rankName(straightHigh)} high` };
  }
  
  if (counts[0].count === 4) {
    const kicker = counts[1].rank;
    return { rank: 'four_of_a_kind', rankValue: 8, kickers: [counts[0].rank, kicker], bestCards: cards, description: `Four of a Kind, ${rankName(counts[0].rank)}s` };
  }
  
  if (counts[0].count === 3 && counts[1].count === 2) {
    return { rank: 'full_house', rankValue: 7, kickers: [counts[0].rank, counts[1].rank], bestCards: cards, description: `Full House, ${rankName(counts[0].rank)}s full of ${rankName(counts[1].rank)}s` };
  }
  
  if (isFlush) {
    return { rank: 'flush', rankValue: 6, kickers: values, bestCards: cards, description: `Flush, ${rankName(values[0])} high` };
  }
  
  if (isStraight) {
    return { rank: 'straight', rankValue: 5, kickers: [straightHigh], bestCards: cards, description: `Straight, ${rankName(straightHigh)} high` };
  }
  
  if (counts[0].count === 3) {
    const kickers = counts.filter(c => c.count === 1).map(c => c.rank).sort((a, b) => b - a);
    return { rank: 'three_of_a_kind', rankValue: 4, kickers: [counts[0].rank, ...kickers], bestCards: cards, description: `Three of a Kind, ${rankName(counts[0].rank)}s` };
  }
  
  if (counts[0].count === 2 && counts[1].count === 2) {
    const pairs = [counts[0].rank, counts[1].rank].sort((a, b) => b - a);
    const kicker = counts[2].rank;
    return { rank: 'two_pair', rankValue: 3, kickers: [...pairs, kicker], bestCards: cards, description: `Two Pair, ${rankName(pairs[0])}s and ${rankName(pairs[1])}s` };
  }
  
  if (counts[0].count === 2) {
    const kickers = counts.filter(c => c.count === 1).map(c => c.rank).sort((a, b) => b - a);
    return { rank: 'pair', rankValue: 2, kickers: [counts[0].rank, ...kickers], bestCards: cards, description: `Pair of ${rankName(counts[0].rank)}s` };
  }
  
  return { rank: 'high_card', rankValue: 1, kickers: values, bestCards: cards, description: `${rankName(values[0])} High` };
}

function rankName(value: number): string {
  const names: Record<number, string> = {
    2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven',
    8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace'
  };
  return names[value] || String(value);
}

// Evaluate best 5-card hand from 7 cards (2 hole + 5 community)
export function evaluateHand(holeCards: Card[], communityCards: Card[]): HandResult {
  const allCards = [...holeCards, ...communityCards];
  const combinations = getCombinations(allCards, 5);
  
  let bestHand: HandResult | null = null;
  
  for (const combo of combinations) {
    const result = evaluateFiveCards(combo);
    if (!bestHand || compareHands(result, bestHand) > 0) {
      bestHand = result;
    }
  }
  
  return bestHand!;
}

// Compare two hands: returns positive if a wins, negative if b wins, 0 if tie
export function compareHands(a: HandResult, b: HandResult): number {
  if (a.rankValue !== b.rankValue) return a.rankValue - b.rankValue;
  
  // Compare kickers
  for (let i = 0; i < Math.min(a.kickers.length, b.kickers.length); i++) {
    if (a.kickers[i] !== b.kickers[i]) return a.kickers[i] - b.kickers[i];
  }
  
  return 0;
}

// Game state types
export type BettingRound = 'preflop' | 'flop' | 'turn' | 'river';
export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all_in';
export type GamePhase = 'waiting' | 'dealing' | 'betting' | 'showdown' | 'hand_complete';

export interface PlayerState {
  oduserId: number;
  odisplayName: string;
  avatarUrl: string | null;
  seatIndex: number;
  chips: number;
  holeCards: Card[];
  currentBet: number;
  totalBetThisRound: number;
  hasFolded: boolean;
  hasActed: boolean;
  isAllIn: boolean;
  isConnected: boolean;
  isSittingOut: boolean;
  lastAction?: PlayerAction;
}

export interface PotInfo {
  amount: number;
  eligiblePlayers: number[]; // seat indices
}

export interface GameState {
  tournamentId: number;
  tableId: string;
  phase: GamePhase;
  bettingRound: BettingRound;
  deck: Card[];
  communityCards: Card[];
  players: PlayerState[];
  pots: PotInfo[];
  currentBet: number;
  minRaise: number;
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  currentPlayerSeat: number;
  smallBlindAmount: number;
  bigBlindAmount: number;
  anteAmount: number;
  handNumber: number;
  turnTimer: number; // seconds remaining
  turnStartTime: number; // timestamp
  handHistory: HandHistoryEntry[];
}

export interface HandHistoryEntry {
  handNumber: number;
  action: string;
  player?: string;
  amount?: number;
  cards?: Card[];
  handDescription?: string;
  timestamp: number;
}

// Game logic functions
export function createGameState(
  tournamentId: number,
  tableId: string,
  players: { userId: number; displayName: string; avatarUrl: string | null; seatIndex: number; chips: number }[],
  blinds: { smallBlind: number; bigBlind: number; ante: number },
  dealerSeat: number
): GameState {
  const playerStates: PlayerState[] = players.map(p => ({
    oduserId: p.userId,
    odisplayName: p.displayName,
    avatarUrl: p.avatarUrl,
    seatIndex: p.seatIndex,
    chips: p.chips,
    holeCards: [],
    currentBet: 0,
    totalBetThisRound: 0,
    hasFolded: false,
    hasActed: false,
    isAllIn: false,
    isConnected: true,
    isSittingOut: false,
  }));

  return {
    tournamentId,
    tableId,
    phase: 'waiting',
    bettingRound: 'preflop',
    deck: [],
    communityCards: [],
    players: playerStates,
    pots: [{ amount: 0, eligiblePlayers: playerStates.map(p => p.seatIndex) }],
    currentBet: 0,
    minRaise: blinds.bigBlind,
    dealerSeat,
    smallBlindSeat: -1,
    bigBlindSeat: -1,
    currentPlayerSeat: -1,
    smallBlindAmount: blinds.smallBlind,
    bigBlindAmount: blinds.bigBlind,
    anteAmount: blinds.ante,
    handNumber: 0,
    turnTimer: 30,
    turnStartTime: 0,
    handHistory: [],
  };
}

// Get active (non-folded, non-all-in) players in seat order starting from a position
function getActivePlayers(state: GameState): PlayerState[] {
  return state.players.filter(p => !p.hasFolded && !p.isAllIn && p.chips > 0);
}

function getPlayersInHand(state: GameState): PlayerState[] {
  return state.players.filter(p => !p.hasFolded);
}

// Get next active seat after a given seat
function getNextActiveSeat(state: GameState, fromSeat: number, includeAllIn: boolean = false): number {
  const playerCount = state.players.length;
  let seat = fromSeat;
  
  for (let i = 0; i < playerCount; i++) {
    seat = (seat + 1) % playerCount;
    const player = state.players.find(p => p.seatIndex === seat);
    if (player && !player.hasFolded && (!player.isAllIn || includeAllIn)) {
      return seat;
    }
  }
  return fromSeat;
}

// Start a new hand
export function startHand(state: GameState): GameState {
  const newState = { ...state };
  newState.handNumber++;
  newState.phase = 'dealing';
  newState.bettingRound = 'preflop';
  newState.communityCards = [];
  newState.currentBet = 0;
  newState.pots = [{ amount: 0, eligiblePlayers: state.players.filter(p => p.chips > 0).map(p => p.seatIndex) }];
  newState.handHistory = [];
  
  // Reset player states
  newState.players = state.players.map(p => ({
    ...p,
    holeCards: [],
    currentBet: 0,
    totalBetThisRound: 0,
    hasFolded: p.chips <= 0, // auto-fold players with no chips
    hasActed: false,
    isAllIn: false,
    lastAction: undefined,
  }));
  
  // Shuffle and deal
  newState.deck = shuffleDeck(createDeck());
  
  // Determine blinds positions
  const activePlayers = newState.players.filter(p => !p.hasFolded);
  if (activePlayers.length === 2) {
    // Heads-up: dealer is small blind
    newState.smallBlindSeat = newState.dealerSeat;
    newState.bigBlindSeat = getNextActiveSeat(newState, newState.dealerSeat, true);
  } else {
    newState.smallBlindSeat = getNextActiveSeat(newState, newState.dealerSeat, true);
    newState.bigBlindSeat = getNextActiveSeat(newState, newState.smallBlindSeat, true);
  }
  
  // Post antes
  if (newState.anteAmount > 0) {
    for (const player of newState.players) {
      if (!player.hasFolded) {
        const ante = Math.min(newState.anteAmount, player.chips);
        player.chips -= ante;
        newState.pots[0].amount += ante;
        if (player.chips === 0) player.isAllIn = true;
      }
    }
    newState.handHistory.push({ handNumber: newState.handNumber, action: 'antes_posted', amount: newState.anteAmount, timestamp: Date.now() });
  }
  
  // Post blinds
  const sbPlayer = newState.players.find(p => p.seatIndex === newState.smallBlindSeat)!;
  const sbAmount = Math.min(newState.smallBlindAmount, sbPlayer.chips);
  sbPlayer.chips -= sbAmount;
  sbPlayer.currentBet = sbAmount;
  sbPlayer.totalBetThisRound = sbAmount;
  newState.pots[0].amount += sbAmount;
  if (sbPlayer.chips === 0) sbPlayer.isAllIn = true;
  
  const bbPlayer = newState.players.find(p => p.seatIndex === newState.bigBlindSeat)!;
  const bbAmount = Math.min(newState.bigBlindAmount, bbPlayer.chips);
  bbPlayer.chips -= bbAmount;
  bbPlayer.currentBet = bbAmount;
  bbPlayer.totalBetThisRound = bbAmount;
  newState.pots[0].amount += bbAmount;
  if (bbPlayer.chips === 0) bbPlayer.isAllIn = true;
  
  newState.currentBet = newState.bigBlindAmount;
  newState.minRaise = newState.bigBlindAmount;
  
  // Deal hole cards
  for (const player of newState.players) {
    if (!player.hasFolded) {
      player.holeCards = [newState.deck.pop()!, newState.deck.pop()!];
    }
  }
  
  // Set first player to act (UTG = after big blind)
  newState.currentPlayerSeat = getNextActiveSeat(newState, newState.bigBlindSeat);
  newState.phase = 'betting';
  newState.turnStartTime = Date.now();
  
  newState.handHistory.push({
    handNumber: newState.handNumber,
    action: 'hand_start',
    timestamp: Date.now(),
  });
  
  return newState;
}

// Process a player action
export function processAction(
  state: GameState,
  seatIndex: number,
  action: PlayerAction,
  amount?: number
): { state: GameState; error?: string } {
  if (state.currentPlayerSeat !== seatIndex) {
    return { state, error: 'Not your turn' };
  }
  
  const player = state.players.find(p => p.seatIndex === seatIndex);
  if (!player) return { state, error: 'Player not found' };
  if (player.hasFolded) return { state, error: 'Player has folded' };
  
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const currentPlayer = newState.players.find(p => p.seatIndex === seatIndex)!;
  
  switch (action) {
    case 'fold': {
      currentPlayer.hasFolded = true;
      currentPlayer.lastAction = 'fold';
      currentPlayer.hasActed = true;
      newState.handHistory.push({
        handNumber: newState.handNumber,
        action: 'fold',
        player: currentPlayer.odisplayName,
        timestamp: Date.now(),
      });
      break;
    }
    
    case 'check': {
      if (currentPlayer.currentBet < newState.currentBet) {
        return { state, error: 'Cannot check, must call or raise' };
      }
      currentPlayer.lastAction = 'check';
      currentPlayer.hasActed = true;
      newState.handHistory.push({
        handNumber: newState.handNumber,
        action: 'check',
        player: currentPlayer.odisplayName,
        timestamp: Date.now(),
      });
      break;
    }
    
    case 'call': {
      const callAmount = Math.min(newState.currentBet - currentPlayer.currentBet, currentPlayer.chips);
      currentPlayer.chips -= callAmount;
      currentPlayer.currentBet += callAmount;
      currentPlayer.totalBetThisRound += callAmount;
      newState.pots[0].amount += callAmount;
      if (currentPlayer.chips === 0) currentPlayer.isAllIn = true;
      currentPlayer.lastAction = currentPlayer.isAllIn ? 'all_in' : 'call';
      currentPlayer.hasActed = true;
      newState.handHistory.push({
        handNumber: newState.handNumber,
        action: currentPlayer.isAllIn ? 'all_in' : 'call',
        player: currentPlayer.odisplayName,
        amount: callAmount,
        timestamp: Date.now(),
      });
      break;
    }
    
    case 'raise': {
      const raiseAmount = amount || newState.currentBet * 2;
      const totalToCall = raiseAmount - currentPlayer.currentBet;
      
      if (totalToCall > currentPlayer.chips) {
        // All-in
        const allInAmount = currentPlayer.chips;
        currentPlayer.chips = 0;
        currentPlayer.currentBet += allInAmount;
        currentPlayer.totalBetThisRound += allInAmount;
        newState.pots[0].amount += allInAmount;
        currentPlayer.isAllIn = true;
        currentPlayer.lastAction = 'all_in';
        if (currentPlayer.currentBet > newState.currentBet) {
          newState.minRaise = currentPlayer.currentBet - newState.currentBet;
          newState.currentBet = currentPlayer.currentBet;
          // Reset hasActed for other players since bet increased
          for (const p of newState.players) {
            if (p.seatIndex !== seatIndex && !p.hasFolded && !p.isAllIn) {
              p.hasActed = false;
            }
          }
        }
      } else {
        if (raiseAmount < newState.currentBet + newState.minRaise && currentPlayer.chips > totalToCall) {
          return { state, error: `Minimum raise is ${newState.currentBet + newState.minRaise}` };
        }
        currentPlayer.chips -= totalToCall;
        currentPlayer.currentBet = raiseAmount;
        currentPlayer.totalBetThisRound += totalToCall;
        newState.pots[0].amount += totalToCall;
        newState.minRaise = raiseAmount - newState.currentBet;
        newState.currentBet = raiseAmount;
        currentPlayer.lastAction = 'raise';
        // Reset hasActed for other players
        for (const p of newState.players) {
          if (p.seatIndex !== seatIndex && !p.hasFolded && !p.isAllIn) {
            p.hasActed = false;
          }
        }
      }
      currentPlayer.hasActed = true;
      newState.handHistory.push({
        handNumber: newState.handNumber,
        action: currentPlayer.isAllIn ? 'all_in' : 'raise',
        player: currentPlayer.odisplayName,
        amount: currentPlayer.currentBet,
        timestamp: Date.now(),
      });
      break;
    }
    
    case 'all_in': {
      const allInAmount = currentPlayer.chips;
      currentPlayer.currentBet += allInAmount;
      currentPlayer.totalBetThisRound += allInAmount;
      currentPlayer.chips = 0;
      currentPlayer.isAllIn = true;
      currentPlayer.lastAction = 'all_in';
      currentPlayer.hasActed = true;
      newState.pots[0].amount += allInAmount;
      
      if (currentPlayer.currentBet > newState.currentBet) {
        newState.minRaise = currentPlayer.currentBet - newState.currentBet;
        newState.currentBet = currentPlayer.currentBet;
        for (const p of newState.players) {
          if (p.seatIndex !== seatIndex && !p.hasFolded && !p.isAllIn) {
            p.hasActed = false;
          }
        }
      }
      newState.handHistory.push({
        handNumber: newState.handNumber,
        action: 'all_in',
        player: currentPlayer.odisplayName,
        amount: currentPlayer.currentBet,
        timestamp: Date.now(),
      });
      break;
    }
  }
  
  // Check if hand is over (only one player remaining)
  const playersInHand = newState.players.filter(p => !p.hasFolded);
  if (playersInHand.length === 1) {
    return { state: resolveHand(newState) };
  }
  
  // Check if betting round is complete
  const activePlayers = newState.players.filter(p => !p.hasFolded && !p.isAllIn);
  const allActed = activePlayers.every(p => p.hasActed);
  const allEvenBets = activePlayers.every(p => p.currentBet === newState.currentBet);
  
  if (allActed && allEvenBets) {
    // Move to next round
    return { state: advanceRound(newState) };
  }
  
  // Move to next player
  newState.currentPlayerSeat = getNextActiveSeat(newState, seatIndex);
  newState.turnStartTime = Date.now();
  
  return { state: newState };
}

// Advance to next betting round
function advanceRound(state: GameState): GameState {
  const newState = { ...state };
  
  // Reset bets for new round
  for (const player of newState.players) {
    player.currentBet = 0;
    player.hasActed = false;
  }
  newState.currentBet = 0;
  newState.minRaise = newState.bigBlindAmount;
  
  // Check if all remaining players are all-in (run out the board)
  const activePlayers = newState.players.filter(p => !p.hasFolded && !p.isAllIn);
  
  switch (newState.bettingRound) {
    case 'preflop':
      newState.bettingRound = 'flop';
      newState.deck.pop(); // burn
      newState.communityCards.push(newState.deck.pop()!, newState.deck.pop()!, newState.deck.pop()!);
      newState.handHistory.push({ handNumber: newState.handNumber, action: 'flop', cards: newState.communityCards.slice(0, 3), timestamp: Date.now() });
      break;
    case 'flop':
      newState.bettingRound = 'turn';
      newState.deck.pop(); // burn
      newState.communityCards.push(newState.deck.pop()!);
      newState.handHistory.push({ handNumber: newState.handNumber, action: 'turn', cards: [newState.communityCards[3]], timestamp: Date.now() });
      break;
    case 'turn':
      newState.bettingRound = 'river';
      newState.deck.pop(); // burn
      newState.communityCards.push(newState.deck.pop()!);
      newState.handHistory.push({ handNumber: newState.handNumber, action: 'river', cards: [newState.communityCards[4]], timestamp: Date.now() });
      break;
    case 'river':
      return resolveHand(newState);
  }
  
  // If no active players can act (all all-in), run out remaining cards
  if (activePlayers.length <= 1) {
    // Run out remaining community cards
    while (newState.communityCards.length < 5) {
      newState.deck.pop(); // burn
      newState.communityCards.push(newState.deck.pop()!);
    }
    return resolveHand(newState);
  }
  
  // First to act post-flop is first active player after dealer
  newState.currentPlayerSeat = getNextActiveSeat(newState, newState.dealerSeat);
  newState.turnStartTime = Date.now();
  
  return newState;
}

// Resolve hand - determine winner(s) and distribute pot
export function resolveHand(state: GameState): GameState {
  const newState = { ...state };
  newState.phase = 'showdown';
  
  const playersInHand = newState.players.filter(p => !p.hasFolded);
  
  // If only one player left, they win
  if (playersInHand.length === 1) {
    const winner = playersInHand[0];
    const totalPot = newState.pots.reduce((sum, pot) => sum + pot.amount, 0);
    winner.chips += totalPot;
    newState.pots = [{ amount: 0, eligiblePlayers: [] }];
    newState.handHistory.push({
      handNumber: newState.handNumber,
      action: 'win',
      player: winner.odisplayName,
      amount: totalPot,
      timestamp: Date.now(),
    });
    newState.phase = 'hand_complete';
    return newState;
  }
  
  // Evaluate all hands
  const handResults = playersInHand.map(player => ({
    player,
    result: evaluateHand(player.holeCards, newState.communityCards),
  }));
  
  // Sort by hand strength (best first)
  handResults.sort((a, b) => compareHands(b.result, a.result));
  
  // Calculate side pots and distribute
  const totalPot = newState.pots.reduce((sum, pot) => sum + pot.amount, 0);
  
  // Find winners (could be split pot)
  const bestResult = handResults[0].result;
  const winners = handResults.filter(hr => compareHands(hr.result, bestResult) === 0);
  
  const winAmount = Math.floor(totalPot / winners.length);
  const remainder = totalPot - (winAmount * winners.length);
  
  for (let i = 0; i < winners.length; i++) {
    winners[i].player.chips += winAmount + (i === 0 ? remainder : 0);
  }
  
  newState.pots = [{ amount: 0, eligiblePlayers: [] }];
  
  for (const winner of winners) {
    newState.handHistory.push({
      handNumber: newState.handNumber,
      action: 'win',
      player: winner.player.odisplayName,
      amount: winAmount,
      handDescription: winner.result.description,
      timestamp: Date.now(),
    });
  }
  
  newState.phase = 'hand_complete';
  
  // Advance dealer for next hand
  newState.dealerSeat = getNextActiveSeat(newState, newState.dealerSeat, true);
  
  return newState;
}

// Get the game state as seen by a specific player (hide other players' cards)
export function getPlayerView(state: GameState, seatIndex: number): any {
  return {
    ...state,
    deck: undefined, // Never send deck to client
    players: state.players.map(p => {
      const showCards = p.seatIndex === seatIndex || state.phase === 'showdown' || state.phase === 'hand_complete';
      let handDescription: string | undefined;
      if (showCards && !p.hasFolded && p.holeCards.length === 2 && state.communityCards.length >= 3) {
        try {
          const result = evaluateHand(p.holeCards, state.communityCards);
          handDescription = result.description;
        } catch { /* ignore */ }
      }
      return {
        oduserId: p.oduserId,
        odisplayName: p.odisplayName,
        avatarUrl: p.avatarUrl,
        seatIndex: p.seatIndex,
        chips: p.chips,
        currentBet: p.currentBet,
        totalBetThisRound: p.totalBetThisRound,
        hasFolded: p.hasFolded,
        hasActed: p.hasActed,
        isAllIn: p.isAllIn,
        isConnected: p.isConnected,
        isSittingOut: p.isSittingOut,
        lastAction: p.lastAction,
        handDescription,
        holeCards: showCards
          ? p.holeCards
          : p.holeCards.length > 0 ? ['back', 'back'] : [],
      };
    }),
  };
}
