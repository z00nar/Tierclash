/* tier-store.jsx — single source of truth for Tier Clash.
 *
 * Everything runs on local React state so the app is fully demoable. Each state
 * change is ONE function call; the spots marked `// FIREBASE:` are exactly where
 * the Firestore reads/writes get swapped in later. Components never mutate state
 * directly — they call these actions.
 *
 *   user     { uid, displayName, role:'admin'|'player', color }
 *   board    { title, blurb, locked, createdBy }
 *   items[]  { id, name, emoji, image, tier:'S'|..|'F'|'pool', order, movedBy, moveNonce, votes:{up,down} }
 *   presence[] { uid, displayName, color, isBot }
 *   cursors  { [uid]: { x, y, visible, label, color } }   // live cursors (demo bots)
 */

const { TIERS, PALETTE, BOTS, BOT_QUIPS, AVATAR_COLORS, cloneTheme, uid: newId } = window.TC;
const TIER_IDS = TIERS.map((t) => t.id);

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
  const [phase, setPhase] = React.useState("auth");      // 'auth' | 'loading' | 'board'
  const [user, setUser] = React.useState(null);
  const [board, setBoard] = React.useState(() => {
    const seed = cloneTheme("snacks");
    return { title: seed.title, blurb: seed.blurb, locked: false, createdBy: "system", _seedItems: seed.items };
  });
  const [items, setItems] = React.useState(() => board._seedItems);
  const [presence, setPresence] = React.useState([]);
  const [cursors, setCursors] = React.useState({});
  const [toasts, setToasts] = React.useState([]);
  const [botsEnabled, setBotsEnabled] = React.useState(true);

  const itemsRef = React.useRef(items); itemsRef.current = items;
  const lockedRef = React.useRef(board.locked); lockedRef.current = board.locked;
  const presenceRef = React.useRef(presence); presenceRef.current = presence;

  // ── Toasts ──────────────────────────────────────────────────────────────
  const pushToast = React.useCallback((t) => {
    const id = newId("toast");
    setToasts((prev) => [...prev.slice(-2), { id, ...t }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);

  // ── Auth ────────────────────────────────────────────────────────────────
  // FIREBASE: replace with signInWithEmailAndPassword / createUser / signInAnonymously.
  const signIn = React.useCallback(({ displayName, role }) => {
    const u = { uid: newId("user"), displayName: displayName || "You", role: role || "admin", color: AVATAR_COLORS[0] };
    setUser(u);
    setPhase("loading");
    // FIREBASE: this delay stands in for the initial board + presence subscription.
    setTimeout(() => {
      const onlineBots = BOTS.slice(0, 3);
      setPresence([{ uid: u.uid, displayName: u.displayName, color: u.color, isBot: false }, ...onlineBots]);
      setPhase("board");
    }, 950);
  }, []);

  // FIREBASE: signOut() + detach all listeners.
  const signOut = React.useCallback(() => {
    setUser(null); setPresence([]); setCursors({}); setPhase("auth");
  }, []);

  // Demo only: flip the local viewer between admin and player to show role-based UI.
  const toggleRole = React.useCallback(() => {
    setUser((u) => u ? { ...u, role: u.role === "admin" ? "player" : "admin" } : u);
  }, []);

  // ── Item / board mutations (each is one clean call → one Firestore write) ──
  // FIREBASE: write { tier, order, movedBy } for itemId (and re-order siblings).
  const moveItem = React.useCallback((itemId, toTier, index, movedBy) => {
    setItems((prev) => applyMove(prev, itemId, toTier, index, movedBy || (user && user.uid)));
  }, [user]);

  // FIREBASE: addDoc to the items collection (lands in the pool).
  const addItem = React.useCallback(({ name, emoji, image }) => {
    setItems((prev) => {
      const order = prev.filter((i) => i.tier === "pool").length;
      return [...prev, { id: newId("item"), name: name || "Untitled", emoji: emoji || "", image: image || "", tier: "pool", order, movedBy: user && user.uid, moveNonce: 0, votes: { up: 0, down: 0 } }];
    });
  }, [user]);

  // FIREBASE: deleteDoc(itemId).
  const removeItem = React.useCallback((itemId) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  // FIREBASE: update board doc { locked }.
  const setLocked = React.useCallback((locked) => {
    setBoard((b) => ({ ...b, locked }));
    pushToast({ text: locked ? "Board locked" : "Board unlocked", color: PALETTE.accent });
  }, [pushToast]);

  // FIREBASE: update board doc { title }.
  const renameBoard = React.useCallback((title) => {
    setBoard((b) => ({ ...b, title: title || b.title }));
  }, []);

  // FIREBASE: batch-update every item back to tier:'pool'.
  const resetBoard = React.useCallback(() => {
    setItems((prev) => prev.map((i, idx) => ({ ...i, tier: "pool", order: idx, movedBy: user && user.uid, moveNonce: (i.moveNonce || 0) + 1 })));
    pushToast({ text: "Board reset — everything back to the pool", color: PALETTE.accent });
  }, [user, pushToast]);

  // FIREBASE: optional — agree/disagree counters (e.g. increment via transaction).
  const voteItem = React.useCallback((itemId, dir) => {
    setItems((prev) => prev.map((i) => i.id === itemId
      ? { ...i, votes: { up: i.votes.up + (dir === "up" ? 1 : 0), down: i.votes.down + (dir === "down" ? 1 : 0) } }
      : i));
  }, []);

  // FIREBASE: create a new board doc + seed its items collection.
  const createBoard = React.useCallback(({ title, themeKey, blank }) => {
    const seed = blank ? { items: [], blurb: "Your call." } : cloneTheme(themeKey || "snacks");
    setBoard((b) => ({ ...b, title: title || seed.title, blurb: seed.blurb, locked: false, createdBy: user && user.uid }));
    setItems(blank ? [] : seed.items);
    pushToast({ text: "New board created", color: PALETTE.accent });
  }, [user, pushToast]);

  // ── Live cursors (demo only) ──────────────────────────────────────────────
  const setCursor = React.useCallback((bot, pos) => {
    setCursors((prev) => ({ ...prev, [bot.uid]: { x: pos.x, y: pos.y, visible: pos.visible !== false, label: bot.displayName, color: bot.color } }));
  }, []);
  const hideCursor = React.useCallback((botUid) => {
    setCursors((prev) => prev[botUid] ? { ...prev, [botUid]: { ...prev[botUid], visible: false } } : prev);
  }, []);

  // ── Simulated remote move: a bot's cursor glides to an item, then moves it. ──
  const simulateMove = React.useCallback(() => {
    if (lockedRef.current) return;
    const bots = presenceRef.current.filter((p) => p.isBot);
    const pool = itemsRef.current;
    if (!bots.length || !pool.length) return;
    const bot = bots[Math.floor(Math.random() * bots.length)];
    const it = pool[Math.floor(Math.random() * pool.length)];
    const tiers = TIER_IDS.filter((t) => t !== it.tier);
    const toTier = tiers[Math.floor(Math.random() * tiers.length)];

    const node = document.querySelector(`[data-id="${it.id}"]`);
    if (node) { const r = node.getBoundingClientRect(); setCursor(bot, { x: r.left + r.width / 2, y: r.top + r.height / 2 }); }
    setTimeout(() => {
      moveItem(it.id, toTier, 9999, bot.uid);
      const quip = BOT_QUIPS[Math.floor(Math.random() * BOT_QUIPS.length)];
      pushToast({ text: `${bot.displayName}: ${it.name} ${quip}`, color: bot.color });
      setTimeout(() => {
        const n2 = document.querySelector(`[data-id="${it.id}"]`);
        if (n2) { const r2 = n2.getBoundingClientRect(); setCursor(bot, { x: r2.left + r2.width / 2, y: r2.top + r2.height / 2 }); }
      }, 80);
      setTimeout(() => hideCursor(bot.uid), 1900);
    }, 680);
  }, [moveItem, pushToast, setCursor, hideCursor]);

  // Ambient bot activity while on the board.
  React.useEffect(() => {
    if (phase !== "board" || !botsEnabled) return;
    const tick = () => simulateMove();
    const id = setInterval(tick, 5200);
    return () => clearInterval(id);
  }, [phase, botsEnabled, simulateMove]);

  // Occasional presence join/leave so the avatar cluster feels alive.
  React.useEffect(() => {
    if (phase !== "board") return;
    const id = setInterval(() => {
      setPresence((prev) => {
        const onlineBotUids = prev.filter((p) => p.isBot).map((p) => p.uid);
        const offline = BOTS.filter((b) => !onlineBotUids.includes(b.uid));
        if (offline.length && Math.random() > 0.5) {
          const join = offline[Math.floor(Math.random() * offline.length)];
          pushToast({ text: `${join.displayName} joined`, color: join.color });
          return [...prev, join];
        }
        if (prev.filter((p) => p.isBot).length > 2 && Math.random() > 0.55) {
          const bots = prev.filter((p) => p.isBot);
          const leave = bots[Math.floor(Math.random() * bots.length)];
          return prev.filter((p) => p.uid !== leave.uid);
        }
        return prev;
      });
    }, 9000);
    return () => clearInterval(id);
  }, [phase, pushToast]);

  return {
    phase, user, board, items, presence, cursors, toasts, botsEnabled,
    setBotsEnabled,
    signIn, signOut,
    moveItem, addItem, removeItem, setLocked, renameBoard, resetBoard, voteItem, createBoard,
    simulateMove, toggleRole,
  };
}

Object.assign(window, { useTierClash, TIERS, TIER_IDS, PALETTE });
