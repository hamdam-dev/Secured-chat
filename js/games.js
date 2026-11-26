import { escapeHtml, playEmotionSound } from "./crypto.js";
import {
  createInitialTttBoard,
  checkTttWinningLine,
  applyTttMove,
  resolveRpsWinner,
  normalizeWordGuess,
  getMaskedWord,
  isWordSolved,
  countWrongGuesses,
  scoreQuizAnswers,
  LUDO_MAIN_TRACK,
  LUDO_SAFE_TRACK_INDICES,
  LUDO_HOME_LANES,
  createLudoState,
  getLudoGridCoord,
  getMovableLudoTokens,
  applyLudoDiceRoll,
  applyLudoTokenMove,
  pickBotLudoToken,
  createConnect4Board,
  checkConnect4WinningLine,
  dropConnect4Disc,
  createDotsBoxesState,
  claimDotsEdge,
  evaluateCodeGuess,
  create2048Board,
  can2048Move,
  slide2048Board,
  pickTttBotMove,
  pickConnect4BotCol,
  pickDotsBotEdge,
  ROMANTIC_WORD_BANK,
  isSlidingSolved,
  createSlidingPuzzle,
  moveSlidingTile,
  createSnakeState,
  stepSnakeState
} from "../shared/gameLogic.js";

const TDW_BANK = {
  easy: [
    { type: "Truth", prompt: "Meri kaunsi ek choti si aadat tumhe sabse pyari lagti hai?" },
    { type: "Truth", prompt: "Humari pehli baat ka kaunsa pal tum aaj bhi muskurake yaad karte ho?" },
    { type: "Dare", prompt: "Abhi ek cute si smile selfie ya pyara voice note bhejo 😘" },
    { type: "Promise", prompt: "Waada karo jab bhi mood off hoga, chup rehne ke bajaye mujhe bataoge 🫶🏻" },
    { type: "Truth", prompt: "Mere kis nickname par tumhara dil sabse zyada khush hota hai?" },
    { type: "Dare", prompt: "Bina soche mere baare mein 3 pyari cheezein abhi likho ✨" },
    { type: "Promise", prompt: "Waada karo roz sone se pehle mujhe ek pyara sa Good Night bhejoge 🌙" },
    { type: "Truth", prompt: "Aaj din mein mujhe kitni baar yaad kiya sach sach batao? 🥺" },
    { type: "Dare", prompt: "Mujhe apni gallery ki sabse cute smile photo bhejo 📸" },
    { type: "Truth", prompt: "Agar abhi hum saath chai pee rahe hote to pehli baat kya karte? ☕" },
    { type: "Promise", prompt: "Waada karo chhoti ladai mein bhi kabhi mujhe akela nahi chhodoge ❤️" },
    { type: "Dare", prompt: "Ek cute emoji story bana kar bhejo jo humari love story dikhaye 💖" }
  ],
  flirty: [
    { type: "Flirty Truth", prompt: "Mere kis andaaz ya awaaz par tumhara dil sabse zyada pighal jaata hai? 💓" },
    { type: "Flirty Dare", prompt: "20 second ka slow romantic voice note bhejo jisme mera naam pyar se lo 🎙️😘" },
    { type: "Flirty Dare", prompt: "Mujhe 3 pyare nicknames do jo sirf tum mujhe bulaoge 🥰" },
    { type: "Flirty Truth", prompt: "Aaj tumhare paas hota/hoti to sabse pehle kya karte — hug, kiss ya tight holding? 💋" },
    { type: "Flirty Truth", prompt: "Meri kis aadat par tumhe sabse zyada pyar + nakhre aate hain? 😉" },
    { type: "Flirty Dare", prompt: "Ek flirty si 2-line shayari abhi mere naam par likh kar bhejo 💌" },
    { type: "Flirty Truth", prompt: "Agli mulaqat par mujhe kitni der hug karke rakhna chahte ho? 🤗" },
    { type: "Flirty Dare", prompt: "Abhi mirror selfie lo aur likho 'Sirf Janan ke liye' 😘" },
    { type: "Flirty Truth", prompt: "Meri kaunsi photo dekh kar tumhara dil sabse tez dhadakta hai? 💘" },
    { type: "Flirty Dare", prompt: "Ek voice note mein sirf 5 baar 'Janan I miss you' pyar se bolo 🎧" },
    { type: "Flirty Truth", prompt: "Kya kabhi mera message dekh kar chupke se sharmaaye ho? Kab? 🙈" },
    { type: "Flirty Dare", prompt: "Mujhe ek pyari si kiss emoji + ek secret compliment abhi bhejo 💋" }
  ],
  deep: [
    { type: "Deep Truth", prompt: "Mere saath apni zindagi ka sabse khoobsurat khwab kya dekhte ho? 🌙" },
    { type: "Deep Promise", prompt: "Ek aisi baat bolo jo tum humesha hamare rishte mein sambhal kar rakhna chahte ho 💍" },
    { type: "Deep Truth", prompt: "Meri kaunsi baat tumhe sabse zyada sukoon deti hai jab tum thake hote ho? 🤍" },
    { type: "Deep Truth", prompt: "Humare rishte ki kaunsi cheez tumhe sabse zyada khaas aur alag lagti hai? ✨" },
    { type: "Deep Promise", prompt: "Waada karo mushkil waqt mein hum dono hamesha ek team ban kar khade rahenge 🫶🏻" },
    { type: "Deep Truth", prompt: "Kab mehsoos hua tha ke main tumhare liye sirf dost nahi, sab kuch hoon? 💖" },
    { type: "Deep Truth", prompt: "Meri zindagi mein aane se tumhari kaunsi aadat behtar ho gayi? 🌸" },
    { type: "Deep Promise", prompt: "Ek aisa dream destination batao jahan hum shaadi ke baad saath jayenge ✈️" },
    { type: "Deep Truth", prompt: "Mujhse kisi baat ka gila ya koi khwahish jo abhi tak dil mein chhupi ho? 🥺" },
    { type: "Deep Truth", prompt: "Jab main paas na hoon to meri yaad aane par kya karte ho? 💭" },
    { type: "Deep Promise", prompt: "Waada karo har khushi aur har gham mein pehla phone mujhe karoge 📞" },
    { type: "Deep Truth", prompt: "Humare 10 saal baad ke future ko kis tarah imagine karte ho? 🏡" }
  ]
};

const WHEEL_BANK = {
  sweet: [
    "🤗 Ek lambi Jaadu Ki Jhappi (Virtual + Agli Mulaqat par Double!)",
    "💌 2 line ki pyari shayari mere liye likho",
    "📸 Ek pyaari si bina filter wali smile selfie bhejo",
    "☕ Agli baar meri taraf se chai / coffee date pakki!",
    "🍫 Tumhari pasand ki chocolate meri taraf se treat!",
    "🧸 3 pyari baatein likho jo aaj mere baare mein pasand aayin",
    "🌷 Mere naam ke sath ek cute sa status lagao 1 ghante ke liye",
    "📞 Aaj raat sone se pehle 10 min bina tension call",
    "🫶🏻 Ek aisi dua maango hum dono ke liye aur yahan likho",
    "🎶 Apna favourite romantic gaana voice note mein gaa ke sunao"
  ],
  flirty: [
    "💋 10 Non-Stop Flying Kisses voice note mein bhejo!",
    "😘 Aankhon mein dekh ke video par 'I Love You Janan' bolo",
    "🔥 Batao mera kaunsa look tumhe sabse zyada attract karta hai?",
    "🫶🏻 Agli mulaqat par 2 minute bina bole sirf haath thaam kar baithna hai",
    "💋 1 Forehead kiss + 1 Cheek kiss coupon abhi claim karo!",
    "😉 Ek flirty secret confession bhejo jo abhi tak nahi bataya",
    "🎙️ Dheemi aawaz mein 'Sirf tum mere ho' bol kar bhejo",
    "📸 Cute wink karte hue ek photo bhejo abhi!",
    "💖 Mujhe ek pyara sa naya romantic nickname do",
    "🔥 Bataye bina ek surprise compliment bhejo jo mujhe blush kara de"
  ],
  spicy: [
    "🌙 Midnight Whisper: Dheemi awaaz mein ek secret khwahish voice note mein bhejo",
    "💋 Ek forehead kiss + ek neck kiss credit hua — agli mulaqat par wasool hoga!",
    "🔥 Mujhe apne phone ke lockscreen par rakhne ke liye ek special photo bhejo",
    "💞 Aaj raat sone se pehle 10 pyari baatein likh ke bhejni hongi",
    "😘 15-second slow hug challenge — agli mulaqat par pehla kaam!",
    "💓 Apni sabse romantic imagination likho jo tum mere saath chahte ho",
    "🌹 Dinner date par kya pehnna pasand karoge mere liye?",
    "🔐 Ek one-word secret wish bhejo sirf mere liye",
    "🎙️ 10 second tak bina ruke pyar bhara wish whisper karo",
    "💋 Aaj tum par meri har cute shart chalegi — pehli shart poochho!"
  ],
  deep: [
    "💍 Dil se ek aisa waada likho jo humari poori zindagi ka ho",
    "🤍 Meri zindagi mein tumhara sabse bada sukoon kya hai?",
    "🏡 Humare sapno ke ghar ka ek scene describe karo",
    "✨ Humari sabse yaadgar baat jo tumhe humesha yaad rahegi",
    "🫶🏻 Agar aaj hum sab kuch bhool kar ek naya din shuru karein, kya karoge?",
    "🌟 Mere liye 3 duayein jo tum har namaz/waqt maangte ho",
    "💞 Sabse pyari memory jo kabhi kisi ko nahi batayi",
    "🕰️ Jab main bohot busy hoon tab meri kami kaise mehsoos hoti hai?",
    "🌙 Aaj raat mujhe ek pyara sa Khat (Sealed Letter) likh ke bhejna",
    "🤍 Meri kaunsi ek baat tumhe sabse zyada himmat deti hai?"
  ]
};

const COUPON_POOL = [
  "💋 10 Non-Stop Kisses",
  "🤗 5-Min Tight Hug",
  "📸 Cute Smile Selfie Abhi",
  "🎙️ Romantic Voice Shayari",
  "🍫 Favorite Chocolate Treat",
  "📱 Late Night Cozy Call",
  "☕ Coffee / Chai Date Pass",
  "🛍️ Chhota Pyara Surprise Gift",
  "🎬 Saath Movie Night Choice",
  "💆‍♂️ Head Massage Token",
  "🚗 Long Drive Winner Pass",
  "👑 No-Nakhra Yes-Day Pass",
  "💌 Hand-Written Love Note",
  "🌹 Ek Pyara Phool Delivery",
  "🍔 Midnight Craving Treat",
  "🎧 Dedicate 1 Song Live",
  "🫶🏻 10-Min Bina Phone Baat",
  "✨ Instant Mood-Fix Card"
];

const WYR_BANK = [
  { q: "Kya choose karoge?", optA: "🌧️ Baarish mein saath chai & walk", optB: "🌙 Chhat par taaron ke neeche baatein" },
  { q: "Romantic Choice:", optA: "💋 50 Chhote-chhote kisses", optB: "🤗 10-minute bina toote tight hug" },
  { q: "Surprise Mode:", optA: "💌 Haath se likha pyar bhara khat", optB: "🎙️ Neend bhari pyari voice note" },
  { q: "Date Vibe:", optA: "🚗 Raat ki long drive + gaane", optB: "🏡 Ghar par movie + cuddle" },
  { q: "Subah Ka Pehla Pal:", optA: "☀️ Aankh khulte hi pyari smile dekhna", optB: "☕ Haath mein garma garam chai saath peena" },
  { q: "Ladai Ho Jaye To:", optA: "🥺 Turant hug karke manana", optB: "🍫 Chocolate + sorry card bhejna" },
  { q: "Safar Choice:", optA: "🏔️ Pahadon ki thandi subah", optB: "🌊 Samandar kinare shaam" },
  { q: "Photo Memory:", optA: "📸 Candid hansti hui selfies", optB: "🎞️ Aesthetic couple polaroids" },
  { q: "Late Night:", optA: "📞 2 baje tak bina topic baatein", optB: "🎮 Saath game khelo aur shart lagao" },
  { q: "Pyar Ka Izhaar:", optA: "👀 Aankhon mein dekh ke khamoshi", optB: "💬 Har ghante 'Love You' message" },
  { q: "Gift Style:", optA: "🧸 Ek bada soft teddy bear", optB: "💍 Chhota sa hamesha pehnne wala ring" },
  { q: "Weekend Plan:", optA: "🍝 Saath kitchen mein cooking masti", optB: "🍽️ Candlelight dinner bahar" },
  { q: "Barish Ka Din:", optA: "🎶 Purane romantic gaane + pakode", optB: "🛋️ Kambal mein cozy baatein" },
  { q: "Call Style:", optA: "📹 Bina bole sirf video par dekhna", optB: "🎧 Slow aawaz mein audio call" },
  { q: "Dream Future:", optA: "🏡 Chhota sukoon bhara pyara ghar", optB: "✈️ Duniya ghoomne ki lambi trips" },
  { q: "Surprise Time:", optA: "🎂 Raat 12 baje pehla wish", optB: "🎁 Din mein achanak bina bataye aana" },
  { q: "Flirt Level:", optA: "🙈 Pyara sharmana aur aankh churana", optB: "😘 Direct bold tareef karna" },
  { q: "Mausam:", optA: "❄️ Sardiyon ki dhoop + haath thaamna", optB: "🌧️ Sawan ki rimjhim baarish" },
  { q: "Snack Partner:", optA: "🍕 Cheesy pizza share karna", optB: "🍦 Ek hi ice-cream cup dono ke liye" },
  { q: "Nickname:", optA: "💖 Janan / Zargoo", optB: "🧸 Bacha / Katoto" },
  { q: "Mood Fix:", optA: "🎤 Pyar se lori/gaana sunana", optB: "😂 Funny memes bhej ke hansana" },
  { q: "Secret Language:", optA: "😉 Sirf aankhon ke ishaare", optB: "💬 Humare private code words" },
  { q: "Anniversary:", optA: "💌 Har saal ek letter likhna", optB: "📸 Har saal nayi jagah photo lena" },
  { q: "Pehli Pasand:", optA: "❤️ Tumhari masoom muskan", optB: "🫶🏻 Tumhari care karne ki aadat" }
];

