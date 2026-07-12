/**
 * PokerTablePreview — Static mock of the poker table in an active game state.
 * Layout matches PokerNow reference:
 *   - Table felt = ~80% of screen (object-contain, dark bg in corners)
 *   - Players positioned around the oval edge (cards + nameplate floating at rim)
 *   - Community cards BIG in the center of the oval
 *   - Action bar = thin strip at very bottom (~15%)
 *   - Top info bar = minimal (~5%)
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

const TABLE_PORTRAIT_URL = "/manus-storage/epic_table_portrait_69e228e3.jpg";
const TABLE_LANDSCAPE_URL = "/manus-storage/epic_table_landscape_50e1326d.jpg";

// ---- Card Component ----
function Card({ card, faceDown = false, size = "md" }: { card: string; faceDown?: boolean; size?: "xs" | "sm" | "md" | "lg" }) {
  const dims = { xs: "w-6 h-9", sm: "w-9 h-[52px]", md: "w-12 h-[68px]", lg: "w-[56px] h-[80px]" };
  const textSz = { xs: "text-[8px]", sm: "text-[10px]", md: "text-sm", lg: "text-base" };
  const suitSz = { xs: "text-sm", sm: "text-lg", md: "text-2xl", lg: "text-3xl" };
  if (faceDown || card === "back") {
    return (
      <div className={`${dims[size]} bg-gradient-to-br from-purple-900 via-purple-950 to-black border-2 border-purple-500/60 rounded flex items-center justify-center shadow-lg`}>
        <div className="w-3/4 h-3/4 rounded border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-purple-800/40 flex items-center justify-center">
          <span className="text-yellow-500/70 font-bold text-[8px]">E</span>
        </div>
      </div>
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

// ---- Player Seat with ACTION OVERLAY IN FRONT of cards ----
interface SeatProps {
  name: string;
  chips: number;
  cards: string[];
  faceDown?: boolean;
  handDesc?: string;
  lastAction?: string;
  isDealer?: boolean;
  isCurrent?: boolean;
  folded?: boolean;
  bet?: number;
  cardSize?: "xs" | "sm" | "md" | "lg";
}
function PlayerSeat({ name, chips, cards, faceDown = false, handDesc, lastAction, isDealer, isCurrent, folded, bet, cardSize = "sm" }: SeatProps) {
  // Determine action display
  const getActionDisplay = () => {
    if (folded) return { text: "FOLD", color: "bg-red-900/90 text-red-300 border-red-500/50" };
    if (!lastAction) return null;
    const map: Record<string, { text: string; color: string }> = {
      fold: { text: "FOLD", color: "bg-red-900/90 text-red-300 border-red-500/50" },
      check: { text: "CHECK", color: "bg-green-900/90 text-green-300 border-green-500/50" },
      call: { text: `CALL ${bet || ""}`, color: "bg-green-900/90 text-green-300 border-green-500/50" },
      raise: { text: `RAISE ${bet || ""}`, color: "bg-yellow-900/90 text-yellow-300 border-yellow-500/50" },
      all_in: { text: "ALL IN", color: "bg-red-800/90 text-yellow-300 border-yellow-500/50" },
      small_blind: { text: `SB ${bet || ""}`, color: "bg-gray-800/90 text-gray-300 border-gray-500/50" },
      big_blind: { text: `BB ${bet || ""}`, color: "bg-gray-800/90 text-gray-300 border-gray-500/50" },
    };
    return map[lastAction] || { text: lastAction.toUpperCase(), color: "bg-gray-800/90 text-gray-300 border-gray-500/50" };
  };
  const actionDisplay = getActionDisplay();

  return (
    <div className="flex flex-col items-center gap-0.5 relative">
      {/* Cards */}
      <div className={`flex -space-x-2 mb-0.5 ${folded ? "opacity-30 grayscale" : ""}`}>
        {cards.map((c, i) => (
          <div key={i} style={{ transform: `rotate(${i === 0 ? "-6deg" : "6deg"})`, zIndex: i }}>
            <Card card={c} faceDown={faceDown} size={cardSize} />
          </div>
        ))}
      </div>

      {/* ACTION OVERLAY — BIG, IN FRONT of cards */}
      {actionDisplay && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-2.5 py-1 rounded-md border font-bold text-[10px] uppercase tracking-wider shadow-lg whitespace-nowrap ${actionDisplay.color}`}
        >
          {actionDisplay.text}
        </motion.div>
      )}

      {/* Hand strength */}
      {handDesc && !folded && (
        <span className="text-[7px] font-bold uppercase bg-red-700 text-white px-1.5 py-0.5 rounded shadow z-10">
          {handDesc}
        </span>
      )}
      {/* Name plate */}
      <div className={`relative rounded px-2 py-0.5 min-w-[60px] text-center ${isCurrent ? "border border-yellow-400 bg-black/85 shadow-lg shadow-yellow-400/20" : "border border-gray-600/40 bg-black/75"}`}>
        {isDealer && (
          <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-700 text-black text-[7px] font-bold flex items-center justify-center shadow border border-yellow-400 z-10">D</div>
        )}
        {isCurrent && <motion.div className="absolute inset-0 rounded border-2 border-yellow-400/70" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }} />}
        <p className="text-[9px] font-semibold text-white truncate max-w-[70px]">{name}</p>
        <p className="text-[9px] text-yellow-400 font-mono font-bold">{chips.toLocaleString()}</p>
      </div>
      {/* Bet chip */}
      {bet && bet > 0 && !folded && (
        <div className="flex items-center gap-0.5 mt-0.5">
          <div className="w-2 h-2 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-700" />
          <span className="text-[7px] text-yellow-400 font-mono">{bet}</span>
        </div>
      )}
    </div>
  );
}

// ---- Mock data ----
const MOCK = {
  communityCards: ["Ah", "Kd", "7c"],
  pot: 600,
  blinds: { small: 100, big: 200, nextSmall: 200, nextBig: 400, timeToNext: "04:22" },
  me: { name: "Monkeebarz", chips: 1800, cards: ["Qs", "Ad"], handDesc: "PAIR (A)", bet: 200, isDealer: false },
  opponent: { name: "brittbabyyx", chips: 1800, cards: ["back", "back"], bet: 200, lastAction: "call", isDealer: true },
  timeLeft: 18,
  handHistory: [
    { player: "brittbabyyx", action: "small_blind", amount: 100 },
    { player: "Monkeebarz", action: "big_blind", amount: 200 },
    { player: "brittbabyyx", action: "call", amount: 100 },
  ] as Array<{ player: string; action: string; amount?: number }>,
};

export default function PokerTablePreview() {
  const [isLandscape, setIsLandscape] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showCustomRaise, setShowCustomRaise] = useState(false);
  const [customRaiseInput, setCustomRaiseInput] = useState("");

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

  return (
    <div className="h-[100dvh] w-full bg-[#050508] flex flex-col overflow-hidden select-none">

      {/* ===== TOP NAV — 5% ===== */}
      <div className="flex items-center justify-between px-3 bg-[#0a0a12]/95 border-b border-yellow-500/10 shrink-0 h-[5dvh] min-h-[26px] z-30">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-[11px] cursor-pointer">&larr;</span>
          <span className="text-gray-500 text-[9px] uppercase tracking-wider">Options</span>
          <span className="text-gray-500 text-[9px] uppercase tracking-wider">Away</span>
        </div>
        <div className="text-center flex-1 px-2">
          <h1 className="text-[10px] font-bold text-yellow-500 truncate font-serif tracking-wide">EPIC POKER BETA #2</h1>
          <p className="text-[8px] text-gray-400">Table #1 &middot; 1st of 2 playing</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <button className="text-yellow-500 text-[11px]" title="Sound On">🔊</button>
          <button onClick={() => setShowLog(!showLog)} className="text-yellow-500 text-[9px] uppercase tracking-wider font-bold">Log</button>
        </div>
      </div>

      {/* ===== TABLE AREA — 80% ===== */}
      <div className="flex-1 relative overflow-hidden bg-[#050508]">

        {/* Felt image — object-contain so full oval shape visible with dark corners */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={isLandscape ? TABLE_LANDSCAPE_URL : TABLE_PORTRAIT_URL}
            alt=""
            className="w-full h-full object-contain"
          />
        </div>

        {/* ---- PORTRAIT LAYOUT ---- */}
        {!isLandscape && (
          <>
            {/* Tournament info — ABOVE community cards on the felt */}
            <div className="absolute top-[28%] left-1/2 -translate-x-1/2 text-center z-10">
              <p className="text-[10px] text-yellow-500/90 font-bold font-serif drop-shadow tracking-wide">EPIC POKER BETA #2</p>
              <p className="text-[8px] text-gray-300/80 drop-shadow">Table #1 &middot; 1st of 2 &middot; 2 playing</p>
            </div>

            {/* Opponent — top center of oval */}
            <div className="absolute top-[13%] left-1/2 -translate-x-1/2 z-10">
              <PlayerSeat
                name={MOCK.opponent.name}
                chips={MOCK.opponent.chips}
                cards={MOCK.opponent.cards}
                faceDown
                lastAction={MOCK.opponent.lastAction}
                isDealer={MOCK.opponent.isDealer}
                bet={MOCK.opponent.bet}
                cardSize="sm"
              />
            </div>

            {/* Pot — above community cards */}
            <div className="absolute top-[35%] left-1/2 -translate-x-1/2 z-10">
              <div className="bg-black/80 border border-yellow-500/40 rounded-full px-3 py-0.5 flex items-center gap-1.5 shadow-lg">
                <div className="w-3 h-3 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-700 border border-yellow-500/50" />
                <span className="text-yellow-400 font-mono text-xs font-bold">{MOCK.pot.toLocaleString()}</span>
              </div>
            </div>

            {/* Community cards — center of oval */}
            <div className="absolute top-[42%] left-1/2 z-10" style={{ transform: "translateX(-50%)" }}>
              <div className="flex gap-1.5">
                {MOCK.communityCards.map((card, i) => (
                  <motion.div key={i} initial={{ y: -20, opacity: 0, rotateY: -90 }} animate={{ y: 0, opacity: 1, rotateY: 0 }} transition={{ delay: i * 0.1, duration: 0.35 }}>
                    <Card card={card} size="md" />
                  </motion.div>
                ))}
                {[3, 4].map((i) => (
                  <div key={i} className="w-12 h-[68px] rounded-md border border-dashed border-gray-500/15" />
                ))}
              </div>
            </div>

            {/* Blind info + countdown timer */}
            <div className="absolute top-[58%] left-1/2 -translate-x-1/2 text-center z-10">
              <p className="text-sm text-gray-200/90 font-bold uppercase tracking-wide drop-shadow">NLH ~ {MOCK.blinds.small}/{MOCK.blinds.big}</p>
              <p className="text-xs text-gray-400/80 mt-0.5 drop-shadow">
                Next: {MOCK.blinds.nextSmall}/{MOCK.blinds.nextBig}
                <span className="ml-1.5 text-yellow-400/90 font-mono font-bold">{MOCK.blinds.timeToNext}</span>
              </p>
            </div>

            {/* My seat — bottom of oval, inside felt */}
            <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 z-10">
              <PlayerSeat
                name={MOCK.me.name}
                chips={MOCK.me.chips}
                cards={MOCK.me.cards}
                handDesc={MOCK.me.handDesc}
                bet={MOCK.me.bet}
                isCurrent
                cardSize="lg"
              />
            </div>
          </>
        )}

        {/* ---- LANDSCAPE LAYOUT ---- */}
        {isLandscape && (
          <>
            {/* Tournament info — above community cards */}
            <div className="absolute top-[8%] left-1/2 -translate-x-1/2 text-center z-10">
              <p className="text-[10px] text-yellow-500/90 font-bold font-serif drop-shadow tracking-wide">EPIC POKER BETA #2</p>
              <p className="text-[8px] text-gray-300/80 drop-shadow">Table #1 &middot; 1st of 2 &middot; 2 playing</p>
            </div>

            {/* Opponent — left side of oval */}
            <div className="absolute left-[5%] top-1/2 -translate-y-1/2 z-10">
              <PlayerSeat
                name={MOCK.opponent.name}
                chips={MOCK.opponent.chips}
                cards={MOCK.opponent.cards}
                faceDown
                lastAction={MOCK.opponent.lastAction}
                isDealer={MOCK.opponent.isDealer}
                bet={MOCK.opponent.bet}
                cardSize="sm"
              />
            </div>

            {/* Pot — above community cards, center */}
            <div className="absolute top-[18%] left-1/2 -translate-x-1/2 z-10">
              <div className="bg-black/80 border border-yellow-500/40 rounded-full px-3 py-0.5 flex items-center gap-1.5 shadow-lg">
                <div className="w-3 h-3 rounded-full bg-gradient-to-b from-yellow-400 to-yellow-700 border border-yellow-500/50" />
                <span className="text-yellow-400 font-mono text-sm font-bold">{MOCK.pot.toLocaleString()}</span>
              </div>
            </div>

            {/* Community cards — center of oval, BIG */}
            <div className="absolute top-1/2 left-1/2 z-10" style={{ transform: "translate(-50%, -50%)" }}>
              <div className="flex gap-2">
                {MOCK.communityCards.map((card, i) => (
                  <motion.div key={i} initial={{ y: -20, opacity: 0, rotateY: -90 }} animate={{ y: 0, opacity: 1, rotateY: 0 }} transition={{ delay: i * 0.1, duration: 0.35 }}>
                    <Card card={card} size="lg" />
                  </motion.div>
                ))}
                {[3, 4].map((i) => (
                  <div key={i} className="w-[56px] h-[80px] rounded-md border border-dashed border-gray-500/15" />
                ))}
              </div>
            </div>

            {/* Blind info + countdown timer */}
            <div className="absolute top-[72%] left-1/2 -translate-x-1/2 text-center z-10">
              <p className="text-sm text-gray-200/90 font-bold uppercase tracking-wide drop-shadow">NLH ~ {MOCK.blinds.small}/{MOCK.blinds.big}</p>
              <p className="text-xs text-gray-400/80 drop-shadow">
                Next: {MOCK.blinds.nextSmall}/{MOCK.blinds.nextBig}
                <span className="ml-1.5 text-yellow-400/90 font-mono font-bold">{MOCK.blinds.timeToNext}</span>
              </p>
            </div>

            {/* My seat — right side of oval */}
            <div className="absolute right-[5%] top-1/2 -translate-y-1/2 z-10">
              <PlayerSeat
                name={MOCK.me.name}
                chips={MOCK.me.chips}
                cards={MOCK.me.cards}
                handDesc={MOCK.me.handDesc}
                bet={MOCK.me.bet}
                isCurrent
                cardSize="md"
              />
            </div>
          </>
        )}

        {/* Hand Log Panel */}
        <AnimatePresence>
          {showLog && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute top-0 right-0 bottom-0 w-44 bg-black/95 border-l border-purple-500/30 z-30 overflow-y-auto p-2"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">Hand Log</h3>
                <button onClick={() => setShowLog(false)} className="text-gray-500 hover:text-white">&times;</button>
              </div>
              {MOCK.handHistory.map((entry, i) => (
                <div key={i} className="text-[9px] py-0.5 border-b border-gray-800/50">
                  <span className="text-purple-300 font-medium">{entry.player} </span>
                  <span className="text-gray-500">{entry.action}</span>
                  {entry.amount && <span className="text-yellow-400 ml-1">{entry.amount}</span>}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== ACTION BAR — thin strip at very bottom (~15%) ===== */}
      <div className="bg-[#0a0a12] border-t border-yellow-500/15 px-2 py-1.5 shrink-0 z-20">
        {/* Timer */}
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full bg-yellow-500" style={{ width: `${(MOCK.timeLeft / 30) * 100}%` }} />
          </div>
          <span className="text-[9px] font-mono text-gray-400 w-5 text-right">{MOCK.timeLeft}s</span>
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
                  placeholder="400 - 1800"
                  className="flex-1 h-7 text-xs bg-black/80 border-yellow-500/30 text-white placeholder:text-gray-600"
                />
                <Button className="h-7 px-3 bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-bold">
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
          <Button variant="outline" className="flex-1 border-purple-500/40 text-purple-300 hover:bg-purple-500/15 font-bold text-[10px] h-7 bg-transparent">¼ Pot</Button>
          <Button variant="outline" className="flex-1 border-purple-500/40 text-purple-300 hover:bg-purple-500/15 font-bold text-[10px] h-7 bg-transparent">½ Pot</Button>
          <Button variant="outline" className="flex-1 border-purple-500/40 text-purple-300 hover:bg-purple-500/15 font-bold text-[10px] h-7 bg-transparent">Pot</Button>
          <Button
            onClick={() => setShowCustomRaise(!showCustomRaise)}
            variant="outline"
            className={`flex-1 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/15 font-bold text-[10px] h-7 bg-transparent ${showCustomRaise ? "bg-yellow-500/15" : ""}`}
          >
            Custom
          </Button>
        </div>

        {/* Action buttons — Fold | Call | Raise 2x | ALL IN */}
        <div className="flex gap-1">
          <Button variant="outline" className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/15 font-bold text-[11px] h-8 bg-transparent">Fold</Button>
          <Button className="flex-1 bg-green-700 hover:bg-green-600 text-white font-bold text-[11px] h-8">Call 200</Button>
          <Button className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold text-[11px] h-8">Raise 400</Button>
          <Button className="shrink-0 px-3 bg-red-700 hover:bg-red-600 text-white font-bold text-[11px] h-8">ALL IN</Button>
        </div>

        {/* Bottom mini bar */}
        <div className="flex items-center justify-between border-t border-gray-800/40 pt-1 mt-1">
          <div className="flex items-center gap-3">
            <button className="text-gray-500 text-[9px] uppercase tracking-wider hover:text-yellow-500">Chat</button>
            <button className="text-gray-500 text-[9px] uppercase tracking-wider hover:text-yellow-500 flex items-center gap-0.5">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Join
            </button>
          </div>
          <button onClick={() => setShowLog(!showLog)} className="text-gray-500 text-[9px] uppercase tracking-wider hover:text-yellow-500">Log</button>
        </div>
      </div>
    </div>
  );
}
