export function createInitialTttBoard() {
  return Array(9).fill("");
}

export function checkTttWinningLine(board = []) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (const line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return null;
}

export function checkTttWinner(board = []) {
  return checkTttWinningLine(board)?.winner || null;
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

// =========================================
// LUDO COUPLE EDITION (15x15 Classic Track)
// Player A = Top-Left Red/Rose (starts track 0)
// Player B = Bottom-Right Indigo/Purple (starts track 26)
// =========================================
export const LUDO_MAIN_TRACK = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
  [6, 0]
];

export const LUDO_SAFE_TRACK_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

export const LUDO_HOME_LANES = {
  A: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  B: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]]
};

export const LUDO_BASE_SLOTS = {
  A: [[1, 1], [1, 4], [4, 1], [4, 4]],
  B: [[10, 10], [10, 13], [13, 10], [13, 13]]
};

export function createLudoState(mode = "bot") {
  return {
    mode,
    tokensA: [-1, -1, -1, -1],
    tokensB: [-1, -1, -1, -1],
    turn: "A",
    dice: null,
    canMove: false,
    consecutiveSixes: 0,
    winner: "",
    statusText: "A ki baari! Dice roll karein 🎲"
  };
}

export function getLudoTrackIndex(side, progress) {
  if (progress < 0 || progress > 50) return -1;
  const offset = side === "B" ? 26 : 0;
  return (offset + progress) % 52;
}

export function getLudoGridCoord(side, progress, slotIndex = 0) {
  if (progress < 0) {
    return (LUDO_BASE_SLOTS[side] || LUDO_BASE_SLOTS.A)[slotIndex % 4];
  }
  if (progress <= 50) {
    return LUDO_MAIN_TRACK[getLudoTrackIndex(side, progress)];
  }
  if (progress <= 55) {
    return LUDO_HOME_LANES[side][progress - 51];
  }
  return side === "B" ? [7, 8] : [7, 6];
}

export function getMovableLudoTokens(tokens = [], dice = 0) {
  if (!dice || dice < 1 || dice > 6) return [];
  const movable = [];
  for (let i = 0; i < tokens.length; i++) {
    const p = tokens[i];
    if (p === 56) continue;
    if (p === -1) {
      if (dice === 6) movable.push(i);
    } else if (p + dice <= 56) {
      movable.push(i);
    }
  }
  return movable;
}

export function applyLudoDiceRoll(state, rollValue) {
  if (!state || state.winner || state.canMove) return null;
  const side = state.turn === "B" ? "B" : "A";
  const dice = Math.max(1, Math.min(6, Number(rollValue) || 1));
  const nextSixes = dice === 6 ? (state.consecutiveSixes || 0) + 1 : 0;

  if (nextSixes >= 3) {
    return {
      ...state,
      dice,
      canMove: false,
      consecutiveSixes: 0,
      turn: side === "A" ? "B" : "A",
      statusText: `Lagataar 3 chhakke (6)! Baari ${side === "A" ? "B" : "A"} ko mili`
    };
  }

  const tokens = side === "A" ? state.tokensA : state.tokensB;
  const movable = getMovableLudoTokens(tokens, dice);
  if (movable.length === 0) {
    const nextTurn = side === "A" ? "B" : "A";
    return {
      ...state,
      dice,
      canMove: false,
      consecutiveSixes: 0,
      turn: nextTurn,
      statusText: `${dice} aaya — koi chaal nahi! Ab ${nextTurn} ki baari`
    };
  }

  return {
    ...state,
    dice,
    canMove: true,
    consecutiveSixes: nextSixes,
    statusText: `${dice} aaya! Apna highlight token chunein`
  };
}

