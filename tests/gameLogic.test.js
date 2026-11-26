import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialTttBoard,
  applyTttMove,
  resolveRpsWinner,
  getMaskedWord,
  isWordSolved,
  countWrongGuesses,
  scoreQuizAnswers,
  isMessageExpired
} from "../shared/gameLogic.js";

test("Tic-Tac-Toe detects win and blocks occupied cells", () => {
  let b = createInitialTttBoard();
  b = applyTttMove(b, 0, "❤️").board;
  assert.equal(applyTttMove(b, 0, "😘"), null);
  b = applyTttMove(b, 4, "❤️").board;
  const res = applyTttMove(b, 8, "❤️");
  assert.equal(res.winner, "❤️");
  assert.equal(res.draw, false);
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
});

test("Couple Quiz scoring and disappearing message expiry work accurately", () => {
  const qs = [{ correct: 1 }, { correct: 0 }, { correct: 2 }];
  assert.deepEqual(scoreQuizAnswers(qs, [1, 2, 2]), { score: 2, total: 3 });

  assert.equal(isMessageExpired({ expiresAtMs: 1000 }, 1500), true);
  assert.equal(isMessageExpired({ expiresAtMs: 2000 }, 1500), false);
  assert.equal(isMessageExpired({ text: "hello" }, 1500), false);
});
