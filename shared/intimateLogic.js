// Pure logic & customizable pools for the 20 Intimacy Couple Games + Love Wallet

export const CODEWORD_GLOSSARY = [
  { key: "honey", label: "🍯 Honey", hint: "Gentle & sweet male focus" },
  { key: "chocolate", label: "🍫 Chocolate", hint: "Sweet female focus" },
  { key: "mam", label: "🎀 Mam", hint: "Soft upper embrace & kisses" }
];

export const INTIMATE_GAMES_META = [
  { id: "dice", icon: "🎲", name: "Naughty Dice", cat: "dice", badge: "Custom" },
  { id: "roulette", icon: "🎡", name: "Intimate Wheel", cat: "dice", badge: "Custom" },
  { id: "strip", icon: "🃏", name: "5-Card Stakes", cat: "cards", badge: "Vs / Live" },
  { id: "heat", icon: "🌡️", name: "Heat Meter 1-5", cat: "timers", badge: "Ladder" },
  { id: "teaser", icon: "⏱️", name: "60s Tease Timer", cat: "timers", badge: "Live Timer" },
  { id: "scratch", icon: "💋", name: "Scratch Card", cat: "cards", badge: "Rub Canvas" },
  { id: "spicydare", icon: "😈", name: "Spicy T/D", cat: "cards", badge: "3 Levels" },
  { id: "fantasy", icon: "🔥", name: "Fantasy Swipe", cat: "cards", badge: "Mutual Match" },
  { id: "roleplay", icon: "🎭", name: "Roleplay Studio", cat: "plan", badge: "Custom" },
  { id: "sensory", icon: "🧊", name: "Sensory Quiz", cat: "cards", badge: "Guess" },
  { id: "whisper", icon: "🎙️", name: "Whisper Dare", cat: "timers", badge: "Voice" },
  { id: "teaseframe", icon: "📸", name: "Tease Frame", cat: "cards", badge: "1x Photo" },
  { id: "bottle", icon: "🍾", name: "Spin Bottle", cat: "dice", badge: "Canvas" },
  { id: "wishes", icon: "💌", name: "3 Secret Wishes", cat: "plan", badge: "Sealed" },
  { id: "counter", icon: "💘", name: "Kisses Counter", cat: "timers", badge: "Tracker" },
  { id: "blurcard", icon: "🧩", name: "Blurred Card", cat: "cards", badge: "Riddle" },
  { id: "rapidfire", icon: "⚡", name: "Rapid Fire 10", cat: "timers", badge: "5s Timer" },
  { id: "boss", icon: "👑", name: "Boss Command", cat: "plan", badge: "1h Pass" },
  { id: "dart", icon: "🎯", name: "Mood Dartboard", cat: "dice", badge: "Canvas" },
  { id: "nightplan", icon: "🌙", name: "Tonight's Plan", cat: "plan", badge: "4-Step" }
];

export const DEFAULT_DICE_CONFIG = {
  actions: ["Slow Kiss 😘", "Soft Tease 💋", "Warm Massage 💆", "Whisper & Bite 😉", "Honey / Chocolate Lick 🍯", "Close Hold 🤗"],
  targets: ["Lips 💋", "Neck & Collarbone ✨", "Honey 🍯", "Chocolate 🍫", "Mam 🎀", "Waist & Back 🫶🏻"],
  durations: ["15 sec", "30 sec", "45 sec", "60 sec", "90 sec", "Until Tap"]
};