export function applyLudoTokenMove(state, tokenIdx) {
  if (!state || state.winner || !state.canMove || !state.dice) return null;
  const side = state.turn === "B" ? "B" : "A";
  const oppSide = side === "A" ? "B" : "A";
  const myTokens = [...(side === "A" ? state.tokensA : state.tokensB)];
  const oppTokens = [...(oppSide === "A" ? state.tokensA : state.tokensB)];
  const movable = getMovableLudoTokens(myTokens, state.dice);
  if (!movable.includes(tokenIdx)) return null;

  const cur = myTokens[tokenIdx];
  const nextPos = cur === -1 ? 0 : cur + state.dice;
  myTokens[tokenIdx] = nextPos;

  let captured = false;
  if (nextPos >= 0 && nextPos <= 50) {
    const landedTrack = getLudoTrackIndex(side, nextPos);
    if (!LUDO_SAFE_TRACK_INDICES.has(landedTrack)) {
      for (let i = 0; i < oppTokens.length; i++) {
        const op = oppTokens[i];
        if (op >= 0 && op <= 50 && getLudoTrackIndex(oppSide, op) === landedTrack) {
          oppTokens[i] = -1;
          captured = true;
        }
      }
    }
  }

  const finishedNow = nextPos === 56;
  const won = myTokens.every(p => p === 56);
  const bonusTurn = !won && (state.dice === 6 || captured || finishedNow);
  const nextTurn = won ? side : (bonusTurn ? side : oppSide);

  let statusText = "";
  if (won) statusText = `${side === "A" ? "❤️ Janan" : "😘 Partner"} Ludo jeet gaya! 🏆🎉`;
  else if (captured) statusText = `💥 Token pakad liya! ${side} ko bonus turn mila!`;
  else if (finishedNow) statusText = `🏠 Ek token Ghar pahunch gaya! Bonus turn!`;
  else if (bonusTurn) statusText = `🎲 6 aaya! Dobara roll karein`;
  else statusText = `Ab ${nextTurn === "A" ? "❤️ A" : "😘 B"} ki baari`;

  return {
    ...state,
    tokensA: side === "A" ? myTokens : oppTokens,
    tokensB: side === "B" ? myTokens : oppTokens,
    turn: nextTurn,
    canMove: false,
    consecutiveSixes: bonusTurn ? state.consecutiveSixes : 0,
    winner: won ? side : "",
    statusText,
    captured
  };
}

export function pickBotLudoToken(state) {
  if (!state || !state.canMove || !state.dice) return -1;
  const side = state.turn === "B" ? "B" : "A";
  const oppSide = side === "A" ? "B" : "A";
  const myTokens = side === "A" ? state.tokensA : state.tokensB;
  const oppTokens = oppSide === "A" ? state.tokensA : state.tokensB;
  const movable = getMovableLudoTokens(myTokens, state.dice);
  if (!movable.length) return -1;

  let bestIdx = movable[0];
  let bestScore = -1e9;

  for (const idx of movable) {
    const cur = myTokens[idx];
    const nextPos = cur === -1 ? 0 : cur + state.dice;
    let score = nextPos;

    if (nextPos === 56) score += 500;
    else if (cur === -1) score += 260;

    if (nextPos >= 0 && nextPos <= 50) {
      const tIdx = getLudoTrackIndex(side, nextPos);
      if (LUDO_SAFE_TRACK_INDICES.has(tIdx)) score += 120;
      else {
        const canCapture = oppTokens.some(
          op => op >= 0 && op <= 50 && getLudoTrackIndex(oppSide, op) === tIdx
        );
        if (canCapture) score += 420;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  }
  return bestIdx;
}

// =========================================
// CONNECT 4 DIL (7 cols x 6 rows)
// =========================================
export function createConnect4Board() {
  return Array(42).fill("");
}

export function checkConnect4WinningLine(board = []) {
  const rows = 6;
  const cols = 7;
  const at = (r, c) => (r >= 0 && r < rows && c >= 0 && c < cols ? board[r * cols + c] : "");
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sym = at(r, c);
      if (!sym) continue;
      for (const [dr, dc] of dirs) {
        if (
          at(r + dr, c + dc) === sym &&
          at(r + 2 * dr, c + 2 * dc) === sym &&
          at(r + 3 * dr, c + 3 * dc) === sym
        ) {
          return {
            winner: sym,
            cells: [
              r * cols + c,
              (r + dr) * cols + (c + dc),
              (r + 2 * dr) * cols + (c + 2 * dc),
              (r + 3 * dr) * cols + (c + 3 * dc)
            ]
          };
        }
      }
    }
  }
  return null;
}

