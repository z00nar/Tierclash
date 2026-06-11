/* tier-store.jsx — single source of truth for Tier Clash.
 * Wired to Firebase Realtime Database. The whole board lives under "boards/main".
 * Every change writes there, and a listener pushes the latest data back to every
 * connected window — that's the live sync. */

const { TIERS, PALETTE, BOTS, BOT_QUIPS, AVATAR_COLORS, cloneTheme, uid: newId } = window.TC;
const TIER_IDS = TIERS.map((t) => t.id);

const db = window.db;          // Realtime Database (set in firebase-config.js)
const BOARD = "boards/main";   // everything for this board lives here

// turn our items array into an object keyed by id (how the database stores a list)
function itemsToMap(arr) {
  const map = {};
  arr.forEach((it) => { const { id, ...rest } = it; map[id] = rest; });
  return map;
}

function applyMove(items, id, toTier, index, movedBy) {
  const item = items.find((i) => i.id === id);
  if (!item) return items;
  const target = items.filter((i) => i.tier === toTier && i.id !== id).sort((a, b) => a.order - b.order);
  const at = Math.max(0, Math.min(index == null ? target.length : index, target.length));
  target.splice(at, 0, item);
  const orderMap = {};
  target.forEach((it, idx) => { orderMap[it.id] = idx; });
  return items.map((i) => {
    if (i.id === id) return { ...i, tier: toTier, order: orderMap[i.id], movedBy, moveNonce: (i.moveNonce || 0) + 1 };
    if (i.tier === toTier) return { ...i, order: orderMap[i.id] };
    return i;
  });
}

