import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialTttBoard,
  applyTttMove,
  checkTttWinningLine,
  resolveRpsWinner,
  getMaskedWord,
  isWordSolved,
  countWrongGuesses,
  scoreQuizAnswers,
  isMessageExpired,
  LUDO_MAIN_TRACK,
  createLudoState,
  getMovableLudoTokens,
  applyLudoDiceRoll,
  applyLudoTokenMove,
  pickBotLudoToken,
  getLudoGridCoord,
  createConnect4Board,
  dropConnect4Disc,
  checkConnect4WinningLine,
  createDotsBoxesState,
  claimDotsEdge,
  evaluateCodeGuess,
  slide2048Board,
  can2048Move,
  pickTttBotMove,
  pickConnect4BotCol,
  pickDotsBotEdge,
  ROMANTIC_WORD_BANK,
  createSlidingPuzzle,
  moveSlidingTile,
  isSlidingSolved,
  isSlidingSolvable,
  createSnakeState,
  stepSnakeState,
  shouldNotifyCreatorOnMessageChange,
  resolveTwoPlayerTurn,
  resolveLiveLudoTurnAccess,
  SCORE_DUEL_GAMES,
  createScoreDuel,
  submitScoreDuelTurn
} from "../shared/gameLogic.js";

test("Tic-Tac-Toe detects win, winning line, and blocks occupied cells", () => {
  let b = createInitialTttBoard();
  b = applyTttMove(b, 0, "❤️").board;
  assert.equal(applyTttMove(b, 0, "😘"), null);
  b = applyTttMove(b, 4, "❤️").board;
  const res = applyTttMove(b, 8, "❤️");
  assert.equal(res.winner, "❤️");
  assert.equal(res.draw, false);
  assert.deepEqual(checkTttWinningLine(res.board), { winner: "❤️", line: [0, 4, 8] });
});

test("Rose-Letter-Scissors resolves winner deterministically", () => {
  assert.equal(resolveRpsWinner("rose", "scissors"), "A");
  assert.equal(resolveRpsWinner("scissors", "letter"), "A");
  assert.equal(resolveRpsWinner("letter", "rose"), "A");
  assert.equal(resolveRpsWinner("rose", "rose"), "draw");
  assert.equal(resolveRpsWinner("rose", "letter"), "B");
});

test("Secret Word Boojho masks letters, counts wrongs, and detects solve", () => {
  assert.equal(getMaskedWord("JANAN", ["A"]), "_ A _ A _");
  assert.equal(countWrongGuesses("JANAN", ["A", "Z", "X"]), 2);
  assert.equal(isWordSolved("JANAN", ["J", "A", "N"]), true);
  assert.equal(isWordSolved("JANAN", ["J", "A"]), false);
  assert.ok(ROMANTIC_WORD_BANK.length >= 20);
});

test("Couple Quiz scoring and disappearing message expiry work accurately", () => {
  const qs = [{ correct: 1 }, { correct: 0 }, { correct: 2 }];
  assert.deepEqual(scoreQuizAnswers(qs, [1, 2, 2]), { score: 2, total: 3 });

  assert.equal(isMessageExpired({ expiresAtMs: 1000 }, 1500), true);
  assert.equal(isMessageExpired({ expiresAtMs: 2000 }, 1500), false);
  assert.equal(isMessageExpired({ text: "hello" }, 1500), false);
});

test("Ludo track geometry, dice unlock on 6, safe stars, and capture rules work cleanly", () => {
  assert.equal(LUDO_MAIN_TRACK.length, 52);
  assert.deepEqual(getLudoGridCoord("A", 0, 0), [6, 1]);
  assert.deepEqual(getLudoGridCoord("B", 0, 0), [8, 13]);
  assert.deepEqual(getLudoGridCoord("A", 56, 0), [7, 6]);

  let st = createLudoState("bot");
  assert.deepEqual(getMovableLudoTokens(st.tokensA, 4), []);
  st = applyLudoDiceRoll(st, 4);
  assert.equal(st.turn, "B");
  assert.equal(st.canMove, false);

  st = createLudoState("bot");
  st = applyLudoDiceRoll(st, 6);
  assert.equal(st.canMove, true);
  assert.deepEqual(getMovableLudoTokens(st.tokensA, 6), [0, 1, 2, 3]);
  st = applyLudoTokenMove(st, 0);
  assert.equal(st.tokensA[0], 0);
  assert.equal(st.turn, "A"); // bonus turn on 6

  const capState = {
    ...createLudoState("bot"),
    tokensA: [25, -1, -1, -1],
    tokensB: [1, -1, -1, -1],
    turn: "A",
    dice: 2,
    canMove: true
  };
  const afterCap = applyLudoTokenMove(capState, 0);
  assert.equal(afterCap.captured, true);
  assert.equal(afterCap.tokensB[0], -1);
  assert.equal(afterCap.turn, "A");
  assert.equal(pickBotLudoToken({ ...capState, dice: 2 }), 0);
});