export function checkConnect4Winner(board = []) {
  return checkConnect4WinningLine(board)?.winner || null;
}

export function dropConnect4Disc(board = [], col, symbol) {
  if (!Array.isArray(board) || board.length !== 42 || col < 0 || col > 6 || !symbol) return null;
  const cols = 7;
  let targetRow = -1;
  for (let r = 5; r >= 0; r--) {
    if (!board[r * cols + col]) {
      targetRow = r;
      break;
    }
  }
  if (targetRow === -1) return null;
  const next = [...board];
  next[targetRow * cols + col] = symbol;
  const winner = checkConnect4Winner(next);
  const draw = !winner && next.every(Boolean);
  return { board: next, row: targetRow, col, winner, draw };
}

// =========================================
// DOTS & BOXES (3x3 Boxes = 12 H + 12 V edges)
// =========================================
export function createDotsBoxesState() {
  return {
    hEdges: Array(12).fill(""),
    vEdges: Array(12).fill(""),
    boxes: Array(9).fill(""),
    scoreA: 0,
    scoreB: 0,
    turn: "A",
    winner: ""
  };
}

export function claimDotsEdge(state, type, idx, playerSide) {
  if (!state || state.winner) return null;
  const side = playerSide === "B" ? "B" : "A";
  const hEdges = [...(state.hEdges || Array(12).fill(""))];
  const vEdges = [...(state.vEdges || Array(12).fill(""))];
  const boxes = [...(state.boxes || Array(9).fill(""))];

  if (type === "h") {
    if (idx < 0 || idx >= 12 || hEdges[idx]) return null;
    hEdges[idx] = side;
  } else if (type === "v") {
    if (idx < 0 || idx >= 12 || vEdges[idx]) return null;
    vEdges[idx] = side;
  } else {
    return null;
  }

  let completedNow = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const bIdx = r * 3 + c;
      if (boxes[bIdx]) continue;
      const top = hEdges[r * 3 + c];
      const bottom = hEdges[(r + 1) * 3 + c];
      const left = vEdges[r * 4 + c];
      const right = vEdges[r * 4 + c + 1];
      if (top && bottom && left && right) {
        boxes[bIdx] = side;
        completedNow++;
      }
    }
  }

  const scoreA = boxes.filter(b => b === "A").length;
  const scoreB = boxes.filter(b => b === "B").length;
  const done = boxes.every(Boolean);
  let winner = "";
  if (done) {
    winner = scoreA === scoreB ? "draw" : (scoreA > scoreB ? "A" : "B");
  }

  return {
    ...state,
    hEdges,
    vEdges,
    boxes,
    scoreA,
    scoreB,
    turn: completedNow > 0 || done ? side : (side === "A" ? "B" : "A"),
    winner,
    completedNow
  };
}

// =========================================
// DIL KA LOCK (Mastermind Emoji Code Cracker)
// =========================================
export function evaluateCodeGuess(secret = [], guess = []) {
  const len = secret.length;
  if (!len || guess.length !== len) return { exact: 0, partial: 0, solved: false };
  let exact = 0;
  const remSecret = [];
  const remGuess = [];
  for (let i = 0; i < len; i++) {
    if (secret[i] === guess[i]) {
      exact++;
    } else {
      remSecret.push(secret[i]);
      remGuess.push(guess[i]);
    }
  }
  let partial = 0;
  for (const g of remGuess) {
    const pos = remSecret.indexOf(g);
    if (pos !== -1) {
      partial++;
      remSecret.splice(pos, 1);
    }
  }
  return { exact, partial, solved: exact === len };
}

