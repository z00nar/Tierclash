/* tier-data.js — Tier Clash seed data & constants.
 * Plain script: defines window.TC before any React/Babel code runs.
 * This is the ONE obvious place to swap themes / colours. */
(function () {
  // ── Tier definitions (id, label, colour). F is optional but enabled per spec. ──
  var TIERS = [
    { id: "S", label: "S", color: "#E25C7C" },
    { id: "A", label: "A", color: "#EB8A5A" },
    { id: "B", label: "B", color: "#ECC663" },
    { id: "C", label: "C", color: "#9BCB6E" },
    { id: "D", label: "D", color: "#6FB8A0" },
    { id: "F", label: "F", color: "#8E7A8C" },
  ];

  // ── App chrome palette (exact values from brief) ──
  var PALETTE = {
    bg: "#3D0B37",        // page background
    surface: "#63264A",   // cards / panels / header / modals
    text: "#F3F9D2",      // primary text
    muted: "#CBEAA6",     // secondary / muted text + borders
    accent: "#C0D684",    // primary accent — buttons, live, focus
  };

  // ── Avatar colours for presence (harmonious, distinct from chrome) ──
  var AVATAR_COLORS = ["#C0D684", "#E25C7C", "#6FB8A0", "#ECC663", "#9BCB6E", "#EB8A5A", "#E0A6C8"];

  // ── A tiny id helper (stand-in for Firestore doc ids) ──
  var _n = 0;
  function uid(prefix) { _n += 1; return (prefix || "id") + "_" + Date.now().toString(36) + "_" + _n; }

  // ── Theme presets. Each seeds a fresh board. `seed` describes initial placement. ──
  // tier: "S"|"A"|"B"|"C"|"D"|"F"|"pool"
  function mk(name, emoji, tier) { return { id: uid("item"), name: name, emoji: emoji, image: "", tier: tier, order: 0, movedBy: null, votes: { up: 0, down: 0 } }; }

  var THEMES = {
    snacks: {
      key: "snacks",
      title: "Ultimate Snack Showdown",
      blurb: "Settle it once and for all.",
      items: [
        mk("Pizza", "🍕", "S"),
        mk("Sushi", "🍣", "S"),
        mk("Tacos", "🌮", "A"),
        mk("Ramen", "🍜", "A"),
        mk("Burger", "🍔", "B"),
        mk("Dumplings", "🥟", "B"),
        mk("Donut", "🍩", "C"),
        mk("Hot Dog", "🌭", "D"),
        mk("Ice Cream", "🍦", "pool"),
        mk("Waffles", "🧇", "pool"),
        mk("Popcorn", "🍿", "pool"),
        mk("Fries", "🍟", "pool"),
      ],
    },
    games: {
      key: "games",
      title: "Greatest Games of All Time",
      blurb: "No wrong answers. (There are wrong answers.)",
      items: [
        mk("Open-World RPG", "🗺️", "S"),
        mk("Roguelike", "💀", "A"),
        mk("Platformer", "🍄", "A"),
        mk("Racing Sim", "🏎️", "B"),
        mk("Builder", "🧱", "B"),
        mk("Rhythm", "🎵", "C"),
        mk("Battle Royale", "🪂", "pool"),
        mk("Farming Sim", "🚜", "pool"),
        mk("Fighting", "🥊", "pool"),
        mk("Puzzle", "🧩", "pool"),
        mk("Horror", "👻", "pool"),
        mk("MMO", "⚔️", "pool"),
      ],
    },
    animals: {
      key: "animals",
      title: "Best Animal, Ranked",
      blurb: "Objectively correct rankings only.",
      items: [
        mk("Otter", "🦦", "S"),
        mk("Cat", "🐱", "S"),
        mk("Dog", "🐶", "A"),
        mk("Penguin", "🐧", "A"),
        mk("Fox", "🦊", "B"),
        mk("Frog", "🐸", "C"),
        mk("Capybara", "🦫", "pool"),
        mk("Octopus", "🐙", "pool"),
        mk("Owl", "🦉", "pool"),
        mk("Hedgehog", "🦔", "pool"),
        mk("Axolotl", "🐲", "pool"),
        mk("Sloth", "🦥", "pool"),
      ],
    },
  };

  // Re-number `order` within each tier so seed data is well-formed.
  function normalize(items) {
    var byTier = {};
    items.forEach(function (it) { (byTier[it.tier] = byTier[it.tier] || []).push(it); });
    Object.keys(byTier).forEach(function (t) {
      byTier[t].forEach(function (it, i) { it.order = i; });
    });
    return items;
  }

  function cloneTheme(key) {
    // Deep-ish clone so each board gets fresh item objects with new ids.
    var theme = THEMES[key] || THEMES.snacks;
    var items = theme.items.map(function (it) {
      return { id: uid("item"), name: it.name, emoji: it.emoji, image: it.image,
               tier: it.tier, order: it.order, movedBy: null, votes: { up: 0, down: 0 } };
    });
    return { title: theme.title, blurb: theme.blurb, items: normalize(items) };
  }

  // ── Simulated "other players" (bots) + the demo human. ──
  var BOTS = [
    { uid: "bot_maya",  displayName: "Maya",  color: "#E25C7C", isBot: true },
    { uid: "bot_kenji", displayName: "Kenji", color: "#6FB8A0", isBot: true },
    { uid: "bot_priya", displayName: "Priya", color: "#ECC663", isBot: true },
    { uid: "bot_diego", displayName: "Diego", color: "#9BCB6E", isBot: true },
  ];

  // A pool of fun reactions bots "say" via a brief toast when they move things.
  var BOT_QUIPS = [
    "is unranked propaganda", "deserves better", "is overrated tbh",
    "nope, hard disagree", "S-tier, no notes", "bottom of the barrel",
    "criminally underrated", "this is the way",
  ];

  window.TC = {
    TIERS: TIERS,
    PALETTE: PALETTE,
    AVATAR_COLORS: AVATAR_COLORS,
    THEMES: THEMES,
    BOTS: BOTS,
    BOT_QUIPS: BOT_QUIPS,
    uid: uid,
    cloneTheme: cloneTheme,
    normalize: normalize,
  };
})();