test("Connect 4 Dil drops discs cleanly and returns winning 4 cell indices", () => {
  let b = createConnect4Board();
  for (let i = 0; i < 4; i++) {
    const res = dropConnect4Disc(b, i, "❤️");
    b = res.board;
    if (i < 3) assert.equal(res.winner, null);
    else {
      assert.equal(res.winner, "❤️");
      const line = checkConnect4WinningLine(b);
      assert.equal(line.winner, "❤️");
      assert.equal(line.cells.length, 4);
    }
  }
});

test("Dots & Boxes awards box and retains turn on completion", () => {
  let st = createDotsBoxesState();
  st = claimDotsEdge(st, "h", 0, "A");
  assert.equal(st.turn, "B");
  st = claimDotsEdge(st, "h", 3, "B");
  st = claimDotsEdge(st, "v", 0, "A");
  const doneBox = claimDotsEdge(st, "v", 1, "B");
  assert.equal(doneBox.boxes[0], "B");
  assert.equal(doneBox.scoreB, 1);
  assert.equal(doneBox.turn, "B");
});

test("Dil Ka Lock evaluates exact and partial matches accurately", () => {
  assert.deepEqual(
    evaluateCodeGuess(["❤️", "💜", "💛", "🌹"], ["❤️", "🌹", "💙", "💛"]),
    { exact: 1, partial: 2, solved: false }
  );
  assert.deepEqual(
    evaluateCodeGuess(["❤️", "💜", "💛", "🌹"], ["❤️", "💜", "💛", "🌹"]),
    { exact: 4, partial: 0, solved: true }
  );
});

test("Couple 2048 slides and merges tiles properly", () => {
  const board = [
    2, 2, 4, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0
  ];
  const res = slide2048Board(board, "left", false);
  assert.equal(res.changed, true);
  assert.equal(res.gained, 4);
  assert.deepEqual(res.board.slice(0, 4), [4, 4, 0, 0]);
  assert.equal(can2048Move(res.board), true);
});

test("Bot AIs block threats and complete winning moves accurately", () => {
  const tttBoard = ["❤️", "❤️", "", "", "😘", "", "", "", ""];
  assert.equal(pickTttBotMove(tttBoard, "😘", "❤️"), 2);

  let c4 = createConnect4Board();
  for (let i = 0; i < 3; i++) c4 = dropConnect4Disc(c4, i, "❤️").board;
  assert.equal(pickConnect4BotCol(c4, "😘", "❤️"), 3);

  let dots = createDotsBoxesState();
  dots = claimDotsEdge(dots, "h", 0, "A");
  dots = claimDotsEdge(dots, "h", 3, "A");
  dots = claimDotsEdge(dots, "v", 0, "A");
  assert.deepEqual(pickDotsBotEdge(dots), { type: "v", idx: 1 });
});

test("Sliding Love Puzzle generates solvable boards and detects win", () => {
  const b3 = createSlidingPuzzle(3);
  assert.equal(b3.length, 9);
  assert.equal(isSlidingSolvable(b3, 3), true);
  assert.equal(isSlidingSolved(b3), false);

  const b4 = createSlidingPuzzle(4);
  assert.equal(b4.length, 16);
  assert.equal(isSlidingSolvable(b4, 4), true);

  const almost = [1, 2, 3, 4, 5, 6, 7, 0, 8];
  const moved = moveSlidingTile(almost, 3, 8);
  assert.equal(isSlidingSolved(moved), true);
  assert.equal(moveSlidingTile(almost, 3, 0), null);
});

test("Love Snake moves, eats apple, grows, and detects wall collision", () => {
  let st = createSnakeState(10);
  st.apple = { x: st.snake[0].x + 1, y: st.snake[0].y, gold: false };
  st = stepSnakeState(st, "right", 10);
  assert.equal(st.alive, true);
  assert.equal(st.score, 1);
  assert.equal(st.snake.length, 4);

  // Prevent instant 180 reversal
  const reversed = stepSnakeState(st, "left", 10);
  assert.equal(reversed.dir, "right");

  // Wall collision
  st.snake[0] = { x: 9, y: 5 };
  const crashed = stepSnakeState(st, "right", 10);
  assert.equal(crashed.alive, false);
});

test("Creator notification detector alerts creator when partner modifies a game doc", () => {
  assert.equal(
    shouldNotifyCreatorOnMessageChange({
      changeType: "modified",
      isFirstLoad: false,
      docSender: "creatorUid",
      myUid: "creatorUid",
      nextDec: { gameData: { kind: "quiz", lastUpdatedBy: "partnerUid", completed: true } }
    }),
    true
  );
  assert.equal(
    shouldNotifyCreatorOnMessageChange({
      changeType: "modified",
      isFirstLoad: false,
      docSender: "creatorUid",
      myUid: "creatorUid",
      nextDec: { gameData: { kind: "quiz", lastUpdatedBy: "creatorUid", completed: false } }
    }),
    false
  );
  assert.equal(
    shouldNotifyCreatorOnMessageChange({
      changeType: "modified",
      isFirstLoad: false,
      docSender: "creatorUid",
      myUid: "creatorUid",
      nextDec: { questionCard: { question: "q", answer: "yes", lastUpdatedBy: "partnerUid" } }
    }),
    true
  );
});