// =========================================
// COUPLE 2048 HEART MERGE (Mushkil Strategy)
// =========================================
function spawn2048Tile(board) {
  const empties = [];
  for (let i = 0; i < 16; i++) {
    if (!board[i]) empties.push(i);
  }
  if (!empties.length) return board;
  const pick = empties[Math.floor(Math.random() * empties.length)];
  const next = [...board];
  next[pick] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

export function create2048Board() {
  let b = Array(16).fill(0);
  b = spawn2048Tile(b);
  b = spawn2048Tile(b);
  return b;
}

export function can2048Move(board = []) {
  for (let i = 0; i < 16; i++) {
    if (!board[i]) return true;
    const r = Math.floor(i / 4);
    const c = i % 4;
    if (c < 3 && board[i] === board[i + 1]) return true;
    if (r < 3 && board[i] === board[i + 4]) return true;
  }
  return false;
}

function slideLineLeft(line) {
  const vals = line.filter(v => v > 0);
  const out = [];
  let gained = 0;
  for (let i = 0; i < vals.length; i++) {
    if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
      const merged = vals[i] * 2;
      out.push(merged);
      gained += merged;
      i++;
    } else {
      out.push(vals[i]);
    }
  }
  while (out.length < 4) out.push(0);
  return { line: out, gained };
}

export function slide2048Board(board = [], dir = "left", spawn = true) {
  if (!Array.isArray(board) || board.length !== 16) return null;
  const next = Array(16).fill(0);
  let totalGained = 0;

  for (let i = 0; i < 4; i++) {
    const line = [];
    for (let j = 0; j < 4; j++) {
      let idx = 0;
      if (dir === "left") idx = i * 4 + j;
      else if (dir === "right") idx = i * 4 + (3 - j);
      else if (dir === "up") idx = j * 4 + i;
      else if (dir === "down") idx = (3 - j) * 4 + i;
      line.push(board[idx]);
    }
    const { line: slid, gained } = slideLineLeft(line);
    totalGained += gained;
    for (let j = 0; j < 4; j++) {
      let idx = 0;
      if (dir === "left") idx = i * 4 + j;
      else if (dir === "right") idx = i * 4 + (3 - j);
      else if (dir === "up") idx = j * 4 + i;
      else if (dir === "down") idx = (3 - j) * 4 + i;
      next[idx] = slid[j];
    }
  }

  const changed = next.some((v, idx) => v !== board[idx]);
  if (!changed) return { board, gained: 0, changed: false, won: false, gameOver: !can2048Move(board) };

  const finalBoard = spawn ? spawn2048Tile(next) : next;
  const won = finalBoard.some(v => v >= 2048);
  const gameOver = !can2048Move(finalBoard);
  return { board: finalBoard, gained: totalGained, changed: true, won, gameOver };
}

// =========================================
// SMART COUPLE BOT AI FOR INSTANT PLAY
// =========================================
export function pickTttBotMove(board = [], botSym = "😘", oppSym = "❤️") {
  const empty = [];
  for (let i = 0; i < 9; i++) {
    if (!board[i]) empty.push(i);
  }
  if (!empty.length) return -1;
  for (const idx of empty) {
    if (applyTttMove(board, idx, botSym)?.winner === botSym) return idx;
  }
  for (const idx of empty) {
    if (applyTttMove(board, idx, oppSym)?.winner === oppSym) return idx;
  }
  if (!board[4]) return 4;
  const corners = [0, 2, 6, 8].filter(i => !board[i]);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)];
}

export function pickConnect4BotCol(board = [], botSym = "😘", oppSym = "❤️") {
  const order = [3, 2, 4, 1, 5, 0, 6];
  const valid = order.filter(c => dropConnect4Disc(board, c, botSym) !== null);
  if (!valid.length) return -1;
  for (const col of valid) {
    if (dropConnect4Disc(board, col, botSym)?.winner === botSym) return col;
  }
  for (const col of valid) {
    if (dropConnect4Disc(board, col, oppSym)?.winner === oppSym) return col;
  }
  return valid[0];
}

