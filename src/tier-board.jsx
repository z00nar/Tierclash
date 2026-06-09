/* tier-board.jsx — the main board screen and all its parts. */

const B_TIERS = window.TIERS;
const B_PAL = window.PALETTE;
const B_THEMES = window.TC.THEMES;

// ── Inline-editable board title (admins only) ───────────────────────────────
function BoardTitle({ title, canEdit, onRename }) {
  const [editing, setEditing] = React.useState(false);
  const [val, setVal] = React.useState(title);
  React.useEffect(() => { setVal(title); }, [title]);
  const commit = () => { setEditing(false); if (val.trim()) onRename(val.trim()); else setVal(title); };
  if (editing && canEdit) {
    return (
      <input autoFocus className="tc-title-input" value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(title); setEditing(false); } }} />
    );
  }
  return (
    <button className={"tc-title" + (canEdit ? " tc-title--editable" : "")}
      onClick={() => canEdit && setEditing(true)} title={canEdit ? "Rename board" : undefined}>
      <span>{title}</span>
      {canEdit && <Icon name="pencil" size={15} />}
    </button>
  );
}

// ── Account menu (display name, role, demo controls, log out) ────────────────
function AccountMenu({ user, presence, onSignOut, demo }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, []);
  return (
    <div className="tc-account" ref={ref}>
      <button className="tc-account-btn" onClick={() => setOpen((o) => !o)}>
        <Avatar name={user.displayName} color={user.color} size={28} ring={false} />
        <span className="tc-account-name">{user.displayName}</span>
        <Icon name={open ? "up" : "down"} size={14} />
      </button>
      {open && (
        <div className="tc-menu">
          <div className="tc-menu-head">
            <Avatar name={user.displayName} color={user.color} size={36} ring={false} />
            <div>
              <div className="tc-menu-name">{user.displayName}</div>
              <div className="tc-menu-sub">{user.role === "admin" ? "Admin" : "Player"} · {presence.length} online</div>
            </div>
          </div>
          <div className="tc-menu-section">Demo controls</div>
          <button className="tc-menu-item" onClick={() => demo.toggleRole()}>
            <Icon name={user.role === "admin" ? "user" : "bolt"} size={16} />
            View as {user.role === "admin" ? "Player" : "Admin"}
          </button>
          <button className="tc-menu-item" onClick={() => { demo.simulate(); }}>
            <Icon name="bolt" size={16} /> Simulate a live move
          </button>
          <button className="tc-menu-item" onClick={() => demo.toggleBots()}>
            <Icon name="sparkle" size={16} /> Ambient bots: <b style={{ marginLeft: 4, color: demo.botsEnabled ? B_PAL.accent : B_PAL.muted }}>{demo.botsEnabled ? "On" : "Off"}</b>
          </button>
          <div className="tc-menu-divider" />
          <button className="tc-menu-item tc-menu-item--danger" onClick={onSignOut}>
            <Icon name="logout" size={16} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

// ── Header ──────────────────────────────────────────────────────────────────
function AppHeader({ board, user, presence, onRename, onSignOut, demo }) {
  return (
    <header className="tc-header">
      <div className="tc-header-left">
        <Logo size={26} />
      </div>
      <div className="tc-header-center">
        <BoardTitle title={board.title} canEdit={user.role === "admin"} onRename={onRename} />
        <div className="tc-header-blurb">{board.blurb}</div>
      </div>
      <div className="tc-header-right">
        <LiveDot />
        <PresenceBar presence={presence} />
        <RoleBadge role={user.role} />
        <AccountMenu user={user} presence={presence} onSignOut={onSignOut} demo={demo} />
      </div>
    </header>
  );
}

function Logo({ size = 26 }) {
  return (
    <div className="tc-logo" style={{ fontSize: size }}>
      <span className="tc-logo-mark"><Icon name="bolt" size={size * 0.8} stroke={0} /></span>
      <span className="tc-logo-text">Tier<span>Clash</span></span>
    </div>
  );
}

// ── Admin toolbar (admins only — simply not rendered for players) ───────────
function AdminToolbar({ board, onAdd, onReset, onLock, onNewBoard }) {
  return (
    <div className="tc-admintoolbar">
      <span className="tc-admintoolbar-label"><Icon name="bolt" size={13} /> Admin</span>
      <div className="tc-admintoolbar-actions">
        <button className="tc-btn tc-btn--accent" onClick={onAdd}><Icon name="plus" size={16} /> Add item</button>
        <button className="tc-btn tc-btn--outline" onClick={onNewBoard}><Icon name="sparkle" size={16} /> New board</button>
        <button className="tc-btn tc-btn--outline" onClick={onReset}><Icon name="reset" size={16} /> Reset</button>
        <button className={"tc-btn " + (board.locked ? "tc-btn--locked" : "tc-btn--outline")} onClick={onLock}>
          <Icon name={board.locked ? "lock" : "unlock"} size={16} /> {board.locked ? "Locked" : "Lock board"}
        </button>
      </div>
    </div>
  );
}

// ── Insertion indicator shown in the active drop zone ───────────────────────
function InsertionBar() { return <div className="tc-insert" aria-hidden="true" />; }

// renders a tier/pool's cards with the live insertion bar spliced in
function renderCards(cards, { activeId, overTier, index }, tierId, cardProps) {
  const visible = cards.filter((c) => c.id !== activeId).sort((a, b) => a.order - b.order);
  const showBar = activeId && overTier === tierId && index >= 0;
  const out = [];
  visible.forEach((c, i) => {
    if (showBar && i === index) out.push(<InsertionBar key="__bar" />);
    out.push(<ItemCard key={c.id} item={c} {...cardProps} />);
  });
  if (showBar && index >= visible.length) out.push(<InsertionBar key="__bar" />);
  return out;
}

// ── Tier row ────────────────────────────────────────────────────────────────
function TierRow({ tier, cards, cardProps }) {
  const dnd = useDndState();
  const isTarget = dnd.activeId && dnd.overTier === tier.id;
  const empty = cards.filter((c) => c.id !== dnd.activeId).length === 0;
  return (
    <div className="tc-row">
      <div className="tc-tierlabel" style={{ background: tier.color }}>
        <span>{tier.label}</span>
      </div>
      <div className={"tc-dropzone" + (isTarget ? " tc-dropzone--over" : "")}
        data-droppable={tier.id}
        style={isTarget ? { boxShadow: `inset 0 0 0 2px ${tier.color}`, background: hexA(tier.color, 0.08) } : undefined}>
        {renderCards(cards, dnd, tier.id, cardProps)}
        {empty && !isTarget && <span className="tc-dropzone-hint">Drag items here</span>}
      </div>
    </div>
  );
}

// ── Pool ────────────────────────────────────────────────────────────────────
function ItemPool({ cards, cardProps, canAdd, onAdd }) {
  const dnd = useDndState();
  const isTarget = dnd.activeId && dnd.overTier === "pool";
  const empty = cards.filter((c) => c.id !== dnd.activeId).length === 0;
  return (
    <div className="tc-pool">
      <div className="tc-pool-head">
        <span className="tc-pool-title">Unranked pool</span>
        <span className="tc-pool-count">{cards.length} item{cards.length === 1 ? "" : "s"}</span>
      </div>
      <div className={"tc-dropzone tc-pool-zone" + (isTarget ? " tc-dropzone--over" : "")}
        data-droppable="pool">
        {renderCards(cards, dnd, "pool", cardProps)}
        {empty && !isTarget && (
          <div className="tc-pool-empty">
            <span className="tc-pool-empty-emoji">🗳️</span>
            <div>
              <div className="tc-pool-empty-title">No items yet</div>
              <div className="tc-pool-empty-sub">{canAdd ? "Add some items to start the battle." : "An admin can add some to start the battle."}</div>
            </div>
            {canAdd && <button className="tc-btn tc-btn--accent" onClick={onAdd}><Icon name="plus" size={16} /> Add item</button>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal shell ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, width = 460 }) {
  return (
    <div className="tc-modal-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tc-modal" style={{ width }} role="dialog" aria-modal="true">
        <div className="tc-modal-head">
          <h2>{title}</h2>
          <button className="tc-icon-btn" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Add-item modal ──────────────────────────────────────────────────────────
function AddItemModal({ onClose, onAdd }) {
  const [name, setName] = React.useState("");
  const [emoji, setEmoji] = React.useState("");
  const [image, setImage] = React.useState("");
  const QUICK = ["🍕", "🎮", "🐱", "🔥", "⭐", "🍩", "🚀", "🎧", "🏆", "👑"];
  const submit = () => { if (!name.trim()) return; onAdd({ name: name.trim(), emoji: image ? "" : (emoji || "❓"), image: image.trim() }); onClose(); };
  return (
    <Modal title="Add an item" onClose={onClose}>
      <div className="tc-form">
        <label className="tc-field">
          <span>Item name</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pizza" onKeyDown={(e) => e.key === "Enter" && submit()} />
        </label>
        <div className="tc-field-row">
          <label className="tc-field" style={{ flex: 1 }}>
            <span>Emoji</span>
            <input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 2))} placeholder="🍕" />
          </label>
          <label className="tc-field" style={{ flex: 2 }}>
            <span>or image URL</span>
            <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…" />
          </label>
        </div>
        <div className="tc-quickemoji">
          {QUICK.map((e) => <button key={e} className={"tc-quick" + (emoji === e ? " tc-quick--on" : "")} onClick={() => { setEmoji(e); setImage(""); }}>{e}</button>)}
        </div>
        <div className="tc-preview">
          <span className="tc-preview-label">Preview</span>
          <div className="tc-card tc-card--static">
            <div className="tc-card-thumb">{image ? <img src={image} alt="" /> : <span className="tc-card-emoji">{emoji || "❓"}</span>}</div>
            <div className="tc-card-name">{name || "Item name"}</div>
          </div>
        </div>
        <div className="tc-modal-foot">
          <button className="tc-btn tc-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="tc-btn tc-btn--accent" disabled={!name.trim()} onClick={submit}><Icon name="plus" size={16} /> Add to pool</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Create-board modal (custom topic) ───────────────────────────────────────
function CreateBoardModal({ onClose, onCreate }) {
  const [title, setTitle] = React.useState("");
  const [choice, setChoice] = React.useState("snacks");
  const presets = [
    { key: "snacks", label: "Snacks", emoji: "🍕" },
    { key: "games", label: "Game genres", emoji: "🎮" },
    { key: "animals", label: "Animals", emoji: "🦦" },
    { key: "blank", label: "Blank", emoji: "✨" },
  ];
  const submit = () => {
    const blank = choice === "blank";
    const t = title.trim() || (blank ? "Untitled board" : B_THEMES[choice].title);
    onCreate({ title: t, themeKey: blank ? null : choice, blank });
    onClose();
  };
  return (
    <Modal title="Create a new board" onClose={onClose} width={500}>
      <div className="tc-form">
        <label className="tc-field">
          <span>Board topic</span>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Best pizza toppings, ranked" />
        </label>
        <div className="tc-field"><span>Start from</span></div>
        <div className="tc-presetgrid">
          {presets.map((p) => (
            <button key={p.key} className={"tc-preset" + (choice === p.key ? " tc-preset--on" : "")} onClick={() => setChoice(p.key)}>
              <span className="tc-preset-emoji">{p.emoji}</span>
              <span className="tc-preset-label">{p.label}</span>
              {choice === p.key && <span className="tc-preset-check"><Icon name="check" size={14} stroke={3} /></span>}
            </button>
          ))}
        </div>
        <div className="tc-modal-foot">
          <button className="tc-btn tc-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="tc-btn tc-btn--accent" onClick={submit}><Icon name="sparkle" size={16} /> Create board</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Confirm dialog ──────────────────────────────────────────────────────────
function ConfirmDialog({ title, body, confirmLabel, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose} width={420}>
      <div className="tc-form">
        <p className="tc-confirm-body">{body}</p>
        <div className="tc-modal-foot">
          <button className="tc-btn tc-btn--ghost" onClick={onClose}>Cancel</button>
          <button className="tc-btn tc-btn--danger" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Loading skeleton ────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="tc-loading">
      <div className="tc-loading-logo"><Logo size={40} /></div>
      <div className="tc-loading-bars">
        {B_TIERS.map((t) => (
          <div key={t.id} className="tc-skel-row">
            <div className="tc-skel-label" style={{ background: t.color }}>{t.label}</div>
            <div className="tc-skel-zone">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="tc-skel-card" style={{ animationDelay: `${i * 0.12}s` }} />)}
            </div>
          </div>
        ))}
      </div>
      <div className="tc-loading-text">Entering the room…</div>
    </div>
  );
}

function LockBanner() {
  return <div className="tc-lockbanner"><Icon name="lock" size={15} /> Board locked — players can't move items right now.</div>;
}

Object.assign(window, {
  BoardTitle, AccountMenu, AppHeader, Logo, AdminToolbar, TierRow, ItemPool,
  Modal, AddItemModal, CreateBoardModal, ConfirmDialog, LoadingScreen, LockBanner, InsertionBar,
});