const QUIZ_POOL = [
  { q: "Jab main udaas hota/hoti hoon to mujhe kya chahiye?", opts: ["Pyari baatein & hug 🤗", "Thoda time akela 🌙", "Chocolate / chai 🍫"] },
  { q: "Mera favourite time tumhare saath kya hai?", opts: ["Raat ki lambi baatein 🌙", "Video call par hansna 📹", "Chote pyare surprises 🎁"] },
  { q: "Agar main gussa ho jaun to best tareeqa?", opts: ["Pyar se mana lena 😘", "Sorry + cute gift 🧸", "Voice note bhejna 🎤"] },
  { q: "Meri sabse pyari romantic demand kya hoti hai?", opts: ["Haath thaam kar chalna 🫶🏻", "Pyare nicknames lena 💖", "Surprise call karna 📞"] },
  { q: "Mujhe kis cheez se sabse jaldi smile aati hai?", opts: ["Tumhara cute voice note 🎙️", "Achanak 'Miss You' ping 💓", "Tumhari ek selfie 📸"] },
  { q: "Mera favourite date snack kya hoga?", opts: ["Chai / Coffee ☕", "Chocolate / Ice Cream 🍫", "Spicy street food 🌶️"] },
  { q: "Mujhe sabse zyada kaisa mausam pasand hai?", opts: ["Baarish & thandi hawa 🌧️", "Sardiyon ki dhoop ❄️", "Raat ka chandni mausam 🌙"] },
  { q: "Agar mujhe neend na aa rahi ho to kya karun?", opts: ["Tumse call par baat 📞", "Purane messages padhna 💌", "Gaane sunna 🎧"] },
  { q: "Meri personality ka sabse cute hissa?", opts: ["Thoda sa nakhra 🙈", "Bohot zyada care karna 🤗", "Bina bole samajh jaana ✨"] },
  { q: "Sabse pehli nazar mein kya notice karta/karti hoon?", opts: ["Aankhein & muskan 👀", "Baat karne ka andaaz 💬", "Vibe & saadgi 🌸"] },
  { q: "Humara perfect weekend kya hoga?", opts: ["Ghar mein movie + snacks 🎬", "Long drive + music 🚗", "Shopping + dinner date 🛍️"] },
  { q: "Mujhe kis tarah ka gift zyada khush karta hai?", opts: ["Dil se likha khat 💌", "Chhota meaningful yaadgar 💍", "Surprise food treat 🍕"] },
  { q: "Agar main chup ho jaun to iska matlab?", opts: ["Chahta/chahti hoon tum poocho 🥺", "Thak gaya/gayi hoon 😴", "Thoda sa hurt hoon 💔"] },
  { q: "Mera favorite romantic gesture?", opts: ["Forehead kiss 😘", "Tight hug 🤗", "Haath pakad kar chalna 🫶🏻"] },
  { q: "Subah uth ke sabse pehla kaam?", opts: ["Tumhara message check 📱", "Paani / chai peena ☕", "Thodi der aur sona 😴"] },
  { q: "Kis baat par mujhe sabse zyada proud hota hai?", opts: ["Humari loyalty & trust 🤝", "Humari cute bonding 💖", "Ek doosre ki support ✨"] },
  { q: "Agar humari koi movie bane to genre?", opts: ["Pure Romantic Drama 💖", "Cute Rom-Com 😂", "Adventure Love Story 🌍"] },
  { q: "Mera go-to stress buster?", opts: ["Tumhari aawaz sunna 🎙️", "Garma garam chai ☕", "Neend poori karna 🌙"] },
  { q: "Kaunsa color mere liye sabse lucky/cute hai?", opts: ["Pink / Rose 🎀", "Black / Royal 🖤", "White / Sukoon 🤍"] },
  { q: "Jab main 'Theek hoon' bolun to aksar kya hota hai?", opts: ["Pyar se puchho kya hua 🥺", "Sach mein theek hoon 😊", "Hug chahiye abhi 🤗"] },
  { q: "Meri dreamy vacation jagah?", opts: ["Pahad & barf 🏔️", "Samandar kinara 🌊", "Koi bhi jagah bas tum saath 🫶🏻"] },
  { q: "Mujhe call par kya zyada pasand hai?", opts: ["Tumhari hansi sunna 😂", "Pyari baatein karna 💕", "Bas saath line par rehna 📞"] },
  { q: "Sabse meetha lafz jo tumhare munh se achha lagta hai?", opts: ["Janan ❤️", "Zargoo 💖", "Meri Jaan 🌹"] },
  { q: "Humari sabse badi strength kya hai?", opts: ["Ek doosre ko samajhna 🧠", "Har haal mein saath rehna 🤝", "Be-shumar pyar ❤️"] }
];

const LOCK_EMOJIS = ["❤️", "💜", "💛", "💙", "🌹"];
const MEMORY_POOL = ["❤️", "😘", "🌹", "🧸", "🍫", "💍", "💋", "🦋"];
const DICE_GLYPHS = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const SNAKE_GRID = 14;
const POP_EMOJI_POOL = ["❤️", "❤️", "💖", "💋", "💣"];