export function pickDotsBotEdge(state) {
  if (!state || state.winner) return null;
  const candidates = [];
  for (let i = 0; i < 12; i++) {
    if (!state.hEdges?.[i]) candidates.push({ type: "h", idx: i });
    if (!state.vEdges?.[i]) candidates.push({ type: "v", idx: i });
  }
  if (!candidates.length) return null;

  // 1. Prefer edges that complete a box
  for (const cand of candidates) {
    const res = claimDotsEdge(state, cand.type, cand.idx, "B");
    if (res && res.completedNow > 0) return cand;
  }
  // 2. Avoid giving opponent a 3-sided box
  const safe = candidates.filter(cand => {
    const res = claimDotsEdge(state, cand.type, cand.idx, "B");
    if (!res) return false;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (res.boxes[r * 3 + c]) continue;
        const sides = [
          res.hEdges[r * 3 + c],
          res.hEdges[(r + 1) * 3 + c],
          res.vEdges[r * 4 + c],
          res.vEdges[r * 4 + c + 1]
        ].filter(Boolean).length;
        if (sides === 3) return false;
      }
    }
    return true;
  });
  const pool = safe.length ? safe : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

export const ROMANTIC_WORD_BANK = [
  { word: "ZARGOO", hint: "Pyara sa special nickname 💖" },
  { word: "JANAN", hint: "Dil ka sabse kareeb lafz ❤️" },
  { word: "MOHABBAT", hint: "Jo sirf tumse hai 🌹" },
  { word: "CHANDNI", hint: "Raat ki pyari roshni 🌙" },
  { word: "MUSKAN", hint: "Tumhari sabse pyari cheez 😊" },
  { word: "SAATHI", hint: "Humesha haath thaamne wala 🫶🏻" },
  { word: "KHWAB", hint: "Jo aankhon mein saja hai ✨" },
  { word: "WAADA", hint: "Jo kabhi nahi tootega 💍" },
  { word: "ISHQ", hint: "Sabse gehra ehsaas 💓" },
  { word: "SUKOON", hint: "Tumse baat karke jo milta hai 🤍" },
  { word: "DHADKAN", hint: "Jo tumhare naam par chalti hai 💘" },
  { word: "SITARAY", hint: "Aasmaan mein chamakte hue ✨" },
  { word: "BARISH", hint: "Romantic mausam aur chai 🌧️" },
  { word: "JHAPPI", hint: "Pyari si tight hug 🤗" },
  { word: "SHAYARI", hint: "Dil ki baatein lafzon mein 💌" },
  { word: "GULAB", hint: "Mohabbat ka phool 🌹" },
  { word: "HUMSAFAR", hint: "Zindagi bhar ka saath 🛤️" },
  { word: "MASOOM", hint: "Tumhari pyari si aankhein 🥺" },
  { word: "YAADEIN", hint: "Meethe pal jo dil mein hain 🎀" },
  { word: "CHOCOLATE", hint: "Meetha sa surprise 🍫" },
  { word: "PARI", hint: "Sabse pyari dulhan jaisi 🦋" },
  { word: "JAADU", hint: "Tumhari ek smile ka asar ✨" },
  { word: "ROSHNI", hint: "Andhere mein ujale jaisi 💡" },
  { word: "AASHIQ", hint: "Jo har waqt yaad kare 😘" }
];

// =========================================
// SLIDING LOVE PUZZLE (N-Puzzle 3x3 / 4x4)
// =========================================
export function isSlidingSolved(board = []) {
  for (let i = 0; i < board.length - 1; i++) {
    if (board[i] !== i + 1) return false;
  }
  return board[board.length - 1] === 0;
}

