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
  { id: "nightplan", icon: "🌙", name: "Tonight's Plan", cat: "plan", badge: "4-Step" },
  { id: "bodymap", icon: "🗺️", name: "Body Map", cat: "spicy", badge: "Hot Tap" },
  { id: "positions", icon: "💫", name: "Vibe Roulette", cat: "spicy", badge: "Spicy+" },
  { id: "tasting", icon: "🍯", name: "Sweet Taste", cat: "spicy", badge: "Honey/Choc" },
  { id: "doubletrouble", icon: "🔥", name: "Double Duel", cat: "spicy", badge: "Stakes" },
  { id: "escalator", icon: "📈", name: "3-Phase Rush", cat: "spicy", badge: "Escalator" },
  { id: "afterhours", icon: "🔞", name: "After Hours", cat: "spicy", badge: "Pass/Dare" },
  { id: "auction", icon: "🔥", name: "Spicy Auction", cat: "saza", badge: "Bid War" },
  { id: "risk2x", icon: "💥", name: "2x Risk Dare", cat: "saza", badge: "Double Risk" },
  { id: "freeze", icon: "🧊", name: "Slow-Mo Freeze", cat: "timers", badge: "Freeze" },
  { id: "kisszone", icon: "💋", name: "Kiss Roulette", cat: "dice", badge: "Zone+Style" },
  { id: "lockbox", icon: "🔐", name: "Secret Lockbox", cat: "plan", badge: "Password" },
  { id: "icefire", icon: "🌡️", name: "Ice & Fire", cat: "spicy", badge: "Temp Shift" },
  { id: "blind4", icon: "🃏", name: "Blind 4-Card", cat: "saza", badge: "Mystery Pick" },
  { id: "confess", icon: "⚖️", name: "Confess or Tax", cat: "saza", badge: "Truth/Tax" },
  { id: "sazawheel", icon: "🎯", name: "Wheel of Saza", cat: "saza", badge: "Punishment" },
  { id: "craving", icon: "🌙", name: "Craving Sync", cat: "spicy", badge: "Live Match" }
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

export const DEFAULT_POSITIONS_POOL = [
  "🫶🏻 Cozy Spoon Cuddle + Slow Mam Hold (3 min)",
  "💞 Face-to-Face Eye Lock + Neck Kisses",
  "🔥 Partner Leads Top Pace — Zero Hands Mode",
  "🪑 Lap Sit Tight Hug + Whispering Fantasies",
  "🌙 Side-by-Side Slow Honey & Chocolate Focus",
  "👑 Pillow Elevation + Deep Breath Sync"
];

export const DEFAULT_TASTING_POOL = {
  treats: ["🍯 Real Honey Drop", "🍫 Melted Chocolate", "🍓 Strawberry Cream", "🧊 Cold Ice Trace", "💋 Warm Breath & Lips"],
  zones: ["Neck & Jawline ✨", "Mam Curve 🎀", "Honey Point 🍯", "Chocolate Point 🍫", "Inner Wrist & Waist 🫶🏻"]
};

export const DEFAULT_DOUBLE_TROUBLE = [
  "Loser owes Winner a 2-Min Honey/Chocolate VIP Pass 🍯🍫",
  "Har round lose hone par 10 nonstop kisses on Mam/Neck 🎀",
  "Winner gets full 1-Hour No-Say-No Boss Coupon 👑",
  "Donon ko ek saath 30s deep eye lock + whisper voice note 🎙️",
  "Loser must send a View-Once/Tease-Blur Surprise Photo 📸🔥"
];

export const DEFAULT_AFTER_HOURS = [
  { truth: "Honey/Chocolate ke baare mein woh kaunsa fantasy hai jo tum bolne se sharmate ho? 🙈", dare: "Abhi 20s whisper voice note mein describe karo 🎙️🔥" },
  { truth: "Mam kisses slow pasand hain ya thoda teasing bite ke saath? 🎀", dare: "Partner ko agle 45s non-stop attention coupon bhejo 💋" },
  { truth: "Sabse zyaada turn-on meri kaunsi ek aadat ya aawaz se hota hai? ⚡", dare: "Us aadat/aawaz ko praise karte hue ek naughty line likho 💬" },
  { truth: "Aaj raat kis zone par sabse pehle aur sabse zyada focus chahiye? 🍯🍫", dare: "Secret Vault / Love Wallet ke liye ek Naya Pass banao 🎟️" }
];

export const DEFAULT_ESCALATOR_PHASES = [
  { phase: 1, title: "Phase 1 · Warm Spark (20s)", desc: "Slow eye contact, deep breath sync & gentle lip/neck kisses 💋" },
  { phase: 2, title: "Phase 2 · Mam & Curve Tease (30s)", desc: "Soft hands & warm kisses around Mam + collarbone, buildup without rush 🎀" },
  { phase: 3, title: "Phase 3 · Full Honey & Chocolate Wave (45s)", desc: "Unstoppable Honey & Chocolate focus — follow partner's heartbeat 🔥" }
];

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