function shuffleCopy(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function createGamesManager({ getAuth, chat }) {
  const modal = document.getElementById("games-modal");
  const openBtn = document.getElementById("games-btn");
  const closeBtn = document.getElementById("close-games-btn");

  const ludoBoardEl = document.getElementById("ludo-board-grid");
  const ludoTurnLabel = document.getElementById("ludo-turn-label");
  const ludoStatusText = document.getElementById("ludo-status-text");
  const ludoDiceFace = document.getElementById("ludo-dice-face");
  const ludoRollBtn = document.getElementById("ludo-roll-btn");
  const ludoRuleBtn = document.getElementById("ludo-rule-btn");

  const memoryBoard = document.getElementById("memory-game-board");
  const memoryStatus = document.getElementById("memory-game-status");

  const g2048BoardEl = document.getElementById("g2048-board");
  const g2048ScoreEl = document.getElementById("g2048-score");
  const g2048StatusEl = document.getElementById("g2048-status");
  const g2048BestEl = document.getElementById("g2048-best");

  const catcherCanvas = document.getElementById("catcher-canvas");
  const catcherOverlay = document.getElementById("catcher-overlay");
  const catcherOverlayMsg = document.getElementById("catcher-overlay-msg");
  const catcherHud = document.getElementById("catcher-hud");

  const snakeCanvas = document.getElementById("snake-canvas");
  const snakeOverlay = document.getElementById("snake-overlay");
  const snakeOverlayMsg = document.getElementById("snake-overlay-msg");
  const snakeHud = document.getElementById("snake-hud");

  const breakerCanvas = document.getElementById("breaker-canvas");
  const breakerOverlay = document.getElementById("breaker-overlay");
  const breakerOverlayMsg = document.getElementById("breaker-overlay-msg");
  const breakerHud = document.getElementById("breaker-hud");

  let activeTab = "ludo";
  const activeSubtabs = {
    flirty: "flirty:wheel",
    easy: "easy:c4",
    hard: "hard:2048",
    arcade: "arcade:catcher"
  };

  // Ludo state
  let ludoMode = "bot";
  let ludoQuick = true;
  let ludoState = buildInitialLudo("bot", true);
  let ludoBotTimer = null;
  let liveLudoMsg = null;

  // Flirty state
  let wheelMood = "sweet";
  let wheelAngle = 0;
  let lastWheelResult = "";
  let localCoupons = [];
  let localCouponPicked = -1;
  let wyrOrder = shuffleCopy(WYR_BANK);
  let localWyrIdx = 0;
  let localWyrChoice = "";
  let tdwTier = "easy";
  let currentTdwCard = TDW_BANK.easy[0];

  // Asan state
  let c4LocalBoard = createConnect4Board();
  let c4LocalWinner = "";
  let c4LocalDraw = false;
  let c4BotBusy = false;

  let tttLocalBoard = createInitialTttBoard();
  let tttLocalWinner = "";
  let tttLocalDraw = false;
  let tttBotBusy = false;

  const rpsScore = { you: 0, bot: 0 };
  let currentQuizSlice = shuffleCopy(QUIZ_POOL).slice(0, 4);

  // Heart Pop Rush 15s state
  let popRunning = false;
  let popScore = 0;
  let popBest = Number(localStorage.getItem("sc_pop_best_v1") || "0");
  let popTimeLeft = 15;
  let popActiveIdx = -1;
  let popActiveEmoji = "❤️";
  let popTickInt = null;
  let popCountdownInt = null;

  // Hard state
  let g2048Board = create2048Board();
  let g2048Score = 0;
  let g2048Best = Number(localStorage.getItem("sc_2048_best_v1") || "0");

  const lockGuess = ["❤️", "💜", "💛", "🌹"];
  let lockTarget = Array.from({ length: 4 }, () => LOCK_EMOJIS[Math.floor(Math.random() * LOCK_EMOJIS.length)]);
  let lockHistory = [];
  let lockSolved = false;

  let dotsLocal = createDotsBoxesState();
  let dotsBotBusy = false;

  let wordOrder = shuffleCopy(ROMANTIC_WORD_BANK);
  let wordIdx = 0;
  let wordGuessed = [];
  let wordClueUsed = false;

  // Sliding Puzzle state
  let puzzleSize = 3;
  let puzzleBoard = createSlidingPuzzle(3);
  let puzzleMoves = 0;
  let puzzleSeconds = 0;
  let puzzleTimerInt = null;
  let puzzleSolved = false;

  // Memory state
  let memPairsCount = 6;
  let memCards = [];
  let memFlipped = [];
  let memMatched = new Set();
  let memMoves = 0;
  let memStartMs = 0;
  let memLock = false;

  // Catcher canvas state
  let catcherDiff = "easy";
  let catcherRunning = false;
  let catcherRaf = null;
  let catcherBasketX = 160;
  let catcherItems = [];
  let catcherScore = 0;
  let catcherBest = Number(localStorage.getItem("sc_catcher_best_v1") || "0");
  let catcherLives = 3;
  let catcherTimeLeft = 30;
  let catcherSpawnAcc = 0;
  let catcherLastTs = 0;
  const catcherKeys = { left: false, right: false };

  // Love Snake canvas state
  let snakeSpeed = "easy";
  let snakeState = createSnakeState(SNAKE_GRID);
  let snakeNextDir = "right";
  let snakeRunning = false;
  let snakeTimerInt = null;
  let snakeBest = Number(localStorage.getItem("sc_snake_best_v1") || "0");

  // Dil Brick Breaker canvas state
  let breakerRunning = false;
  let breakerRaf = null;
  let breakerPaddleX = 160;
  let breakerBall = { x: 160, y: 185, vx: 135, vy: -155 };
  let breakerBricks = [];
  let breakerScore = 0;
  let breakerBest = Number(localStorage.getItem("sc_breaker_best_v1") || "0");
  let breakerLives = 3;
  let breakerLastTs = 0;
  const breakerKeys = { left: false, right: false };

  // Love Reflex Duel state
  let reflexPhase = "idle"; // idle | waiting | ready | done
  let reflexRound = 0;
  let reflexTimes = [];
  let reflexReadyAt = 0;
  let reflexWaitTimer = null;
  let reflexBestAvg = Number(localStorage.getItem("sc_reflex_best_v1") || "0");

  function buildInitialLudo(mode, quick) {
    const st = createLudoState(mode);
    if (quick) {
      st.tokensA = [0, -1, -1, -1];
      st.tokensB = [0, -1, -1, -1];
      st.statusText = "Quick Ludo! 1 token bahar hai — Dice roll karein 🎲";
    }
    return st;
  }

  function myUid() {
    return getAuth()?.currentUser?.uid || "";
  }

  function stopCatcherLoop() {
    catcherRunning = false;
    if (catcherRaf) {
      cancelAnimationFrame(catcherRaf);
      catcherRaf = null;
    }
  }

  function stopSnakeLoop() {
    snakeRunning = false;
    if (snakeTimerInt) {
      clearInterval(snakeTimerInt);
      snakeTimerInt = null;
    }
  }

  function stopBreakerLoop() {
    breakerRunning = false;
    if (breakerRaf) {
      cancelAnimationFrame(breakerRaf);
      breakerRaf = null;
    }
  }

  function stopPopRush() {
    popRunning = false;
    clearInterval(popTickInt);
    clearInterval(popCountdownInt);
    popTickInt = null;
    popCountdownInt = null;
  }

  function stopReflex() {
    clearTimeout(reflexWaitTimer);
    reflexWaitTimer = null;
    if (reflexPhase === "waiting" || reflexPhase === "ready") {
      reflexPhase = "idle";
    }
  }

  function stopPuzzleTimer() {
    clearInterval(puzzleTimerInt);
    puzzleTimerInt = null;
  }

  function stopAllArcadeLoops() {
    stopCatcherLoop();
    stopSnakeLoop();
    stopBreakerLoop();
    stopPopRush();
    stopReflex();
  }

  function showSubTab(subKey) {
    if (!subKey || !subKey.includes(":")) return;
    stopAllArcadeLoops();
    const [parentTab] = subKey.split(":");
    activeSubtabs[parentTab] = subKey;

    const pane = modal?.querySelector(`[data-game-pane="${parentTab}"]`);
    if (pane) {
      pane.querySelectorAll("[data-subtab]").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.subtab === subKey);
      });
      pane.querySelectorAll("[data-subpane]").forEach(sp => {
        sp.style.display = sp.dataset.subpane === subKey ? "flex" : "none";
      });
    }

    if (subKey === "flirty:coupons") {
      if (!localCoupons.length) shuffleLocalCoupons();
    } else if (subKey === "flirty:wyr") {
      renderFlirtyWyr();
    } else if (subKey === "flirty:tdw") {
      renderTdwPreview();
    } else if (subKey === "easy:c4") {
      renderC4Local();
    } else if (subKey === "easy:ttt") {
      renderTttLocal();
    } else if (subKey === "easy:quiz") {
      renderQuizSetup();
    } else if (subKey === "easy:pop") {
      renderPopRushGrid();
    } else if (subKey === "hard:2048") {
      render2048Board();
    } else if (subKey === "hard:lock") {
      renderLockLocal();
    } else if (subKey === "hard:dots") {
      renderDotsLocal();
    } else if (subKey === "hard:word") {
      renderWordLocal();
    } else if (subKey === "hard:puzzle") {
      renderSlidingPuzzle();
    } else if (subKey === "arcade:catcher") {
      renderCatcherFrame();
    } else if (subKey === "arcade:snake") {
      renderSnakeFrame();
      updateSnakeHud();
    } else if (subKey === "arcade:breaker") {
      if (!breakerBricks.length) resetBreakerBricks();
      renderBreakerFrame();
      updateBreakerHud();
    } else if (subKey === "arcade:memory") {
      if (!memCards.length) startMemoryGame();
      else renderMemoryBoard();
    } else if (subKey === "arcade:reflex") {
      renderReflexUi();
    }
  }

  function showTab(tabKey, subKey = "") {
    activeTab = tabKey;
    stopAllArcadeLoops();
    if (tabKey !== "hard") stopPuzzleTimer();

    modal?.querySelectorAll("[data-game-tab]").forEach(b => {
      b.classList.toggle("active", b.dataset.gameTab === tabKey);
    });
    modal?.querySelectorAll("[data-game-pane]").forEach(p => {
      const show = p.dataset.gamePane === tabKey;
      p.style.display = show ? "flex" : "none";
      if (show) p.scrollTop = 0;
    });

    if (tabKey === "ludo") {
      renderLudoBoard();
    } else {
      const targetSub = subKey && subKey.startsWith(`${tabKey}:`) ? subKey : activeSubtabs[tabKey];
      if (targetSub) showSubTab(targetSub);
    }
  }

  function openGameSubtab(subKey) {
    if (!modal) return;
    if (subKey === "ludo") {
      showTab("ludo");
    } else if (subKey && subKey.includes(":")) {
      showTab(subKey.split(":")[0], subKey);
    } else {
      showTab(activeTab || "ludo");
    }
    modal.style.display = "flex";
  }

  modal?.querySelectorAll("[data-game-tab]").forEach(btn => {
    btn.addEventListener("click", () => showTab(btn.dataset.gameTab));
  });

  modal?.querySelectorAll("[data-subtab]").forEach(btn => {
    btn.addEventListener("click", () => showSubTab(btn.dataset.subtab));
  });

  openBtn?.addEventListener("click", () => {
    showTab(activeTab || "ludo");
    modal.style.display = "flex";
  });

  closeBtn?.addEventListener("click", () => {
    stopAllArcadeLoops();
    stopPuzzleTimer();
    clearTimeout(ludoBotTimer);
    liveLudoMsg = null;
    modal.style.display = "none";
  });

  // =========================================
  // 1. LUDO COUPLE EDITION (BOARD & LIVE CHAT)
  // =========================================
  const ludoTrackCoordMap = new Map();
  LUDO_MAIN_TRACK.forEach(([r, c], idx) => ludoTrackCoordMap.set(`${r},${c}`, idx));
  const ludoHomeAMap = new Set(LUDO_HOME_LANES.A.map(([r, c]) => `${r},${c}`));
  const ludoHomeBMap = new Set(LUDO_HOME_LANES.B.map(([r, c]) => `${r},${c}`));

  function currentLudoDisplayState() {
    return liveLudoMsg ? (liveLudoMsg.dec?.gameData?.ludoState || buildInitialLudo("chat", ludoQuick)) : ludoState;
  }

  async function commitLudoState(nextState, actionDesc = "") {
    if (liveLudoMsg) {
      const uid = myUid();
      liveLudoMsg.dec.gameData.ludoState = nextState;
      renderLudoBoard();
      const homeA = (nextState.tokensA || []).filter(p => p === 56).length;
      const homeB = (nextState.tokensB || []).filter(p => p === 56).length;
      const winNotice = nextState.winner
        ? `🏆 Ludo Couple Match khatam! ${nextState.winner === "A" ? "❤️ Player A" : "😘 Player B"} jeet gaya! (${homeA}/4 vs ${homeB}/4)`
        : "";
      await chat.updateEncryptedMessage(
        liveLudoMsg.id,
        {
          ...liveLudoMsg.dec,
          gameData: {
            ...liveLudoMsg.dec.gameData,
            ludoState: nextState,
            lastUpdatedBy: uid,
            lastActionText: actionDesc || `🎲 Ludo: ${nextState.statusText || "Chaal chali gayi!"}`
          }
        },
        {
          notifyPartner: true,
          alertKind: "letter",
          gameNoticeText: winNotice
        }
      );
    } else {
      ludoState = nextState;
      renderLudoBoard();
    }
  }

  function isMyLudoTurn(st) {
    if (!liveLudoMsg) {
      if (st.mode === "bot" && st.turn === "B") return false;
      return true;
    }
    const uid = myUid();
    const gd = liveLudoMsg.dec?.gameData || {};
    const mySide = gd.playerA === uid ? "A" : "B";
    return st.turn === mySide;
  }

  function triggerDiceSpinAnim() {
    if (!ludoDiceFace) return;
    ludoDiceFace.classList.remove("dice-spin");
    void ludoDiceFace.offsetWidth;
    ludoDiceFace.classList.add("dice-spin");
  }

  function scheduleLudoBotTurn() {
    clearTimeout(ludoBotTimer);
    if (liveLudoMsg) return;
    if (ludoState.mode !== "bot" || ludoState.turn !== "B" || ludoState.winner) return;

    ludoBotTimer = setTimeout(() => {
      if (modal?.style.display !== "flex") return;
      if (ludoState.mode !== "bot" || ludoState.turn !== "B" || ludoState.winner) return;
      if (!ludoState.canMove) {
        const roll = Math.floor(Math.random() * 6) + 1;
        const afterRoll = applyLudoDiceRoll(ludoState, roll);
        if (!afterRoll) return;
        ludoState = afterRoll;
        triggerDiceSpinAnim();
        playEmotionSound("chime");
        renderLudoBoard();
        if (ludoState.canMove) scheduleLudoBotTurn();
      } else {
        const pick = pickBotLudoToken(ludoState);
        if (pick >= 0) {
          const afterMove = applyLudoTokenMove(ludoState, pick);
          if (afterMove) {
            const [mr, mc] = getLudoGridCoord("B", afterMove.tokensB[pick], pick);
            afterMove.lastMoveKey = `${mr},${mc}`;
            ludoState = afterMove;
            playEmotionSound(afterMove.captured || afterMove.winner ? "gift" : "happy");
            renderLudoBoard();
            if (ludoState.turn === "B" && !ludoState.winner) scheduleLudoBotTurn();
          }
        }
      }
    }, 520);
  }

  function renderLudoBoard() {
    if (!ludoBoardEl) return;
    const st = currentLudoDisplayState();
    const movableSet = st.canMove && isMyLudoTurn(st)
      ? new Set(getMovableLudoTokens(st.turn === "A" ? st.tokensA : st.tokensB, st.dice))
      : new Set();

    const homeA = (st.tokensA || []).filter(p => p === 56).length;
    const homeB = (st.tokensB || []).filter(p => p === 56).length;

    if (ludoTurnLabel) {
      if (st.winner) {
        ludoTurnLabel.innerText = st.winner === "A" ? "🏆 ❤️ Jeet Gaya!" : "🏆 😘 Jeet Gaya!";
      } else {
        ludoTurnLabel.innerText = st.turn === "A"
          ? `❤️ A Ki Baari  •  Ghar: ❤️${homeA}/4 😘${homeB}/4`
          : (st.mode === "bot" && !liveLudoMsg
            ? `🤖 Love Bot (😘)  •  Ghar: ❤️${homeA}/4 😘${homeB}/4`
            : `😘 B Ki Baari  •  Ghar: ❤️${homeA}/4 😘${homeB}/4`);
      }
    }
    if (ludoStatusText) ludoStatusText.innerText = st.statusText || "";
    if (ludoDiceFace) {
      ludoDiceFace.innerText = st.dice ? `${DICE_GLYPHS[st.dice]} ${st.dice}` : "—";
    }
    if (ludoRollBtn) {
      ludoRollBtn.disabled = Boolean(st.winner || st.canMove || !isMyLudoTurn(st));
    }

    const cellTokens = new Map();
    const pushTok = (side, idx, progress) => {
      const [r, c] = getLudoGridCoord(side, progress, idx);
      const key = `${r},${c}`;
      if (!cellTokens.has(key)) cellTokens.set(key, []);
      cellTokens.get(key).push({ side, idx, progress });
    };
    (st.tokensA || []).forEach((p, i) => pushTok("A", i, p));
    (st.tokensB || []).forEach((p, i) => pushTok("B", i, p));

    ludoBoardEl.innerHTML = "";
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const key = `${r},${c}`;
        const cell = document.createElement("div");
        let cls = "ludo-cell";

        if (r < 6 && c < 6) cls += " base-a";
        else if (r < 6 && c > 8) cls += " base-inactive";
        else if (r > 8 && c < 6) cls += " base-inactive";
        else if (r > 8 && c > 8) cls += " base-b";
        else if (r >= 6 && r <= 8 && c >= 6 && c <= 8) cls += " center-home";
        else if (ludoHomeAMap.has(key)) cls += " lane-a";
        else if (ludoHomeBMap.has(key)) cls += " lane-b";
        else {
          const tIdx = ludoTrackCoordMap.get(key);
          if (tIdx === 0) cls += " start-a safe";
          else if (tIdx === 26) cls += " start-b safe";
          else if (LUDO_SAFE_TRACK_INDICES.has(tIdx)) cls += " safe";
        }
        if (st.lastMoveKey === key) cls += " last-move";

        cell.className = cls;
        if (r === 7 && c === 7) cell.innerText = "👑";
        else if (cls.includes("safe")) cell.innerText = "★";

        const toks = cellTokens.get(key) || [];
        if (toks.length) {
          cell.innerText = "";
          // Group tokens cleanly by side so stacked tokens show a crisp count badge while keeping movable token clickable
          ["A", "B"].forEach(side => {
            const sideToks = toks.filter(t => t.side === side);
            if (!sideToks.length) return;
            const movableTok = sideToks.find(t => t.side === st.turn && movableSet.has(t.idx));
            const rep = movableTok || sideToks[0];
            const canPick = Boolean(movableTok);

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className =
              `ludo-tok tok-${side.toLowerCase()}` +
              (canPick ? " movable" : "") +
              (sideToks.length > 1 ? " ludo-tok-stack" : "");
            btn.innerText = side === "A" ? "❤️" : "😘";
            if (sideToks.length > 1) {
              const badge = document.createElement("span");
              badge.className = "ludo-tok-count";
              badge.innerText = `×${sideToks.length}`;
              btn.appendChild(badge);
            }
            btn.setAttribute("aria-label", `Player ${side} token ${rep.idx + 1}`);
            btn.disabled = !canPick;
            if (canPick) {
              btn.onclick = async e => {
                e.stopPropagation();
                const cur = currentLudoDisplayState();
                const movedSide = cur.turn;
                const next = applyLudoTokenMove(cur, rep.idx);
                if (!next) return;
                const nextTokArr = movedSide === "A" ? next.tokensA : next.tokensB;
                const [mr, mc] = getLudoGridCoord(movedSide, nextTokArr[rep.idx], rep.idx);
                next.lastMoveKey = `${mr},${mc}`;
                playEmotionSound(next.captured || next.winner ? "gift" : "happy");
                await commitLudoState(next, `🎲 Ludo: ${next.statusText}`);
                scheduleLudoBotTurn();
              };
            }
            cell.appendChild(btn);
          });
        }
        ludoBoardEl.appendChild(cell);
      }
    }
  }

  modal?.querySelectorAll("[data-ludo-mode]").forEach(btn => {
    btn.addEventListener("click", () => {
      liveLudoMsg = null;
      ludoMode = btn.dataset.ludoMode;
      modal.querySelectorAll("[data-ludo-mode]").forEach(b => b.classList.toggle("active", b === btn));
      ludoState = buildInitialLudo(ludoMode, ludoQuick);
      clearTimeout(ludoBotTimer);
      renderLudoBoard();
    });
  });

  ludoRuleBtn?.addEventListener("click", () => {
    if (liveLudoMsg) return;
    ludoQuick = !ludoQuick;
    ludoRuleBtn.innerText = ludoQuick ? "⚡ Quick" : "🎲 Classic";
    ludoRuleBtn.classList.toggle("active", ludoQuick);
    clearTimeout(ludoBotTimer);
    ludoState = buildInitialLudo(ludoMode, ludoQuick);
    renderLudoBoard();
  });

  ludoRollBtn?.addEventListener("click", async () => {
    const cur = currentLudoDisplayState();
    if (!isMyLudoTurn(cur) || cur.canMove || cur.winner) return;
    const roll = Math.floor(Math.random() * 6) + 1;
    const next = applyLudoDiceRoll(cur, roll);
    if (!next) return;
    triggerDiceSpinAnim();
    playEmotionSound("chime");
    await commitLudoState(next, `🎲 Ludo dice ${roll}: ${next.statusText}`);
    scheduleLudoBotTurn();
  });

  document.getElementById("ludo-reset-btn")?.addEventListener("click", () => {
    liveLudoMsg = null;
    clearTimeout(ludoBotTimer);
    ludoState = buildInitialLudo(ludoMode, ludoQuick);
    renderLudoBoard();
  });

  document.getElementById("ludo-share-btn")?.addEventListener("click", async () => {
    const st = currentLudoDisplayState();
    const homeA = (st.tokensA || []).filter(p => p === 56).length;
    const homeB = (st.tokensB || []).filter(p => p === 56).length;
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "ludo_summary",
        challengeSubtab: "ludo",
        title: "Ludo Couple Match",
        summary: st.winner
          ? `${st.winner === "A" ? "❤️ Janan" : "😘 Partner"} Ludo jeet gaya! (${homeA}/4 vs ${homeB}/4)`
          : `Ludo score: ❤️ ${homeA}/4 Ghar • 😘 ${homeB}/4 Ghar`
      }
    }, "letter");
  });

  document.getElementById("send-ludo-chat-btn")?.addEventListener("click", async () => {
    const uid = myUid();
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "ludo",
        title: "Ludo Couple Board",
        playerA: uid,
        playerB: "",
        ludoState: buildInitialLudo("chat", ludoQuick)
      }
    }, "letter");
  });

  // =========================================
  // 2. FLIRTY & PYARE GAMES
  // =========================================
  modal?.querySelectorAll("[data-wheel-mood]").forEach(btn => {
    btn.addEventListener("click", () => {
      wheelMood = btn.dataset.wheelMood;
      modal.querySelectorAll("[data-wheel-mood]").forEach(b => b.classList.toggle("active", b === btn));
    });
  });

  document.getElementById("spin-wheel-btn")?.addEventListener("click", () => {
    const disc = document.getElementById("flirty-wheel-disc");
    const resEl = document.getElementById("flirty-wheel-result");
    const sendBtn = document.getElementById("send-wheel-btn");
    const list = WHEEL_BANK[wheelMood] || WHEEL_BANK.sweet;
    const filtered = list.filter(x => x !== lastWheelResult);
    const pool = filtered.length ? filtered : list;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    lastWheelResult = pick;

    wheelAngle += 1080 + Math.floor(Math.random() * 360);
    if (disc) disc.style.transform = `rotate(${wheelAngle}deg)`;

    playEmotionSound("love");
    if (resEl) {
      resEl.classList.remove("wheel-pop");
      void resEl.offsetWidth;
      resEl.classList.add("wheel-pop");
      resEl.innerText = pick;
    }
    if (sendBtn) sendBtn.disabled = false;
  });

  document.getElementById("send-wheel-btn")?.addEventListener("click", async () => {
    if (!lastWheelResult) return;
    const picked = lastWheelResult;
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "tdw",
        title: `Flirty Wheel (${wheelMood})`,
        cardType: `🎡 Flirty Wheel (${wheelMood})`,
        creator: myUid(),
        prompt: picked,
        replyText: ""
      }
    }, "letter");
  });

  document.getElementById("wheel-custom-send-btn")?.addEventListener("click", async () => {
    const inp = document.getElementById("wheel-custom-input");
    const val = (inp?.value || "").trim();
    if (!val) {
      inp?.focus();
      return;
    }
    inp.value = "";
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "tdw",
        title: "Custom Flirty Wheel",
        cardType: "🎡 Custom Flirty Task",
        creator: myUid(),
        prompt: val,
        replyText: ""
      }
    }, "letter");
  });

  function shuffleLocalCoupons() {
    localCoupons = shuffleCopy(COUPON_POOL).slice(0, 3);
    localCouponPicked = -1;
    renderLocalCoupons();
  }

  function renderLocalCoupons() {
    const stage = document.getElementById("flirty-coupon-stage");
    if (!stage) return;
    stage.innerHTML = "";
    const labels = ["💌 Card 1", "💖 Card 2", "💋 Card 3"];
    localCoupons.forEach((reward, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      const opened = localCouponPicked === idx;
      b.className = "game-mini-btn" + (opened ? " active" : "");
      b.innerText = localCouponPicked >= 0 ? reward : labels[idx];
      b.disabled = localCouponPicked >= 0;
      b.onclick = () => {
        localCouponPicked = idx;
        playEmotionSound("gift");
        renderLocalCoupons();
      };
      stage.appendChild(b);
    });
  }

  document.getElementById("reset-coupon-btn")?.addEventListener("click", shuffleLocalCoupons);

  document.getElementById("send-coupon-btn")?.addEventListener("click", async () => {
    const shuffled = shuffleCopy(COUPON_POOL).slice(0, 3);
    modal.style.display = "none";
    playEmotionSound("love");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "coupon",
        title: "Mystery Love Coupons",
        creator: myUid(),
        options: shuffled,
        pickedIdx: -1
      }
    }, "letter");
  });

  document.getElementById("send-custom-coupon-btn")?.addEventListener("click", async () => {
    const inp = document.getElementById("coupon-custom-input");
    const val = (inp?.value || "").trim();
    if (!val) {
      inp?.focus();
      return;
    }
    inp.value = "";
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "coupon",
        title: "Special Custom Coupon",
        creator: myUid(),
        options: [val],
        pickedIdx: -1
      }
    }, "letter");
  });

  function renderFlirtyWyr() {
    const host = document.getElementById("flirty-wyr-stage");
    if (!host) return;
    const item = wyrOrder[localWyrIdx % wyrOrder.length];
    host.innerHTML = "";
    const qEl = document.createElement("div");
    qEl.className = "game-card-sub";
    qEl.innerText = item.q;
    host.appendChild(qEl);

    const row = document.createElement("div");
    row.className = "quiz-opt-col";
    [["A", item.optA], ["B", item.optB]].forEach(([k, label]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "game-mini-btn" + (localWyrChoice === k ? " active" : "");
      b.innerText = localWyrChoice === k ? `${label}  (💖 Good Choice!)` : label;
      b.onclick = () => {
        localWyrChoice = k;
        playEmotionSound("love");
        renderFlirtyWyr();
      };
      row.appendChild(b);
    });
    host.appendChild(row);
  }

  document.getElementById("next-wyr-btn")?.addEventListener("click", () => {
    localWyrIdx = (localWyrIdx + 1) % wyrOrder.length;
    if (localWyrIdx === 0) wyrOrder = shuffleCopy(WYR_BANK);
    localWyrChoice = "";
    renderFlirtyWyr();
  });

  document.getElementById("send-wyr-btn")?.addEventListener("click", async () => {
    const pick = wyrOrder[localWyrIdx % wyrOrder.length];
    modal.style.display = "none";
    playEmotionSound("love");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "wyr",
        title: "Would You Rather",
        q: pick.q,
        optA: pick.optA,
        optB: pick.optB,
        creator: myUid(),
        choiceA: "",
        choiceB: ""
      }
    }, "letter");
  });

  document.getElementById("send-custom-wyr-btn")?.addEventListener("click", async () => {
    const aEl = document.getElementById("wyr-custom-a");
    const bEl = document.getElementById("wyr-custom-b");
    const optA = (aEl?.value || "").trim();
    const optB = (bEl?.value || "").trim();
    if (!optA) {
      aEl?.focus();
      return;
    }
    if (!optB) {
      bEl?.focus();
      return;
    }
    aEl.value = "";
    bEl.value = "";
    modal.style.display = "none";
    playEmotionSound("love");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "wyr",
        title: "Would You Rather (Custom)",
        q: "Kya choose karoge?",
        optA,
        optB,
        creator: myUid(),
        choiceA: "",
        choiceB: ""
      }
    }, "letter");
  });

  function pickFreshTdwCard(tier) {
    const pool = TDW_BANK[tier] || TDW_BANK.easy;
    const filtered = pool.filter(c => c.prompt !== currentTdwCard?.prompt);
    const arr = filtered.length ? filtered : pool;
    currentTdwCard = arr[Math.floor(Math.random() * arr.length)];
    renderTdwPreview();
  }

  function renderTdwPreview() {
    const box = document.getElementById("tdw-preview-box");
    if (!box || !currentTdwCard) return;
    box.innerText = `${currentTdwCard.type}: ${currentTdwCard.prompt}`;
  }

  modal?.querySelectorAll("[data-tdw-tier]").forEach(btn => {
    btn.addEventListener("click", () => {
      tdwTier = btn.dataset.tdwTier || "easy";
      modal.querySelectorAll("[data-tdw-tier]").forEach(b => b.classList.toggle("active", b === btn));
      pickFreshTdwCard(tdwTier);
      playEmotionSound("chime");
    });
  });

  document.getElementById("tdw-shuffle-btn")?.addEventListener("click", () => {
    pickFreshTdwCard(tdwTier);
    playEmotionSound("chime");
  });

  document.getElementById("tdw-send-btn")?.addEventListener("click", async () => {
    const pick = currentTdwCard || TDW_BANK.easy[0];
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "tdw",
        title: `${pick.type} Card`,
        cardType: pick.type,
        creator: myUid(),
        prompt: pick.prompt,
        replyText: ""
      }
    }, "letter");
  });

  document.getElementById("tdw-custom-send-btn")?.addEventListener("click", async () => {
    const inp = document.getElementById("tdw-custom-input");
    const val = (inp?.value || "").trim();
    if (!val) {
      inp?.focus();
      return;
    }
    inp.value = "";
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "tdw",
        title: "Custom Truth / Dare",
        cardType: "🎭 Custom Card",
        creator: myUid(),
        prompt: val,
        replyText: ""
      }
    }, "letter");
  });

  // =========================================
  // 3. ASAN GAMES (CONNECT 4, TTT, RPS, QUIZ, POP RUSH)
  // =========================================
  function renderC4Local() {
    const grid = document.getElementById("c4-local-grid");
    const statusEl = document.getElementById("c4-local-status");
    if (!grid) return;
    const winInfo = checkConnect4WinningLine(c4LocalBoard);
    const winCells = new Set(winInfo?.cells || []);

    if (statusEl) {
      if (c4LocalWinner) statusEl.innerText = `${c4LocalWinner} 4-in-a-Row Jeet gaya! 🎉`;
      else if (c4LocalDraw) statusEl.innerText = "Board Bhar Gaya — Draw! 🤝";
      else statusEl.innerText = c4BotBusy ? "🤖 Love Bot soch raha hai..." : "Aapki baari (❤️) — Column tap karein!";
    }
    grid.innerHTML = "";
    for (let i = 0; i < 42; i++) {
      const col = i % 7;
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "c4-cell" + (winCells.has(i) ? " win-cell" : "");
      cell.innerText = c4LocalBoard[i] || "•";
      cell.disabled = Boolean(c4LocalWinner || c4LocalDraw || c4BotBusy);
      cell.onclick = () => {
        if (c4BotBusy || c4LocalWinner || c4LocalDraw) return;
        const res = dropConnect4Disc(c4LocalBoard, col, "❤️");
        if (!res) return;
        c4LocalBoard = res.board;
        c4LocalWinner = res.winner || "";
        c4LocalDraw = res.draw;
        playEmotionSound(res.winner ? "gift" : "chime");
        renderC4Local();
        if (!c4LocalWinner && !c4LocalDraw) {
          c4BotBusy = true;
          renderC4Local();
          setTimeout(() => {
            const bCol = pickConnect4BotCol(c4LocalBoard, "😘", "❤️");
            if (bCol >= 0) {
              const bRes = dropConnect4Disc(c4LocalBoard, bCol, "😘");
              if (bRes) {
                c4LocalBoard = bRes.board;
                c4LocalWinner = bRes.winner || "";
                c4LocalDraw = bRes.draw;
                playEmotionSound(bRes.winner ? "gift" : "happy");
              }
            }
            c4BotBusy = false;
            renderC4Local();
          }, 360);
        }
      };
      grid.appendChild(cell);
    }
  }

  document.getElementById("c4-local-reset")?.addEventListener("click", () => {
    c4LocalBoard = createConnect4Board();
    c4LocalWinner = "";
    c4LocalDraw = false;
    c4BotBusy = false;
    renderC4Local();
  });

  document.getElementById("start-c4-btn")?.addEventListener("click", async () => {
    const uid = myUid();
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "c4",
        title: "Connect 4 Dil",
        board: createConnect4Board(),
        playerA: uid,
        lastMover: uid,
        winnerSymbol: "",
        draw: false
      }
    }, "letter");
  });

  function renderTttLocal() {
    const grid = document.getElementById("ttt-local-grid");
    const statusEl = document.getElementById("ttt-local-status");
    if (!grid) return;
    const winInfo = checkTttWinningLine(tttLocalBoard);
    const winCells = new Set(winInfo?.line || []);

    if (statusEl) {
      if (tttLocalWinner) statusEl.innerText = `${tttLocalWinner} Jeet gaya! 🎉`;
      else if (tttLocalDraw) statusEl.innerText = "Match Draw! 🤝";
      else statusEl.innerText = tttBotBusy ? "🤖 Bot chal raha hai..." : "Aap ❤️ hain — Box par tap karein!";
    }
    grid.innerHTML = "";
    tttLocalBoard.forEach((val, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ttt-cell" + (winCells.has(idx) ? " win-cell" : "");
      b.innerText = val || "";
      b.disabled = Boolean(val || tttLocalWinner || tttLocalDraw || tttBotBusy);
      b.onclick = () => {
        const res = applyTttMove(tttLocalBoard, idx, "❤️");
        if (!res) return;
        tttLocalBoard = res.board;
        tttLocalWinner = res.winner || "";
        tttLocalDraw = res.draw;
        playEmotionSound(res.winner ? "gift" : "chime");
        renderTttLocal();
        if (!tttLocalWinner && !tttLocalDraw) {
          tttBotBusy = true;
          renderTttLocal();
          setTimeout(() => {
            const botIdx = pickTttBotMove(tttLocalBoard, "😘", "❤️");
            if (botIdx >= 0) {
              const bRes = applyTttMove(tttLocalBoard, botIdx, "😘");
              if (bRes) {
                tttLocalBoard = bRes.board;
                tttLocalWinner = bRes.winner || "";
                tttLocalDraw = bRes.draw;
                playEmotionSound(bRes.winner ? "gift" : "happy");
              }
            }
            tttBotBusy = false;
            renderTttLocal();
          }, 300);
        }
      };
      grid.appendChild(b);
    });
  }

  document.getElementById("ttt-local-reset")?.addEventListener("click", () => {
    tttLocalBoard = createInitialTttBoard();
    tttLocalWinner = "";
    tttLocalDraw = false;
    tttBotBusy = false;
    renderTttLocal();
  });

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
        lastMover: uid,
        winnerSymbol: "",
        draw: false
      }
    }, "letter");
  });

  // Instant RPS vs Bot + Chat Live
  modal?.querySelectorAll("[data-rps-local]").forEach(btn => {
    btn.addEventListener("click", () => {
      const icons = { rose: "🌹 Rose", letter: "💌 Letter", scissors: "✂️ Scissors" };
      const moves = ["rose", "letter", "scissors"];
      const you = btn.dataset.rpsLocal;
      const bot = moves[Math.floor(Math.random() * 3)];
      const winner = resolveRpsWinner(you, bot);
      if (winner === "A") rpsScore.you++;
      else if (winner === "B") rpsScore.bot++;
      playEmotionSound(winner === "A" ? "gift" : "chime");
      const out = document.getElementById("rps-local-result");
      if (out) {
        const resLabel = winner === "draw" ? "Barabar! 🤝" : (winner === "A" ? "Aap Jeete! 🎉" : "Bot Jeeta! 🤭");
        out.innerText = `${icons[you]} vs ${icons[bot]} → ${resLabel} (Score: Aap ${rpsScore.you} · Bot ${rpsScore.bot})`;
      }
    });
  });

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

  // Dynamic 24-Question Quiz + Custom Question
  function renderQuizSetup() {
    const quizForm = document.getElementById("quiz-creator-list");
    if (!quizForm) return;
    quizForm.replaceChildren();
    currentQuizSlice.forEach((item, idx) => {
      const box = document.createElement("div");
      box.className = "quiz-setup-item";
      const lbl = document.createElement("div");
      lbl.className = "quiz-q-label";
      lbl.innerText = `${idx + 1}. ${item.q}`;
      const sel = document.createElement("select");
      sel.className = "care-input";
      item.opts.forEach((opt, oi) => {
        const o = document.createElement("option");
        o.value = String(oi);
        o.textContent = opt;
        sel.appendChild(o);
      });
      box.appendChild(lbl);
      box.appendChild(sel);
      quizForm.appendChild(box);
    });
  }

  document.getElementById("shuffle-quiz-btn")?.addEventListener("click", () => {
    currentQuizSlice = shuffleCopy(QUIZ_POOL).slice(0, 4);
    playEmotionSound("chime");
    renderQuizSetup();
  });

  document.getElementById("send-quiz-btn")?.addEventListener("click", async () => {
    const uid = myUid();
    const quizForm = document.getElementById("quiz-creator-list");
    const selects = quizForm?.querySelectorAll("select") || [];
    const questions = currentQuizSlice.map((item, idx) => ({
      q: item.q,
      opts: item.opts,
      correct: Number(selects[idx]?.value || 0)
    }));

    const customQEl = document.getElementById("quiz-custom-q");
    const customAEl = document.getElementById("quiz-custom-ans");
    const customQ = (customQEl?.value || "").trim();
    const customA = (customAEl?.value || "").trim();
    if (customQ && customA) {
      const opts = shuffleCopy([customA, "Pata nahi 🙈", "Surprise! 🎁"]);
      questions.push({
        q: customQ,
        opts,
        correct: opts.indexOf(customA)
      });
      customQEl.value = "";
      customAEl.value = "";
    }

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

  // Heart Pop Rush (15s)
  function updatePopRushHud() {
    const hud = document.getElementById("pop-rush-hud");
    if (hud) {
      hud.innerText = `Score: ${popScore} · ${popTimeLeft}s · Best: ${popBest}`;
    }
  }

  function pickNextPopCell() {
    popActiveIdx = Math.floor(Math.random() * 16);
    popActiveEmoji = POP_EMOJI_POOL[Math.floor(Math.random() * POP_EMOJI_POOL.length)];
    renderPopRushGrid();
  }

  function renderPopRushGrid() {
    const grid = document.getElementById("pop-rush-grid");
    if (!grid) return;
    updatePopRushHud();
    grid.innerHTML = "";
    for (let i = 0; i < 16; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pop-cell";
      if (popRunning && i === popActiveIdx) {
        b.innerText = popActiveEmoji;
        b.onclick = () => {
          if (!popRunning || i !== popActiveIdx) return;
          if (popActiveEmoji === "💣") {
            popScore = Math.max(0, popScore - 2);
            playEmotionSound("chime");
          } else if (popActiveEmoji === "💋") {
            popScore += 3;
            playEmotionSound("gift");
          } else {
            popScore += 1;
            playEmotionSound("happy");
          }
          pickNextPopCell();
        };
      } else {
        b.innerText = popRunning ? "·" : (i % 5 === 0 ? "💖" : "🌸");
        b.disabled = !popRunning;
      }
      grid.appendChild(b);
    }
  }

  function startPopRush() {
    stopPopRush();
    popScore = 0;
    popTimeLeft = 15;
    popRunning = true;
    pickNextPopCell();
    popTickInt = setInterval(() => {
      if (!popRunning || modal?.style.display !== "flex") {
        stopPopRush();
        return;
      }
      pickNextPopCell();
    }, 780);
    popCountdownInt = setInterval(() => {
      if (!popRunning) return;
      popTimeLeft--;
      if (popTimeLeft <= 0) {
        popTimeLeft = 0;
        stopPopRush();
        if (popScore > popBest) {
          popBest = popScore;
          try { localStorage.setItem("sc_pop_best_v1", String(popBest)); } catch {}
        }
        playEmotionSound("gift");
      }
      renderPopRushGrid();
    }, 1000);
  }

  document.getElementById("pop-rush-start-btn")?.addEventListener("click", startPopRush);
  document.getElementById("pop-rush-share-btn")?.addEventListener("click", async () => {
    stopPopRush();
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "score_card",
        challengeSubtab: "easy:pop",
        title: "Heart Pop Rush (15s)",
        summary: `Maine 15s mein ${popScore} hearts pop kiye! (Best: ${popBest}) 💥🏆`
      }
    }, "letter");
  });

  // =========================================
  // 4. MUSHKIL / BRAINY GAMES
  // =========================================
  function render2048Board() {
    if (!g2048BoardEl) return;
    if (g2048ScoreEl) g2048ScoreEl.innerText = `Score: ${g2048Score}`;
    if (g2048BestEl) g2048BestEl.innerText = `Best: ${g2048Best}`;
    if (g2048StatusEl) {
      if (g2048Board.some(v => v >= 2048)) g2048StatusEl.innerText = "🏆 2048 Ban Gaya! Shabash!";
      else if (!can2048Move(g2048Board)) g2048StatusEl.innerText = "😅 Koi move bachi nahi — Game Over!";
      else g2048StatusEl.innerText = "Swipe ya Arrows use karein";
    }
    g2048BoardEl.innerHTML = "";
    g2048Board.forEach(val => {
      const tile = document.createElement("div");
      tile.className = `g2048-cell tile-${val > 2048 ? 2048 : val}`;
      tile.innerText = val ? String(val) : "";
      g2048BoardEl.appendChild(tile);
    });
  }

  function handle2048Move(dir) {
    const res = slide2048Board(g2048Board, dir, true);
    if (!res) return;
    if (!res.changed) {
      render2048Board();
      return;
    }
    g2048Board = res.board;
    g2048Score += res.gained;
    if (g2048Score > g2048Best) {
      g2048Best = g2048Score;
      try { localStorage.setItem("sc_2048_best_v1", String(g2048Best)); } catch {}
    }
    playEmotionSound(res.won || res.gameOver ? "gift" : (res.gained > 0 ? "happy" : "chime"));
    render2048Board();
  }

  modal?.querySelectorAll("[data-g2048-dir]").forEach(btn => {
    btn.addEventListener("click", () => handle2048Move(btn.dataset.g2048Dir));
  });

  if (g2048BoardEl) {
    let sx = 0;
    let sy = 0;
    g2048BoardEl.addEventListener("touchstart", e => {
      const t = e.touches[0];
      sx = t.clientX;
      sy = t.clientY;
    }, { passive: true });
    g2048BoardEl.addEventListener("touchend", e => {
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      handle2048Move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    }, { passive: true });
  }

  document.getElementById("g2048-reset-btn")?.addEventListener("click", () => {
    g2048Board = create2048Board();
    g2048Score = 0;
    render2048Board();
  });

  document.getElementById("g2048-share-btn")?.addEventListener("click", async () => {
    const maxTile = Math.max(...g2048Board);
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "score_card",
        challengeSubtab: "hard:2048",
        title: "Couple 2048 Challenge",
        summary: `Mera Score: ${g2048Score} • Best Tile: ${maxTile} (Record: ${g2048Best}) 🏆`
      }
    }, "letter");
  });

  // Dil Ka Lock Solo + Challenge
  function renderLockLocal() {
    const statusEl = document.getElementById("lock-local-status");
    const histEl = document.getElementById("lock-local-history");
    const picker = document.getElementById("lock-secret-picker");
    const guessBtn = document.getElementById("lock-guess-btn");
    const failed = !lockSolved && lockHistory.length >= 7;

    if (statusEl) {
      if (lockSolved) statusEl.innerText = `Code Crack Ho Gaya! 🎉 Secret: ${lockTarget.join(" ")}`;
      else if (failed) statusEl.innerText = `7 Tries Khatam! Code tha: ${lockTarget.join(" ")}`;
      else statusEl.innerText = `Tries: ${lockHistory.length}/7 · 🎯 Sahi Jagah · 💫 Galat Jagah`;
    }
    if (histEl) {
      histEl.innerHTML = lockHistory
        .map((a, idx) => `<div class="lock-attempt-row">${idx + 1}. ${a.guess.join(" ")} → 🎯${a.exact} 💫${a.partial}</div>`)
        .join("");
    }
    if (picker) {
      picker.innerHTML = "";
      lockGuess.forEach((em, idx) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "lock-slot-btn";
        b.innerText = em;
        b.setAttribute("aria-label", `Lock slot ${idx + 1}`);
        b.onclick = () => {
          const curIdx = LOCK_EMOJIS.indexOf(lockGuess[idx]);
          lockGuess[idx] = LOCK_EMOJIS[(curIdx + 1) % LOCK_EMOJIS.length];
          renderLockLocal();
        };
        picker.appendChild(b);
      });
    }
    if (guessBtn) guessBtn.disabled = lockSolved || failed;
  }

  document.getElementById("lock-guess-btn")?.addEventListener("click", () => {
    if (lockSolved || lockHistory.length >= 7) return;
    const res = evaluateCodeGuess(lockTarget, lockGuess);
    lockHistory.push({ guess: [...lockGuess], exact: res.exact, partial: res.partial });
    lockSolved = res.solved;
    playEmotionSound(res.solved ? "gift" : "chime");
    renderLockLocal();
  });

  document.getElementById("lock-random-btn")?.addEventListener("click", () => {
    lockTarget = Array.from({ length: 4 }, () => LOCK_EMOJIS[Math.floor(Math.random() * LOCK_EMOJIS.length)]);
    lockHistory = [];
    lockSolved = false;
    renderLockLocal();
  });

  document.getElementById("send-lock-btn")?.addEventListener("click", async () => {
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "lock",
        title: "Dil Ka Lock (Code Cracker)",
        creator: myUid(),
        secret: [...lockGuess],
        attempts: [],
        solved: false
      }
    }, "letter");
  });

  // Dots & Boxes Local Bot + Chat
  function renderDotsGridInto(containerEl, st, interactive, onEdgeClick) {
    containerEl.innerHTML = "";
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const rEven = r % 2 === 0;
        const cEven = c % 2 === 0;
        if (rEven && cEven) {
          const dot = document.createElement("div");
          dot.className = "db-dot";
          containerEl.appendChild(dot);
        } else if (rEven && !cEven) {
          const edgeIdx = (r / 2) * 3 + Math.floor(c / 2);
          const owner = st.hEdges?.[edgeIdx] || "";
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "db-hedge" + (owner ? ` taken-${owner.toLowerCase()}` : "");
          btn.setAttribute("aria-label", `Horizontal line ${edgeIdx + 1}`);
          btn.disabled = !interactive || Boolean(owner);
          btn.onclick = e => { e.stopPropagation(); onEdgeClick("h", edgeIdx); };
          containerEl.appendChild(btn);
        } else if (!rEven && cEven) {
          const edgeIdx = Math.floor(r / 2) * 4 + (c / 2);
          const owner = st.vEdges?.[edgeIdx] || "";
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "db-vedge" + (owner ? ` taken-${owner.toLowerCase()}` : "");
          btn.setAttribute("aria-label", `Vertical line ${edgeIdx + 1}`);
          btn.disabled = !interactive || Boolean(owner);
          btn.onclick = e => { e.stopPropagation(); onEdgeClick("v", edgeIdx); };
          containerEl.appendChild(btn);
        } else {
          const bIdx = Math.floor(r / 2) * 3 + Math.floor(c / 2);
          const owner = st.boxes?.[bIdx] || "";
          const cell = document.createElement("div");
          cell.className = "db-box";
          cell.innerText = owner === "A" ? "❤️" : (owner === "B" ? "😘" : "");
          containerEl.appendChild(cell);
        }
      }
    }
  }

  function scheduleDotsBot() {
    if (dotsLocal.winner || dotsLocal.turn !== "B") {
      dotsBotBusy = false;
      renderDotsLocal();
      return;
    }
    dotsBotBusy = true;
    renderDotsLocal();
    setTimeout(() => {
      const edge = pickDotsBotEdge(dotsLocal);
      if (!edge) {
        dotsBotBusy = false;
        renderDotsLocal();
        return;
      }
      const next = claimDotsEdge(dotsLocal, edge.type, edge.idx, "B");
      if (next) {
        dotsLocal = next;
        playEmotionSound(next.completedNow ? "happy" : "chime");
        if (!dotsLocal.winner && dotsLocal.turn === "B") {
          scheduleDotsBot();
          return;
        }
      }
      dotsBotBusy = false;
      renderDotsLocal();
    }, 340);
  }

  function renderDotsLocal() {
    const grid = document.getElementById("dots-local-grid");
    const statusEl = document.getElementById("dots-local-status");
    if (!grid) return;
    if (statusEl) {
      if (dotsLocal.winner) {
        statusEl.innerText = dotsLocal.winner === "draw"
          ? `Barabar (${dotsLocal.scoreA}-${dotsLocal.scoreB}) 🤝`
          : `${dotsLocal.winner === "A" ? "❤️ Aap" : "😘 Bot"} Jeet gaya! (${dotsLocal.scoreA}-${dotsLocal.scoreB}) 🏆`;
      } else {
        statusEl.innerText = `❤️ ${dotsLocal.scoreA} · 😘 ${dotsLocal.scoreB} · ${dotsBotBusy ? "🤖 Bot chal raha hai..." : "Line par tap karein!"}`;
      }
    }
    const canPlay = !dotsLocal.winner && dotsLocal.turn === "A" && !dotsBotBusy;
    renderDotsGridInto(grid, dotsLocal, canPlay, (type, idx) => {
      const next = claimDotsEdge(dotsLocal, type, idx, "A");
      if (!next) return;
      dotsLocal = next;
      playEmotionSound(next.completedNow ? "happy" : "chime");
      if (!dotsLocal.winner && dotsLocal.turn === "B") {
        scheduleDotsBot();
      } else {
        renderDotsLocal();
      }
    });
  }

  document.getElementById("dots-local-reset")?.addEventListener("click", () => {
    dotsLocal = createDotsBoxesState();
    dotsBotBusy = false;
    renderDotsLocal();
  });

  document.getElementById("start-dots-btn")?.addEventListener("click", async () => {
    const uid = myUid();
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "dots",
        title: "Dots & Boxes (Dil Kabza)",
        playerA: uid,
        dotsState: createDotsBoxesState()
      }
    }, "letter");
  });

  // Word Boojho Solo Play + Hint + Custom Send
  function renderWordLocal() {
    const item = wordOrder[wordIdx % wordOrder.length];
    const hintEl = document.getElementById("word-local-hint");
    const maskEl = document.getElementById("word-local-mask");
    const kbEl = document.getElementById("word-local-kb");
    const clueBtn = document.getElementById("word-local-clue");
    const solved = isWordSolved(item.word, wordGuessed);
    const wrong = countWrongGuesses(item.word, wordGuessed);
    const failed = !solved && wrong >= 6;

    if (hintEl) {
      if (solved) hintEl.innerText = "Sahi Boojha! 🎉💖";
      else if (failed) hintEl.innerText = `Chances khatam! Word tha: ${item.word}`;
      else hintEl.innerText = `Hint: ${item.hint} • ❤️ ${Math.max(0, 6 - wrong)}/6`;
    }
    if (maskEl) {
      maskEl.innerText = (solved || failed) ? item.word.split("").join(" ") : getMaskedWord(item.word, wordGuessed);
    }
    if (clueBtn) clueBtn.disabled = solved || failed || wordClueUsed;
    if (kbEl) {
      kbEl.innerHTML = "";
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(ch => {
        const b = document.createElement("button");
        b.type = "button";
        const used = wordGuessed.includes(ch);
        const isHit = used && item.word.includes(ch);
        const isMiss = used && !item.word.includes(ch);
        b.className = "word-kb-btn" + (isHit ? " hit" : "") + (isMiss ? " miss" : "");
        b.innerText = ch;
        b.disabled = solved || failed || used;
        b.onclick = () => {
          wordGuessed.push(ch);
          playEmotionSound(item.word.includes(ch) ? "happy" : "chime");
          renderWordLocal();
        };
        kbEl.appendChild(b);
      });
    }
  }

  document.getElementById("word-local-clue")?.addEventListener("click", () => {
    const item = wordOrder[wordIdx % wordOrder.length];
    if (wordClueUsed) return;
    const unguessed = [...new Set(item.word.split(""))].filter(ch => !wordGuessed.includes(ch));
    if (!unguessed.length) return;
    wordClueUsed = true;
    wordGuessed.push(unguessed[0]);
    playEmotionSound("happy");
    renderWordLocal();
  });

  document.getElementById("word-local-next")?.addEventListener("click", () => {
    wordIdx = (wordIdx + 1) % wordOrder.length;
    if (wordIdx === 0) wordOrder = shuffleCopy(ROMANTIC_WORD_BANK);
    wordGuessed = [];
    wordClueUsed = false;
    renderWordLocal();
  });

  document.getElementById("send-wordgame-btn")?.addEventListener("click", async () => {
    const wInput = document.getElementById("wordgame-word-input");
    const hInput = document.getElementById("wordgame-hint-input");
    const word = normalizeWordGuess(wInput?.value || "");
    const hint = (hInput?.value || "").trim() || "Pyara sa lafz";
    const err = document.getElementById("wordgame-err");
    if (word.length < 2) {
      if (err) err.innerText = "Kam se kam 2 English letters likhein (e.g. JANAN)";
      return;
    }
    wInput.value = "";
    hInput.value = "";
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

  // Sliding Love Puzzle (3x3 / 4x4)
  function updatePuzzleStatus() {
    const el = document.getElementById("puzzle-status");
    if (!el) return;
    el.innerText = puzzleSolved
      ? `Solved! 🎉 ${puzzleMoves} moves · ${puzzleSeconds}s`
      : `Moves: ${puzzleMoves} · ${puzzleSeconds}s`;
  }

  function resetSlidingPuzzle(size = puzzleSize) {
    stopPuzzleTimer();
    puzzleSize = size === 4 ? 4 : 3;
    puzzleBoard = createSlidingPuzzle(puzzleSize);
    puzzleMoves = 0;
    puzzleSeconds = 0;
    puzzleSolved = false;
    renderSlidingPuzzle();
  }

  function renderSlidingPuzzle() {
    const grid = document.getElementById("sliding-puzzle-grid");
    if (!grid) return;
    grid.className = `puzzle-grid size-${puzzleSize}`;
    updatePuzzleStatus();
    grid.innerHTML = "";
    puzzleBoard.forEach((val, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      const isCorrect = val > 0 && val === idx + 1;
      b.className = "puzzle-tile" + (val === 0 ? " empty" : "") + (isCorrect ? " correct" : "");
      b.innerText = val === 0 ? "" : String(val);
      b.setAttribute("aria-label", val === 0 ? "Empty slot" : `Tile ${val}`);
      b.disabled = val === 0 || puzzleSolved;
      if (val !== 0 && !puzzleSolved) {
        b.onclick = () => {
          const moved = moveSlidingTile(puzzleBoard, puzzleSize, idx);
          if (!moved) return;
          if (!puzzleTimerInt && puzzleMoves === 0) {
            puzzleTimerInt = setInterval(() => {
              if (!puzzleSolved && modal?.style.display === "flex" && activeSubtabs.hard === "hard:puzzle") {
                puzzleSeconds++;
                updatePuzzleStatus();
              }
            }, 1000);
          }
          puzzleBoard = moved;
          puzzleMoves++;
          puzzleSolved = isSlidingSolved(puzzleBoard);
          if (puzzleSolved) {
            stopPuzzleTimer();
            playEmotionSound("gift");
          } else {
            playEmotionSound("chime");
          }
          renderSlidingPuzzle();
        };
      }
      grid.appendChild(b);
    });
  }

  modal?.querySelectorAll("[data-puzzle-size]").forEach(btn => {
    btn.addEventListener("click", () => {
      const sz = Number(btn.dataset.puzzleSize) === 4 ? 4 : 3;
      modal.querySelectorAll("[data-puzzle-size]").forEach(b => b.classList.toggle("active", b === btn));
      resetSlidingPuzzle(sz);
    });
  });

  document.getElementById("puzzle-reset-btn")?.addEventListener("click", () => resetSlidingPuzzle(puzzleSize));
  document.getElementById("puzzle-share-btn")?.addEventListener("click", async () => {
    stopPuzzleTimer();
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "score_card",
        challengeSubtab: "hard:puzzle",
        title: `Sliding Love Puzzle (${puzzleSize}×${puzzleSize})`,
        summary: puzzleSolved
          ? `Maine ${puzzleMoves} moves (${puzzleSeconds}s) mein puzzle solve kiya! 🧩🏆`
          : `Puzzle try: ${puzzleMoves} moves (${puzzleSeconds}s) 🧩`
      }
    }, "letter");
  });

  // =========================================
  // 5. ARCADE (CATCHER, SNAKE, BREAKER, MEMORY, REFLEX)
  // =========================================
  modal?.querySelectorAll("[data-catcher-diff]").forEach(btn => {
    btn.addEventListener("click", () => {
      catcherDiff = btn.dataset.catcherDiff;
      modal.querySelectorAll("[data-catcher-diff]").forEach(b => b.classList.toggle("active", b === btn));
    });
  });

  function spawnCatcherItem() {
    const roll = Math.random();
    const isBad = roll < (catcherDiff === "hard" ? 0.28 : 0.18);
    const item = isBad
      ? { glyph: roll < 0.12 ? "💣" : "💔", bad: true, pts: 0 }
      : roll > 0.85
        ? { glyph: "💋", bad: false, pts: 30 }
        : roll > 0.65
          ? { glyph: "🌹", bad: false, pts: 20 }
          : { glyph: "❤️", bad: false, pts: 10 };
    const baseSpd = catcherDiff === "hard" ? 135 : 95;
    catcherItems.push({
      ...item,
      x: 24 + Math.random() * 272,
      y: 12,
      vy: baseSpd + Math.random() * 55
    });
  }

  function updateCatcherHud() {
    if (!catcherHud) return;
    catcherHud.innerText = `Score: ${catcherScore} · ❤️ ${Math.max(0, catcherLives)} · ${Math.ceil(catcherTimeLeft)}s`;
  }

  function renderCatcherFrame() {
    if (!catcherCanvas) return;
    const ctx = catcherCanvas.getContext("2d");
    const w = catcherCanvas.width;
    const h = catcherCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#2b0d1f");
    grad.addColorStop(1, "#521437");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "22px sans-serif";
    for (const it of catcherItems) {
      ctx.fillText(it.glyph, it.x, it.y);
    }

    ctx.fillStyle = "#ff4081";
    ctx.beginPath();
    ctx.roundRect(catcherBasketX - 28, h - 26, 56, 16, 8);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "12px sans-serif";
    ctx.fillText("💖", catcherBasketX, h - 18);
  }

  function stepCatcher(ts) {
    if (!catcherRunning || modal?.style.display !== "flex") {
      stopCatcherLoop();
      return;
    }
    const rawDt = catcherLastTs ? (ts - catcherLastTs) / 1000 : 0.016;
    const dt = Math.min(rawDt, 0.05);
    catcherLastTs = ts;

    catcherTimeLeft = Math.max(0, catcherTimeLeft - dt);
    if (catcherKeys.left) catcherBasketX -= 220 * dt;
    if (catcherKeys.right) catcherBasketX += 220 * dt;
    catcherBasketX = Math.max(30, Math.min(290, catcherBasketX));

    catcherSpawnAcc += dt;
    const spawnEvery = catcherDiff === "hard" ? 0.36 : 0.55;
    if (catcherSpawnAcc >= spawnEvery) {
      catcherSpawnAcc = 0;
      spawnCatcherItem();
    }

    const catchY = 186;
    const keep = [];
    for (const it of catcherItems) {
      it.y += it.vy * dt;
      if (it.y >= catchY - 10 && it.y <= catchY + 14 && Math.abs(it.x - catcherBasketX) <= 32) {
        if (it.bad) {
          catcherLives--;
          playEmotionSound("chime");
        } else {
          catcherScore += it.pts;
          playEmotionSound("happy");
        }
        continue;
      }
      if (it.y < 224) keep.push(it);
    }
    catcherItems = keep;
    updateCatcherHud();
    renderCatcherFrame();

    if (catcherLives <= 0 || catcherTimeLeft <= 0) {
      stopCatcherLoop();
      if (catcherScore > catcherBest) {
        catcherBest = catcherScore;
        try { localStorage.setItem("sc_catcher_best_v1", String(catcherBest)); } catch {}
      }
      playEmotionSound(catcherLives > 0 ? "gift" : "chime");
      if (catcherOverlayMsg) {
        catcherOverlayMsg.innerText = catcherLives <= 0
          ? `Game Over! Score: ${catcherScore} (Best: ${catcherBest})`
          : `Time Up! 🎉 Score: ${catcherScore} (Best: ${catcherBest})`;
      }
      if (catcherOverlay) catcherOverlay.style.display = "flex";
      return;
    }

    catcherRaf = requestAnimationFrame(stepCatcher);
  }

  function startCatcherGame() {
    stopCatcherLoop();
    catcherBasketX = 160;
    catcherItems = [];
    catcherScore = 0;
    catcherLives = 3;
    catcherTimeLeft = 30;
    catcherSpawnAcc = 0;
    catcherLastTs = 0;
    spawnCatcherItem();
    spawnCatcherItem();
    updateCatcherHud();
    if (catcherOverlay) catcherOverlay.style.display = "none";
    catcherRunning = true;
    catcherRaf = requestAnimationFrame(stepCatcher);
  }

  document.getElementById("catcher-start-btn")?.addEventListener("click", startCatcherGame);

  if (catcherCanvas) {
    const moveBasketToClientX = clientX => {
      const rect = catcherCanvas.getBoundingClientRect();
      if (!rect.width) return;
      const x = ((clientX - rect.left) / rect.width) * catcherCanvas.width;
      catcherBasketX = Math.max(30, Math.min(290, x));
    };
    catcherCanvas.addEventListener("pointermove", e => {
      if (catcherRunning) moveBasketToClientX(e.clientX);
    });
    catcherCanvas.addEventListener("pointerdown", e => {
      if (catcherRunning) moveBasketToClientX(e.clientX);
    });
  }

  document.getElementById("catcher-share-btn")?.addEventListener("click", async () => {
    stopCatcherLoop();
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "score_card",
        challengeSubtab: "arcade:catcher",
        title: `Heart Catcher (${catcherDiff === "hard" ? "Mushkil" : "Asan"})`,
        summary: `Maine ${catcherScore} points score kiya! (Best: ${catcherBest}) 💘🏆`
      }
    }, "letter");
  });

  // LOVE SNAKE CANVAS
  modal?.querySelectorAll("[data-snake-speed]").forEach(btn => {
    btn.addEventListener("click", () => {
      snakeSpeed = btn.dataset.snakeSpeed;
      modal.querySelectorAll("[data-snake-speed]").forEach(b => b.classList.toggle("active", b === btn));
    });
  });

  function updateSnakeHud() {
    if (snakeHud) {
      snakeHud.innerText = `Score: ${snakeState.score} · Best: ${snakeBest}`;
    }
  }

  function renderSnakeFrame() {
    if (!snakeCanvas) return;
    const ctx = snakeCanvas.getContext("2d");
    const w = snakeCanvas.width;
    const h = snakeCanvas.height;
    const cw = w / SNAKE_GRID;
    const ch = h / SNAKE_GRID;

    ctx.fillStyle = "#1f0917";
    ctx.fillRect(0, 0, w, h);

    // Subtle grid dots
    ctx.fillStyle = "rgba(255, 182, 193, 0.12)";
    for (let x = 0; x < SNAKE_GRID; x++) {
      for (let y = 0; y < SNAKE_GRID; y++) {
        ctx.fillRect(x * cw + cw / 2 - 1, y * ch + ch / 2 - 1, 2, 2);
      }
    }

    // Apple
    if (snakeState.apple) {
      ctx.font = `${Math.floor(ch * 0.95)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        snakeState.apple.gold ? "👑" : "❤️",
        snakeState.apple.x * cw + cw / 2,
        snakeState.apple.y * ch + ch / 2
      );
    }

    // Snake body
    snakeState.snake.forEach((seg, idx) => {
      ctx.fillStyle = idx === 0 ? "#ff4081" : (idx % 2 === 0 ? "#f48fb1" : "#ec407a");
      ctx.beginPath();
      ctx.roundRect(seg.x * cw + 1.5, seg.y * ch + 1.5, cw - 3, ch - 3, 5);
      ctx.fill();
      if (idx === 0) {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(seg.x * cw + cw * 0.35, seg.y * ch + ch * 0.35, 2, 0, Math.PI * 2);
        ctx.arc(seg.x * cw + cw * 0.65, seg.y * ch + ch * 0.35, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function startSnakeGame() {
    stopSnakeLoop();
    snakeState = createSnakeState(SNAKE_GRID);
    snakeNextDir = "right";
    if (snakeOverlay) snakeOverlay.style.display = "none";
    updateSnakeHud();
    renderSnakeFrame();
    snakeRunning = true;

    const intervalMs = snakeSpeed === "hard" ? 115 : 175;
    snakeTimerInt = setInterval(() => {
      if (!snakeRunning || modal?.style.display !== "flex") {
        stopSnakeLoop();
        return;
      }
      const next = stepSnakeState(snakeState, snakeNextDir, SNAKE_GRID);
      snakeState = next;
      if (next.ate) playEmotionSound("happy");
      if (next.score > snakeBest) {
        snakeBest = next.score;
        try { localStorage.setItem("sc_snake_best_v1", String(snakeBest)); } catch {}
      }
      updateSnakeHud();
      renderSnakeFrame();
      if (!next.alive) {
        stopSnakeLoop();
        playEmotionSound(next.won ? "gift" : "chime");
        if (snakeOverlayMsg) {
          snakeOverlayMsg.innerText = next.won
            ? `Poora Board Jeet Liya! 🏆 Score: ${next.score}`
            : `Oops! Takra gaye 💥 Score: ${next.score} (Best: ${snakeBest})`;
        }
        if (snakeOverlay) snakeOverlay.style.display = "flex";
      }
    }, intervalMs);
  }

  document.getElementById("snake-start-btn")?.addEventListener("click", startSnakeGame);
  modal?.querySelectorAll("[data-snake-dir]").forEach(btn => {
    btn.addEventListener("click", () => {
      snakeNextDir = btn.dataset.snakeDir;
      if (!snakeRunning && snakeOverlay?.style.display !== "none") startSnakeGame();
    });
  });

  if (snakeCanvas) {
    let sx = 0;
    let sy = 0;
    snakeCanvas.addEventListener("touchstart", e => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    snakeCanvas.addEventListener("touchend", e => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
      snakeNextDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    }, { passive: true });
  }

  document.getElementById("snake-share-btn")?.addEventListener("click", async () => {
    stopSnakeLoop();
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "score_card",
        challengeSubtab: "arcade:snake",
        title: `Love Snake (${snakeSpeed === "hard" ? "Fast" : "Slow"})`,
        summary: `Snake Score: ${snakeState.score} • Best: ${snakeBest} 🐍🏆`
      }
    }, "letter");
  });

  // DIL BRICK BREAKER CANVAS
  function resetBreakerBricks() {
    breakerBricks = [];
    const rows = 3;
    const cols = 7;
    const colors = ["#ff4081", "#ec407a", "#f48fb1"];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        breakerBricks.push({
          x: 12 + c * 43,
          y: 22 + r * 22,
          w: 38,
          h: 15,
          color: colors[r],
          alive: true
        });
      }
    }
  }

  function updateBreakerHud() {
    if (breakerHud) {
      breakerHud.innerText = `Score: ${breakerScore} · ❤️ ${Math.max(0, breakerLives)} · Best: ${breakerBest}`;
    }
  }

  function renderBreakerFrame() {
    if (!breakerCanvas) return;
    const ctx = breakerCanvas.getContext("2d");
    const w = breakerCanvas.width;
    const h = breakerCanvas.height;
    ctx.fillStyle = "#220a1b";
    ctx.fillRect(0, 0, w, h);

    for (const br of breakerBricks) {
      if (!br.alive) continue;
      ctx.fillStyle = br.color;
      ctx.beginPath();
      ctx.roundRect(br.x, br.y, br.w, br.h, 5);
      ctx.fill();
    }

    // Paddle
    ctx.fillStyle = "#ffd1dc";
    ctx.beginPath();
    ctx.roundRect(breakerPaddleX - 34, h - 22, 68, 10, 5);
    ctx.fill();

    // Ball
    ctx.fillStyle = "#ff4081";
    ctx.beginPath();
    ctx.arc(breakerBall.x, breakerBall.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(breakerBall.x - 2, breakerBall.y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function stepBreaker(ts) {
    if (!breakerRunning || modal?.style.display !== "flex") {
      stopBreakerLoop();
      return;
    }
    const rawDt = breakerLastTs ? (ts - breakerLastTs) / 1000 : 0.016;
    const dt = Math.min(rawDt, 0.05);
    breakerLastTs = ts;

    if (breakerKeys.left) breakerPaddleX -= 240 * dt;
    if (breakerKeys.right) breakerPaddleX += 240 * dt;
    breakerPaddleX = Math.max(36, Math.min(284, breakerPaddleX));

    breakerBall.x += breakerBall.vx * dt;
    breakerBall.y += breakerBall.vy * dt;

    if (breakerBall.x <= 7) {
      breakerBall.x = 7;
      breakerBall.vx = Math.abs(breakerBall.vx);
    } else if (breakerBall.x >= 313) {
      breakerBall.x = 313;
      breakerBall.vx = -Math.abs(breakerBall.vx);
    }
    if (breakerBall.y <= 7) {
      breakerBall.y = 7;
      breakerBall.vy = Math.abs(breakerBall.vy);
    }

    // Paddle bounce
    const paddleTop = 208;
    if (
      breakerBall.vy > 0 &&
      breakerBall.y >= paddleTop - 7 &&
      breakerBall.y <= paddleTop + 10 &&
      Math.abs(breakerBall.x - breakerPaddleX) <= 38
    ) {
      breakerBall.y = paddleTop - 7;
      const offset = (breakerBall.x - breakerPaddleX) / 38;
      breakerBall.vx = offset * 190;
      breakerBall.vy = -Math.abs(breakerBall.vy);
      playEmotionSound("chime");
    }

    // Brick collision
    for (const br of breakerBricks) {
      if (!br.alive) continue;
      if (
        breakerBall.x + 6 >= br.x &&
        breakerBall.x - 6 <= br.x + br.w &&
        breakerBall.y + 6 >= br.y &&
        breakerBall.y - 6 <= br.y + br.h
      ) {
        br.alive = false;
        breakerBall.vy = -breakerBall.vy;
        breakerScore += 10;
        if (breakerScore > breakerBest) {
          breakerBest = breakerScore;
          try { localStorage.setItem("sc_breaker_best_v1", String(breakerBest)); } catch {}
        }
        playEmotionSound("happy");
        break;
      }
    }

    // Missed bottom
    if (breakerBall.y > 236) {
      breakerLives--;
      playEmotionSound("chime");
      if (breakerLives > 0) {
        breakerBall = { x: breakerPaddleX, y: 185, vx: 135, vy: -155 };
      }
    }

    const cleared = breakerBricks.every(b => !b.alive);
    updateBreakerHud();
    renderBreakerFrame();

    if (breakerLives <= 0 || cleared) {
      stopBreakerLoop();
      playEmotionSound(cleared ? "gift" : "chime");
      if (breakerOverlayMsg) {
        breakerOverlayMsg.innerText = cleared
          ? `Saari Heart Bricks Toot Gayin! 🏆 Score: ${breakerScore}`
          : `Game Over! Score: ${breakerScore} (Best: ${breakerBest})`;
      }
      if (breakerOverlay) breakerOverlay.style.display = "flex";
      return;
    }

    breakerRaf = requestAnimationFrame(stepBreaker);
  }

  function startBreakerGame() {
    stopBreakerLoop();
    breakerPaddleX = 160;
    breakerBall = { x: 160, y: 185, vx: 130, vy: -160 };
    breakerScore = 0;
    breakerLives = 3;
    breakerLastTs = 0;
    resetBreakerBricks();
    updateBreakerHud();
    if (breakerOverlay) breakerOverlay.style.display = "none";
    breakerRunning = true;
    breakerRaf = requestAnimationFrame(stepBreaker);
  }

  document.getElementById("breaker-start-btn")?.addEventListener("click", startBreakerGame);
  if (breakerCanvas) {
    const movePaddle = clientX => {
      const rect = breakerCanvas.getBoundingClientRect();
      if (!rect.width) return;
      const x = ((clientX - rect.left) / rect.width) * breakerCanvas.width;
      breakerPaddleX = Math.max(36, Math.min(284, x));
    };
    breakerCanvas.addEventListener("pointermove", e => { if (breakerRunning) movePaddle(e.clientX); });
    breakerCanvas.addEventListener("pointerdown", e => { if (breakerRunning) movePaddle(e.clientX); });
  }

  document.getElementById("breaker-share-btn")?.addEventListener("click", async () => {
    stopBreakerLoop();
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "score_card",
        challengeSubtab: "arcade:breaker",
        title: "Dil Brick Breaker",
        summary: `Bricks Score: ${breakerScore} • Best: ${breakerBest} 🧱💖`
      }
    }, "letter");
  });

  // KEYBOARD ROUTING ACROSS 2048, CATCHER, SNAKE, BREAKER
  window.addEventListener("keydown", e => {
    if (modal.style.display !== "flex") return;
    if (activeTab === "arcade") {
      const sub = activeSubtabs.arcade;
      if (sub === "arcade:catcher" && catcherRunning) {
        if (e.key === "ArrowLeft" || e.key === "a") catcherKeys.left = true;
        if (e.key === "ArrowRight" || e.key === "d") catcherKeys.right = true;
      } else if (sub === "arcade:breaker" && breakerRunning) {
        if (e.key === "ArrowLeft" || e.key === "a") breakerKeys.left = true;
        if (e.key === "ArrowRight" || e.key === "d") breakerKeys.right = true;
      } else if (sub === "arcade:snake" && snakeRunning) {
        if (e.key === "ArrowUp" || e.key === "w") { e.preventDefault(); snakeNextDir = "up"; }
        if (e.key === "ArrowDown" || e.key === "s") { e.preventDefault(); snakeNextDir = "down"; }
        if (e.key === "ArrowLeft" || e.key === "a") { e.preventDefault(); snakeNextDir = "left"; }
        if (e.key === "ArrowRight" || e.key === "d") { e.preventDefault(); snakeNextDir = "right"; }
      }
    } else if (activeTab === "hard" && activeSubtabs.hard === "hard:2048") {
      if (e.key === "ArrowLeft") { e.preventDefault(); handle2048Move("left"); }
      if (e.key === "ArrowRight") { e.preventDefault(); handle2048Move("right"); }
      if (e.key === "ArrowUp") { e.preventDefault(); handle2048Move("up"); }
      if (e.key === "ArrowDown") { e.preventDefault(); handle2048Move("down"); }
    }
  });
  window.addEventListener("keyup", e => {
    if (e.key === "ArrowLeft" || e.key === "a") {
      catcherKeys.left = false;
      breakerKeys.left = false;
    }
    if (e.key === "ArrowRight" || e.key === "d") {
      catcherKeys.right = false;
      breakerKeys.right = false;
    }
  });

  // MEMORY MATCH
  modal?.querySelectorAll("[data-mem-diff]").forEach(btn => {
    btn.addEventListener("click", () => {
      memPairsCount = btn.dataset.memDiff === "hard" ? 8 : 6;
      modal.querySelectorAll("[data-mem-diff]").forEach(b => b.classList.toggle("active", b === btn));
      startMemoryGame();
    });
  });

  function startMemoryGame() {
    const base = MEMORY_POOL.slice(0, memPairsCount);
    memCards = shuffleCopy([...base, ...base]);
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
            }, 600);
          }
        }
      };
      memoryBoard.appendChild(btn);
    });
    if (memMatched.size < memCards.length) {
      memoryStatus.innerText = `Pairs: ${memMatched.size / 2}/${memPairsCount} • Moves: ${memMoves}`;
    }
  }

  document.getElementById("memory-restart-btn")?.addEventListener("click", startMemoryGame);
  document.getElementById("memory-share-btn")?.addEventListener("click", async () => {
    const sec = Math.max(1, Math.round((Date.now() - memStartMs) / 1000));
    const solved = memMatched.size === memCards.length;
    modal.style.display = "none";
    playEmotionSound("happy");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "memory_score",
        challengeSubtab: "arcade:memory",
        title: `Heart Memory (${memPairsCount === 8 ? "Mushkil 4×4" : "Asan 4×3"})`,
        moves: memMoves,
        seconds: sec,
        solved
      }
    }, "letter");
  });

  // LOVE REFLEX DUEL (3 ROUNDS)
  function renderReflexUi() {
    const pad = document.getElementById("reflex-pad");
    const hud = document.getElementById("reflex-hud");
    const listEl = document.getElementById("reflex-rounds-list");
    if (hud) hud.innerText = reflexBestAvg ? `Best Avg: ${reflexBestAvg} ms` : "Best: — ms";

    if (pad) {
      pad.className = "reflex-pad" + (reflexPhase === "waiting" ? " waiting" : (reflexPhase === "ready" ? " ready" : ""));
      if (reflexPhase === "idle") {
        pad.innerText = reflexTimes.length
          ? `Round ${reflexRound}/3 • Last: ${reflexTimes[reflexTimes.length - 1]}ms\nTap for Next Round!`
          : "💖 Tap to Start Reflex Test!";
      } else if (reflexPhase === "waiting") {
        pad.innerText = `Round ${reflexRound + 1}/3: Intezaar karo...\nGREEN hone par turant tap karna! ⏳`;
      } else if (reflexPhase === "ready") {
        pad.innerText = "⚡ ABHI TAP KARO! 💖";
      } else if (reflexPhase === "done") {
        const avg = Math.round(reflexTimes.reduce((s, n) => s + n, 0) / Math.max(1, reflexTimes.length));
        pad.innerText = `🏆 Complete! Average: ${avg} ms\nTap karke Dobara Khelein!`;
      }
    }
    if (listEl) {
      listEl.innerText = reflexTimes.length
        ? `Rounds: ${reflexTimes.map((t, i) => `R${i + 1}: ${t}ms`).join(" · ")}`
        : "3 rounds ka average speed dekhein!";
    }
  }

  function startReflexRound() {
    clearTimeout(reflexWaitTimer);
    if (reflexPhase === "done" || reflexRound >= 3) {
      reflexRound = 0;
      reflexTimes = [];
    }
    reflexPhase = "waiting";
    renderReflexUi();
    const delay = 1100 + Math.floor(Math.random() * 1700);
    reflexWaitTimer = setTimeout(() => {
      if (modal?.style.display !== "flex" || activeSubtabs.arcade !== "arcade:reflex") {
        reflexPhase = "idle";
        return;
      }
      reflexPhase = "ready";
      reflexReadyAt = performance.now();
      playEmotionSound("chime");
      renderReflexUi();
    }, delay);
  }

  document.getElementById("reflex-pad")?.addEventListener("click", () => {
    if (reflexPhase === "idle" || reflexPhase === "done") {
      startReflexRound();
    } else if (reflexPhase === "waiting") {
      clearTimeout(reflexWaitTimer);
      reflexPhase = "idle";
      const pad = document.getElementById("reflex-pad");
      if (pad) pad.innerText = "🤭 Jaldi tap kar diya! Dobara tap karein";
      playEmotionSound("chime");
    } else if (reflexPhase === "ready") {
      const ms = Math.max(80, Math.round(performance.now() - reflexReadyAt));
      reflexTimes.push(ms);
      reflexRound++;
      playEmotionSound("happy");
      if (reflexRound >= 3) {
        reflexPhase = "done";
        const avg = Math.round(reflexTimes.reduce((s, n) => s + n, 0) / 3);
        if (!reflexBestAvg || avg < reflexBestAvg) {
          reflexBestAvg = avg;
          try { localStorage.setItem("sc_reflex_best_v1", String(reflexBestAvg)); } catch {}
        }
        playEmotionSound("gift");
      } else {
        reflexPhase = "idle";
      }
      renderReflexUi();
    }
  });

  document.getElementById("reflex-share-btn")?.addEventListener("click", async () => {
    stopReflex();
    const avg = reflexTimes.length
      ? Math.round(reflexTimes.reduce((s, n) => s + n, 0) / reflexTimes.length)
      : (reflexBestAvg || 0);
    modal.style.display = "none";
    playEmotionSound("gift");
    await chat.sendEncryptedMessage({
      gameData: {
        kind: "score_card",
        challengeSubtab: "arcade:reflex",
        title: "Love Reflex Duel",
        summary: avg
          ? `Mera Reflex Speed: ${avg} ms average! (Best: ${reflexBestAvg || avg} ms) ⚡🏆`
          : "Love Reflex Challenge accept karo! ⚡"
      }
    }, "letter");
  });

  // =========================================
  // INTERACTIVE CHAT BUBBLE RENDERER
  // =========================================
  function appendCreatorBadge(box, isCreator) {
    const b = document.createElement("span");
    b.className = "game-creator-badge";
    b.innerText = isCreator ? "✨ Aapne banaya" : "🎮 Love ka Challenge";
    box.appendChild(b);
  }

  function renderGameBubble(m) {
    const dec = m.decrypted || {};
    const gd = dec.gameData || {};
    const uid = myUid();
    const box = document.createElement("div");
    box.className = "game-card-msg";

    if (gd.kind === "ludo") {
      const st = gd.ludoState || buildInitialLudo("chat", ludoQuick);
      const homeA = (st.tokensA || []).filter(p => p === 56).length;
      const homeB = (st.tokensB || []).filter(p => p === 56).length;
      const mySide = gd.playerA === uid ? "A" : "B";
      const myTurn = !st.winner && st.turn === mySide;

      appendCreatorBadge(box, gd.playerA === uid);
      const head = document.createElement("div");
      head.className = "game-card-head";
      head.innerText = "🎲 Ludo Couple Match";
      box.appendChild(head);

      const sub = document.createElement("div");
      sub.className = "game-card-sub";
      sub.innerText = `❤️ Ghar: ${homeA}/4 · 😘 Ghar: ${homeB}/4\n${st.statusText || ""}`;
      box.appendChild(sub);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "game-mini-btn" + (myTurn ? " active" : "");
      btn.innerText = st.winner
        ? "🏆 Board Dekhein"
        : (myTurn ? "🎲 Aapki Baari — Board Kholen" : "👀 Live Board Dekhein");
      btn.onclick = e => {
        e.stopPropagation();
        liveLudoMsg = { id: m.id, dec };
        showTab("ludo");
        modal.style.display = "flex";
      };
      box.appendChild(btn);
      return box;
    }

    if (gd.kind === "c4") {
      const mySym = gd.playerA === uid ? "❤️" : "😘";
      const canMove = !gd.winnerSymbol && !gd.draw && gd.lastMover !== uid;
      appendCreatorBadge(box, gd.playerA === uid);

      const head = document.createElement("div");
      head.className = "game-card-head";
      head.innerText = "🍓 Connect 4 Dil (4-in-a-Row)";
      box.appendChild(head);

      const sub = document.createElement("div");
      sub.className = "game-card-sub";
      if (gd.winnerSymbol) sub.innerText = `${gd.winnerSymbol} 4-in-a-Row Jeet gaya! 🎉`;
      else if (gd.draw) sub.innerText = "Board Bhar Gaya — Draw! 🤝";
      else sub.innerText = canMove ? `Aapki baari (${mySym}) — Column chunein` : "Love ki baari ka intezar...";
      box.appendChild(sub);

      const board = gd.board || createConnect4Board();
      const winCells = new Set(checkConnect4WinningLine(board)?.cells || []);
      const grid = document.createElement("div");
      grid.className = "c4-grid";
      for (let i = 0; i < 42; i++) {
        const col = i % 7;
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "c4-cell" + (winCells.has(i) ? " win-cell" : "");
        cell.innerText = board[i] || "•";
        cell.disabled = !canMove;
        cell.onclick = async e => {
          e.stopPropagation();
          const res = dropConnect4Disc(board, col, mySym);
          if (!res) return;
          playEmotionSound(res.winner ? "gift" : "chime");
          const endNotice = res.winner
            ? `🍓 Connect 4 khatam! ${res.winner} Jeet gaya! 🎉`
            : (res.draw ? "🍓 Connect 4 Draw ho gaya! 🤝" : "");
          await chat.updateEncryptedMessage(
            m.id,
            {
              ...dec,
              gameData: {
                ...gd,
                board: res.board,
                lastMover: uid,
                lastUpdatedBy: uid,
                lastActionText: endNotice || `🍓 Connect 4 mein ${mySym} ne chaal chali!`,
                winnerSymbol: res.winner || "",
                draw: res.draw
              }
            },
            { notifyPartner: true, alertKind: "letter", gameNoticeText: endNotice }
          );
        };
        grid.appendChild(cell);
      }
      box.appendChild(grid);
      return box;
    }

    if (gd.kind === "dots") {
      const st = gd.dotsState || createDotsBoxesState();
      const mySide = gd.playerA === uid ? "A" : "B";
      const canMove = !st.winner && st.turn === mySide;
      appendCreatorBadge(box, gd.playerA === uid);

      const head = document.createElement("div");
      head.className = "game-card-head";
      head.innerText = "📦 Dots & Boxes (Dil Kabza)";
      box.appendChild(head);

      const sub = document.createElement("div");
      sub.className = "game-card-sub";
      if (st.winner) {
        sub.innerText = st.winner === "draw"
          ? `Barabar (${st.scoreA}-${st.scoreB}) 🤝`
          : `${st.winner === "A" ? "❤️ A" : "😘 B"} Jeet gaya! (${st.scoreA}-${st.scoreB}) 🏆`;
      } else {
        sub.innerText = `❤️ ${st.scoreA} · 😘 ${st.scoreB} · ${canMove ? "Aapki chaal!" : "Intezar..."}`;
      }
      box.appendChild(sub);

      const dbGrid = document.createElement("div");
      dbGrid.className = "dots-grid";
      renderDotsGridInto(dbGrid, st, canMove, async (type, edgeIdx) => {
        const next = claimDotsEdge(st, type, edgeIdx, mySide);
        if (!next) return;
        playEmotionSound(next.completedNow ? "happy" : "chime");
        const endNotice = next.winner
          ? (next.winner === "draw"
            ? `📦 Dots & Boxes Draw (${next.scoreA}-${next.scoreB}) 🤝`
            : `📦 Dots & Boxes Jeeta: ${next.winner === "A" ? "❤️ Player A" : "😘 Player B"} (${next.scoreA}-${next.scoreB}) 🏆`)
          : "";
        await chat.updateEncryptedMessage(
          m.id,
          {
            ...dec,
            gameData: {
              ...gd,
              dotsState: next,
              lastUpdatedBy: uid,
              lastActionText: endNotice || `📦 Dots & Boxes mein line lagi (❤️ ${next.scoreA} · 😘 ${next.scoreB})`
            }
          },
          { notifyPartner: true, alertKind: "letter", gameNoticeText: endNotice }
        );
      });
      box.appendChild(dbGrid);
      return box;
    }

    if (gd.kind === "lock") {
      const secret = gd.secret || LOCK_EMOJIS.slice(0, 4);
      const attempts = gd.attempts || [];
      const solved = Boolean(gd.solved);
      const failed = !solved && attempts.length >= 7;
      appendCreatorBadge(box, gd.creator === uid);

      const head = document.createElement("div");
      head.className = "game-card-head";
      head.innerText = "🔐 Dil Ka Lock (Mushkil Code)";
      box.appendChild(head);

      const sub = document.createElement("div");
      sub.className = "game-card-sub";
      if (solved) sub.innerText = `Code Crack Ho Gaya! 🎉 Secret: ${secret.join(" ")}`;
      else if (failed) sub.innerText = `7 Tries Khatam! Code tha: ${secret.join(" ")}`;
      else sub.innerText = `Tries: ${attempts.length}/7 · 🎯 Sahi Jagah · 💫 Galat Jagah`;
      box.appendChild(sub);

      attempts.forEach((att, idx) => {
        const row = document.createElement("div");
        row.className = "lock-attempt-row";
        row.innerText = `${idx + 1}. ${(att.guess || []).join(" ")}  → 🎯${att.exact} 💫${att.partial}`;
        box.appendChild(row);
      });

      if (!solved && !failed && gd.creator !== uid) {
        const guess = ["❤️", "❤️", "❤️", "❤️"];
        const picker = document.createElement("div");
        picker.className = "lock-secret-picker";
        for (let i = 0; i < 4; i++) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "lock-slot-btn";
          b.innerText = guess[i];
          b.onclick = e => {
            e.stopPropagation();
            const cur = LOCK_EMOJIS.indexOf(guess[i]);
            guess[i] = LOCK_EMOJIS[(cur + 1) % LOCK_EMOJIS.length];
            b.innerText = guess[i];
          };
          picker.appendChild(b);
        }
        box.appendChild(picker);

        const tryBtn = document.createElement("button");
        tryBtn.type = "button";
        tryBtn.className = "game-mini-btn active";
        tryBtn.innerText = "🔓 Code Check Karein";
        tryBtn.onclick = async e => {
          e.stopPropagation();
          const res = evaluateCodeGuess(secret, guess);
          const nextAttempts = [...attempts, { guess: [...guess], exact: res.exact, partial: res.partial }];
          const nextFailed = !res.solved && nextAttempts.length >= 7;
          playEmotionSound(res.solved ? "gift" : "chime");
          const endNotice = res.solved
            ? `🔐 Dil Ka Lock ${nextAttempts.length} tries mein Crack ho gaya! 🎉`
            : (nextFailed ? `🔐 Dil Ka Lock ki 7 tries khatam! Secret tha: ${secret.join(" ")}` : "");
          await chat.updateEncryptedMessage(
            m.id,
            {
              ...dec,
              gameData: {
                ...gd,
                attempts: nextAttempts,
                solved: res.solved,
                lastUpdatedBy: uid,
                lastActionText: endNotice || `🔐 Lock Try #${nextAttempts.length}: 🎯${res.exact} 💫${res.partial}`
              }
            },
            { notifyPartner: true, alertKind: "letter", gameNoticeText: endNotice }
          );
        };
        box.appendChild(tryBtn);
      }
      return box;
    }

    if (gd.kind === "coupon") {
      appendCreatorBadge(box, gd.creator === uid);
      const head = document.createElement("div");
      head.className = "game-card-head";
      head.innerText = `💋 ${gd.title || "Mystery Love Coupons"}`;
      box.appendChild(head);

      const pickedIdx = Number.isInteger(gd.pickedIdx) ? gd.pickedIdx : -1;
      if (pickedIdx >= 0) {
        const res = document.createElement("div");
        res.className = "game-card-answer";
        res.innerText = `🎁 Jeeta Gaya Coupon:\n${gd.options?.[pickedIdx] || "Love Surprise"} 💖`;
        box.appendChild(res);
      } else if (gd.creator === uid) {
        const sub = document.createElement("div");
        sub.className = "game-card-sub";
        sub.innerText = `${(gd.options || []).length} Mystery Love Coupon bhej diya — Love ko kholne do ⏳`;
        box.appendChild(sub);
      } else {
        const opts = gd.options || [];
        const sub = document.createElement("div");
        sub.className = "game-card-sub";
        sub.innerText = opts.length === 1
          ? "Special sealed love coupon tap karke kholo:"
          : "Koi 1 pyara mystery card tap karke apna gift jeeto:";
        box.appendChild(sub);
        const row = document.createElement("div");
        row.className = "game-btn-row";
        const cardLabels = opts.length === 1 ? ["🎁 Coupon Kholen"] : ["💌 Card 1", "💖 Card 2", "💋 Card 3"];
        opts.forEach((_, idx) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "game-mini-btn" + (opts.length === 1 ? " active" : "");
          b.innerText = cardLabels[idx] || `🎁 Card ${idx + 1}`;
          b.onclick = async e => {
            e.stopPropagation();
            const wonText = opts[idx] || "Love Surprise";
            playEmotionSound("gift");
            await chat.updateEncryptedMessage(
              m.id,
              {
                ...dec,
                gameData: {
                  ...gd,
                  pickedIdx: idx,
                  lastUpdatedBy: uid,
                  lastActionText: `💋 Love ne Coupon khola: ${wonText}`
                }
              },
              {
                notifyPartner: true,
                alertKind: "letter",
                gameNoticeText: `💋 Mystery Love Coupon khul gaya!\n🎁 Jeeta: ${wonText}`
              }
            );
          };
          row.appendChild(b);
        });
        box.appendChild(row);
      }
      return box;
    }

    if (gd.kind === "wyr") {
      const isCreator = gd.creator === uid;
      const myChoice = isCreator ? gd.choiceA : gd.choiceB;
      const bothDone = Boolean(gd.choiceA && gd.choiceB);
      appendCreatorBadge(box, isCreator);

      const head = document.createElement("div");
      head.className = "game-card-head";
      head.innerText = "🔥 Would You Rather";
      box.appendChild(head);

      const qEl = document.createElement("div");
      qEl.className = "game-card-prompt";
      qEl.innerText = gd.q || "Kya choose karoge?";
      box.appendChild(qEl);

      if (bothDone) {
        const match = gd.choiceA === gd.choiceB;
        const ans = document.createElement("div");
        ans.className = "game-card-answer";
        ans.innerText =
          `❤️ A: ${gd.choiceA === "A" ? gd.optA : gd.optB}\n` +
          `😘 B: ${gd.choiceB === "A" ? gd.optA : gd.optB}\n` +
          (match ? "💯 Same Dil Match!" : "🤭 Cute Alag Pasand!");
        box.appendChild(ans);
      } else {
        const col = document.createElement("div");
        col.className = "quiz-opt-col";
        [["A", gd.optA], ["B", gd.optB]].forEach(([key, label]) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "game-mini-btn" + (myChoice === key ? " active" : "");
          b.innerText = label;
          b.onclick = async e => {
            e.stopPropagation();
            const nextGd = {
              ...gd,
              ...(isCreator ? { choiceA: key } : { choiceB: key }),
              lastUpdatedBy: uid
            };
            const finished = Boolean(nextGd.choiceA && nextGd.choiceB);
            const match = nextGd.choiceA === nextGd.choiceB;
            nextGd.lastActionText = finished
              ? `🔥 Would You Rather Complete! ${match ? "💯 Same Choice!" : "🤭 Alag Pasand!"}`
              : "🔥 Would You Rather par choice lock hui!";
            playEmotionSound("love");
            await chat.updateEncryptedMessage(
              m.id,
              { ...dec, gameData: nextGd },
              {
                notifyPartner: true,
                alertKind: "letter",
                gameNoticeText: finished
                  ? `🔥 Would You Rather Result:\n❤️ A: ${nextGd.choiceA === "A" ? gd.optA : gd.optB}\n😘 B: ${nextGd.choiceB === "A" ? gd.optA : gd.optB}\n${match ? "💯 Same Dil Match!" : "🤭 Cute Alag Pasand!"}`
                  : ""
              }
            );
          };
          col.appendChild(b);
        });
        box.appendChild(col);
      }
      return box;
    }

    if (gd.kind === "ttt") {
      const mySym = gd.playerA === uid ? "❤️" : "😘";
      const canMove = !gd.winnerSymbol && !gd.draw && gd.lastMover !== uid;
      appendCreatorBadge(box, gd.playerA === uid);

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

      const board = gd.board || createInitialTttBoard();
      const winCells = new Set(checkTttWinningLine(board)?.line || []);
      const grid = document.createElement("div");
      grid.className = "ttt-grid";
      board.forEach((cell, idx) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "ttt-cell" + (winCells.has(idx) ? " win-cell" : "");
        b.innerText = cell || "";
        b.disabled = !canMove || Boolean(cell);
        b.onclick = async e => {
          e.stopPropagation();
          const res = applyTttMove(board, idx, mySym);
          if (!res) return;
          playEmotionSound(res.winner ? "gift" : "chime");
          const endNotice = res.winner
            ? `🎮 Tic-Tac-Toe khatam! ${res.winner} Jeet gaya! 🎉`
            : (res.draw ? "🎮 Tic-Tac-Toe Draw ho gaya! 🤝" : "");
          await chat.updateEncryptedMessage(
            m.id,
            {
              ...dec,
              gameData: {
                ...gd,
                board: res.board,
                lastMover: uid,
                lastUpdatedBy: uid,
                lastActionText: endNotice || `🎮 Tic-Tac-Toe mein ${mySym} ne chaal chali!`,
                winnerSymbol: res.winner || "",
                draw: res.draw
              }
            },
            { notifyPartner: true, alertKind: "letter", gameNoticeText: endNotice }
          );
        };
        grid.appendChild(b);
      });
      box.appendChild(grid);
      return box;
    }

    if (gd.kind === "rps") {
      const icons = { rose: "🌹 Rose", letter: "💌 Letter", scissors: "✂️ Scissors" };
      appendCreatorBadge(box, gd.playerA === uid);
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
            const winLabel = win === "draw" ? "Barabar! 🤝" : (win === "A" ? "Challenger Jeeta! 🏆" : "Partner Jeeta! 🏆");
            const summary = `🌹 RPS Result: ${icons[gd.moveA]} vs ${icons[mv]} → ${winLabel}`;
            playEmotionSound("gift");
            await chat.updateEncryptedMessage(
              m.id,
              {
                ...dec,
                gameData: {
                  ...gd,
                  playerB: uid,
                  moveB: mv,
                  winner: win,
                  lastUpdatedBy: uid,
                  lastActionText: summary
                }
              },
              { notifyPartner: true, alertKind: "letter", gameNoticeText: summary }
            );
          };
          row.appendChild(b);
        });
        box.appendChild(row);
      }
      return box;
    }

    if (gd.kind === "tdw") {
      if (gd.creator) appendCreatorBadge(box, gd.creator === uid);
      const head = document.createElement("div");
      head.className = "game-card-head";
      head.innerText = `🎲 ${gd.cardType || "Card"}`;
      box.appendChild(head);
      const promptEl = document.createElement("div");
      promptEl.className = "game-card-prompt";
      promptEl.innerText = gd.prompt || "";
      box.appendChild(promptEl);

      if (gd.replyText) {
        const rep = document.createElement("div");
        rep.className = "game-card-answer";
        rep.innerText = `💖 Jawab: ${gd.replyText}`;
        box.appendChild(rep);
      } else {
        const sendTdwReply = async val => {
          if (!val) return;
          playEmotionSound("love");
          await chat.updateEncryptedMessage(
            m.id,
            {
              ...dec,
              gameData: {
                ...gd,
                replyText: val,
                lastUpdatedBy: uid,
                lastActionText: `🎭 ${gd.cardType || "Card"} ka jawab: ${val}`
              }
            },
            {
              notifyPartner: true,
              alertKind: "letter",
              gameNoticeText: `🎭 ${gd.cardType || "Card"} complete!\n"${gd.prompt}"\n💖 Jawab: ${val}`
            }
          );
        };

        const quickRow = document.createElement("div");
        quickRow.className = "game-btn-row";
        ["😘 Done!", "🙈 Shy", "❤️ Love it"].forEach(chip => {
          const qb = document.createElement("button");
          qb.type = "button";
          qb.className = "game-mini-btn";
          qb.innerText = chip;
          qb.onclick = e => {
            e.stopPropagation();
            sendTdwReply(chip);
          };
          quickRow.appendChild(qb);
        });
        box.appendChild(quickRow);

        const row = document.createElement("div");
        row.className = "game-inline-reply";
        const inp = document.createElement("input");
        inp.type = "text";
        inp.className = "game-inline-input";
        inp.placeholder = "Yahan jawab likhein...";
        inp.onclick = e => e.stopPropagation();
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "game-mini-btn active";
        btn.innerText = "Bhejein";
        btn.onclick = e => {
          e.stopPropagation();
          sendTdwReply(inp.value.trim());
        };
        row.appendChild(inp);
        row.appendChild(btn);
        box.appendChild(row);
      }
      return box;
    }

    if (gd.kind === "quiz") {
      appendCreatorBadge(box, gd.creator === uid);
      const head = document.createElement("div");
      head.className = "game-card-head";
      head.innerText = "🧠 Compatibility Quiz";
      box.appendChild(head);

      const qs = gd.questions || [];
      if (gd.completed) {
        const res = document.createElement("div");
        res.className = "game-card-answer";
        res.innerText = `Score: ${gd.score}/${qs.length} Match! 💯💖`;
        box.appendChild(res);

        // Question-by-question breakdown so creator sees exact answers!
        qs.forEach((item, qi) => {
          const pAnsIdx = gd.partnerAnswers?.[qi];
          const right = String(item.correct) === String(pAnsIdx);
          const row = document.createElement("div");
          row.className = "game-card-sub";
          row.innerText = `${right ? "✅" : "❌"} ${qi + 1}. ${item.q}\n   Love: ${item.opts?.[pAnsIdx] || "—"} (Sahi: ${item.opts?.[item.correct] || "—"})`;
          box.appendChild(row);
        });
      } else if (gd.creator === uid) {
        const sub = document.createElement("div");
        sub.className = "game-card-sub";
        sub.innerText = "Quiz bhej diya gaya — Love ke jawab ka intezar ⏳";
        box.appendChild(sub);
      } else {
        const answers = [...(gd.partnerAnswers || [])];
        qs.forEach((item, qi) => {
          const qDiv = document.createElement("div");
          qDiv.className = "quiz-play-q";
          const qTitle = document.createElement("div");
          qTitle.className = "quiz-play-title";
          qTitle.innerText = `${qi + 1}. ${item.q}`;
          qDiv.appendChild(qTitle);

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
                const notice = `🧠 Couple Quiz Complete! Score: ${score}/${qs.length} Match! 💯💖`;
                await chat.updateEncryptedMessage(
                  m.id,
                  {
                    ...dec,
                    gameData: {
                      ...gd,
                      partnerAnswers: answers,
                      completed: true,
                      score,
                      lastUpdatedBy: uid,
                      lastActionText: notice
                    }
                  },
                  { notifyPartner: true, alertKind: "letter", gameNoticeText: notice }
                );
              } else {
                await chat.updateEncryptedMessage(
                  m.id,
                  {
                    ...dec,
                    gameData: {
                      ...gd,
                      partnerAnswers: answers,
                      lastUpdatedBy: uid,
                      lastActionText: `🧠 Quiz progress: ${answers.filter(x => x !== undefined).length}/${qs.length} sawal`
                    }
                  },
                  { notifyPartner: false }
                );
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
      appendCreatorBadge(box, gd.creator === uid);

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
          const used = guessed.includes(ch);
          const hit = used && gd.word.includes(ch);
          const miss = used && !gd.word.includes(ch);
          b.className = "word-kb-btn" + (hit ? " hit" : "") + (miss ? " miss" : "");
          b.innerText = ch;
          b.disabled = used;
          b.onclick = async e => {
            e.stopPropagation();
            if (used) return;
            const nextGuessed = [...guessed, ch];
            const nextSolved = isWordSolved(gd.word, nextGuessed);
            const nextFailed = !nextSolved && countWrongGuesses(gd.word, nextGuessed) >= 6;
            const endNotice = nextSolved
              ? `🔤 Word Boojho Solved! Lafz tha: ${gd.word} 🎉💖`
              : (nextFailed ? `🔤 Word Boojho khatam! Sahi lafz tha: ${gd.word}` : "");
            playEmotionSound(gd.word.includes(ch) ? "happy" : "chime");
            await chat.updateEncryptedMessage(
              m.id,
              {
                ...dec,
                gameData: {
                  ...gd,
                  guessed: nextGuessed,
                  lastUpdatedBy: uid,
                  lastActionText: endNotice || `🔤 Word Boojho letter try: ${ch}`
                }
              },
              { notifyPartner: Boolean(endNotice), alertKind: "letter", gameNoticeText: endNotice }
            );
          };
          kb.appendChild(b);
        });
        box.appendChild(kb);
      }
      return box;
    }

    if (gd.kind === "ludo_summary" || gd.kind === "score_card") {
      const head = document.createElement("div");
      head.className = "game-card-head";
      head.innerText = `🏆 ${gd.title || "Game Score"}`;
      const sub = document.createElement("div");
      sub.className = "game-card-sub";
      sub.innerText = gd.summary || "";
      box.appendChild(head);
      box.appendChild(sub);

      if (gd.challengeSubtab) {
        const cBtn = document.createElement("button");
        cBtn.type = "button";
        cBtn.className = "game-mini-btn active";
        cBtn.innerText = "⚔️ Challenge Beat Karo";
        cBtn.onclick = e => {
          e.stopPropagation();
          openGameSubtab(gd.challengeSubtab);
        };
        box.appendChild(cBtn);
      }
      return box;
    }

    // memory_score
    const head = document.createElement("div");
    head.className = "game-card-head";
    head.innerText = `🃏 ${gd.title || "Heart Memory Challenge"}`;
    const sub = document.createElement("div");
    sub.className = "game-card-sub";
    sub.innerText = gd.solved
      ? `Maine ${gd.moves} moves (${gd.seconds}s) mein complete kiya! 🏆`
      : `Moves: ${gd.moves} (${gd.seconds}s)`;
    box.appendChild(head);
    box.appendChild(sub);

    const mBtn = document.createElement("button");
    mBtn.type = "button";
    mBtn.className = "game-mini-btn active";
    mBtn.innerText = "⚔️ Challenge Beat Karo";
    mBtn.onclick = e => {
      e.stopPropagation();
      openGameSubtab(gd.challengeSubtab || "arcade:memory");
    };
    box.appendChild(mBtn);
    return box;
  }

  // Initialize dynamic previews
  renderQuizSetup();
  renderTdwPreview();
  renderSlidingPuzzle();

  return { renderGameBubble, openGameSubtab };
}