export function isSlidingSolvable(board = [], size = 3) {
  let inv = 0;
  for (let i = 0; i < board.length; i++) {
    if (!board[i]) continue;
    for (let j = i + 1; j < board.length; j++) {
      if (board[j] && board[i] > board[j]) inv++;
    }
  }
  if (size % 2 === 1) {
    return inv % 2 === 0;
  }
  const emptyRowFromTop = Math.floor(board.indexOf(0) / size);
  const emptyRowFromBottom = size - emptyRowFromTop;
  return (emptyRowFromBottom % 2 === 1) ? (inv % 2 === 0) : (inv % 2 === 1);
}

export function createSlidingPuzzle(size = 3) {
  const n = size === 4 ? 4 : 3;
  const total = n * n;
  const arr = Array.from({ length: total - 1 }, (_, i) => i + 1).concat(0);
  // Make guaranteed solvable non-trivial shuffle
  for (let tries = 0; tries < 40; tries++) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    if (isSlidingSolvable(arr, n) && !isSlidingSolved(arr)) {
      return arr;
    }
  }
  // Deterministic fallback swap of first two non-zero tiles preserves or flips parity cleanly
  const solved = Array.from({ length: total - 1 }, (_, i) => i + 1).concat(0);
  // 2 legal moves from solved guarantees solvable
  let state = [...solved];
  state = moveSlidingTile(state, n, total - 2) || state;
  state = moveSlidingTile(state, n, total - 2 - n) || state;
  return state;
}

export function moveSlidingTile(board = [], size = 3, tileIdx = -1) {
  const n = size === 4 ? 4 : 3;
  const emptyIdx = board.indexOf(0);
  if (emptyIdx < 0 || tileIdx < 0 || tileIdx >= n * n || tileIdx === emptyIdx) return null;
  const r1 = Math.floor(tileIdx / n);
  const c1 = tileIdx % n;
  const r2 = Math.floor(emptyIdx / n);
  const c2 = emptyIdx % n;
  if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return null;
  const next = [...board];
  next[emptyIdx] = next[tileIdx];
  next[tileIdx] = 0;
  return next;
}

// =========================================
// LOVE SNAKE ENGINE (Grid 14x14)
// =========================================
export function spawnSnakeApple(snake = [], gridSize = 14) {
  const occupied = new Set(snake.map(s => `${s.x},${s.y}`));
  const free = [];
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (!free.length) return { x: 0, y: 0, gold: false };
  const pick = free[Math.floor(Math.random() * free.length)];
  return { ...pick, gold: Math.random() < 0.22 };
}

export function createSnakeState(gridSize = 14) {
  const mid = Math.floor(gridSize / 2);
  const snake = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid }
  ];
  return {
    snake,
    dir: "right",
    apple: spawnSnakeApple(snake, gridSize),
    score: 0,
    alive: true,
    won: false
  };
}

export function stepSnakeState(state, nextDir, gridSize = 14) {
  if (!state || !state.alive) return state;
  const opp = { up: "down", down: "up", left: "right", right: "left" };
  const dir = nextDir && opp[state.dir] !== nextDir ? nextDir : state.dir;
  const head = state.snake[0];
  let nx = head.x;
  let ny = head.y;
  if (dir === "up") ny--;
  else if (dir === "down") ny++;
  else if (dir === "left") nx--;
  else nx++;

  if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) {
    return { ...state, dir, alive: false };
  }

  const ate = state.apple && nx === state.apple.x && ny === state.apple.y;
  const bodyToCheck = ate ? state.snake : state.snake.slice(0, -1);
  if (bodyToCheck.some(seg => seg.x === nx && seg.y === ny)) {
    return { ...state, dir, alive: false };
  }

  const nextSnake = [{ x: nx, y: ny }, ...(ate ? state.snake : state.snake.slice(0, -1))];
  const gained = ate ? (state.apple.gold ? 3 : 1) : 0;
  const won = nextSnake.length >= gridSize * gridSize;
  const nextApple = ate && !won ? spawnSnakeApple(nextSnake, gridSize) : state.apple;

  return {
    snake: nextSnake,
    dir,
    apple: nextApple,
    score: state.score + gained,
    alive: !won,
    won,
    ate
  };
}

