export const PRIORITY_REACTIONS = ["❤️", "😘", "🥰", "😂", "🔥", "😢"];

export const EMOJI_SECTIONS = [
  {
    id: "smileys",
    icon: "😀",
    label: "Smileys & Emotions",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😭", "😉",
      "😙", "😚", "😗", "😘", "🥰", "😍", "🤩", "🥳", "🫠", "🙂",
      "🥲", "🥹", "☺️", "🙃", "😌", "😏", "🤤", "😬", "🥺", "🤪",
      "😋", "😑", "😶", "🫥", "🤐", "🫡", "🤔", "🤫", "🤭", "😒",
      "🧐", "🫣", "🥱", "😮‍💨", "🙄", "😤", "😠", "🤬", "😞", "😓",
      "😟", "😧", "😰", "🫤", "☹️", "😢", "😥", "😣", "🤯", "😳",
      "😮", "😦", "😫", "🫨", "🥴", "🥶", "🤢", "🤮", "🤠", "🤥",
      "😷", "🤧", "😪", "🤑", "🤓", "😎", "🤡", "💩", "😈", "👿",
      "👻", "💀", "👾", "⛄", "👹", "☠️", "🌚", "🌝", "🌞", "😺",
      "😸", "😹", "😻", "🙉", "😾", "😽", "😼", "🙈", "😴", "🤒"
    ]
  },
  {
    id: "love",
    icon: "❤️",
    label: "Hearts & Love",
    emojis: [
      "❤️", "🩷", "💛", "🩵", "💜", "💙", "🖤", "🧡", "💚", "🤍",
      "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "❣️", "💕", "💞", "💓", "💗", "💖",
      "💘", "💝", "💟", "♥️", "💌", "💋", "💍", "♾️", "🌹", "🌷",
      "🌸", "🌺", "🌻", "💐", "🫶🏻"
    ]
  },
  {
    id: "hands",
    icon: "🫶🏻",
    label: "Hands & People",
    emojis: [
      "👍🏻", "👎🏻", "🫶🏻", "🙌🏻", "👐🏻", "🫲🏻", "🫱🏻", "🫳🏻", "🫴🏻", "👊🏻",
      "✊🏻", "🤜🏻", "🤛🏻", "🤲🏻", "🫸🏻", "🫷🏻", "👋🏻", "🖐🏻", "✋🏻", "🖖🏻",
      "🤟🏻", "🤘🏻", "🤚🏻", "✌🏻", "🫰🏻", "🤙🏻", "🤏🏻", "🤞🏻", "👌🏻", "🫵🏻",
      "👉🏻", "👈🏻", "👆🏻", "👇🏻", "💅🏻", "🙏🏻", "✍🏻", "🤝", "👏🏻", "🫂",
      "🤗", "🦾", "🦿", "🦵🏻", "🦶🏻", "👃🏻", "👀", "🦴", "🦠", "🫀",
      "🧠", "👥", "🗣️", "👣"
    ]
  },
  {
    id: "vibes",
    icon: "✨",
    label: "Sparkles, Fun & Nature",
    emojis: [
      "🔥", "💫", "⚡", "🌟", "✨", "⭐", "💥", "💢", "💤", "🕳️",
      "💯", "🎉", "🎊", "🎈", "🎁", "🎀", "👑", "🧸", "🐥", "🦋",
      "🕊️", "🌙", "☀️", "🌈", "🌧️", "❄️", "🌊", "🍀", "🍓", "🍫",
      "🍯", "☕", "🍰", "🥂"
    ]
  },
  {
    id: "objects",
    icon: "📱",
    label: "Objects & Symbols",
    emojis: [
      "📱", "💻", "🎧", "📷", "🎥", "🎵", "🎶", "🔔", "🔒", "🔑",
      "💡", "🏆", "🥇", "🎯", "🎮", "🎲", "✈️", "🚗", "🏠", "🕰️",
      "📅", "✅", "❌", "⚠️", "❓", "❗"
    ]
  }
];