export const DEFAULT_ROULETTE_WEDGES = {
  soft: [
    "💋 30s Slow Neck Kisses",
    "🎀 Mam par soft cuddle & forehead kiss",
    "🍫 Chocolate par gentle warm touch (15s)",
    "🍯 Honey ko pyar se tease karo (15s)",
    "🎙️ Kaano mein 'Sirf Tumhare' whisper karo",
    "🤗 1-min bina kapde distance tight hug"
  ],
  naughty: [
    "🍯 Honey par 45s slow teasing & kiss",
    "🍫 Chocolate par 45s soft kiss & taste",
    "🎀 Mam par 30s soft kisses + tracing",
    "💋 Bina haath lagaye sirf lips se tease (30s)",
    "🧊 Thandi saans + garam kiss combo",
    "👑 10-Min Partner Commands Everything"
  ],
  wild: [
    "🍯 Honey 60s full focus — no stopping!",
    "🍫 Chocolate 60s deep focus + whisper",
    "🎀 Mam + Neck nonstop kisses 45s",
    "🔥 Partner apni favourite position choose karega",
    "😈 Eyes closed 60s — blindfolded surprise touch",
    "🌙 Midnight Double Round: Honey & Chocolate dono!"
  ]
};

export const DEFAULT_HEAT_LEVELS = [
  { level: 1, title: "Lv 1 · Sweet Spark ✨", task: "Aankhon mein dekh ke 20s slow breathing aur forehead + cheek kisses." },
  { level: 2, title: "Lv 2 · Neck & Mam 🌸", task: "Neck se Mam tak slow finger tracing aur 30s soft kisses." },
  { level: 3, title: "Lv 3 · Honey & Chocolate Tease 🔥", task: "Honey aur Chocolate ke aas-paas 45s gentle teasing (direct rush mana!)." },
  { level: 4, title: "Lv 4 · Deep Craving 💋", task: "60s unstoppable Honey / Chocolate focus — partner guide karega slow ya fast." },
  { level: 5, title: "Lv 5 · Full Wild Finale 🌙", task: "No timer, no holding back — aaj raat ki sabse intense wish poori karo!" }
];

export const DEFAULT_SPICY_DECK = {
  soft: [
    { type: "Soft Truth", text: "Mam, Chocolate aur Honey mein sabse pehle kahan kiss pasand hai? 🙈" },
    { type: "Soft Dare", text: "Partner ke gale par 20s slow lips trail banao aur cute voice note bhejo 💋" },
    { type: "Soft Dare", text: "Mam par soft hug ke saath apni dhadkan mehsoos karwao 🤗" },
    { type: "Soft Truth", text: "Meri kaunsi khushboo ya touch tumhe turant romantic bana deti hai? 🌸" }
  ],
  flirty: [
    { type: "Naughty Truth", text: "Honey ya Chocolate mein kis jagah slow tease tumhe sabse tez pighlata hai? 🔥" },
    { type: "Naughty Dare", text: "30s Mam ko pyaar se pamper karo bina ek lafz bole 🎀" },
    { type: "Naughty Dare", text: "Voice note mein batao abhi Chocolate/Honey ke liye kya dil kar raha hai 🎙️😘" },
    { type: "Naughty Truth", text: "Lights dim pasand hain ya full candlelight jab hum kareeb hon? 🕯️" }
  ],
  wild: [
    { type: "Wild Dare", text: "60s Chocolate & Mam alternation — partner sirf 'aur' bol sakta hai 🍫🎀" },
    { type: "Wild Dare", text: "60s Honey tease with slow speed, phir last 15s full intensity 🍯🔥" },
    { type: "Wild Truth", text: "Humari sabse wild secret khwahish batao jo aaj try karna chahte ho 😈" },
    { type: "Wild Dare", text: "Abhi 1 Tease Selfie ya Voice Whisper bhejo jo sirf View-Once ho 📸🔥" }
  ]
};

export const DEFAULT_FANTASY_POOL = [
  "🍯 Slow 2-min Honey focus",
  "🍫 Sweet Chocolate taste & tease",
  "🎀 Mam par soft oil massage + kisses",
  "🕯️ Candlelight blindfold surprise",
  "🌧️ Baarish ke baad cozy shower together",
  "🎙️ Dirty-sweet whispers in the dark",
  "🧊 Ice cube trail neck se Chocolate/Honey tak",
  "👑 1 Ghante ka Full Boss Pass"
];