// =========================================
// CREATOR NOTIFICATION DETECTOR FOR CHAT GAMES
// =========================================
export function shouldNotifyCreatorOnMessageChange({
  changeType = "modified",
  isFirstLoad = false,
  docSender = "",
  myUid = "",
  nextDec = null
} = {}) {
  if (isFirstLoad || !myUid || !nextDec || typeof nextDec !== "object") return false;
  if (changeType !== "modified") return false;

  const gd = nextDec.gameData;
  if (gd && gd.lastUpdatedBy && gd.lastUpdatedBy !== myUid) {
    return true;
  }
  const qc = nextDec.questionCard;
  if (qc && qc.lastUpdatedBy && qc.lastUpdatedBy !== myUid) {
    return true;
  }
  // Fallback: if creator originally sent the doc and partner updated without lastUpdatedBy
  if (docSender === myUid && (qc?.answer || gd?.replyText || gd?.completed || gd?.solved || gd?.winner || gd?.pickedIdx >= 0)) {
    return true;
  }
  return false;
}

// =========================================
// TWO-PLAYER LIVE BOARD TURN OWNERSHIP
// =========================================
export function resolveTwoPlayerTurn({
  playerA = "",
  playerB = "",
  turnSide = "",
  lastMover = "",
  myUid = "",
  finished = false
} = {}) {
  const hasUid = Boolean(myUid);
  const isPlayerA = Boolean(hasUid && playerA && playerA === myUid);
  const mySide = isPlayerA ? "A" : "B";
  const mySym = isPlayerA ? "❤️" : "😘";
  let currentTurnSide = turnSide === "A" || turnSide === "B" ? turnSide : "";
  if (!currentTurnSide) {
    if (!lastMover) currentTurnSide = "A";
    else currentTurnSide = lastMover === playerA ? "B" : "A";
  }
  const slotTakenByOther = Boolean(
    hasUid && !isPlayerA && playerB && playerB !== myUid
  );
  const canMove = !finished && hasUid && !slotTakenByOther && currentTurnSide === mySide;
  const nextTurnSide = currentTurnSide === "A" ? "B" : "A";
  return {
    mySide,
    mySym,
    currentTurnSide,
    nextTurnSide,
    canMove
  };
}

// =========================================
// LIVE LUDO STRICT TURN ACCESS
// =========================================
export function resolveLiveLudoTurnAccess(ludoState, gameData = null, myUid = "") {
  if (!ludoState || typeof ludoState !== "object") {
    return {
      isLive: false,
      mySide: "",
      currentTurn: "A",
      canRoll: false,
      canMoveToken: false,
      waitingForPartner: false,
      winner: ""
    };
  }
  const currentTurn = ludoState.turn === "B" ? "B" : "A";
  const winner = ludoState.winner || "";
  const isLive = Boolean(gameData && gameData.kind === "ludo");

  if (!isLive) {
    const mode = ludoState.mode || "bot";
    const mySide = mode === "bot" ? "A" : currentTurn;
    const isMyTurn = !winner && (mode !== "bot" || currentTurn === "A");
    return {
      isLive: false,
      mySide,
      currentTurn,
      canRoll: isMyTurn && !ludoState.canMove,
      canMoveToken: isMyTurn && Boolean(ludoState.canMove),
      waitingForPartner: !winner && mode === "bot" && currentTurn === "B",
      winner
    };
  }

  const playerA = gameData.playerA || "";
  const playerB = gameData.playerB || "";
  if (!myUid || !playerA) {
    return {
      isLive: true,
      mySide: "",
      currentTurn,
      canRoll: false,
      canMoveToken: false,
      waitingForPartner: !winner,
      winner
    };
  }
  const isPlayerA = myUid === playerA;
  if (!isPlayerA && playerB && playerB !== myUid) {
    return {
      isLive: true,
      mySide: "",
      currentTurn,
      canRoll: false,
      canMoveToken: false,
      waitingForPartner: !winner,
      winner
    };
  }
  const mySide = isPlayerA ? "A" : "B";
  const isMyTurn = !winner && currentTurn === mySide;
  return {
    isLive: true,
    mySide,
    currentTurn,
    canRoll: isMyTurn && !ludoState.canMove,
    canMoveToken: isMyTurn && Boolean(ludoState.canMove),
    waitingForPartner: !winner && currentTurn !== mySide,
    winner
  };
}

