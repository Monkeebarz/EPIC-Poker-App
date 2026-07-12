import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function getFriendlyErrorMessage(rawError: string): string {
  if (!rawError) return 'Something went wrong. Please try again.';
  const lower = rawError.toLowerCase();
  if (lower.includes('not found')) return 'That table or game was not found.';
  if (lower.includes('already started')) return 'This game has already started.';
  if (lower.includes('seat already taken')) return 'That seat is already taken.';
  if (lower.includes('not in this game')) return 'You are not in this game.';
  if (lower.includes('need at least')) return 'Not enough players to start the game.';
  if (lower.includes('only the host')) return 'Only the tournament host can perform this action.';
  if (lower.includes('no active game')) return 'There is no active game at this table.';
  if (lower.includes('connection')) return 'Connection lost. Please check your internet and try again.';
  if (lower.includes('timeout')) return 'Request timed out. Please try again.';
  return 'An error occurred. Please try again.';
}

const TABLE_PORTRAIT_URL = "/table-portrait.jpg";
const TABLE_LANDSCAPE_URL = "/table-landscape.jpg";

// ============================================================
// CARD COMPONENT — Big, readable, PokerNow-style
// ============================================================
function CardDisplay({
  card,
  faceDown = false,
  size = "md",
}: {
  card: string;
  faceDown?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const dims = { xs: "w-8 h-12", sm: "w-12 h-[68px]", md: "w-16 h-[92px]", lg: "w-20 h-[112px]" };
  const textSz = { xs: "text-[9px]", sm: "text-xs", md: "text-sm", lg: "text-base" };
  const suitSz = { xs: "text-base", sm: "text-xl", md: "text-3xl", lg: "text-4xl" };

  if (faceDown || card === "back") {
    return (
      <motion.div
        initial={{ rotateY: 180, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`${dims[size]} bg-gradient-to-br from-purple-900 via-purple-950 to-black border-2 border-purple-500/60 rounded flex items-center justify-center shadow-lg`}
      >
        <div className="w-3/4 h-3/4 rounded border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-purple-800/40 flex items-center justify-center">
          <span className="text-yellow-500/70 font-bold text-[8px]">E</span>
        </div>
      </motion.div>
    );
  }

  const rank = card[0];
  const suit = card[1];
  const suitMap: Record<string, string> = { h: "\u2665", d: "\u2666", c: "\u2663", s: "\u2660" };
  const sym = suitMap[suit] || "?";
  const isRed = suit === "h" || suit === "d";
  const col = isRed ? "text-red-500" : "text-gray-900";
  const rankMap: Record<string, string> = { T: "10", J: "J", Q: "Q", K: "K", A: "A" };
  const r = rankMap[rank] || rank;

  return (
    <motion.div
      initial={{ rotateY: -90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className={`${dims[size]} bg-white border border-gray-300 rounded flex flex-col items-center justify-center shadow-xl relative overflow-hidden`}
    >
      <div className={`absolute top-0.5 left-0.5 flex flex-col items-center leading-none ${textSz[size]}`}>
        <span className={`font-bold ${col}`}>{r}</span>
        <span className={col}>{sym}</span>
      </div>
      <span className={`${col} ${suitSz[size]}`}>{sym}</span>
      <div className={`absolute bottom-0.5 right-0.5 flex flex-col items-center leading-none rotate-180 ${textSz[size]}`}>
        <span className={`font-bold ${col}`}>{r}</span>
        <span className={col}>{sym}</span>
      </div>
    </motion.div>
  );
}

// ============================================================
// PLAYER SEAT — Action overlay IN FRONT of cards (bigger, more visible)
// ============================================================
function PlayerSeat({
  player,
  isCurrentTurn,
  isDealer,
  isMe,
  winAmount,
  cardSize = "sm",
}: {
  player: any;
  isCurrentTurn: boolean;
  isDealer: boolean;
  isMe: boolean;
  winAmount?: number;
  cardSize?: "xs" | "sm" | "md" | "lg";
}) {
  const hasCards = player.holeCards && player.holeCards.length > 0;
  const showHandLabel = player.handDescription && !player.hasFolded;

  // CHECK badge fade-out: track when lastAction becomes 'check' and hide after 1.5s
  const [checkVisible, setCheckVisible] = useState(false);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (player.lastAction === 'check' && !player.hasFolded) {
      setCheckVisible(true);
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
      checkTimerRef.current = setTimeout(() => setCheckVisible(false), 1500);
    } else {
      setCheckVisible(false);
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    }
    return () => { if (checkTimerRef.current) clearTimeout(checkTimerRef.current); };
  }, [player.lastAction, player.hasFolded]);

  // Determine action display text and color
  const actionDisplay = useMemo(() => {
    if (player.hasFolded) {
      return { text: "FOLD", color: "bg-red-900/90 text-red-300 border-red-500/50", isCheck: false };
    }
    if (!player.lastAction) return null;
    const actionMap: Record<string, { text: string; color: string; isCheck?: boolean }> = {
      fold: { text: "FOLD", color: "bg-red-900/90 text-red-300 border-red-500/50" },
      check: { text: "CHECK", color: "bg-green-900/90 text-green-300 border-green-500/50", isCheck: true },
      call: { text: `CALL ${player.currentBet || ""}`, color: "bg-green-900/90 text-green-300 border-green-500/50" },
      raise: { text: `RAISE ${player.currentBet || ""}`, color: "bg-yellow-900/90 text-yellow-300 border-yellow-500/50" },
      all_in: { text: "ALL IN", color: "bg-red-800/90 text-yellow-300 border-yellow-500/50" },
      small_blind: { text: `SB ${player.currentBet || ""}`, color: "bg-gray-800/90 text-gray-300 border-gray-500/50" },
      big_blind: { text: `BB ${player.currentBet || ""}`, color: "bg-gray-800/90 text-gray-300 border-gray-500/50" },
    };
    return actionMap[player.lastAction] || { text: player.lastAction.toUpperCase(), color: "bg-gray-800/90 text-gray-300 border-gray-500/50" };
  }, [player.lastAction, player.hasFolded, player.currentBet]);

  // Only show action badge: hide CHECK when faded, show all others normally
  const showActionBadge = actionDisplay && (actionDisplay.isCheck ? checkVisible : true);

  return (
    <div className="flex flex-col items-center gap-0.5 relative">
      {/* Hole cards */}
      {hasCards && (
        <div className={`flex -space-x-2 mb-0.5 ${player.hasFolded ? "opacity-30 grayscale" : ""}`}>
          {player.holeCards.map((card: string, i: number) => (
            <div key={i} style={{ transform: `rotate(${i === 0 ? "-6deg" : "6deg"})`, zIndex: i }}>
              <CardDisplay card={card} faceDown={card === "back"} size={cardSize} />
            </div>
          ))}
        </div>
      )}

      {/* ACTION OVERLAY — BIG, IN FRONT of cards */}
      <AnimatePresence>
        {showActionBadge && (
          <motion.div
            key={`${player.lastAction}-${player.hasFolded}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-2.5 py-1 rounded-md border font-bold text-[10px] uppercase tracking-wider shadow-lg whitespace-nowrap ${actionDisplay!.color}`}
          >
            {actionDisplay!.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hand strength label */}
      {showHandLabel && (
        <span className="text-[7px] font-bold uppercase bg-red-700 text-white px-1.5 py-0.5 rounded shadow z-10">
          {player.handDescription?.split(",")[0] || ""}
        </span>
      )}

      {/* Active player glowing ring — clear indicator of whose turn it is */}
      {isCurrentTurn && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none z-30"
          style={{ margin: '-4px' }}
          animate={{
            boxShadow: [
              '0 0 0px 0px rgba(250, 204, 21, 0)',
              '0 0 12px 4px rgba(250, 204, 21, 0.7)',
              '0 0 6px 2px rgba(250, 204, 21, 0.4)',
              '0 0 12px 4px rgba(250, 204, 21, 0.7)',
            ],
          }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
        />
      )}

      {/* Name plate */}
      <div
        className={`relative rounded px-3 py-1 min-w-[80px] text-center ${
          isCurrentTurn
            ? "border-2 border-yellow-400 bg-black/90 shadow-lg shadow-yellow-400/30"
            : player.hasFolded
            ? "border border-gray-700/30 bg-black/50 opacity-50"
            : isMe
            ? "border border-yellow-500/50 bg-black/85"
            : "border border-gray-600/40 bg-black/75"
        }`}
      >
        {/* Dealer button */}
        {isDealer && (
          <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-700 text-black text-[8px] font-bold flex items-center justify-center shadow border border-yellow-400 z-10">
            D
          </div>
        )}

        {/* Turn pulse */}
        {isCurrentTurn && (
          <motion.div
            className="absolute inset-0 rounded border-2 border-yellow-400/70"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
        )}

        <p className="text-xs font-semibold text-white truncate max-w-[90px]">
          {player.odisplayName || "Player"}
        </p>
        <div className="flex items-center justify-center gap-1">
          <span className="text-xs text-yellow-400 font-mono font-bold">
            {(player.chips || 0).toLocaleString()}
          </span>
          {winAmount && winAmount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-xs text-green-400 font-bold"
            >
              +{winAmount.toLocaleString()}
            </motion.span>
          )}
        </div>
      </div>

      {/* Current bet chip (below nameplate) */}
      {player.currentBet > 0 && !player.hasFolded && (
        <div className="flex items-center gap-0.5 mt-0.5">
          <div className="w-2 h-2 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-700" />
          <span className="text-[7px] text-yellow-400 font-mono">{player.currentBet}</span>
        </div>
      )}

      {/* Disconnected overlay */}
      {!player.isConnected && (
        <span className="text-[7px] text-red-400 font-bold mt-0.5">AWAY</span>
      )}
    </div>
  );
}

// ============================================================
// SEAT POSITIONS — Arranged around the felt area
// ============================================================
function getSeatPositions(totalSeats: number, isLandscape: boolean): { x: string; y: string }[] {
  const portrait: Record<number, { x: string; y: string }[]> = {
    2: [
      { x: "50%", y: "82%" },
      { x: "50%", y: "13%" },
    ],
    3: [
      { x: "50%", y: "82%" },
      { x: "15%", y: "35%" },
      { x: "85%", y: "35%" },
    ],
    4: [
      { x: "50%", y: "82%" },
      { x: "12%", y: "50%" },
      { x: "50%", y: "13%" },
      { x: "88%", y: "50%" },
    ],
    5: [
      { x: "50%", y: "82%" },
      { x: "10%", y: "62%" },
      { x: "18%", y: "18%" },
      { x: "82%", y: "18%" },
      { x: "90%", y: "62%" },
    ],
    6: [
      { x: "50%", y: "82%" },
      { x: "8%", y: "65%" },
      { x: "10%", y: "25%" },
      { x: "50%", y: "10%" },
      { x: "90%", y: "25%" },
      { x: "92%", y: "65%" },
    ],
    7: [
      { x: "50%", y: "82%" },
      { x: "8%", y: "70%" },
      { x: "6%", y: "38%" },
      { x: "28%", y: "10%" },
      { x: "72%", y: "10%" },
      { x: "94%", y: "38%" },
      { x: "92%", y: "70%" },
    ],
    8: [
      { x: "50%", y: "82%" },
      { x: "10%", y: "72%" },
      { x: "5%", y: "44%" },
      { x: "20%", y: "12%" },
      { x: "50%", y: "6%" },
      { x: "80%", y: "12%" },
      { x: "95%", y: "44%" },
      { x: "90%", y: "72%" },
    ],
    9: [
      { x: "50%", y: "82%" },
      { x: "12%", y: "74%" },
      { x: "5%", y: "50%" },
      { x: "10%", y: "22%" },
      { x: "35%", y: "6%" },
      { x: "65%", y: "6%" },
      { x: "90%", y: "22%" },
      { x: "95%", y: "50%" },
      { x: "88%", y: "74%" },
    ],
    10: [
      { x: "50%", y: "82%" },
      { x: "14%", y: "76%" },
      { x: "5%", y: "55%" },
      { x: "5%", y: "30%" },
      { x: "24%", y: "8%" },
      { x: "50%", y: "4%" },
      { x: "76%", y: "8%" },
      { x: "95%", y: "30%" },
      { x: "95%", y: "55%" },
      { x: "86%", y: "76%" },
    ],
  };

  const landscape: Record<number, { x: string; y: string }[]> = {
    2: [
      { x: "50%", y: "82%" },
      { x: "50%", y: "10%" },
    ],
    3: [
      { x: "50%", y: "82%" },
      { x: "8%", y: "45%" },
      { x: "92%", y: "45%" },
    ],
    4: [
      { x: "50%", y: "82%" },
      { x: "6%", y: "50%" },
      { x: "50%", y: "8%" },
      { x: "94%", y: "50%" },
    ],
    5: [
      { x: "50%", y: "82%" },
      { x: "8%", y: "65%" },
      { x: "8%", y: "25%" },
      { x: "92%", y: "25%" },
      { x: "92%", y: "65%" },
    ],
    6: [
      { x: "50%", y: "82%" },
      { x: "6%", y: "65%" },
      { x: "6%", y: "25%" },
      { x: "50%", y: "8%" },
      { x: "94%", y: "25%" },
      { x: "94%", y: "65%" },
    ],
    7: [
      { x: "50%", y: "82%" },
      { x: "10%", y: "70%" },
      { x: "4%", y: "42%" },
      { x: "20%", y: "10%" },
      { x: "80%", y: "10%" },
      { x: "96%", y: "42%" },
      { x: "90%", y: "70%" },
    ],
    8: [
      { x: "50%", y: "82%" },
      { x: "12%", y: "75%" },
      { x: "4%", y: "48%" },
      { x: "14%", y: "12%" },
      { x: "50%", y: "6%" },
      { x: "86%", y: "12%" },
      { x: "96%", y: "48%" },
      { x: "88%", y: "75%" },
    ],
    9: [
      { x: "50%", y: "82%" },
      { x: "14%", y: "78%" },
      { x: "4%", y: "52%" },
      { x: "6%", y: "22%" },
      { x: "30%", y: "6%" },
      { x: "70%", y: "6%" },
      { x: "94%", y: "22%" },
      { x: "96%", y: "52%" },
      { x: "86%", y: "78%" },
    ],
    10: [
      { x: "50%", y: "82%" },
      { x: "14%", y: "80%" },
      { x: "4%", y: "56%" },
      { x: "4%", y: "30%" },
      { x: "20%", y: "6%" },
      { x: "50%", y: "4%" },
      { x: "80%", y: "6%" },
      { x: "96%", y: "30%" },
      { x: "96%", y: "56%" },
      { x: "86%", y: "80%" },
    ],
  };

  const map = isLandscape ? landscape : portrait;
  return map[totalSeats] || map[8];
}

// ============================================================
// TOURNAMENT END POPUP
// ============================================================
function TournamentEndPopup({
  open,
  onClose,
  data,
  myUserId,
  tournamentPublicId,
}: {
  open: boolean;
  onClose: () => void;
  data: any;
  myUserId?: number;
  tournamentPublicId?: string;
}) {
  const [, navigate] = useLocation();
  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-b from-[#1a1025] to-[#0d0815] border-gold/40 max-w-sm mx-auto text-center">
        <DialogHeader>
          <DialogTitle className="text-gold font-serif text-xl">
            Tournament Finished
          </DialogTitle>
          <p className="text-gray-400 text-xs mt-1">
            {data.tournamentName || "EPIC Tournament"}
          </p>
          <p className="text-gray-500 text-[10px]">
            {data.playerCount || 0} entrants
          </p>
        </DialogHeader>

        {/* Standings */}
        <div className="space-y-2 my-4">
          {data.standings?.map((p: any) => (
            <div
              key={p.userId}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                p.placement === 1
                  ? "bg-gold/15 border border-gold/30"
                  : "bg-white/5 border border-white/10"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {p.placement === 1 && <span className="text-lg">🏆</span>}
                {p.placement === 2 && <span className="text-lg">🥈</span>}
                {p.placement === 3 && <span className="text-lg">🥉</span>}
                <span className={`text-sm font-bold ${p.placement === 1 ? "text-gold" : "text-gray-400"}`}>
                  {p.placement}{p.placement === 1 ? "st" : p.placement === 2 ? "nd" : p.placement === 3 ? "rd" : "th"}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-purple-900 border border-purple-500/50 flex items-center justify-center overflow-hidden shrink-0">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl.includes('cdn.discordapp.com') ? `/api/avatar-proxy?url=${encodeURIComponent(p.avatarUrl)}` : p.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-xs font-bold">
                    {(p.displayName || "?")[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-white text-sm font-medium flex-1 text-left truncate">
                {p.displayName}
                {p.userId === myUserId && (
                  <span className="ml-1.5 text-[9px] bg-green-600 text-white px-1 py-0.5 rounded font-bold">you</span>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <Button onClick={onClose} variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-800">
            Close
          </Button>
          {tournamentPublicId && (
            <Button
              onClick={() => navigate(`/tournaments/${tournamentPublicId}`)}
              className="w-full bg-gradient-to-r from-green-700 to-green-600 text-white font-bold hover:from-green-600 hover:to-green-500"
            >
              Tournament Overview
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// BLIND COUNTDOWN TIMER HOOK
// ============================================================
function useBlindCountdown(
  gameStartedAt: number | null,
  blindLevels: any[] | undefined,
  currentBlinds: { small: number; big: number; ante: number } | null
) {
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!gameStartedAt || !blindLevels || !currentBlinds) {
      setTimeRemaining(null);
      return;
    }

    // Find current level index
    const currentIdx = blindLevels.findIndex(
      (l: any) => l.smallBlind === currentBlinds.small && l.bigBlind === currentBlinds.big
    );
    if (currentIdx < 0) {
      setTimeRemaining(null);
      return;
    }

    // Calculate total elapsed time for levels before current
    let elapsedBeforeCurrent = 0;
    for (let i = 0; i < currentIdx; i++) {
      elapsedBeforeCurrent += (blindLevels[i].duration || 15) * 60 * 1000; // minutes to ms
    }

    const currentLevelDuration = (blindLevels[currentIdx].duration || 0) * 60 * 1000;
    if (currentLevelDuration === 0) {
      // Duration 0 = infinity (last level)
      setTimeRemaining(null);
      return;
    }

    const currentLevelStartTime = gameStartedAt + elapsedBeforeCurrent;
    const currentLevelEndTime = currentLevelStartTime + currentLevelDuration;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = currentLevelEndTime - now;
      if (remaining <= 0) {
        setTimeRemaining("00:00");
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setTimeRemaining(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStartedAt, blindLevels, currentBlinds]);

  return timeRemaining;
}

// ============================================================
// MAIN POKER TABLE COMPONENT
// ============================================================
export default function PokerTable() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [customRaiseInput, setCustomRaiseInput] = useState("");
  const [showCustomRaise, setShowCustomRaise] = useState(false);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [gameOverData, setGameOverData] = useState<any>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);
  const [nextHandCountdown, setNextHandCountdown] = useState<number | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ userId: number; displayName: string; message: string; timestamp: number }>>([]); 
  const [chatInput, setChatInput] = useState("");
  const [chatBubbles, setChatBubbles] = useState<Record<number, string>>({}); // userId -> message

  // Audio cue settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [turnSoundEnabled, setTurnSoundEnabled] = useState(true);
  const [lowTimeSoundEnabled, setLowTimeSoundEnabled] = useState(true);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [logTab, setLogTab] = useState<"hand" | "audit">("hand");
  const audioContextRef = useRef<AudioContext | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const tableId = `table_${id}`;

  // Detect orientation
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  // Get tournament info + blind levels
  const { data: tournament } = trpc.tournament.get.useQuery(
    { publicId: id || "" },
    { enabled: !!id }
  );
  const { data: blindLevels } = trpc.tournament.blindLevels.useQuery(
    { publicId: id || "" },
    { enabled: !!id }
  );
  const { data: participantCount } = trpc.tournament.participantCount.useQuery(
    { publicId: id || "" },
    { enabled: !!id }
  );

  // Pre-fetch table info to ensure the room exists server-side (lazy creation)
  const { data: tableInfo } = trpc.tournament.getTableInfo.useQuery(
    { publicId: id || "" },
    { enabled: !!id && !!user }
  );

  // Audio cue functions using Web Audio API (no external files needed)
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTurnChime = useCallback(() => {
    if (!soundEnabled || !turnSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) { /* ignore audio errors */ }
  }, [soundEnabled, turnSoundEnabled, getAudioContext]);

  const playLowTimeBeep = useCallback(() => {
    if (!soundEnabled || !lowTimeSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) { /* ignore audio errors */ }
  }, [soundEnabled, lowTimeSoundEnabled, getAudioContext]);

  // Audio cue: card dealing sound (short swish + soft thud)
  const playDealSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      // Swish: white noise burst
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 3000;
      noiseFilter.Q.value = 0.8;
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseGain.gain.setValueAtTime(0.18, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      noise.start(now);
      noise.stop(now + 0.08);
      // Soft thud
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.connect(thudGain);
      thudGain.connect(ctx.destination);
      thud.type = 'sine';
      thud.frequency.setValueAtTime(180, now + 0.04);
      thud.frequency.exponentialRampToValueAtTime(60, now + 0.12);
      thudGain.gain.setValueAtTime(0.15, now + 0.04);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      thud.start(now + 0.04);
      thud.stop(now + 0.14);
    } catch (e) { /* ignore */ }
  }, [soundEnabled, getAudioContext]);

  // Audio cue: chips clinking (raise)
  const playChipsSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      // Two quick high-pitched tinks
      [0, 0.07].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2200 + offset * 200, now + offset);
        osc.frequency.exponentialRampToValueAtTime(1400, now + offset + 0.12);
        gain.gain.setValueAtTime(0.22, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
        osc.start(now + offset);
        osc.stop(now + offset + 0.18);
      });
    } catch (e) { /* ignore */ }
  }, [soundEnabled, getAudioContext]);

  // Audio cue: card fold/toss (soft papery thud)
  const playFoldSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      const gain = ctx.createGain();
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      noise.start(now);
      noise.stop(now + 0.1);
    } catch (e) { /* ignore */ }
  }, [soundEnabled, getAudioContext]);

  // Audio cue: win bing (satisfying ascending chime)
  const playWinSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = now + i * 0.1;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.4);
      });
    } catch (e) { /* ignore */ }
  }, [soundEnabled, getAudioContext]);

  // Audio cue: check knock knock (two dull knocks on wood)
  const playCheckSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      [0, 0.18].forEach((offset) => {
        const bufferSize = Math.floor(ctx.sampleRate * 0.09);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 2;
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now + offset);
        osc.frequency.exponentialRampToValueAtTime(80, now + offset + 0.08);
        oscGain.gain.setValueAtTime(0.2, now + offset);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        const noiseGain = ctx.createGain();
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseGain.gain.setValueAtTime(0.15, now + offset);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);
        noise.start(now + offset);
        noise.stop(now + offset + 0.09);
        osc.start(now + offset);
        osc.stop(now + offset + 0.09);
      });
    } catch (e) { /* ignore */ }
  }, [soundEnabled, getAudioContext]);

  // Connect to Socket.IO (only after tableInfo is fetched to ensure room exists)
  useEffect(() => {
    if (!user || !id || !tableInfo) return;

    const socketUrl = window.location.origin;
    const newSocket = io(socketUrl, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      newSocket.emit("join_table", {
        tableId,
        userId: user.id,
        displayName: user.displayName || user.name || "Player",
        avatarUrl: user.avatarUrl || null,
      });
    });

    newSocket.on("disconnect", () => setIsConnected(false));
    newSocket.on("room_info", (info: any) => setRoomInfo(info));
    newSocket.on("seats_updated", (data: any) => {
      setRoomInfo((prev: any) => (prev ? { ...prev, players: data.players } : null));
    });
    newSocket.on("timer_update", (data: { timeLeft: number }) => setTimeLeft(data.timeLeft));
    newSocket.on("next_hand_countdown", (data: { seconds: number }) => {
      // Start a local countdown from the given seconds
      setNextHandCountdown(data.seconds);
      let remaining = data.seconds;
      const countdownInterval = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(countdownInterval);
          setNextHandCountdown(null);
        } else {
          setNextHandCountdown(remaining);
        }
      }, 1000);
    });
    newSocket.on("game_state", (state: any) => {
      setGameState((prev: any) => {
        // Play win sound exactly when showdown result first appears
        const wasShowdown = prev?.phase === 'hand_complete' || prev?.phase === 'showdown';
        const isNowShowdown = state?.phase === 'hand_complete' || state?.phase === 'showdown';
        if (!wasShowdown && isNowShowdown) {
          const hasWin = state?.handHistory?.some((h: any) => h.action === 'win');
          if (hasWin) playWinSound();
        }
        return state;
      });
      // Clear countdown when new hand starts
      if (state?.phase === 'betting' || state?.phase === 'dealing') {
        setNextHandCountdown(null);
        setShowAllCards(false);
      }
    });
    newSocket.on("game_over", (data: any) => {
      setGameOverData(data);
      setShowGameOver(true);
      setNextHandCountdown(null);
    });
    newSocket.on("error", (data: { message: string }) => {
      const friendlyMessage = getFriendlyErrorMessage(data.message);
      toast.error(friendlyMessage);
    });
    // No join/leave notifications during gameplay - they distract from the game
    newSocket.on("player_joined", () => { /* silently ignore */ });
    newSocket.on("player_left", () => { /* silently ignore */ });
    newSocket.on("chat_message", (data: { userId: number; displayName: string; message: string; timestamp: number }) => {
      setChatMessages((prev) => [...prev.slice(-99), data]); // Keep last 100 messages
      // Show speech bubble above the player's seat for ~2 seconds
      const bubbleMsg = data.message;
      setChatBubbles((prev) => ({ ...prev, [data.userId]: bubbleMsg }));
      setTimeout(() => {
        setChatBubbles((prev) => {
          if (prev[data.userId] === bubbleMsg) {
            const next = { ...prev };
            delete next[data.userId];
            return next;
          }
          return prev;
        });
      }, 2000);
    });

    // Audio cue: turn start chime
    newSocket.on("turn_start", (data: { userId: number }) => {
      if (data.userId === user?.id) {
        playTurnChime();
      }
    });

    // Audio cue: low time warning beep
    newSocket.on("low_time_warning", (data: { timeLeft: number; userId: number }) => {
      if (data.userId === user?.id) {
        playLowTimeBeep();
      }
    });

    // Audio cue: cards being dealt (hole cards + community cards)
    // Stagger matches the card animation delays in CardDisplay (delay: i * 0.1s = 100ms per card)
    newSocket.on("deal_cards_event", (data: { type: string; count?: number }) => {
      if (data.type === 'hole_cards') {
        // 2 hole cards, 100ms apart (matching animation delay: i * 0.1)
        playDealSound();
        setTimeout(() => playDealSound(), 100);
      } else if (data.type === 'flop') {
        // 3 flop cards, 100ms apart
        playDealSound();
        setTimeout(() => playDealSound(), 100);
        setTimeout(() => playDealSound(), 200);
      } else {
        // Turn or river: 1 card
        playDealSound();
      }
    });

    // Audio cue: player actions (fold, check, raise/call) — fires before game_state for exact sync
    newSocket.on("player_action_event", (data: { userId: number; action: string; amount?: number }) => {
      if (data.action === 'fold') {
        playFoldSound();
      } else if (data.action === 'check') {
        playCheckSound();
      } else if (data.action === 'raise' || data.action === 'all_in') {
        playChipsSound();
      }
      // call: no dedicated sound (turn chime already plays for next player)
    });

    // Inactive player kicked
    newSocket.on("player_kicked_inactive", (data: { userId: number; displayName: string }) => {
      toast.info(`${data.displayName} was kicked for inactivity`);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, [user, id, tableInfo]);

  // Find my player
  const myPlayer = useMemo(() => {
    if (!gameState || !user) return null;
    return gameState.players?.find((p: any) => p.oduserId === user.id);
  }, [gameState, user]);

  // Reorder so I'm always at seat index 0 in display
  const orderedPlayers = useMemo(() => {
    if (!gameState?.players || !user) return [];
    const players = [...gameState.players];
    const myIndex = players.findIndex((p: any) => p.oduserId === user.id);
    if (myIndex <= 0) return players;
    return [...players.slice(myIndex), ...players.slice(0, myIndex)];
  }, [gameState, user]);

  // Compute win amounts from hand history
  const winAmounts = useMemo(() => {
    const map: Record<string, number> = {};
    if (gameState?.handHistory) {
      for (const h of gameState.handHistory) {
        if (h.action === "win" && h.player && h.amount) {
          map[h.player] = (map[h.player] || 0) + h.amount;
        }
      }
    }
    return map;
  }, [gameState?.handHistory]);

  // Blind info
  const currentBlinds = useMemo(() => {
    if (!gameState) return null;
    return {
      small: gameState.smallBlindAmount || 0,
      big: gameState.bigBlindAmount || 0,
      ante: gameState.anteAmount || 0,
    };
  }, [gameState]);

  // Next blind level
  const nextBlindInfo = useMemo(() => {
    if (!blindLevels || !currentBlinds) return null;
    const currentIdx = blindLevels.findIndex(
      (l: any) => l.smallBlind === currentBlinds.small && l.bigBlind === currentBlinds.big
    );
    if (currentIdx < 0 || currentIdx >= blindLevels.length - 1) return null;
    const next = blindLevels[currentIdx + 1];
    if (next.isBreak) return { label: "BREAK", duration: next.duration };
    return { small: next.smallBlind, big: next.bigBlind, duration: next.duration };
  }, [blindLevels, currentBlinds]);

  // Blind countdown timer
  const blindCountdown = useBlindCountdown(
    gameState?.gameStartedAt || roomInfo?.gameStartedAt || null,
    blindLevels,
    currentBlinds
  );

  // Action state
  const canAct =
    gameState?.phase === "betting" &&
    myPlayer &&
    gameState.currentPlayerSeat === myPlayer.seatIndex;
  const canCheck = canAct && myPlayer.currentBet >= gameState.currentBet;
  const callAmount = canAct
    ? Math.min(gameState.currentBet - (myPlayer?.currentBet || 0), myPlayer?.chips || 0)
    : 0;
  const minRaise = gameState ? gameState.currentBet + gameState.minRaise : 0;
  const maxRaise = myPlayer ? myPlayer.chips + (myPlayer?.currentBet || 0) : 0;
  const totalPot = gameState?.pots?.reduce((sum: number, pot: any) => sum + pot.amount, 0) || 0;
  const doubleRaise = gameState ? gameState.currentBet * 2 : 0;

  useEffect(() => {
    if (canAct && minRaise > 0) setRaiseAmount(minRaise);
  }, [canAct, minRaise]);

  const sendAction = useCallback(
    (action: string, amount?: number) => {
      if (!socket || !user) return;
      socket.emit("player_action", { tableId, userId: user.id, action, amount });
      setShowCustomRaise(false);
    },
    [socket, user, tableId]
  );

  const handleFold = () => sendAction("fold");
  const handleCheck = () => sendAction("check");
  const handleCall = () => sendAction("call");
  const handleRaise = (amount: number) => sendAction("raise", amount);
  const handleAllIn = () => sendAction("all_in");
  const handleStartGame = () => socket?.emit("start_game", { tableId, userId: user?.id });
  const handleTakeSeat = (seatIndex: number) =>
    socket?.emit("take_seat", { tableId, userId: user?.id, seatIndex });

  const handleCustomRaiseSubmit = () => {
    const val = parseInt(customRaiseInput);
    if (val && val >= minRaise && val <= maxRaise) {
      handleRaise(val);
      setCustomRaiseInput("");
    } else {
      toast.error(`Enter amount between ${minRaise} and ${maxRaise}`);
    }
  };

  const seatCount = orderedPlayers.length || parseInt(tournament?.tableSize || "8");
  const seatPositions = getSeatPositions(seatCount, isLandscape);
  const isShowdown = gameState?.phase === "showdown" || gameState?.phase === "hand_complete";

  // Compute my position in tournament (by chip count)
  const myPosition = useMemo(() => {
    if (!orderedPlayers.length || !myPlayer) return null;
    const sorted = [...(gameState?.players || [])].sort((a: any, b: any) => b.chips - a.chips);
    const pos = sorted.findIndex((p: any) => p.oduserId === user?.id) + 1;
    return pos > 0 ? pos : null;
  }, [gameState, myPlayer, user]);

  const activePlayers = orderedPlayers.filter((p: any) => !p.hasFolded && p.chips > 0).length;

  return (
    <div className="h-[100dvh] w-full bg-[#050508] flex flex-col overflow-hidden select-none">

      {/* ===== TOP NAV — ~5% ===== */}
      <div className="flex items-center justify-between px-3 bg-[#0a0a12]/95 border-b border-yellow-500/10 shrink-0 h-[5dvh] min-h-[26px] z-30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/tournaments/${id}`)}
            className="text-gray-400 hover:text-yellow-500 text-[11px] transition-colors"
          >
            &larr;
          </button>
          <span className="text-gray-500 text-[9px] uppercase tracking-wider cursor-pointer hover:text-yellow-500">Options</span>
          <span className="text-gray-500 text-[9px] uppercase tracking-wider cursor-pointer hover:text-yellow-500">Leave</span>
          <span className="text-gray-500 text-[9px] uppercase tracking-wider cursor-pointer hover:text-yellow-500">Away</span>
        </div>

        <div className="text-center flex-1 px-2">
          <h1 className="text-[10px] font-bold text-yellow-500 truncate font-serif tracking-wide">
            {tournament?.name || "EPIC Table"}
          </h1>
          <p className="text-[8px] text-gray-400">
            Table #1
            {myPosition && participantCount ? ` · ${myPosition}${myPosition === 1 ? "st" : myPosition === 2 ? "nd" : myPosition === 3 ? "rd" : "th"} of ${participantCount}` : ""}
            {activePlayers > 0 && ` · ${activePlayers} playing`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
          <button
            onClick={() => setShowSoundSettings(!showSoundSettings)}
            className={`text-[11px] transition-colors ${soundEnabled ? "text-yellow-500 hover:text-yellow-300" : "text-gray-600 hover:text-gray-400"}`}
            title={soundEnabled ? "Sound On" : "Sound Off"}
          >
            {soundEnabled ? "\uD83D\uDD0A" : "\uD83D\uDD07"}
          </button>
          <button
            onClick={() => setShowLog(!showLog)}
            className="text-yellow-500 text-[9px] uppercase tracking-wider font-bold hover:text-yellow-300 transition-colors"
          >
            Log
          </button>
        </div>
      </div>

      {/* ===== TABLE AREA — ~80% ===== */}
      <div className="flex-1 relative overflow-hidden bg-[#050508]">

        {/* Felt image — fills entire viewport like PokerNow */}
        <img
          src={isLandscape ? TABLE_LANDSCAPE_URL : TABLE_PORTRAIT_URL}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* TOURNAMENT INFO — ABOVE community cards on the felt */}
        {gameState && (
          <div
            className="absolute left-1/2 -translate-x-1/2 text-center z-10"
            style={{ top: isLandscape ? "8%" : "28%" }}
          >
            <p className="text-[10px] text-yellow-500/90 font-bold font-serif drop-shadow tracking-wide">
              {tournament?.name || "EPIC Table"}
            </p>
            <p className="text-[8px] text-gray-300/80 drop-shadow">
              Table #1
              {myPosition && participantCount
                ? ` · ${myPosition}${myPosition === 1 ? "st" : myPosition === 2 ? "nd" : myPosition === 3 ? "rd" : "th"} of ${participantCount}`
                : ""}
              {activePlayers > 0 && ` · ${activePlayers} playing`}
            </p>
          </div>
        )}

        {/* POT DISPLAY — pill above community cards */}
        {totalPot > 0 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute left-1/2 -translate-x-1/2 z-10"
            style={{ top: isLandscape ? "18%" : "35%" }}
          >
            <div className="bg-black/80 border border-yellow-500/40 rounded-full px-3 py-0.5 flex items-center gap-1.5 shadow-lg">
              <div className="w-3 h-3 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-700 border border-yellow-500/50" />
              <span className="text-yellow-400 font-mono text-xs font-bold">{totalPot.toLocaleString()}</span>
            </div>
          </motion.div>
        )}

        {/* COMMUNITY CARDS — BIG, centered */}
        {gameState?.communityCards && gameState.communityCards.length > 0 && (
          <div
            className="absolute left-1/2 z-10"
            style={{
              top: isLandscape ? "50%" : "42%",
              transform: isLandscape ? "translate(-50%, -50%)" : "translateX(-50%)",
            }}
          >
            <div className="flex gap-1.5">
              {gameState.communityCards.map((card: string, i: number) => (
                <motion.div
                  key={`${card}-${i}`}
                  initial={{ y: -20, opacity: 0, rotateY: -90 }}
                  animate={{ y: 0, opacity: 1, rotateY: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                >
                  <CardDisplay card={card} size={isLandscape ? "lg" : "md"} />
                </motion.div>
              ))}
              {/* Empty slots for remaining cards */}
              {Array.from({ length: 5 - gameState.communityCards.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className={`${isLandscape ? "w-[56px] h-[80px]" : "w-12 h-[68px]"} rounded-md border border-dashed border-gray-500/15`}
                />
              ))}
            </div>
          </div>
        )}

        {/* BLIND INFO + COUNTDOWN TIMER — below community cards */}
        {currentBlinds && gameState && (
          <div
            className="absolute left-1/2 -translate-x-1/2 text-center z-10"
            style={{ top: isLandscape ? "72%" : "58%" }}
          >
            <p className="text-sm text-gray-200/90 font-bold uppercase tracking-wide drop-shadow">
              NLH ~ {currentBlinds.small}/{currentBlinds.big}
              {currentBlinds.ante > 0 && ` (${currentBlinds.ante})`}
            </p>
            {nextBlindInfo && (
              <p className="text-xs text-gray-400/80 mt-0.5 drop-shadow">
                {"small" in nextBlindInfo
                  ? `Next: ${nextBlindInfo.small}/${nextBlindInfo.big}`
                  : `Next: ${nextBlindInfo.label}`}
                {blindCountdown && (
                  <span className="ml-1.5 text-yellow-400/90 font-mono font-bold">
                    {blindCountdown}
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        {/* PLAYER SEATS — positioned around the table */}
        <div className="absolute inset-0 z-10">
          {orderedPlayers.map((player: any, index: number) => {
            const pos = seatPositions[index];
            if (!pos) return null;
            const isMe = player.oduserId === user?.id;
            return (
              <div
                key={player.seatIndex}
                className="absolute"
                style={{
                  left: pos.x,
                  top: pos.y,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* Chat bubble above player */}
                <AnimatePresence>
                  {chatBubbles[player.oduserId] && (
                    <motion.div
                      initial={{ y: 5, opacity: 0, scale: 0.9 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: -5, opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                      className="absolute -top-8 left-1/2 -translate-x-1/2 z-30 max-w-[120px]"
                    >
                      <div className="bg-white/95 text-gray-900 text-[9px] font-medium rounded-lg px-2 py-1 shadow-lg relative whitespace-nowrap overflow-hidden text-ellipsis">
                        {chatBubbles[player.oduserId].slice(0, 40)}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-white/95" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <PlayerSeat
                  player={player}
                  isCurrentTurn={gameState?.currentPlayerSeat === player.seatIndex}
                  isDealer={gameState?.dealerSeat === player.seatIndex}
                  isMe={isMe}
                  winAmount={winAmounts[player.odisplayName]}
                  cardSize={isMe ? "lg" : "sm"}
                />
              </div>
            );
          })}
        </div>

        {/* WAITING STATE — pre-game seat selection */}
        {!gameState && roomInfo && !roomInfo.isStarted && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="bg-[#0d0815]/95 border border-gold/30 rounded-2xl p-5 text-center max-w-xs mx-4 shadow-2xl backdrop-blur-sm">
              <h2 className="text-lg font-bold text-yellow-500 font-serif mb-1">Take Your Seat</h2>
              <p className="text-gray-400 text-xs mb-4">
                {roomInfo.players?.length || 0} player(s) seated
              </p>
              <div className="grid grid-cols-4 gap-1.5 mb-4">
                {Array.from({ length: parseInt(tournament?.tableSize || "8") }).map((_, i) => {
                  const taken = roomInfo.players?.find((p: any) => p.seatIndex === i);
                  return (
                    <button
                      key={i}
                      onClick={() => !taken && handleTakeSeat(i)}
                      disabled={!!taken}
                      className={`p-1.5 rounded-lg text-[10px] border transition-all ${
                        taken
                          ? "border-purple-500/40 bg-purple-900/20 text-purple-300 cursor-default"
                          : "border-yellow-500/30 bg-black hover:bg-yellow-500/10 text-yellow-500 hover:border-yellow-500 cursor-pointer active:scale-95"
                      }`}
                    >
                      {taken ? taken.displayName?.slice(0, 5) || "Taken" : `Seat ${i + 1}`}
                    </button>
                  );
                })}
              </div>
              {roomInfo.hostUserId === user?.id && (
                <Button
                  onClick={handleStartGame}
                  disabled={roomInfo.players?.length < 2}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold hover:from-yellow-400 hover:to-yellow-500 active:scale-97 transition-transform"
                >
                  Start Game ({roomInfo.players?.length || 0}/2 min)
                </Button>
              )}
            </div>
          </div>
        )}

        {/* SHOWDOWN RESULT — winner announcement */}
        {isShowdown && gameState?.handHistory?.some((h: any) => h.action === "win") && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute left-1/2 -translate-x-1/2 z-20 bg-black/95 border border-yellow-500/50 rounded-xl px-4 py-2 text-center shadow-xl"
            style={{ bottom: isLandscape ? "15%" : "18%" }}
          >
            {gameState.handHistory
              .filter((h: any) => h.action === "win")
              .map((h: any, i: number) => (
                <div key={i}>
                  <p className="text-yellow-500 text-sm font-bold font-serif">
                    {h.player} wins {h.amount?.toLocaleString()}
                  </p>
                  {h.handDescription && (
                    <p className="text-purple-300 text-[10px] uppercase tracking-wider mt-0.5">
                      {h.handDescription}
                    </p>
                  )}
                </div>
              ))}
          </motion.div>
        )}

        {/* NEXT HAND COUNTDOWN */}
        <AnimatePresence>
          {nextHandCountdown !== null && nextHandCountdown > 0 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="absolute left-1/2 -translate-x-1/2 z-25 bg-black/90 border border-purple-500/50 rounded-lg px-4 py-1.5 text-center shadow-xl"
              style={{ bottom: isLandscape ? "8%" : "12%" }}
            >
              <p className="text-gray-300 text-[11px] font-medium">
                Next hand in <span className="text-yellow-400 font-bold font-mono">{nextHandCountdown}</span>...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GAME LOG PANEL — with Hand Log + Audit Log tabs */}
        <AnimatePresence>
          {showLog && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute top-0 right-0 bottom-0 w-52 bg-black/95 border-l border-purple-500/30 z-30 flex flex-col"
            >
              <div className="flex items-center justify-between p-2 border-b border-gray-800/50">
                <div className="flex gap-2">
                  <button
                    onClick={() => setLogTab("hand")}
                    className={`text-[9px] font-bold uppercase tracking-wider ${logTab === "hand" ? "text-yellow-500" : "text-gray-600 hover:text-gray-400"}`}
                  >
                    Hand
                  </button>
                  <button
                    onClick={() => setLogTab("audit")}
                    className={`text-[9px] font-bold uppercase tracking-wider ${logTab === "audit" ? "text-yellow-500" : "text-gray-600 hover:text-gray-400"}`}
                  >
                    Audit
                  </button>
                </div>
                <button onClick={() => setShowLog(false)} className="text-gray-500 hover:text-white">&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {logTab === "hand" ? (
                  gameState?.handHistory && gameState.handHistory.length > 0 ? (
                    <div className="space-y-0.5">
                      {[...gameState.handHistory].reverse().map((entry: any, i: number) => (
                        <div key={i} className="text-[9px] py-0.5 border-b border-gray-800/50">
                          {entry.player && <span className="text-purple-300 font-medium">{entry.player} </span>}
                          <span className="text-gray-500">{entry.action}</span>
                          {entry.amount && <span className="text-yellow-400 ml-1">{entry.amount}</span>}
                          {entry.handDescription && (
                            <span className="text-green-400 ml-1 text-[8px]">({entry.handDescription})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-[10px]">No actions yet</p>
                  )
                ) : (
                  <AuditLogTab publicId={id || ""} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SOUND SETTINGS PANEL */}
        <AnimatePresence>
          {showSoundSettings && (
            <motion.div
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute top-0 right-0 w-44 bg-black/95 border-b border-l border-purple-500/30 z-40 p-3 rounded-bl-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">Sound</h3>
                <button onClick={() => setShowSoundSettings(false)} className="text-gray-500 hover:text-white text-xs">&times;</button>
              </div>
              <div className="space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[10px] text-gray-300">Master</span>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`w-8 h-4 rounded-full transition-colors ${soundEnabled ? "bg-yellow-500" : "bg-gray-700"}`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform mx-0.5 ${soundEnabled ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[10px] text-gray-300">Turn Chime</span>
                  <button
                    onClick={() => setTurnSoundEnabled(!turnSoundEnabled)}
                    disabled={!soundEnabled}
                    className={`w-8 h-4 rounded-full transition-colors ${turnSoundEnabled && soundEnabled ? "bg-purple-500" : "bg-gray-700"} disabled:opacity-40`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform mx-0.5 ${turnSoundEnabled && soundEnabled ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[10px] text-gray-300">Low Time Beep</span>
                  <button
                    onClick={() => setLowTimeSoundEnabled(!lowTimeSoundEnabled)}
                    disabled={!soundEnabled}
                    className={`w-8 h-4 rounded-full transition-colors ${lowTimeSoundEnabled && soundEnabled ? "bg-purple-500" : "bg-gray-700"} disabled:opacity-40`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform mx-0.5 ${lowTimeSoundEnabled && soundEnabled ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CHAT PANEL */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute top-0 left-0 bottom-0 w-52 bg-black/95 border-r border-purple-500/30 z-30 flex flex-col"
            >
              <div className="flex items-center justify-between p-2 border-b border-gray-800/50">
                <h3 className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">Table Chat</h3>
                <button onClick={() => setShowChat(false)} className="text-gray-500 hover:text-white text-sm">&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {chatMessages.length === 0 && (
                  <p className="text-gray-600 text-[10px] text-center mt-4">No messages yet</p>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className="text-[10px]">
                    <span className="text-purple-300 font-bold">{msg.displayName}: </span>
                    <span className="text-gray-300">{msg.message}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!chatInput.trim() || !socket || !user) return;
                  socket.emit("chat_message", {
                    tableId,
                    userId: user.id,
                    displayName: user.name || "Player",
                    message: chatInput.trim(),
                  });
                  setChatInput("");
                }}
                className="p-2 border-t border-gray-800/50 flex gap-1"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type..."
                  maxLength={200}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[10px] text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50"
                />
                <button
                  type="submit"
                  className="bg-yellow-500/20 border border-yellow-500/40 text-yellow-500 rounded px-2 py-1 text-[9px] font-bold hover:bg-yellow-500/30 active:scale-95 transition-transform"
                >
                  Send
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== ACTION BAR — thin strip at bottom (~15%) ===== */}
      {canAct && myPlayer && (
        <motion.div
          initial={{ y: 60 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-[#0a0a12] border-t border-yellow-500/15 px-2 py-1.5 shrink-0 z-20"
        >
          {/* Timer bar */}
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full transition-colors ${
                  timeLeft > 10 ? "bg-green-500" : timeLeft > 5 ? "bg-yellow-500" : "bg-red-500"
                }`}
                animate={{ width: `${(timeLeft / 30) * 100}%` }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </div>
            <span className={`text-[9px] font-mono w-5 text-right ${timeLeft <= 5 ? "text-red-400 font-bold animate-pulse" : "text-gray-400"}`}>
              {timeLeft}s
            </span>
          </div>

          {/* Custom Raise Input (shown when toggled) */}
          <AnimatePresence>
            {showCustomRaise && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-1"
              >
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    value={customRaiseInput}
                    onChange={(e) => setCustomRaiseInput(e.target.value)}
                    placeholder={`${minRaise} - ${maxRaise}`}
                    className="flex-1 h-7 text-xs bg-black/80 border-yellow-500/30 text-white placeholder:text-gray-600"
                    onKeyDown={(e) => e.key === "Enter" && handleCustomRaiseSubmit()}
                  />
                  <Button
                    onClick={handleCustomRaiseSubmit}
                    className="h-7 px-3 bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-bold"
                  >
                    Raise
                  </Button>
                  <Button
                    onClick={() => setShowCustomRaise(false)}
                    variant="outline"
                    className="h-7 px-2 border-gray-600 text-gray-400 text-xs bg-transparent"
                  >
                    ×
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bet sizing row — pot-based presets */}
          <div className="flex gap-1 mb-1">
            <Button
              onClick={() => handleRaise(Math.max(minRaise, Math.min(Math.floor(totalPot * 0.25), maxRaise)))}
              disabled={Math.floor(totalPot * 0.25) < minRaise || minRaise > maxRaise}
              variant="outline"
              className="flex-1 border-purple-500/40 text-purple-300 hover:bg-purple-500/15 font-bold text-[10px] h-7 bg-transparent active:scale-97 transition-transform disabled:opacity-40"
            >
              ¼ Pot
            </Button>
            <Button
              onClick={() => handleRaise(Math.max(minRaise, Math.min(Math.floor(totalPot * 0.5), maxRaise)))}
              disabled={Math.floor(totalPot * 0.5) < minRaise || minRaise > maxRaise}
              variant="outline"
              className="flex-1 border-purple-500/40 text-purple-300 hover:bg-purple-500/15 font-bold text-[10px] h-7 bg-transparent active:scale-97 transition-transform disabled:opacity-40"
            >
              ½ Pot
            </Button>
            <Button
              onClick={() => handleRaise(Math.max(minRaise, Math.min(totalPot, maxRaise)))}
              disabled={totalPot < minRaise || minRaise > maxRaise}
              variant="outline"
              className="flex-1 border-purple-500/40 text-purple-300 hover:bg-purple-500/15 font-bold text-[10px] h-7 bg-transparent active:scale-97 transition-transform disabled:opacity-40"
            >
              Pot
            </Button>
            <Button
              onClick={() => setShowCustomRaise(!showCustomRaise)}
              variant="outline"
              className={`flex-1 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/15 font-bold text-[10px] h-7 bg-transparent active:scale-97 transition-transform ${showCustomRaise ? "bg-yellow-500/15" : ""}`}
            >
              Custom
            </Button>
          </div>

          {/* Action buttons — compact row */}
          <div className="flex gap-1">
            <Button
              onClick={handleFold}
              variant="outline"
              className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/15 font-bold text-[11px] h-8 bg-transparent active:scale-97 transition-transform"
            >
              Fold
            </Button>

            {canCheck ? (
              <Button
                onClick={handleCheck}
                className="flex-1 bg-green-700 hover:bg-green-600 text-white font-bold text-[11px] h-8 active:scale-97 transition-transform"
              >
                Check
              </Button>
            ) : (
              <Button
                onClick={handleCall}
                className="flex-1 bg-green-700 hover:bg-green-600 text-white font-bold text-[11px] h-8 active:scale-97 transition-transform"
              >
                Call {callAmount}
              </Button>
            )}

            <Button
              onClick={() => handleRaise(Math.min(doubleRaise, maxRaise))}
              disabled={doubleRaise > maxRaise || doubleRaise < minRaise}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold text-[11px] h-8 hover:from-yellow-400 hover:to-yellow-500 active:scale-97 transition-transform disabled:opacity-40"
            >
              Raise 2x
            </Button>

            <Button
              onClick={handleAllIn}
              className="shrink-0 px-3 bg-red-700 hover:bg-red-600 text-white font-bold text-[11px] h-8 active:scale-97 transition-transform"
            >
              ALL IN
            </Button>
          </div>

          {/* Bottom mini bar */}
          <div className="flex items-center justify-between border-t border-gray-800/40 pt-1 mt-1">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowChat(!showChat)} className="text-gray-500 text-[9px] uppercase tracking-wider hover:text-yellow-500 transition-colors">Chat</button>
              <button className="text-gray-500 text-[9px] uppercase tracking-wider hover:text-yellow-500 transition-colors flex items-center gap-0.5">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Join
              </button>
            </div>
            <span className="text-[9px] text-yellow-400 font-mono font-bold">{myPlayer.chips?.toLocaleString()}</span>
            <button onClick={() => setShowLog(!showLog)} className="text-gray-500 text-[9px] uppercase tracking-wider hover:text-yellow-500 transition-colors">Log</button>
          </div>
        </motion.div>
      )}

      {/* ===== SHOW ALL CARDS BAR (at showdown) ===== */}
      {isShowdown && myPlayer && myPlayer.holeCards?.length > 0 && myPlayer.holeCards[0] !== "back" && (
        <div className="bg-[#0a0a12] border-t border-green-500/30 px-2 py-1.5 flex items-center justify-center gap-2 shrink-0 z-20">
          <Button
            onClick={() => {
              setShowAllCards(!showAllCards);
              socket?.emit("show_cards", { tableId, userId: user?.id });
            }}
            className="bg-green-700 hover:bg-green-600 text-white font-bold text-[11px] px-4 h-8 active:scale-97 transition-transform"
          >
            SHOW ALL CARDS
          </Button>
          {myPlayer.holeCards.map((card: string, i: number) => (
            <button
              key={i}
              onClick={() => socket?.emit("show_card", { tableId, userId: user?.id, cardIndex: i })}
              className="bg-white/10 hover:bg-white/20 border border-white/30 rounded px-2 py-1 text-white text-[10px] font-bold active:scale-95 transition-transform"
            >
              {card[0] === "T" ? "10" : card[0]}{({ h: "\u2665", d: "\u2666", c: "\u2663", s: "\u2660" } as Record<string, string>)[card[1]] || ""}
            </button>
          ))}
        </div>
      )}

      {/* ===== BOTTOM BAR (when not acting and no showdown) ===== */}
      {!canAct && !isShowdown && gameState && (
        <div className="bg-[#0a0a12]/95 border-t border-gray-800/50 px-3 py-1.5 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowChat(!showChat)} className="text-gray-500 text-[9px] uppercase tracking-wider hover:text-yellow-500 transition-colors">Chat</button>
            <button className="text-gray-500 text-[9px] uppercase tracking-wider hover:text-yellow-500 transition-colors flex items-center gap-0.5">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Join
            </button>
          </div>
          <span className="text-[9px] text-yellow-400 font-mono font-bold">{myPlayer?.chips?.toLocaleString() || "0"}</span>
          <button onClick={() => setShowLog(!showLog)} className="text-gray-500 text-[9px] uppercase tracking-wider hover:text-yellow-500 transition-colors">Log</button>
        </div>
      )}

      {/* ===== TOURNAMENT END POPUP ===== */}
      <TournamentEndPopup
        open={showGameOver}
        onClose={() => setShowGameOver(false)}
        data={gameOverData}
        myUserId={user?.id}
        tournamentPublicId={id}
      />
    </div>
  );
}

// Audit Log Tab component — fetches and displays game audit log
function AuditLogTab({ publicId }: { publicId: string }) {
  const { data: auditLogs, isLoading } = trpc.tournament.auditLog.useQuery(
    { publicId },
    { enabled: !!publicId, refetchInterval: 10000 }
  );

  if (isLoading) {
    return <p className="text-gray-600 text-[10px]">Loading...</p>;
  }

  if (!auditLogs || auditLogs.length === 0) {
    return <p className="text-gray-600 text-[10px]">No audit entries yet</p>;
  }

  return (
    <div className="space-y-1">
      {[...auditLogs].reverse().map((entry: any, i: number) => (
        <div key={i} className="text-[9px] py-1 border-b border-gray-800/50">
          <div className="flex items-center justify-between">
            <span className="text-purple-300 font-medium">{entry.userName}</span>
            <span className="text-gray-600 text-[8px]">
              {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p className="text-gray-400 mt-0.5">{entry.action}</p>
        </div>
      ))}
    </div>
  );
}
