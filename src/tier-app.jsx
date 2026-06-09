/* tier-app.jsx — top-level app: routing, role toggle, modals, DnD + Tweaks wiring. */

const APP_TIERS = window.TIERS;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#C0D684",
  "tiers": ["#E25C7C", "#EB8A5A", "#ECC663", "#9BCB6E", "#6FB8A0", "#8E7A8C"]
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = ["#C0D684", "#8FE3A0", "#FFD166", "#7CC6FF"];
const TIER_PALETTES = [
  ["#E25C7C", "#EB8A5A", "#ECC663", "#9BCB6E", "#6FB8A0", "#8E7A8C"], // Classic (spec)
  ["#F2545B", "#F47A3E", "#F2B705", "#7FB069", "#4D9DE0", "#7B6D8D"], // Heat
  ["#FF6B9D", "#FFA45B", "#FFD670", "#9BE564", "#6BCBEF", "#B79CED"], // Candy
];

// ── Board surface (lives inside LayoutGroup so it can suppress self-moves) ───
function Surface({ store, tiers, cardProps, onAdd }) {
  const suppress = useSuppressFlip();
  const onDrop = React.useCallback((id, tier, index) => {
    suppress(id);                                  // local move = instant/optimistic (no glide)
    store.moveItem(id, tier, index, store.user.uid); // FIREBASE: this write reconciles via the listener
  }, [store, suppress]);
  const poolCards = store.items.filter((i) => i.tier === "pool");
  return (
    <DndProvider onDrop={onDrop} renderOverlay={(item) => <ItemCard item={item} overlay />}>
      <div className="tc-rows">
        {tiers.map((tier) => (
          <TierRow key={tier.id} tier={tier} cards={store.items.filter((i) => i.tier === tier.id)} cardProps={cardProps} />
        ))}
      </div>
      <ItemPool cards={poolCards} cardProps={cardProps} canAdd={store.user.role === "admin"} onAdd={onAdd} />
    </DndProvider>
  );
}

// ── Board screen ────────────────────────────────────────────────────────────
function BoardScreen({ store, tiers, demo }) {
  const { user, board, presence } = store;
  const [modal, setModal] = React.useState(null); // 'add' | 'create' | 'reset'

  // color lookup for the "someone else moved this" flash
  const colorMap = React.useMemo(() => {
    const m = {};
    window.TC.BOTS.forEach((b) => { m[b.uid] = b.color; });
    presence.forEach((p) => { m[p.uid] = p.color; });
    if (user) m[user.uid] = user.color;
    return m;
  }, [presence, user]);
  const getColor = React.useCallback((uid) => colorMap[uid] || "var(--tc-accent)", [colorMap]);

  const isAdmin = user.role === "admin";
  const cardProps = {
    draggable: true,
    disabled: board.locked && !isAdmin,
    onVote: store.voteItem,
    onRemove: store.removeItem,
    canRemove: isAdmin,
    getColor,
    currentUid: user.uid,
  };

  return (
    <div className="tc-board">
      <AppHeader board={board} user={user} presence={presence} onRename={store.renameBoard} onSignOut={store.signOut} demo={demo} />
      {isAdmin && (
        <AdminToolbar board={board}
          onAdd={() => setModal("add")}
          onReset={() => setModal("reset")}
          onLock={() => store.setLocked(!board.locked)}
          onNewBoard={() => setModal("create")} />
      )}
      {board.locked && <LockBanner />}

      <main className="tc-surface-wrap">
        <LayoutGroup>
          <Surface store={store} tiers={tiers} cardProps={cardProps} onAdd={() => setModal("add")} />
        </LayoutGroup>
      </main>

      {modal === "add" && <AddItemModal onClose={() => setModal(null)} onAdd={store.addItem} />}
      {modal === "create" && <CreateBoardModal onClose={() => setModal(null)} onCreate={store.createBoard} />}
      {modal === "reset" && (
        <ConfirmDialog title="Reset the board?" confirmLabel="Reset everything"
          body="Every item goes back to the unranked pool. Everyone in the room will see it happen instantly."
          onConfirm={store.resetBoard} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ── App ─────────────────────────────────────────────────────────────────────
function App() {
  const store = useTierClash();
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const tiers = React.useMemo(
    () => APP_TIERS.map((tier, i) => ({ ...tier, color: t.tiers[i] || tier.color })),
    [t.tiers]
  );

  const rootStyle = React.useMemo(() => {
    const s = {
      "--tc-bg": "#3D0B37", "--tc-surface": "#63264A", "--tc-text": "#F3F9D2",
      "--tc-muted": "#CBEAA6", "--tc-accent": t.accent,
    };
    tiers.forEach((tier) => { s["--tier-" + tier.id] = tier.color; });
    return s;
  }, [t.accent, tiers]);

  const demo = {
    botsEnabled: store.botsEnabled,
    toggleBots: () => store.setBotsEnabled(!store.botsEnabled),
    simulate: store.simulateMove,
    toggleRole: store.toggleRole,
  };

  return (
    <div className="tc-app-root" style={rootStyle}>
      {store.phase === "auth" && <AuthForm onAuth={store.signIn} />}
      {store.phase === "loading" && <LoadingScreen />}
      {store.phase === "board" && <BoardScreen store={store} tiers={tiers} demo={demo} />}

      {store.phase === "board" && <ToastStack toasts={store.toasts} />}
      {store.phase === "board" && <LiveCursors cursors={store.cursors} />}

      <TweaksPanel>
        <TweakSection label="Accent" />
        <TweakColor label="Accent color" value={t.accent} options={ACCENT_OPTIONS} onChange={(v) => setTweak("accent", v)} />
        <TweakSection label="Tier colors" />
        <TweakColor label="Palette" value={t.tiers} options={TIER_PALETTES} onChange={(v) => setTweak("tiers", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
