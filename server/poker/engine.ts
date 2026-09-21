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
export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all_in' | 'small_blind' | 'big_blind';
export type GamePhase = 'waiting' | 'dealing' | 'betting' | 'showdown' | 'hand_complete';

export interface PlayerState {
  oduserId: number;
  odisplayName: string;
  avatarUrl: string | null;
  seatIndex: number;
  chips: number;
  holeCards: Card[];
  /** All chips committed to the current hand, including antes, blinds and every street. */
  totalBetThisRound: number;
  /** Chips committed in the current betting street. */
  currentBet: number;
  hasFolded: boolean;
  hasActed: boolean;
  isAllIn: boolean;
  isConnected: boolean;
  isSittingOut: boolean;
  lastAction?: PlayerAction;
}

export interface PotInfo {
  amount: number;
  eligiblePlayers: number[];
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
  /** Last full raise increment; a new raise must increase the total by at least this much. */
  minRaise: number;
  /** Physical button position. It may be empty between hands under dead-button tournament rules. */
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  currentPlayerSeat: number;
  /** Physical seat count, used to preserve button/blind rotation through empty seats. */
  tableSeatCount?: number;
  smallBlindAmount: number;
  bigBlindAmount: number;
  anteAmount: number;
  handNumber: number;
  turnTimer: number;
  turnStartTime: number;
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

export interface InitialDealerDraw {
  dealerSeat: number;
  draws: Array<{ seatIndex: number; card: Card }>;
}

const BUTTON_SUIT_VALUES: Record<Suit, number> = { c: 1, d: 2, h: 3, s: 4 };

/**
 * One-time button draw: highest rank wins, then spades > hearts > diamonds > clubs.
 * This is deliberately separate from every later hand, where seat rotation is the only authority.
 */
export function drawInitialDealerSeat(
  players: Array<{ seatIndex: number }>,
  deck: Card[] = shuffleDeck(createDeck()),
  referenceSeat = 0,
): InitialDealerDraw {
  if (players.length < 2) throw new Error('At least two seated players are required for the button draw');
  const seatOrder = [...players]
    .sort((a, b) => a.seatIndex - b.seatIndex)
    .map(player => player.seatIndex);
  const start = seatOrder.findIndex(seat => seat > referenceSeat);
  const orderedSeats = start === -1
    ? seatOrder
    : [...seatOrder.slice(start), ...seatOrder.slice(0, start)];
  const draws = orderedSeats.map(seatIndex => ({ seatIndex, card: deck.pop()! }));
  const winner = draws.reduce((best, draw) => {
    const bestRank = RANK_VALUES[best.card[0] as Rank];
    const drawRank = RANK_VALUES[draw.card[0] as Rank];
    if (drawRank !== bestRank) return drawRank > bestRank ? draw : best;
    return BUTTON_SUIT_VALUES[draw.card[1] as Suit] > BUTTON_SUIT_VALUES[best.card[1] as Suit] ? draw : best;
  });
  return { dealerSeat: winner.seatIndex, draws };
}

export function createGameState(
  tournamentId: number,
  tableId: string,
  players: { userId: number; displayName: string; avatarUrl: string | null; seatIndex: number; chips: number }[],
  blinds: { smallBlind: number; bigBlind: number; ante: number },
  dealerSeat: number,
  tableSeatCount?: number,
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
  const inferredSeatCount = Math.max(2, ...playerStates.map(player => player.seatIndex + 1));

  return {
    tournamentId,
    tableId,
    phase: 'waiting',
    bettingRound: 'preflop',
    deck: [],
    communityCards: [],
    players: playerStates,
    pots: [{ amount: 0, eligiblePlayers: playerStates.map(player => player.seatIndex) }],
    currentBet: 0,
    minRaise: blinds.bigBlind,
    dealerSeat,
    smallBlindSeat: -1,
    bigBlindSeat: -1,
    currentPlayerSeat: -1,
    tableSeatCount: Math.max(inferredSeatCount, tableSeatCount ?? 0),
    smallBlindAmount: blinds.smallBlind,
    bigBlindAmount: blinds.bigBlind,
    anteAmount: blinds.ante,
    handNumber: 0,
    turnTimer: 30,
    turnStartTime: 0,
    handHistory: [],
  };
}

function seatCount(state: GameState): number {
  return Math.max(2, state.tableSeatCount ?? 0, ...state.players.map(player => player.seatIndex + 1));
}

function nextPhysicalSeat(state: GameState, fromSeat: number): number {
  return (fromSeat + 1) % seatCount(state);
}

function clockwiseDistance(state: GameState, fromSeat: number, seatIndex: number, includeFrom = false): number {
  const distance = (seatIndex - fromSeat + seatCount(state)) % seatCount(state);
  return distance === 0 && !includeFrom ? seatCount(state) : distance;
}

function isEligibleForHand(player: PlayerState): boolean {
  return player.chips > 0 && !player.isSittingOut;
}

function getPlayersClockwiseFrom(
  state: GameState,
  fromSeat: number,
  predicate: (player: PlayerState) => boolean,
  includeFrom = false,
): PlayerState[] {
  return state.players
    .filter(predicate)
    .sort((a, b) => clockwiseDistance(state, fromSeat, a.seatIndex, includeFrom) - clockwiseDistance(state, fromSeat, b.seatIndex, includeFrom));
}

function getNextActiveSeat(state: GameState, fromSeat: number, includeAllIn = false): number {
  const next = getPlayersClockwiseFrom(
    state,
    fromSeat,
    player => !player.hasFolded && !player.isSittingOut && (includeAllIn || (!player.isAllIn && player.chips > 0)),
  )[0];
  return next?.seatIndex ?? -1;
}

function getNextPlayerNeedingAction(state: GameState, fromSeat: number): number {
  const next = getPlayersClockwiseFrom(
    state,
    fromSeat,
    // A prior full bet/raise resets hasActed=false for affected players.
    // An under-sized all-in can raise the amount to call for players who have not acted yet,
    // but it does not reopen action for players who already acted/called.
    player => !player.hasFolded && !player.isSittingOut && !player.isAllIn && !player.hasActed,
  )[0];
  return next?.seatIndex ?? -1;
}

function postForcedContribution(state: GameState, player: PlayerState, amount: number, action: 'small_blind' | 'big_blind'): void {
  const posted = Math.min(amount, player.chips);
  player.chips -= posted;
  player.currentBet += posted;
  player.totalBetThisRound += posted;
  player.lastAction = action;
  state.pots[0].amount += posted;
  if (player.chips === 0) player.isAllIn = true;
}

/** Starts a hand with physical-seat button/blind rotation and standard one-card-at-a-time dealing. */
export function startHand(state: GameState): GameState {
  const newState: GameState = {
    ...state,
    handNumber: state.handNumber + 1,
    phase: 'dealing',
    bettingRound: 'preflop',
    communityCards: [],
    currentBet: 0,
    minRaise: state.bigBlindAmount,
    handHistory: [],
    deck: shuffleDeck(createDeck()),
    players: state.players.map(player => ({
      ...player,
      holeCards: [],
      currentBet: 0,
      totalBetThisRound: 0,
      hasFolded: !isEligibleForHand(player),
      hasActed: false,
      isAllIn: false,
      lastAction: undefined,
    })),
    pots: [{ amount: 0, eligiblePlayers: state.players.filter(isEligibleForHand).map(player => player.seatIndex) }],
  };

  const livePlayers = newState.players.filter(player => !player.hasFolded);
  if (livePlayers.length < 2) {
    return { ...newState, phase: 'waiting', currentPlayerSeat: -1 };
  }

  const headsUp = livePlayers.length === 2;
  let smallBlindPosition: number;
  let bigBlindPosition: number;
  if (headsUp) {
    // In heads-up, the button is the SB and acts first preflop.
    const buttonPlayer = newState.players.find(player => player.seatIndex === newState.dealerSeat && !player.hasFolded)
      ?? getPlayersClockwiseFrom(newState, newState.dealerSeat, player => !player.hasFolded)[0];
    newState.dealerSeat = buttonPlayer.seatIndex;
    smallBlindPosition = buttonPlayer.seatIndex;
    bigBlindPosition = getNextActiveSeat(newState, smallBlindPosition, true);
  } else {
    // Dead button is preserved physically: blind positions are never shifted to make a gap convenient.
    smallBlindPosition = nextPhysicalSeat(newState, newState.dealerSeat);
    bigBlindPosition = nextPhysicalSeat(newState, smallBlindPosition);
  }

  const sbPlayer = newState.players.find(player => player.seatIndex === smallBlindPosition && !player.hasFolded);
  const bbPlayer = newState.players.find(player => player.seatIndex === bigBlindPosition && !player.hasFolded);
  newState.smallBlindSeat = sbPlayer ? smallBlindPosition : -1;
  newState.bigBlindSeat = bbPlayer ? bigBlindPosition : -1;

  if (newState.anteAmount > 0) {
    for (const player of livePlayers) postForcedContribution(newState, player, newState.anteAmount, 'small_blind');
    newState.handHistory.push({ handNumber: newState.handNumber, action: 'antes_posted', amount: newState.anteAmount, timestamp: Date.now() });
  }
  if (sbPlayer) postForcedContribution(newState, sbPlayer, newState.smallBlindAmount, 'small_blind');
  if (bbPlayer) postForcedContribution(newState, bbPlayer, newState.bigBlindAmount, 'big_blind');

  newState.currentBet = newState.bigBlindAmount;
  newState.minRaise = newState.bigBlindAmount;

  // Standard deal: two full clockwise passes, beginning from the SB position (or next live seat after a dead SB).
  const dealOrder = getPlayersClockwiseFrom(newState, smallBlindPosition, player => !player.hasFolded, true);
  for (let cardNumber = 0; cardNumber < 2; cardNumber++) {
    for (const player of dealOrder) player.holeCards.push(newState.deck.pop()!);
  }

  // Heads-up exception: the button is the SB and opens preflop itself. In every
  // multi-way hand, action opens immediately clockwise of the BB (UTG).
  newState.currentPlayerSeat = headsUp
    ? (sbPlayer && !sbPlayer.isAllIn ? sbPlayer.seatIndex : getNextPlayerNeedingAction(newState, smallBlindPosition))
    : getNextPlayerNeedingAction(newState, bigBlindPosition);
  newState.phase = 'betting';
  newState.turnStartTime = Date.now();
  newState.handHistory.push({ handNumber: newState.handNumber, action: 'hand_start', timestamp: Date.now() });
  return newState;
}

function isBettingRoundComplete(state: GameState): boolean {
  const canAct = state.players.filter(player => !player.hasFolded && !player.isSittingOut && !player.isAllIn);
  // Full raises explicitly reset hasActed=false for live opponents.
  // Partial all-ins do not, so completion must be keyed to hasActed rather than raw bet equality.
  return canAct.every(player => player.hasActed);
}

function addActionHistory(state: GameState, player: PlayerState, action: PlayerAction, amount?: number): void {
  state.handHistory.push({
    handNumber: state.handNumber,
    action,
    player: player.odisplayName,
    amount,
    timestamp: Date.now(),
  });
}

/** Applies only legal live-state actions. Partial all-ins increase the call amount but never reopen raising. */
export function processAction(
  state: GameState,
  seatIndex: number,
  action: PlayerAction,
  amount?: number,
): { state: GameState; error?: string } {
  if (state.currentPlayerSeat !== seatIndex) return { state, error: 'Not your turn' };
  const originalPlayer = state.players.find(player => player.seatIndex === seatIndex);
  if (!originalPlayer) return { state, error: 'Player not found' };
  if (originalPlayer.hasFolded || originalPlayer.isSittingOut || originalPlayer.isAllIn) return { state, error: 'Player cannot act' };

  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const player = newState.players.find(candidate => candidate.seatIndex === seatIndex)!;
  const previousBet = newState.currentBet;

  switch (action) {
    case 'fold':
      player.hasFolded = true;
      player.hasActed = true;
      player.lastAction = 'fold';
      addActionHistory(newState, player, 'fold');
      break;

    case 'check':
      if (player.currentBet !== newState.currentBet) return { state, error: 'Cannot check while facing a bet' };
      player.hasActed = true;
      player.lastAction = 'check';
      addActionHistory(newState, player, 'check');
      break;

    case 'call': {
      const callAmount = newState.currentBet - player.currentBet;
      if (callAmount <= 0) return { state, error: 'Nothing to call; check instead' };
      const paid = Math.min(callAmount, player.chips);
      player.chips -= paid;
      player.currentBet += paid;
      player.totalBetThisRound += paid;
      newState.pots[0].amount += paid;
      player.isAllIn = player.chips === 0;
      player.hasActed = true;
      player.lastAction = player.isAllIn ? 'all_in' : 'call';
      addActionHistory(newState, player, player.lastAction, paid);
      break;
    }

    case 'raise':
    case 'all_in': {
      const availableTotal = player.currentBet + player.chips;
      const requestedTotal = action === 'all_in' ? availableTotal : Math.floor(amount ?? 0);
      if (!Number.isFinite(requestedTotal) || requestedTotal <= player.currentBet) {
        return { state, error: 'Raise amount must exceed your current bet' };
      }
      const targetTotal = Math.min(requestedTotal, availableTotal);
      const added = targetTotal - player.currentBet;
      const raiseIncrement = targetTotal - newState.currentBet;
      const isAllIn = targetTotal === availableTotal;

      if (raiseIncrement <= 0) {
        // An all-in for less than a call is a valid short call, not a raise.
        player.chips -= added;
        player.currentBet = targetTotal;
        player.totalBetThisRound += added;
        newState.pots[0].amount += added;
        player.isAllIn = true;
        player.hasActed = true;
        player.lastAction = 'all_in';
        addActionHistory(newState, player, 'all_in', added);
        break;
      }
      if (player.hasActed) return { state, error: 'Action was not reopened by the prior bet' };
      if (!isAllIn && targetTotal < newState.currentBet + newState.minRaise) {
        return { state, error: `Minimum raise is ${newState.currentBet + newState.minRaise}` };
      }

      player.chips -= added;
      player.currentBet = targetTotal;
      player.totalBetThisRound += added;
      newState.pots[0].amount += added;
      player.isAllIn = isAllIn;
      player.hasActed = true;
      player.lastAction = isAllIn ? 'all_in' : 'raise';
      newState.currentBet = targetTotal;

      // Only a full raise reopens betting and establishes a new min-raise increment.
      if (raiseIncrement >= newState.minRaise) {
        newState.minRaise = raiseIncrement;
        for (const other of newState.players) {
          if (other.seatIndex !== player.seatIndex && !other.hasFolded && !other.isSittingOut && !other.isAllIn) other.hasActed = false;
        }
      }
      addActionHistory(newState, player, player.lastAction, targetTotal);
      break;
    }

    default:
      return { state, error: 'Unsupported player action' };
  }

  const playersInHand = newState.players.filter(candidate => !candidate.hasFolded && !candidate.isSittingOut);
  if (playersInHand.length === 1) return { state: resolveHand(newState) };
  if (isBettingRoundComplete(newState)) return { state: advanceRound(newState) };

  const nextSeat = getNextPlayerNeedingAction(newState, seatIndex);
  if (nextSeat === -1) return { state: advanceRound(newState) };
  newState.currentPlayerSeat = nextSeat;
  newState.turnStartTime = Date.now();
  return { state: newState };
}

function dealNextStreet(state: GameState): void {
  if (state.bettingRound === 'preflop') {
    state.bettingRound = 'flop';
    state.deck.pop();
    state.communityCards.push(state.deck.pop()!, state.deck.pop()!, state.deck.pop()!);
    state.handHistory.push({ handNumber: state.handNumber, action: 'flop', cards: state.communityCards.slice(0, 3), timestamp: Date.now() });
  } else if (state.bettingRound === 'flop') {
    state.bettingRound = 'turn';
    state.deck.pop();
    state.communityCards.push(state.deck.pop()!);
    state.handHistory.push({ handNumber: state.handNumber, action: 'turn', cards: [state.communityCards[3]], timestamp: Date.now() });
  } else if (state.bettingRound === 'turn') {
    state.bettingRound = 'river';
    state.deck.pop();
    state.communityCards.push(state.deck.pop()!);
    state.handHistory.push({ handNumber: state.handNumber, action: 'river', cards: [state.communityCards[4]], timestamp: Date.now() });
  }
}

function advanceRound(state: GameState): GameState {
  const newState: GameState = {
    ...state,
    players: state.players.map(player => ({ ...player, currentBet: 0, hasActed: false })),
    currentBet: 0,
    minRaise: state.bigBlindAmount,
  };
  if (newState.bettingRound === 'river') return resolveHand(newState);
  dealNextStreet(newState);

  const playersAbleToAct = newState.players.filter(player => !player.hasFolded && !player.isSittingOut && !player.isAllIn);
  if (playersAbleToAct.length <= 1) {
    while (newState.communityCards.length < 5) dealNextStreet(newState);
    return resolveHand(newState);
  }

  // Every postflop street begins left of the button and ends on the button.
  newState.currentPlayerSeat = getNextPlayerNeedingAction(newState, newState.dealerSeat);
  newState.turnStartTime = Date.now();
  return newState;
}

/** Builds main and side pots from actual hand contributions; folded chips remain in pots but cannot win them. */
export function calculateSidePots(players: PlayerState[]): PotInfo[] {
  const levels = Array.from(new Set<number>(players.map(player => player.totalBetThisRound).filter(amount => amount > 0))).sort((a, b) => a - b);
  const pots: PotInfo[] = [];
  let previousLevel = 0;
  for (const level of levels) {
    const contributors = players.filter(player => player.totalBetThisRound >= level);
    const amount = (level - previousLevel) * contributors.length;
    const eligiblePlayers = contributors.filter(player => !player.hasFolded && !player.isSittingOut).map(player => player.seatIndex);
    if (amount > 0 && eligiblePlayers.length > 0) pots.push({ amount, eligiblePlayers });
    previousLevel = level;
  }
  return pots;
}

function distributeOddChips(state: GameState, winners: PlayerState[], remainder: number): void {
  const ordered = [...winners].sort((a, b) => clockwiseDistance(state, state.dealerSeat, a.seatIndex) - clockwiseDistance(state, state.dealerSeat, b.seatIndex));
  for (let index = 0; index < remainder; index++) ordered[index % ordered.length].chips += 1;
}

/** Resolves every main/side pot separately and moves the physical button exactly one seat clockwise. */
export function resolveHand(state: GameState): GameState {
  const newState: GameState = { ...state, players: state.players.map(player => ({ ...player })), phase: 'showdown' };
  const playersInHand = newState.players.filter(player => !player.hasFolded && !player.isSittingOut);

  if (playersInHand.length === 1) {
    const winner = playersInHand[0];
    const amount = newState.pots.reduce((sum, pot) => sum + pot.amount, 0);
    winner.chips += amount;
    newState.handHistory.push({ handNumber: newState.handNumber, action: 'win', player: winner.odisplayName, amount, timestamp: Date.now() });
  } else {
    const handResults = playersInHand.map(player => ({ player, result: evaluateHand(player.holeCards, newState.communityCards) }));
    const sidePots = calculateSidePots(newState.players);
    const winnings = new Map<number, { amount: number; description: string }>();

    for (const pot of sidePots) {
      const contenders = handResults.filter(entry => pot.eligiblePlayers.includes(entry.player.seatIndex));
      if (contenders.length === 0) continue;
      const bestResult = contenders.reduce((best, entry) => compareHands(entry.result, best.result) > 0 ? entry : best).result;
      const winners = contenders.filter(entry => compareHands(entry.result, bestResult) === 0).map(entry => entry.player);
      const share = Math.floor(pot.amount / winners.length);
      for (const winner of winners) {
        winner.chips += share;
        const existing = winnings.get(winner.seatIndex) ?? { amount: 0, description: bestResult.description };
        winnings.set(winner.seatIndex, { amount: existing.amount + share, description: bestResult.description });
      }
      const remainder = pot.amount - share * winners.length;
      if (remainder > 0) {
        distributeOddChips(newState, winners, remainder);
        const oddChipOrder = [...winners].sort((a, b) => clockwiseDistance(newState, newState.dealerSeat, a.seatIndex) - clockwiseDistance(newState, newState.dealerSeat, b.seatIndex));
        for (let index = 0; index < remainder; index++) {
          const winner = oddChipOrder[index % oddChipOrder.length];
          const existing = winnings.get(winner.seatIndex)!;
          winnings.set(winner.seatIndex, { ...existing, amount: existing.amount + 1 });
        }
      }
    }
    for (const [seatIndex, winning] of Array.from(winnings.entries())) {
      const winner = newState.players.find(player => player.seatIndex === seatIndex)!;
      newState.handHistory.push({
        handNumber: newState.handNumber,
        action: 'win',
        player: winner.odisplayName,
        amount: winning.amount,
        handDescription: winning.description,
        timestamp: Date.now(),
      });
    }
  }

  newState.pots = [{ amount: 0, eligiblePlayers: [] }];
  newState.phase = 'hand_complete';
  // Physical advancement preserves a dead button when the next seat is empty.
  newState.dealerSeat = nextPhysicalSeat(newState, newState.dealerSeat);
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