export function pickBodyMapAction(zone = "🍯 Honey", intensity = "Tease") {
  const verbs = {
    Soft: "Slow feather-light touches & warm kisses",
    Tease: "Playful slow teasing + breathless pauses (30s)",
    Wild: "Deep passionate focus — full intensity (60s)"
  };
  return `${zone} • ${intensity}: ${verbs[intensity] || verbs.Tease}`;
}

export function pickTastingCombo(cfg = DEFAULT_TASTING_POOL, rng = Math.random) {
  const treats = cfg.treats?.length ? cfg.treats : DEFAULT_TASTING_POOL.treats;
  const zones = cfg.zones?.length ? cfg.zones : DEFAULT_TASTING_POOL.zones;
  const t = treats[Math.floor(rng() * treats.length)];
  const z = zones[Math.floor(rng() * zones.length)];
  return { treat: t, zone: z, summary: `${t} on ${z}` };
}

export function createMysteryBoxes(rewards = []) {
  const fallback = DEFAULT_SCRATCH_REWARDS;
  return Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    reward: String(rewards[i] || fallback[i % fallback.length]).trim(),
    opened: false
  }));
}

export function unwrapMysteryBox(boxes = [], dayIdx = 0) {
  let unlockedBox = null;
  const next = (boxes || []).map((b, idx) => {
    if (idx === dayIdx && !b.opened) {
      unlockedBox = { ...b, opened: true };
      return unlockedBox;
    }
    return b;
  });
  return { next, unlockedBox };
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

export function receiveWalletGift(wallet = [], giftObj = {}) {
  const cleanTitle = String(giftObj.title || "").trim();
  if (!cleanTitle) return { next: wallet || [], added: null };
  if (giftObj.giftId && (wallet || []).some(w => w.giftId === giftObj.giftId)) {
    return { next: wallet || [], added: null };
  }
  const item = {
    ...createWalletCoupon(cleanTitle, giftObj.source || "Partner Gift 🎁"),
    giftId: giftObj.giftId || ""
  };
  return { next: [item, ...(wallet || [])].slice(0, 60), added: item };
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

// =========================================
// 10 NEW SPICY HOT GAMES & UNIVERSAL CUSTOM/SAZA POOLS
// =========================================
export const DEFAULT_SAZA_WHEEL = [
  "💋 Saza: 15 Non-Stop Neck & Cheek Kisses!",
  "🍯 Saza: 45s Honey Focus — No Hands!",
  "🍫 Saza: 45s Chocolate Special Pampering!",
  "🎀 Saza: 30s Soft Mam Kisses + Warm Hug!",
  "🎙️ Saza: 20s Seductive Whisper Voice Note Abhi!",
  "📸 Saza: Ek Tease-Blur / View-Once Surprise Photo!",
  "👑 Inaam: 1 Ghante ka Full Boss Pass Unlocked!",
  "💆 Saza: 5-Min Warm Oil Shoulder & Back Massage!"
];

export const DEFAULT_AUCTION_PRIZES = [
  "🍯 2-Min VIP Honey Pass (Zero Refusal)",
  "🍫 2-Min Sweet Chocolate Attention",
  "🎀 3-Min Mam Cuddle & Slow Kisses",
  "👑 Winner Commands Tonight's Entire Routine",
  "🎙️ Custom Midnight Dirty-Sweet Voice Story",
  "🔥 1 Wild Fantasy Unconditionally Unlocked"
];

export const DEFAULT_RISK_DARES = {
  safe: [
    "💋 20s Slow Lip & Forehead Kisses",
    "🤗 45s Warm Tight Embrace + Whisper",
    "🎀 25s Soft Mam Hug & Hair Play"
  ],
  double: [
    "🔥 45s Honey / Chocolate Tease + Slow Breathing",
    "🧊 Ice Trace from Neck to Mam Curve (30s)",
    "🎙️ Abhi 20s unfiltered craving voice note bhejo!"
  ],
  triple: [
    "🔞 60s Full Wild Focus on Honey & Chocolate — Partner Controls Speed!",
    "😈 Blindfold 60s: Partner does ANY 2 chosen teasing acts!",
    "👑 Instant 1-Hour No-Say-No Master Pass for Winner!"
  ]
};

export const DEFAULT_KISS_ZONES = {
  zones: ["Lips 💋", "Neck & Collarbone ✨", "Mam 🎀", "Honey 🍯", "Chocolate 🍫", "Ear & Jawline 👂", "Waist & Back 🫶🏻"],
  styles: ["Ultra Slow & Soft 🌸", "Warm Breath + Tease Bite 😉", "Butterfly Rapid Kisses 🦋", "Deep & Passionate (30s) 🔥", "Eye-Locked Lingering Kiss 😘"]
};

export const DEFAULT_BLIND_CARDS = [
  "🎁 Inaam: 60s Partner Choice Pampering!",
  "💋 Saza: 10 Nonstop Kisses on Neck & Mam!",
  "🍯🔥 Special: 45s Honey & Chocolate Dual Tease!",
  "😈 Wild Card: Send 1 Tease Voice Whisper or Photo!"
];

export const DEFAULT_CONFESS_PROMPTS = [
  "Mera kaunsa touch ya zone tumhe sabse zyada pagal banata hai?",
  "Humare beech ka sabse wild fantasy moment kaunsa raha ya chahte ho?",
  "Aaj raat lights off chahiye ya dim romantic lamp mein kareeb aana hai?",
  "Jab hum door hote hain to meri kis body/romance baat ko sabse zyada miss karte ho?"
];

export const DEFAULT_CONFESS_TAXES = [
  "🎟️ Tax Paid: 30s Honey / Chocolate Attention Token",
  "💋 Tax Paid: 15 Slow Kisses + Whisper Voice Note",
  "🎀 Tax Paid: 2-Min Mam Cuddle & Forehead Kisses"
];

export const DEFAULT_ICE_FIRE_ROUNDS = [
  { mode: "🧊 ICE", title: "Round 1 · Cool Spark (20s)", desc: "Thandi saans ya ice cube trace Neck se Mam tak — slow & gentle!" },
  { mode: "🔥 FIRE", title: "Round 2 · Warm Wave (30s)", desc: "Garam saans aur deep slow kisses Honey / Chocolate ke aas-paas!" },
  { mode: "🧊🔥 SWITCH", title: "Round 3 · Contrast Rush (40s)", desc: "Har 10s mein cool whisper aur warm passionate kiss switch karo!" }
];

export const DEFAULT_CRAVING_CHOICES = [
  "🍯 Slow Honey Attention",
  "🍫 Sweet Chocolate Focus",
  "🎀 Cozy Mam Cuddle & Kisses",
  "🔥 Wild Unfiltered Night",
  "💋 Deep Romantic Makeout",
  "🎁 Partner's Total Surprise"
];

export const DEFAULT_FREEZE_ZONES = [
  "💋 Lips & Jawline",
  "🎀 Mam Soft Focus",
  "🍯 Honey Tease Zone",
  "🍫 Chocolate Tease Zone",
  "🫶🏻 Waist & Lower Back"
];

export function rollKissZone(cfg = DEFAULT_KISS_ZONES, rng = Math.random) {
  const zones = Array.isArray(cfg.zones) && cfg.zones.length ? cfg.zones : DEFAULT_KISS_ZONES.zones;
  const styles = Array.isArray(cfg.styles) && cfg.styles.length ? cfg.styles : DEFAULT_KISS_ZONES.styles;
  const zone = zones[Math.floor(rng() * zones.length)];
  const style = styles[Math.floor(rng() * styles.length)];
  return { zone, style, summary: `${zone} — ${style}` };
}

export function resolveRiskDare(multiplier = 1, cfg = DEFAULT_RISK_DARES, rng = Math.random) {
  const key = multiplier >= 3 ? "triple" : (multiplier === 2 ? "double" : "safe");
  const pool = Array.isArray(cfg[key]) && cfg[key].length ? cfg[key] : DEFAULT_RISK_DARES[key];
  const prompt = pool[Math.floor(rng() * pool.length)];
  return { multiplier: key === "triple" ? 3 : (key === "double" ? 2 : 1), tier: key, prompt };
}

export function pickBlindCards(pool = DEFAULT_BLIND_CARDS, rng = Math.random) {
  const clean = Array.isArray(pool) && pool.length >= 4 ? pool : DEFAULT_BLIND_CARDS;
  const copy = [...clean].sort(() => rng() - 0.5);
  return copy.slice(0, 4);
}

export function checkLockboxPass(expected = "", attempt = "") {
  const a = String(expected || "").trim().toLowerCase();
  const b = String(attempt || "").trim().toLowerCase();
  if (!a || !b) return false;
  return a === b;
}

export function evaluateCravingSync(choiceA = "", choiceB = "") {
  const a = String(choiceA || "").trim();
  const b = String(choiceB || "").trim();
  if (!a || !b) return { synced: false, summary: "Dono apni craving lock karein!" };
  if (a === b) return { synced: true, summary: `🔥 100% Craving Match: Dono ne "${a}" chuna!` };
  return { synced: false, summary: `💞 Double Treat Tonight: "${a}" + "${b}"!` };
}

export function getEffectivePool(customArr, fallbackArr = []) {
  const cleaned = Array.isArray(customArr) ? customArr.map(s => String(s || "").trim()).filter(Boolean) : [];
  return cleaned.length ? cleaned : [...fallbackArr];
}

export function addCustomItemToPool(currentArr, fallbackArr = [], itemText = "", maxItems = 60) {
  const clean = String(itemText || "").trim();
  if (!clean) return getEffectivePool(currentArr, fallbackArr);
  const base = Array.isArray(currentArr) && currentArr.length ? [...currentArr] : [...fallbackArr];
  if (base.some(x => String(x).toLowerCase() === clean.toLowerCase())) return base.slice(0, maxItems);
  return [clean, ...base].slice(0, maxItems);
}

export function removeCustomItemFromPool(currentArr, fallbackArr = [], idx = 0) {
  const base = Array.isArray(currentArr) && currentArr.length ? [...currentArr] : [...fallbackArr];
  if (idx < 0 || idx >= base.length) return base;
  const next = base.filter((_, i) => i !== idx);
  return next.length ? next : [...fallbackArr];
}