export const DEFAULT_RAPID_FIRE = [
  { q: "Pehle kya?", a: "🎀 Mam kisses", b: "💋 Deep lip lock" },
  { q: "Speed kaisi?", a: "🍯 Slow tease", b: "🔥 Fast & wild" },
  { q: "Focus zone?", a: "🍫 Chocolate", b: "🍯 Honey" },
  { q: "Vibe?", a: "🕯️ Soft romantic", b: "😈 Naughty rough" },
  { q: "Awaaz?", a: "🎙️ Kan mein whisper", b: "🤫 Silent intense" },
  { q: "Mood?", a: "🌅 Morning fresh", b: "🌙 Midnight dark" },
  { q: "Touch style?", a: "🪶 Feather light", b: "🫶🏻 Tight grip" },
  { q: "Starter?", a: "💆 Back massage", b: "😘 Neck bites" },
  { q: "Surprise?", a: "🙈 Blindfold", b: "📸 Cute peek photo" },
  { q: "Aftercare?", a: "🤗 Tight cuddle", b: "💬 Pillow talk" }
];

export const DEFAULT_ROLEPLAY_OPTIONS = {
  scenarios: ["🌙 Midnight Hotel Room", "🌧️ Rainy Cabin", "🩺 Naughty Doctor & Patient", "✈️ First Class Night Flight", "👑 Royal King & Queen"],
  outfits: ["Silk Nightwear 🎀", "Partner's Oversized Shirt 👕", "Black / Red Mood 🖤", "Surprise Choice ✨"],
  rules: ["Bina bole sirf touch (5 min)", "Har 30s ek kiss tax 💋", "Mam & Chocolate/Honey focus allowed 🔥", "Password bolne par double reward"]
};

export const DEFAULT_BOSS_COMMANDS = [
  "👑 1-Min nonstop neck & Mam pampering",
  "🍯 Honey 45s special attention on demand",
  "🍫 Chocolate par sweet kiss token claim",
  "🎙️ Abhi 15s seductive voice note bhejo",
  "🤗 3-Min tight cuddle + hair play"
];

export const DEFAULT_SCRATCH_REWARDS = [
  "🍯 Free 2-Min Honey Focus Pass",
  "🍫 Free Chocolate & Kisses Token",
  "🎀 Mam Special Cuddle + Massage",
  "💋 20 Unstoppable Neck Kisses",
  "🔥 Tonight Your Wildest Wish Unlocked!",
  "👑 Instant 30-Min Boss Command Card"
];

export const DEFAULT_DART_ZONES = [
  "🎯 Bullseye! Partner picks Honey/Chocolate/Mam wild reward!",
  "🎀 Ring 2: 45s Mam & Collarbone kisses",
  "🍯 Ring 3: Honey 30s special tease",
  "🍫 Ring 3: Chocolate 30s sweet focus",
  "💋 Ring 4: 15s Deep Kiss + Whisper",
  "🤗 Outer Ring: Warm tight hug + 1 Naughty Truth"
];

export const DEFAULT_NIGHT_PLAN = {
  starters: ["🕯️ Candles & Music", "💆 10-Min Warm Oil Massage", "💋 Slow Lip & Neck Kisses", "🎙️ Secret Desires Whisper"],
  teases: ["🎀 Mam Soft Kisses & Hold", "🧊 Ice / Feather Tease", "🙈 Blindfold Guessing", "📸 Cute Tease Reveal"],
  mains: ["🍯 + 🍫 Full Passion Sync", "🐢 Ultra Slow Connection", "🔥 Wild Roleplay Mode", "👑 Winner Leads Tonight"],
  aftercares: ["🤗 10-Min Chest Cuddle", "💧 Water + Forehead Kiss", "💬 Sweet Pillow Talk", "😴 Sleep In Arms"]
};