function useTierClash() {
  const [phase, setPhase] = React.useState("auth");
  const [user, setUser] = React.useState(null);
  const [board, setBoard] = React.useState(() => {
    const seed = cloneTheme("snacks");
    return { title: seed.title, blurb: seed.blurb, locked: false, createdBy: "system", _seedItems: seed.items };
  });
  const [items, setItems] = React.useState(() => board._seedItems);
  const [presence, setPresence] = React.useState([]);
  const [cursors, setCursors] = React.useState({});
  const [toasts, setToasts] = React.useState([]);
  const [botsEnabled, setBotsEnabled] = React.useState(false); // bots off — we have real users now

  const itemsRef = React.useRef(items); itemsRef.current = items;
  const lockedRef = React.useRef(board.locked); lockedRef.current = board.locked;
  const presenceRef = React.useRef(presence); presenceRef.current = presence;

  // ── Toasts ────────────────────────────────────────────────────────────────
  const pushToast = React.useCallback((t) => {
    const id = newId("toast");
    setToasts((prev) => [...prev.slice(-2), { id, ...t }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);

  // write the whole items list to the database (the listener then updates everyone)
  const writeItems = React.useCallback((arr) => {
    db.ref(BOARD + "/items").set(itemsToMap(arr));
  }, []);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const signIn = React.useCallback(({ uid, displayName, role }) => {
    const u = { uid, displayName: displayName || "You", role: role || "admin", color: AVATAR_COLORS[0] };
    db.ref("roles/" + uid).set(u.role); // store role so the security rules can check it
    setUser(u);
    setPhase("loading");
    setTimeout(() => setPhase("board"), 700);
  }, []);

  const signOut = React.useCallback(() => {
    if (user) db.ref(BOARD + "/presence/" + user.uid).remove();
    firebase.auth().signOut();
    setUser(null); setPresence([]); setCursors({}); setPhase("auth");
  }, [user]);

  // Demo only: flip your own view between admin and player.
  const toggleRole = React.useCallback(() => {
    setUser((u) => u ? { ...u, role: u.role === "admin" ? "player" : "admin" } : u);
  }, []);

  // ── Item / board changes (each one writes to the database) ─────────────────
  const moveItem = React.useCallback((itemId, toTier, index, movedBy) => {
    writeItems(applyMove(itemsRef.current, itemId, toTier, index, movedBy || (user && user.uid)));
  }, [user, writeItems]);

  const addItem = React.useCallback(({ name, emoji, image }) => {
    const prev = itemsRef.current;
    const order = prev.filter((i) => i.tier === "pool").length;
    const item = { id: newId("item"), name: name || "Untitled", emoji: emoji || "", image: image || "", tier: "pool", order, movedBy: user && user.uid, moveNonce: 0, votes: { up: 0, down: 0 } };
    writeItems([...prev, item]);
  }, [user, writeItems]);

  const removeItem = React.useCallback((itemId) => {
    writeItems(itemsRef.current.filter((i) => i.id !== itemId));
  }, [writeItems]);

  const setLocked = React.useCallback((locked) => {
    db.ref(BOARD + "/meta").update({ locked });
    pushToast({ text: locked ? "Board locked" : "Board unlocked", color: PALETTE.accent });
  }, [pushToast]);

  const renameBoard = React.useCallback((title) => {
    if (title) db.ref(BOARD + "/meta").update({ title });
  }, []);

  const resetBoard = React.useCallback(() => {
    writeItems(itemsRef.current.map((i, idx) => ({ ...i, tier: "pool", order: idx, movedBy: user && user.uid, moveNonce: (i.moveNonce || 0) + 1 })));
    pushToast({ text: "Board reset — everything back to the pool", color: PALETTE.accent });
  }, [user, writeItems, pushToast]);

  const voteItem = React.useCallback((itemId, dir) => {
    writeItems(itemsRef.current.map((i) => i.id === itemId
      ? { ...i, votes: { up: i.votes.up + (dir === "up" ? 1 : 0), down: i.votes.down + (dir === "down" ? 1 : 0) } }
      : i));
  }, [writeItems]);

  const createBoard = React.useCallback(({ title, themeKey, blank }) => {
    const seed = blank ? { items: [], blurb: "Your call." } : cloneTheme(themeKey || "snacks");
    db.ref(BOARD).set({
      meta: { title: title || seed.title, blurb: seed.blurb, locked: false },
      items: itemsToMap(seed.items),
    });
    pushToast({ text: "New board created", color: PALETTE.accent });
  }, [pushToast]);

  // ── Live cursors (kept for the demo button; harmless) ──────────────────────
  const setCursor = React.useCallback((bot, pos) => {
    setCursors((prev) => ({ ...prev, [bot.uid]: { x: pos.x, y: pos.y, visible: pos.visible !== false, label: bot.displayName, color: bot.color } }));
  }, []);
  const hideCursor = React.useCallback((botUid) => {
    setCursors((prev) => prev[botUid] ? { ...prev, [botUid]: { ...prev[botUid], visible: false } } : prev);
  }, []);

  const simulateMove = React.useCallback(() => {
    if (lockedRef.current) return;
    const bots = presenceRef.current.filter((p) => p.isBot);
    const pool = itemsRef.current;
    if (!bots.length || !pool.length) return;
    const bot = bots[Math.floor(Math.random() * bots.length)];
    const it = pool[Math.floor(Math.random() * pool.length)];
    const tiers = TIER_IDS.filter((t) => t !== it.tier);
    const toTier = tiers[Math.floor(Math.random() * tiers.length)];
    moveItem(it.id, toTier, 9999, bot.uid);
  }, [moveItem]);

  // ── LIVE SYNC: listen to the database; seed it the first time it's opened ──
  React.useEffect(() => {
    if (phase !== "board") return;
    const itemsDbRef = db.ref(BOARD + "/items");
    const metaDbRef = db.ref(BOARD + "/meta");

    // first person to ever open the board fills it with the starter items
    itemsDbRef.once("value").then((snap) => {
      if (!snap.exists()) {
        db.ref(BOARD).set({
          meta: { title: board.title, blurb: board.blurb, locked: false },
          items: itemsToMap(board._seedItems || []),
        });
      }
    });

    const onItems = itemsDbRef.on("value", (snap) => {
      const obj = snap.val() || {};
      setItems(Object.keys(obj).map((id) => ({ id, ...obj[id] })));
    });
    const onMeta = metaDbRef.on("value", (snap) => {
      const m = snap.val();
      if (m) setBoard((b) => ({ ...b, title: m.title, blurb: m.blurb, locked: !!m.locked }));
    });

    return () => { itemsDbRef.off("value", onItems); metaDbRef.off("value", onMeta); };
  }, [phase]);

  // ── PRESENCE: show everyone who's in the room right now ────────────────────
  React.useEffect(() => {
    if (phase !== "board" || !user) return;
    const meRef = db.ref(BOARD + "/presence/" + user.uid);
    meRef.set({ displayName: user.displayName, color: user.color });
    meRef.onDisconnect().remove(); // auto-remove me if I close the tab

    const presDbRef = db.ref(BOARD + "/presence");
    const onPres = presDbRef.on("value", (snap) => {
      const obj = snap.val() || {};
      setPresence(Object.keys(obj).map((id) => ({ uid: id, displayName: obj[id].displayName, color: obj[id].color, isBot: false })));
    });

    return () => { presDbRef.off("value", onPres); meRef.remove(); };
  }, [phase, user]);

  return {
    phase, user, board, items, presence, cursors, toasts, botsEnabled,
    setBotsEnabled,
    signIn, signOut,
    moveItem, addItem, removeItem, setLocked, renameBoard, resetBoard, voteItem, createBoard,
    simulateMove, toggleRole,
  };
}

Object.assign(window, { useTierClash, TIERS, TIER_IDS, PALETTE });