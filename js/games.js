import { escapeHtml, playEmotionSound } from "./crypto.js";
import {
  createInitialTttBoard,
  applyTttMove,
  resolveRpsWinner,
  normalizeWordGuess,
  getMaskedWord,
  isWordSolved,
  countWrongGuesses,
  scoreQuizAnswers
} from "../shared/gameLogic.js";

const TRUTH_DARE_PROMPTS = [
  { type: "Truth", prompt: "Meri kaunsi ek aadat tumhe sabse zyada pyari lagti hai?" },
  { type: "Truth", prompt: "Humari pehli baat ya pehli mulaqat ka kaunsa pal sabse yaadgar hai?" },
  { type: "Dare", prompt: "Abhi ek cute si smile selfie ya pyaara voice note bhejo 😘" },
  { type: "Dare", prompt: "Mere liye 2 line ki pyari shayari ya tareef likh kar bhejo 💌" },
  { type: "Promise", prompt: "Waada karo jab bhi mood off hoga, chup rehne ke bajaye mujhe bataoge 🫶🏻" },
  { type: "Promise", prompt: "Agli baar milne par ek lamba tight hug pakka 🤗💖" }
];

const QUIZ_PRESETS = [
  {
    q: "Jab main udaas hota/hoti hoon to mujhe kya chahiye?",
    opts: ["Pyari baatein & hug 🤗", "Thoda time akela 🌙", "Chocolate / chai 🍫"]
  },
  {
    q: "Mera favourite time tumhare saath kya hai?",
    opts: ["Raat ki lambi baatein 🌙", "Video call par hansna 📹", "Chote pyare surprises 🎁"]
  },
  {
    q: "Agar main gussa ho jaun to best tareeqa?",
    opts: ["Pyar se mana lena 😘", "Sorry + cute gift 🧸", "Voice note bhejna 🎤"]
  }
];

const MEMORY_EMOJIS = ["❤️", "😘", "🌹", "🧸", "🍫", "💍"];