export function rollNaughtyDice(config = DEFAULT_DICE_CONFIG, rng = Math.random) {
  const actions = Array.isArray(config.actions) && config.actions.length ? config.actions : DEFAULT_DICE_CONFIG.actions;
  const targets = Array.isArray(config.targets) && config.targets.length ? config.targets : DEFAULT_DICE_CONFIG.targets;
  const durations = Array.isArray(config.durations) && config.durations.length ? config.durations : DEFAULT_DICE_CONFIG.durations;
  const pick = arr => arr[Math.floor(rng() * arr.length)];
  const action = pick(actions);
  const target = pick(targets);
  const duration = pick(durations);
  return { action, target, duration, summary: `${action} → ${target} (${duration})` };
}

export function stepHeatLevel(currentLevel = 1, delta = 1, levels = DEFAULT_HEAT_LEVELS) {
  const maxLv = Math.max(1, levels.length);
  const nextLv = Math.max(1, Math.min(maxLv, Number(currentLevel || 1) + delta));
  const item = levels.find(x => x.level === nextLv) || levels[nextLv - 1] || DEFAULT_HEAT_LEVELS[0];
  return { level: nextLv, max: maxLv, title: item.title, task: item.task };
}

export function evaluateFantasyMatches(items = [], votesA = {}, votesB = {}) {
  const mutual = [];
  const onlyOne = [];
  for (let i = 0; i < items.length; i++) {
    const a = votesA[i];
    const b = votesB[i];
    if (a === "yes" && b === "yes") mutual.push(items[i]);
    else if (a && b && (a === "yes" || b === "yes") && a !== "no" && b !== "no") onlyOne.push(items[i]);
  }
  return { mutual, maybeMatches: onlyOne, totalReviewed: Object.keys(votesB).length };
}

export function resolveStripRound(roundIdx = 0, cardA = 0, cardB = 0, stakes = []) {
  const list = stakes.length ? stakes : [
    "1st Round: Remove 1 accessory / send whisper 💋",
    "2nd Round: 30s Neck & Mam tease 🎀",
    "3rd Round: Honey / Chocolate 30s focus 🍯🍫",
    "4th Round: 45s Blindfold kiss challenge 🔥",
    "Final Round: Winner claims Full Night Command! 👑"
  ];
  const winner = cardA === cardB ? "draw" : (cardA > cardB ? "A" : "B");
  const stake = list[Math.min(list.length - 1, Math.max(0, roundIdx))];
  return { winner, stake };
}

export function checkBlurredAnswer(expected = "", attempt = "") {
  const cleanExp = String(expected || "").trim().toLowerCase();
  const cleanAtt = String(attempt || "").trim().toLowerCase();
  if (!cleanExp || !cleanAtt) return false;
  return cleanAtt === cleanExp || cleanAtt.includes(cleanExp) || cleanExp.includes(cleanAtt);
}

export function formatTonightPlan(plan = {}) {
  const parts = [
    plan.starter ? `1️⃣ Starter: ${plan.starter}` : "",
    plan.tease ? `2️⃣ Tease: ${plan.tease}` : "",
    plan.main ? `3️⃣ Main: ${plan.main}` : "",
    plan.aftercare ? `4️⃣ Aftercare: ${plan.aftercare}` : ""
  ].filter(Boolean);
  return parts.join("\n");
}

export function createWalletCoupon(title, source = "Game Reward") {
  return {
    id: `wal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: String(title || "Love Coupon").trim(),
    source: String(source || "Game Reward").trim(),
    createdAt: Date.now(),
    redeemed: false,
    redeemedAt: 0
  };
}

export function redeemWalletCoupon(wallet = [], id) {
  let redeemedItem = null;
  const next = (wallet || []).map(item => {
    if (item.id === id && !item.redeemed) {
      redeemedItem = { ...item, redeemed: true, redeemedAt: Date.now() };
      return redeemedItem;
    }
    return item;
  });
  return { next, redeemedItem };
}