// =========================================
// 2-PLAYER LIVE SCORE DUEL HELPERS (ARCADE & PUZZLES)
// =========================================
export const SCORE_DUEL_GAMES = {
  pop: { title: "Heart Pop Rush (15s)", unit: "pts", lowerIsBetter: false, subtab: "easy:pop" },
  g2048: { title: "Couple 2048 Heart Merge", unit: "pts", lowerIsBetter: false, subtab: "hard:2048" },
  puzzle: { title: "Sliding Love Puzzle", unit: "moves", lowerIsBetter: true, subtab: "hard:puzzle" },
  catcher: { title: "Heart Catcher", unit: "pts", lowerIsBetter: false, subtab: "arcade:catcher" },
  snake: { title: "Love Snake", unit: "pts", lowerIsBetter: false, subtab: "arcade:snake" },
  breaker: { title: "Dil Brick Breaker", unit: "pts", lowerIsBetter: false, subtab: "arcade:breaker" },
  memory: { title: "Heart Memory Match", unit: "moves", lowerIsBetter: true, subtab: "arcade:memory" },
  reflex: { title: "Love Reflex Duel", unit: "ms", lowerIsBetter: true, subtab: "arcade:reflex" }
};

export function createScoreDuel({
  gameKey = "pop",
  title = "",
  subtab = "",
  lowerIsBetter,
  unit,
  playerA = "",
  scoreA = 0,
  detailA = ""
} = {}) {
  const meta = SCORE_DUEL_GAMES[gameKey] || SCORE_DUEL_GAMES.pop;
  const numScore = Number(scoreA) || 0;
  return {
    kind: "score_duel",
    gameKey,
    title: title || meta.title,
    challengeSubtab: subtab || meta.subtab,
    lowerIsBetter: typeof lowerIsBetter === "boolean" ? lowerIsBetter : meta.lowerIsBetter,
    unit: unit || meta.unit,
    playerA,
    playerB: "",
    scoreA: numScore,
    detailA: detailA || `${numScore} ${unit || meta.unit}`,
    scoreB: null,
    detailB: "",
    turnSide: "B",
    winner: ""
  };
}

export function submitScoreDuelTurn(gd, { uid = "", score = 0, detail = "" } = {}) {
  if (!gd || gd.kind !== "score_duel" || gd.winner) return null;
  if (!uid || (gd.playerA && uid === gd.playerA)) return null;
  if (gd.playerB && gd.playerB !== uid) return null;

  const scoreA = Number(gd.scoreA);
  const scoreB = Number(score);
  const lowerWins = Boolean(gd.lowerIsBetter);
  let winner = "draw";
  if (scoreA !== scoreB) {
    if (lowerWins) {
      winner = scoreA < scoreB ? "A" : "B";
    } else {
      winner = scoreA > scoreB ? "A" : "B";
    }
  }
  const unit = gd.unit || "pts";
  const detailB = detail || `${scoreB} ${unit}`;
  const winText = winner === "draw"
    ? `🤝 Barabar! (${gd.detailA} vs ${detailB})`
    : `🏆 ${winner === "A" ? "❤️ Player A" : "😘 Partner B"} Jeet gaya! (${gd.detailA} vs ${detailB})`;

  return {
    ...gd,
    playerB: uid,
    scoreB,
    detailB,
    turnSide: "",
    winner,
    lastUpdatedBy: uid,
    lastActionText: `${gd.title}: ${winText}`
  };
}