export function createGamesManager({ getAuth, chat }) {
  const modal = document.getElementById("games-modal");
  const openBtn = document.getElementById("games-btn");
  const closeBtn = document.getElementById("close-games-btn");
  const setupArea = document.getElementById("game-setup-area");
  const memoryBoard = document.getElementById("memory-game-board");
  const memoryStatus = document.getElementById("memory-game-status");

  let memCards = [];
  let memFlipped = [];
  let memMatched = new Set();
  let memMoves = 0;
  let memStartMs = 0;
  let memLock = false;

  function myUid() {
    return getAuth()?.currentUser?.uid || "";
  }

  function showTab(tabKey) {
    modal.querySelectorAll("[data-game-tab]").forEach(b => {
      b.classList.toggle("active", b.dataset.gameTab === tabKey);
    });
    modal.querySelectorAll("[data-game-pane]").forEach(p => {
      p.style.display = p.dataset.gamePane === tabKey ? "flex" : "none";
    });
    if (tabKey === "memory" && !memCards.length) {
      startMemoryGame();
    }
  }

  function startMemoryGame() {
    const deck = [...MEMORY_EMOJIS, ...MEMORY_EMOJIS].sort(() => Math.random() - 0.5);
    memCards = deck;
    memFlipped = [];
    memMatched = new Set();
    memMoves = 0;
    memStartMs = Date.now();
    memLock = false;
    renderMemoryBoard();
  }

  function renderMemoryBoard() {
    if (!memoryBoard) return;
    memoryBoard.innerHTML = "";
    memCards.forEach((em, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      const isOpen = memFlipped.includes(idx) || memMatched.has(idx);
      btn.className = "mem-card" + (isOpen ? " open" : "") + (memMatched.has(idx) ? " matched" : "");
      btn.innerText = isOpen ? em : "💖";
      btn.onclick = () => {
        if (memLock || memMatched.has(idx) || memFlipped.includes(idx)) return;
        memFlipped.push(idx);
        renderMemoryBoard();
        if (memFlipped.length === 2) {
          memMoves++;
          const [a, b] = memFlipped;
          if (memCards[a] === memCards[b]) {
            memMatched.add(a);
            memMatched.add(b);
            memFlipped = [];
            playEmotionSound("happy");
            renderMemoryBoard();
            if (memMatched.size === memCards.length) {
              const sec = Math.max(1, Math.round((Date.now() - memStartMs) / 1000));
              memoryStatus.innerText = `Jeet gaye! 🎉 ${memMoves} moves • ${sec}s`;
            }
          } else {
            memLock = true;
            setTimeout(() => {
              memFlipped = [];
              memLock = false;
              renderMemoryBoard();
            }, 650);
          }
        }
      };
      memoryBoard.appendChild(btn);
    });
    if (memMatched.size < memCards.length) {
      memoryStatus.innerText = `Pairs: ${memMatched.size / 2}/${MEMORY_EMOJIS.length} • Moves: ${memMoves}`;
    }
  }

  modal?.querySelectorAll("[data-game-tab]").forEach(btn => {
    btn.addEventListener("click", () => showTab(btn.dataset.gameTab));
  });

  openBtn?.addEventListener("click", () => {
    showTab("quick");
    modal.style.display = "flex";
  });
  closeBtn?.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // 1. Send Tic-Tac-Toe
  document.getElementById("start-ttt-btn")?.addEventListener("click", async () => {
    const uid = myUid();
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "ttt",
        title: "Pyar Wala Tic-Tac-Toe",
        board: createInitialTttBoard(),
        playerA: uid,
        playerB: "",
        turnUid: "",
        lastMover: uid,
        winnerSymbol: "",
        draw: false
      }
    }, "letter");
  });

  // 2. Rose-Letter-Scissors Challenge
  modal?.querySelectorAll("[data-rps-start]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const moveA = btn.dataset.rpsStart;
      const uid = myUid();
      modal.style.display = "none";
      playEmotionSound("love");
      await chat.sendEncryptedMessage({
        gameData: {
          kind: "rps",
          title: "Rose • Letter • Scissors",
          playerA: uid,
          moveA,
          playerB: "",
          moveB: "",
          winner: ""
        }
      }, "letter");
    });
  });

  // 3. Truth / Dare / Waada Spin
  document.getElementById("spin-tdw-btn")?.addEventListener("click", async () => {
    const pick = TRUTH_DARE_PROMPTS[Math.floor(Math.random() * TRUTH_DARE_PROMPTS.length)];
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "tdw",
        title: `${pick.type} Card`,
        cardType: pick.type,
        prompt: pick.prompt,
        replyText: ""
      }
    }, "letter");
  });

  // 4. Send Compatibility Quiz
  const quizForm = document.getElementById("quiz-creator-list");
  if (quizForm) {
    quizForm.innerHTML = "";
    QUIZ_PRESETS.forEach((item, idx) => {
      const box = document.createElement("div");
      box.className = "quiz-setup-item";
      box.innerHTML = `<div class="quiz-q-label">${idx + 1}. ${escapeHtml(item.q)}</div>`;
      const sel = document.createElement("select");
      sel.className = "care-input";
      sel.dataset.quizIdx = String(idx);
      item.opts.forEach((opt, oi) => {
        const o = document.createElement("option");
        o.value = String(oi);
        o.textContent = opt;
        sel.appendChild(o);
      });
      box.appendChild(sel);
      quizForm.appendChild(box);
    });
  }

  document.getElementById("send-quiz-btn")?.addEventListener("click", async () => {
    const uid = myUid();
    const selects = quizForm?.querySelectorAll("select") || [];
    const questions = QUIZ_PRESETS.map((item, idx) => ({
      q: item.q,
      opts: item.opts,
      correct: Number(selects[idx]?.value || 0)
    }));
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "quiz",
        title: "Kaun Behtar Jaanta Hai?",
        creator: uid,
        questions,
        partnerAnswers: [],
        completed: false,
        score: 0
      }
    }, "letter");
  });

  // 5. Send Secret Word Boojho
  document.getElementById("send-wordgame-btn")?.addEventListener("click", async () => {
    const wInput = document.getElementById("wordgame-word-input");
    const hInput = document.getElementById("wordgame-hint-input");
    const word = normalizeWordGuess(wInput?.value || "");
    const hint = (hInput?.value || "").trim() || "Pyara sa lafz";
    if (word.length < 2) {
      if (setupArea) {
        const err = document.getElementById("wordgame-err");
        if (err) err.innerText = "Kam se kam 2 English letters likhein (e.g. JANAN)";
      }
      return;
    }
    wInput.value = "";
    hInput.value = "";
    const err = document.getElementById("wordgame-err");
    if (err) err.innerText = "";
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "word",
        title: "Secret Word Boojho",
        creator: myUid(),
        word,
        hint,
        guessed: []
      }
    }, "letter");
  });

  // 6. Memory Match Restart & Share Score
  document.getElementById("memory-restart-btn")?.addEventListener("click", startMemoryGame);
  document.getElementById("memory-share-btn")?.addEventListener("click", async () => {
    const sec = Math.max(1, Math.round((Date.now() - memStartMs) / 1000));
    const solved = memMatched.size === memCards.length;
    modal.style.display = "none";
    playEmotionSound("happy");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "memory_score",
        title: "Heart Memory Match",
        moves: memMoves,
        seconds: sec,
        solved
      }
    }, "letter");
  });

  // Render interactive game bubble inside chat
  function renderGameBubble(m) {
    const dec = m.decrypted || {};
    const gd = dec.gameData || {};
    const uid = myUid();
    const box = document.createElement("div");
    box.className = "game-card-msg";

    if (gd.kind === "ttt") {
      const mySym = gd.playerA === uid ? "❤️" : "😘";
      const canMove = !gd.winnerSymbol && !gd.draw && gd.lastMover !== uid;
      const head = document.createElement("div");
      head.className = "game-card-head";
      head.innerText = `🎮 ${gd.title}`;
      box.appendChild(head);

      const sub = document.createElement("div");
      sub.className = "game-card-sub";
      if (gd.winnerSymbol) sub.innerText = `${gd.winnerSymbol} Jeet gaya! 🎉`;
      else if (gd.draw) sub.innerText = "Match Draw! 🤝";
      else sub.innerText = canMove ? `Aapki baari (${mySym})` : "Love ki baari ka intezar...";
      box.appendChild(sub);

      const grid = document.createElement("div");
      grid.className = "ttt-grid";
      (gd.board || createInitialTttBoard()).forEach((cell, idx) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ttt-cell";
        b.innerText = cell || "";
        b.disabled = !canMove || Boolean(cell);
        b.onclick = async e => {
          e.stopPropagation();
          const res = applyTttMove(gd.board || createInitialTttBoard(), idx, mySym);
          if (!res) return;
          playEmotionSound(res.winner ? "gift" : "chime");
          await chat.updateEncryptedMessage(m.id, {
            ...dec,
            gameData: {
              ...gd,
              board: res.board,
              lastMover: uid,
              winnerSymbol: res.winner || "",
              draw: res.draw
            }
          });
        };
        grid.appendChild(b);
      });
      box.appendChild(grid);
      return box;
    }

    if (gd.kind === "rps") {
      const icons = { rose: "🌹 Rose", letter: "💌 Letter", scissors: "✂️ Scissors" };
      const head = document.createElement("div");
      head.className = "game-card-head";
      head.innerText = "🌹 Rose • Letter • Scissors";
      box.appendChild(head);

      if (gd.moveB) {
        const res = resolveRpsWinner(gd.moveA, gd.moveB);
        const info = document.createElement("div");
        info.className = "game-card-sub";
        const winText = res === "draw" ? "Barabar! 🤝" : (res === "A" ? "Challenger Jeeta! 🏆" : "Partner Jeeta! 🏆");
        info.innerText = `${icons[gd.moveA] || gd.moveA} vs ${icons[gd.moveB] || gd.moveB}\n${winText}`;
        box.appendChild(info);
      } else if (gd.playerA === uid) {
        const info = document.createElement("div");
        info.className = "game-card-sub";
        info.innerText = `Aapne chuna: ${icons[gd.moveA] || gd.moveA}\nLove ke move ka intezar ⏳`;
        box.appendChild(info);
      } else {
        const info = document.createElement("div");
        info.className = "game-card-sub";
        info.innerText = "Love ne apna move lock kar diya hai! Apna chuno:";
        box.appendChild(info);
        const row = document.createElement("div");
        row.className = "game-btn-row";
        ["rose", "letter", "scissors"].forEach(mv => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "game-mini-btn";
          b.innerText = icons[mv];
          b.onclick = async e => {
            e.stopPropagation();
            const win = resolveRpsWinner(gd.moveA, mv);
            playEmotionSound("gift");
            await chat.updateEncryptedMessage(m.id, {
              ...dec,
              gameData: { ...gd, playerB: uid, moveB: mv, winner: win }
            });
          };
          row.appendChild(b);
        });
        box.appendChild(row);
      }
      return box;
    }

    if (gd.kind === "tdw") {
      box.innerHTML = `<div class="game-card-head">🎲 ${escapeHtml(gd.cardType || "Card")}</div><div class="game-card-prompt">${escapeHtml(gd.prompt || "")}</div>`;
      if (gd.replyText) {
        const rep = document.createElement("div");
        rep.className = "game-card-answer";
        rep.innerText = `💖 Jawab: ${gd.replyText}`;
        box.appendChild(rep);
      } else {
        const row = document.createElement("div");
        row.className = "game-inline-reply";
        const inp = document.createElement("input");
        inp.type = "text";
        inp.className = "game-inline-input";
        inp.placeholder = "Yahan jawab likhein...";
        inp.onclick = e => e.stopPropagation();
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "game-mini-btn";
        btn.innerText = "Bhejein";
        btn.onclick = async e => {
          e.stopPropagation();
          const val = inp.value.trim();
          if (!val) return;
          playEmotionSound("love");
          await chat.updateEncryptedMessage(m.id, {
            ...dec,
            gameData: { ...gd, replyText: val }
          });
        };
        row.appendChild(inp);
        row.appendChild(btn);
        box.appendChild(row);
      }
      return box;
    }

    if (gd.kind === "quiz") {
      const head = document.createElement("div");
      head.className = "game-card-head";
      head.innerText = "🧠 Compatibility Quiz";
      box.appendChild(head);
      if (gd.completed) {
        const res = document.createElement("div");
        res.className = "game-card-sub";
        res.innerText = `Score: ${gd.score}/${(gd.questions || []).length} Match! 💯💖`;
        box.appendChild(res);
      } else if (gd.creator === uid) {
        const sub = document.createElement("div");
        sub.className = "game-card-sub";
        sub.innerText = "Quiz bhej diya gaya — Love ke jawab ka intezar ⏳";
        box.appendChild(sub);
      } else {
        const qs = gd.questions || [];
        const answers = [...(gd.partnerAnswers || [])];
        qs.forEach((item, qi) => {
          const qDiv = document.createElement("div");
          qDiv.className = "quiz-play-q";
          qDiv.innerHTML = `<div class="quiz-play-title">${qi + 1}. ${escapeHtml(item.q)}</div>`;
          const optRow = document.createElement("div");
          optRow.className = "quiz-opt-col";
          (item.opts || []).forEach((op, oi) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "game-mini-btn" + (answers[qi] === oi ? " active" : "");
            b.innerText = op;
            b.onclick = async e => {
              e.stopPropagation();
              answers[qi] = oi;
              const allAnswered = qs.every((_, idx) => answers[idx] !== undefined);
              if (allAnswered) {
                const { score } = scoreQuizAnswers(qs, answers);
                playEmotionSound("gift");
                await chat.updateEncryptedMessage(m.id, {
                  ...dec,
                  gameData: { ...gd, partnerAnswers: answers, completed: true, score }
                });
              } else {
                await chat.updateEncryptedMessage(m.id, {
                  ...dec,
                  gameData: { ...gd, partnerAnswers: answers }
                });
              }
            };
            optRow.appendChild(b);
          });
          qDiv.appendChild(optRow);
          box.appendChild(qDiv);
        });
      }
      return box;
    }

    if (gd.kind === "word") {
      const guessed = gd.guessed || [];
      const solved = isWordSolved(gd.word, guessed);
      const wrong = countWrongGuesses(gd.word, guessed);
      const failed = !solved && wrong >= 6;

      const head = document.createElement("div");
      head.className = "game-card-head";
      head.innerText = "🔤 Secret Word Boojho";
      box.appendChild(head);

      const hint = document.createElement("div");
      hint.className = "game-card-sub";
      hint.innerText = `Hint: ${gd.hint} • ❤️ ${Math.max(0, 6 - wrong)}/6`;
      box.appendChild(hint);

      const wordDisplay = document.createElement("div");
      wordDisplay.className = "word-mask-display";
      wordDisplay.innerText = (solved || failed) ? gd.word.split("").join(" ") : getMaskedWord(gd.word, guessed);
      box.appendChild(wordDisplay);

      if (solved) {
        const win = document.createElement("div");
        win.className = "game-card-answer";
        win.innerText = "Sahi Boojha! 🎉💖";
        box.appendChild(win);
      } else if (failed) {
        const lose = document.createElement("div");
        lose.className = "game-card-answer";
        lose.innerText = `Chances khatam! Word tha: ${gd.word}`;
        box.appendChild(lose);
      } else if (gd.creator !== uid) {
        const kb = document.createElement("div");
        kb.className = "word-kb-grid";
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(ch => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "word-kb-btn";
          b.innerText = ch;
          b.disabled = guessed.includes(ch);
          b.onclick = async e => {
            e.stopPropagation();
            if (guessed.includes(ch)) return;
            const nextGuessed = [...guessed, ch];
            playEmotionSound(gd.word.includes(ch) ? "happy" : "chime");
            await chat.updateEncryptedMessage(m.id, {
              ...dec,
              gameData: { ...gd, guessed: nextGuessed }
            });
          };
          kb.appendChild(b);
        });
        box.appendChild(kb);
      }
      return box;
    }

    // memory_score
    box.innerHTML = `<div class="game-card-head">🃏 Heart Memory Challenge</div><div class="game-card-sub">${gd.solved ? `Maine ${gd.moves} moves (${gd.seconds}s) mein complete kiya! 🏆` : `Moves: ${gd.moves} (${gd.seconds}s)`}</div>`;
    return box;
  }

  return { renderGameBubble };
}