const USER_REACTION_STREAM = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😭", "😉",
  "😙", "😚", "😗", "😘", "🥰", "😍", "🤩", "🥳", "🫠", "🙂",
  "🥲", "🥹", "☺️", "🙃", "😌", "😏", "🤤", "😬", "🥺", "🤪",
  "😋", "😑", "😶", "🫥", "🤐", "🫡", "🤔", "🤫", "🤭", "😒",
  "🧐", "🫣", "🥱", "😮‍💨", "🙄", "😤", "😠", "🤬", "😞", "😓",
  "😟", "😧", "😰", "🫤", "☹️", "😢", "😥", "😣", "🤯", "😳",
  "😮", "😦", "😫", "🫨", "🥴", "🥶", "🤢", "🤮", "🤠", "🤥",
  "😷", "🤧", "😪", "🤑", "🤓", "😎", "🤡", "💩", "😈", "👿",
  "👻", "💀", "👾", "⛄", "👹", "☠️", "🌚", "🌝", "🌞", "😺",
  "😸", "😹", "😻", "💫", "🙉", "😾", "😽", "😼", "⚡", "🌟",
  "💥", "💢", "💤", "🕳️", "💯", "🩵", "💛", "❤️", "🎉", "💝",
  "🩷", "🖤", "💜", "💙", "💓", "💕", "💟", "♥️", "❣️", "💌",
  "❤️‍🩹", "❤️‍🔥", "👥", "🗣️", "👣", "👀", "🦴", "🦠", "🫀", "🧠",
  "🦵🏻", "🦶🏻", "👃🏻", "👏🏻", "🦾", "🦿", "👍🏻", "👎🏻", "🫶🏻", "🙌🏻",
  "👐🏻", "🫲🏻", "🫱🏻", "🫳🏻", "👊🏻", "✊🏻", "🤜🏻", "🤲🏻", "🫸🏻", "👋🏻",
  "🖐🏻", "✋🏻", "🖖🏻", "🤟🏻", "🤘🏻", "🫷🏻", "🤚🏻", "✌🏻", "🫰🏻", "🤙🏻",
  "🤏🏻", "🤞🏻", "👌🏻", "🫵🏻", "👉🏻", "👈🏻", "💅🏻", "🙏🏻", "✍🏻", "👆🏻",
  "🤝"
];

const EMOJI_KEYWORDS = {
  "❤️": "heart love pyar dil red",
  "🩷": "pink heart love pyar",
  "🩵": "blue heart light",
  "💛": "yellow heart friendship",
  "💜": "purple heart",
  "💙": "blue heart",
  "🖤": "black heart dark",
  "❤️‍🔥": "heart fire passion love",
  "❤️‍🩹": "mending healing heart",
  "💔": "broken heart sad",
  "💕": "two hearts love",
  "💖": "sparkling heart",
  "💓": "beating heart pulse",
  "💘": "cupid heart arrow",
  "💝": "gift heart",
  "💟": "heart box",
  "♥️": "heart suit",
  "❣️": "heart exclamation",
  "💌": "love letter khat",
  "💋": "kiss lip",
  "😘": "kiss blowing love",
  "🥰": "love smiling hearts",
  "😍": "heart eyes love",
  "😂": "laugh funny haha lol",
  "🤣": "rofl laugh funny",
  "😭": "cry sob sad tears",
  "😢": "cry sad tear",
  "🥹": "holding back tears emotional",
  "🥺": "pleading puppy eyes miss",
  "😊": "smile happy blush",
  "😁": "grin happy teeth",
  "😉": "wink flirt",
  "🤗": "hug jhappi",
  "🙈": "shy monkey hide",
  "🔥": "fire hot lit",
  "🎉": "party celebrate congrats",
  "💯": "100 percent perfect",
  "👍🏻": "thumbs up ok good yes",
  "👎🏻": "thumbs down no",
  "🫶🏻": "heart hands love",
  "🙏🏻": "please pray thanks namaste",
  "👏🏻": "clap bravo",
  "🤝": "handshake deal",
  "😡": "angry gussa mad",
  "🤬": "angry curse mad",
  "😴": "sleepy good night",
  "🌙": "moon night chand",
  "🌹": "rose flower phool",
  "🧸": "teddy bear",
  "🍫": "chocolate sweet",
  "💍": "ring promise"
};

export function dedupeEmojis(list = []) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const clean = String(item || "").trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

export function getQuickReactions(recentReactions = [], customPinned = []) {
  const validPinned = dedupeEmojis(customPinned);
  const validRecent = dedupeEmojis(recentReactions).filter(
    em => !PRIORITY_REACTIONS.includes(em) && !validPinned.includes(em)
  );
  return dedupeEmojis([
    ...validPinned,
    ...PRIORITY_REACTIONS,
    ...validRecent.slice(0, 6),
    ...USER_REACTION_STREAM
  ]);
}

export function searchEmojis(query = "") {
  const q = String(query || "").trim().toLowerCase();
  const all = dedupeEmojis(EMOJI_SECTIONS.flatMap(sec => sec.emojis));
  if (!q) return all;

  const sectionMatches = new Set();
  for (const sec of EMOJI_SECTIONS) {
    if (sec.label.toLowerCase().includes(q) || sec.id.toLowerCase().includes(q)) {
      sec.emojis.forEach(em => sectionMatches.add(em));
    }
  }

  return all.filter(em => {
    if (em.includes(q)) return true;
    if (sectionMatches.has(em)) return true;
    const kw = EMOJI_KEYWORDS[em];
    return kw ? kw.includes(q) : false;
  });
}

export function addRecentEmoji(currentList = [], emoji, maxCount = 18) {
  const clean = String(emoji || "").trim();
  if (!clean) return dedupeEmojis(currentList).slice(0, maxCount);
  return dedupeEmojis([clean, ...currentList]).slice(0, maxCount);
}
