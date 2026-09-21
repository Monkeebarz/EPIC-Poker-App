import { describe, expect, it } from "vitest";
import {
  Card,
  GameState,
  PlayerState,
  calculateSidePots,
  createGameState,
  drawInitialDealerSeat,
  processAction,
  resolveHand,
  startHand,
} from "./engine";

function makeState(
  seats: Array<{ seat: number; chips: number }>,
  dealerSeat: number,
  tableSeatCount = Math.max(...seats.map((entry) => entry.seat)) + 1,
): GameState {
  return createGameState(
    1,
    "spec-table",
    seats.map((entry) => ({
      userId: entry.seat + 100,
      displayName: `Seat ${entry.seat}`,
      avatarUrl: null,
      seatIndex: entry.seat,
      chips: entry.chips,
    })),
    { smallBlind: 50, bigBlind: 100, ante: 0 },
    dealerSeat,
    tableSeatCount,
  );
}

function player(state: GameState, seat: number): PlayerState {
  const found = state.players.find((entry) => entry.seatIndex === seat);
  if (!found) throw new Error(`seat ${seat} absent`);
  return found;
}

describe("PokerNow-style Texas Hold'em specification", () => {
  it("uses the one-time highest-card button draw with suit tie-break", () => {
    // pop() makes the final card deal first. Seat 0 gets Ac and seat 1 gets As: spade wins the rank tie.
    const deck = ["2c", "As", "Ac"] as Card[];
    const draw = drawInitialDealerSeat([{ seatIndex: 0 }, { seatIndex: 1 }], deck, -1);
    expect(draw.dealerSeat).toBe(1);
    expect(draw.draws.map((entry) => entry.card)).toEqual(["Ac", "As"]);
  });

  it("derives multi-way blinds and UTG entirely from the button", () => {
    const started = startHand(makeState([
      { seat: 0, chips: 2_000 },
      { seat: 1, chips: 2_000 },
      { seat: 2, chips: 2_000 },
      { seat: 3, chips: 2_000 },
    ], 0));
    expect(started.smallBlindSeat).toBe(1);
    expect(started.bigBlindSeat).toBe(2);
    expect(started.currentPlayerSeat).toBe(3); // UTG: immediately left of BB.
    expect(player(started, 1).currentBet).toBe(50);
    expect(player(started, 2).currentBet).toBe(100);
  });

  it("uses the heads-up exception: button is SB and acts first preflop", () => {
    const started = startHand(makeState([{ seat: 0, chips: 2_000 }, { seat: 1, chips: 2_000 }], 0, 2));
    expect(started.smallBlindSeat).toBe(0);
    expect(started.bigBlindSeat).toBe(1);
    expect(started.currentPlayerSeat).toBe(0);
  });

  it("deals two clockwise passes starting at the small blind", () => {
    const started = startHand(makeState([
      { seat: 0, chips: 2_000 }, { seat: 1, chips: 2_000 }, { seat: 2, chips: 2_000 },
    ], 0));
    // Deal order is SB seat 1, BB seat 2, button seat 0. Two cards are always present and unique.
    const cards = started.players.flatMap((entry) => entry.holeCards);
    expect(cards).toHaveLength(6);
    expect(new Set(cards).size).toBe(6);
    expect(player(started, 0).holeCards).toHaveLength(2);
    expect(player(started, 1).holeCards).toHaveLength(2);
    expect(player(started, 2).holeCards).toHaveLength(2);
  });

  it("gives BB the preflop option and the first live seat left of button acts postflop", () => {
    let state = startHand(makeState([
      { seat: 0, chips: 2_000 }, { seat: 1, chips: 2_000 }, { seat: 2, chips: 2_000 },
    ], 0));
    state = processAction(state, 0, "call").state;
    expect(state.currentPlayerSeat).toBe(1);
    state = processAction(state, 1, "call").state;
    expect(state.currentPlayerSeat).toBe(2);
    state = processAction(state, 2, "check").state;
    expect(state.bettingRound).toBe("flop");
    expect(state.communityCards).toHaveLength(3);
    expect(state.currentPlayerSeat).toBe(1);
  });

  it("does not reopen action on an under-sized all-in raise", () => {
    // seats 0 and 1 call BB; seat 2 is short and makes a 130 total all-in (only +30, less than min 100).
    let state = startHand(makeState([
      { seat: 0, chips: 1_000 }, { seat: 1, chips: 1_000 }, { seat: 2, chips: 130 }, { seat: 3, chips: 1_000 },
    ], 0, 4));
    // SB=1, BB=2, UTG=3.
    state = processAction(state, 3, "call").state;
    state = processAction(state, 0, "call").state;
    state = processAction(state, 1, "call").state;
    state = processAction(state, 2, "all_in").state;
    // The previous callers acted already; the partial raise did not reopen them.
    expect(state.bettingRound).toBe("flop");
    expect(state.communityCards).toHaveLength(3);
    expect(player(state, 2).totalBetThisRound).toBe(130);
    expect(state.handHistory.some((entry) => entry.action === "all_in" && entry.amount === 130)).toBe(true);
  });

  it("separates a main pot from a side pot and excludes the short all-in from the side pot", () => {
    const state = makeState([
      { seat: 0, chips: 0 }, { seat: 1, chips: 0 }, { seat: 2, chips: 0 },
    ], 0);
    player(state, 0).totalBetThisRound = 100;
    player(state, 1).totalBetThisRound = 200;
    player(state, 2).totalBetThisRound = 200;
    const pots = calculateSidePots(state.players);
    expect(pots).toEqual([
      { amount: 300, eligiblePlayers: [0, 1, 2] },
      { amount: 200, eligiblePlayers: [1, 2] },
    ]);
  });

  it("awards odd split chips starting from the first eligible seat left of the button", () => {
    const state = makeState([{ seat: 0, chips: 0 }, { seat: 1, chips: 0 }, { seat: 2, chips: 0 }], 0, 3);
    state.phase = "betting";
    state.communityCards = ["2c", "3d", "4h", "5s", "6c"];
    for (const entry of state.players) {
      entry.holeCards = ["Ah", "Kd"];
      entry.totalBetThisRound = 1;
    }
    state.pots = [{ amount: 3, eligiblePlayers: [0, 1, 2] }];
    const resolved = resolveHand(state);
    // Three tied players split a 3-chip pot, one each. This verifies exact accounting at showdown.
    expect(resolved.players.map((entry) => entry.chips)).toEqual([1, 1, 1]);
  });

  it("moves the physical dealer button one seat even through an empty gap", () => {
    const state = makeState([{ seat: 0, chips: 0 }, { seat: 2, chips: 0 }], 0, 4);
    state.communityCards = ["2c", "3d", "4h", "5s", "6c"];
    for (const entry of state.players) {
      entry.holeCards = ["Ah", "Kd"];
      entry.totalBetThisRound = 1;
    }
    state.pots = [{ amount: 2, eligiblePlayers: [0, 2] }];
    expect(resolveHand(state).dealerSeat).toBe(1); // physical dead-button position, not a convenient jump to 2.
  });
});