test("resolveTwoPlayerTurn alternates turns cleanly between creator and partner", () => {
  const t1A = resolveTwoPlayerTurn({ playerA: "u1", turnSide: "A", lastMover: "", myUid: "u1" });
  assert.equal(t1A.mySym, "❤️");
  assert.equal(t1A.canMove, true);
  assert.equal(t1A.nextTurnSide, "B");

  const t1B = resolveTwoPlayerTurn({ playerA: "u1", turnSide: "A", lastMover: "", myUid: "u2" });
  assert.equal(t1B.mySym, "😘");
  assert.equal(t1B.canMove, false);

  const t2B = resolveTwoPlayerTurn({ playerA: "u1", turnSide: "B", lastMover: "u1", myUid: "u2" });
  assert.equal(t2B.canMove, true);
  assert.equal(t2B.nextTurnSide, "A");

  // Backwards-compatible fallback when turnSide is absent and lastMover is creator
  const legacyB = resolveTwoPlayerTurn({ playerA: "u1", lastMover: "u1", myUid: "u2" });
  assert.equal(legacyB.canMove, true);
  assert.equal(legacyB.currentTurnSide, "B");

  // Strict lock if slot B is already bound to u2 and u3 tries to act
  const intruder = resolveTwoPlayerTurn({ playerA: "u1", playerB: "u2", turnSide: "B", myUid: "u3" });
  assert.equal(intruder.canMove, false);
});

test("resolveLiveLudoTurnAccess enforces strict turn ownership after rolling & moving", () => {
  const gd = { kind: "ludo", playerA: "uA", playerB: "" };
  let st = createLudoState("chat");

  // Initially A's turn to roll
  const aInit = resolveLiveLudoTurnAccess(st, gd, "uA");
  const bInit = resolveLiveLudoTurnAccess(st, gd, "uB");
  assert.equal(aInit.canRoll, true);
  assert.equal(aInit.canMoveToken, false);
  assert.equal(bInit.canRoll, false);
  assert.equal(bInit.waitingForPartner, true);

  // Player A rolls 4 with all tokens locked -> turn passes immediately to B
  st = applyLudoDiceRoll(st, 4);
  assert.equal(st.turn, "B");
  const aAfter = resolveLiveLudoTurnAccess(st, gd, "uA");
  const bAfter = resolveLiveLudoTurnAccess(st, gd, "uB");
  assert.equal(aAfter.canRoll, false);
  assert.equal(aAfter.waitingForPartner, true);
  assert.equal(bAfter.canRoll, true);

  // Missing uid cannot move in a live game
  const anon = resolveLiveLudoTurnAccess(st, gd, "");
  assert.equal(anon.canRoll, false);
  assert.equal(anon.canMoveToken, false);
});

test("Score Duel creates and resolves both higher-is-better and lower-is-better live matches", () => {
  assert.ok(Object.keys(SCORE_DUEL_GAMES).length >= 8);

  // Higher is better (Heart Catcher)
  const catcherDuel = createScoreDuel({ gameKey: "catcher", playerA: "uA", scoreA: 120, detailA: "120 pts" });
  assert.equal(catcherDuel.turnSide, "B");
  assert.equal(catcherDuel.winner, "");

  // Creator A cannot submit B's turn
  assert.equal(submitScoreDuelTurn(catcherDuel, { uid: "uA", score: 200 }), null);

  // Partner B wins with higher score
  const catcherDone = submitScoreDuelTurn(catcherDuel, { uid: "uB", score: 150, detail: "150 pts" });
  assert.equal(catcherDone.winner, "B");
  assert.equal(catcherDone.playerB, "uB");
  assert.equal(catcherDone.turnSide, "");
  // Further submissions blocked
  assert.equal(submitScoreDuelTurn(catcherDone, { uid: "uB", score: 300 }), null);

  // Lower is better (Love Reflex ms)
  const reflexDuel = createScoreDuel({ gameKey: "reflex", playerA: "uA", scoreA: 240, detailA: "240 ms" });
  const reflexDone = submitScoreDuelTurn(reflexDuel, { uid: "uB", score: 310, detail: "310 ms" });
  assert.equal(reflexDone.winner, "A");

  // Draw case
  const memDuel = createScoreDuel({ gameKey: "memory", playerA: "uA", scoreA: 12, detailA: "12 moves" });
  const memDraw = submitScoreDuelTurn(memDuel, { uid: "uB", score: 12, detail: "12 moves" });
  assert.equal(memDraw.winner, "draw");
});




