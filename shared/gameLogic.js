export function createInitialTttBoard() {
  return Array(9).fill("");
}

export function checkTttWinner(board = []) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

export function isTttBoardFull(board = []) {
  return board.length === 9 && board.every(Boolean);
}

export function applyTttMove(board = [], index, symbol) {
  if (!Array.isArray(board) || index < 0 || index > 8 || board[index]) return null;
  const next = [...board];
  next[index] = symbol;
  return {
    board: next,
    winner: checkTttWinner(next),
    draw: !checkTttWinner(next) && isTttBoardFull(next)
  };
}

export function resolveRpsWinner(moveA, moveB) {
  if (!moveA || !moveB) return null;
  if (moveA === moveB) return "draw";
  if (
    (moveA === "rose" && moveB === "scissors") ||
    (moveA === "scissors" && moveB === "letter") ||
    (moveA === "letter" && moveB === "rose")
  ) {
    return "A";
  }
  return "B";
}

export function normalizeWordGuess(word = "") {
  return String(word || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 14);
}

export function getMaskedWord(word = "", guessedLetters = []) {
  const clean = normalizeWordGuess(word);
  const set = new Set((guessedLetters || []).map(l => String(l).toUpperCase()));
  return clean.split("").map(ch => (set.has(ch) ? ch : "_")).join(" ");
}

export function isWordSolved(word = "", guessedLetters = []) {
  const clean = normalizeWordGuess(word);
  if (!clean) return false;
  const set = new Set((guessedLetters || []).map(l => String(l).toUpperCase()));
  return clean.split("").every(ch => set.has(ch));
}

export function countWrongGuesses(word = "", guessedLetters = []) {
  const clean = normalizeWordGuess(word);
  const wordChars = new Set(clean.split(""));
  let wrong = 0;
  for (const l of new Set((guessedLetters || []).map(x => String(x).toUpperCase()))) {
    if (!wordChars.has(l)) wrong++;
  }
  return wrong;
}

export function scoreQuizAnswers(questions = [], partnerAnswers = []) {
  let score = 0;
  for (let i = 0; i < questions.length; i++) {
    if (String(questions[i]?.correct ?? "") === String(partnerAnswers[i] ?? "")) {
      score++;
    }
  }
  return { score, total: questions.length };
}

export function isMessageExpired(dec, nowMs = Date.now()) {
  if (!dec || !dec.expiresAtMs) return false;
  return Number(dec.expiresAtMs) <= nowMs;
}
