/* tier-components.jsx — small, reusable presentational pieces. */

const TC_PAL = window.TC.PALETTE;
const TC_BOTS = window.TC.BOTS;

// ── Minimal line-icon set (simple shapes only) ──────────────────────────────
function Icon({ name, size = 18, stroke = 2 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    close: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
    lock: <><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    unlock: <><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-2" /></>,
    reset: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 3v4h4" /></>,
    trash: <><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></>,
    pencil: <><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M14 6l4 4" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    up: <polyline points="6 15 12 9 18 15" />,
    down: <polyline points="6 9 12 15 18 9" />,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
    sparkle: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></>,
    bolt: <polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2" />,
  };
  return <svg {...common} aria-hidden="true">{paths[name] || null}</svg>;
}

// ── Avatar ──────────────────────────────────────────────────────────────────
function initials(name) { return (name || "?").trim().slice(0, 1).toUpperCase(); }
function Avatar({ name, color, size = 30, ring = true, title }) {
  return (
    <div className="tc-avatar" title={title || name} style={{
      width: size, height: size, borderRadius: "50%", background: color,
      color: "#3D0B37", fontWeight: 800, fontSize: size * 0.42,
      display: "grid", placeItems: "center", flex: "0 0 auto",
      boxShadow: ring ? `0 0 0 2px ${TC_PAL.surface}` : "none",
      fontFamily: "'Bricolage Grotesque', sans-serif", userSelect: "none",
    }}>{initials(name)}</div>
  );
}

// ── Presence cluster: ~4 avatars then +N, with smooth join/leave ────────────
function PresenceBar({ presence }) {
  const shown = presence.slice(0, 4);
  const extra = presence.length - shown.length;
  return (
    <div className="tc-presence" style={{ display: "flex", alignItems: "center" }}>
      <div style={{ display: "flex" }}>
        {shown.map((p, i) => (
          <div key={p.uid} className="tc-presence-av" style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }}>
            <Avatar name={p.displayName} color={p.color} title={p.displayName + (p.isBot ? "" : " (you)")} />
          </div>
        ))}
        {extra > 0 && (
          <div className="tc-presence-av" style={{ marginLeft: -10, zIndex: 1 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#7a3a5e", color: TC_PAL.text,
              fontWeight: 700, fontSize: 12, display: "grid", placeItems: "center", boxShadow: `0 0 0 2px ${TC_PAL.surface}` }}>+{extra}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Role badge ──────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const admin = role === "admin";
  return (
    <span className="tc-rolebadge" style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase",
      color: admin ? "#3D0B37" : TC_PAL.muted,
      background: admin ? TC_PAL.accent : "transparent",
      border: admin ? "none" : `1px solid ${hexA(TC_PAL.muted, 0.4)}`,
    }}>
      <Icon name={admin ? "bolt" : "user"} size={13} stroke={2.4} />
      {admin ? "Admin" : "Player"}
    </span>
  );
}

// ── "● Live" indicator ──────────────────────────────────────────────────────
function LiveDot() {
  return (
    <span className="tc-live" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 700, fontSize: 13 }}>
      <span className="tc-live-dot" />
      Live
    </span>
  );
}

// ── Vote chips (agree / disagree) ───────────────────────────────────────────
function VoteChips({ item, onVote, compact }) {
  return (
    <div className="tc-votes" data-nodrag style={{ display: "flex", gap: 4 }}>
      <button data-nodrag className="tc-vote tc-vote-up" onClick={(e) => { e.stopPropagation(); onVote(item.id, "up"); }} title="Agree">
        <Icon name="up" size={13} stroke={2.6} /><span>{item.votes.up}</span>
      </button>
      <button data-nodrag className="tc-vote tc-vote-down" onClick={(e) => { e.stopPropagation(); onVote(item.id, "down"); }} title="Disagree">
        <Icon name="down" size={13} stroke={2.6} /><span>{item.votes.down}</span>
      </button>
    </div>
  );
}

// ── Item card ───────────────────────────────────────────────────────────────
function ItemCard({ item, overlay, draggable, disabled, onVote, onRemove, canRemove, getColor, currentUid }) {
  const layoutRef = overlay ? null : useLayoutItem(item.id);
  const drag = draggable ? useDraggable(item, { disabled }) : null;
  const [flash, setFlash] = React.useState(null);
  const firstNonce = React.useRef(item.moveNonce || 0);

  React.useEffect(() => {
    if (overlay) return;
    const n = item.moveNonce || 0;
    if (n !== firstNonce.current) {
      firstNonce.current = n;
      // Only flash when SOMEONE ELSE moved it (your own moves are optimistic/instant).
      if (item.movedBy && item.movedBy !== currentUid) {
        setFlash(getColor ? getColor(item.movedBy) : TC_PAL.accent);
        const t = setTimeout(() => setFlash(null), 1100);
        return () => clearTimeout(t);
      }
    }
  }, [item.moveNonce]);

  const setRefs = (node) => {
    if (layoutRef) layoutRef(node);
    if (drag) drag.dragHandlers.ref.current = node;
  };

  const style = {
    boxShadow: flash ? `0 0 0 3px ${flash}, 0 10px 24px -12px rgba(0,0,0,.6)` : undefined,
  };

  return (
    <div
      ref={setRefs}
      data-card={overlay ? undefined : ""}
      data-id={item.id}
      data-tier={item.tier}
      onPointerDown={drag ? drag.dragHandlers.onPointerDown : undefined}
      className={
        "tc-card" +
        (overlay ? " tc-card--overlay" : "") +
        (drag && drag.isDragging ? " tc-card--ghost" : "") +
        (disabled ? " tc-card--locked" : "")
      }
      style={style}
    >
      <div className="tc-card-thumb">
        {item.image
          ? <img src={item.image} alt="" draggable="false" onError={(e) => { e.target.style.display = "none"; }} />
          : <span className="tc-card-emoji">{item.emoji || "❓"}</span>}
      </div>
      <div className="tc-card-name">{item.name}</div>
      {!overlay && (
        <div className="tc-card-foot">
          <VoteChips item={item} onVote={onVote} />
          {canRemove && (
            <button data-nodrag className="tc-card-remove" title="Remove item"
              onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}>
              <Icon name="trash" size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Live cursors (demo bots dragging) ───────────────────────────────────────
function LiveCursors({ cursors }) {
  return (
    <div className="tc-cursor-layer">
      {Object.keys(cursors).map((uid) => {
        const c = cursors[uid];
        return (
          <div key={uid} className="tc-cursor" style={{
            transform: `translate(${c.x}px, ${c.y}px)`,
            opacity: c.visible ? 1 : 0,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill={c.color} stroke="#3D0B37" strokeWidth="1.5">
              <path d="M5 3l5 16 2.5-6.5L19 10 5 3z" />
            </svg>
            <span className="tc-cursor-label" style={{ background: c.color }}>{c.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Toast stack ─────────────────────────────────────────────────────────────
function ToastStack({ toasts }) {
  return (
    <div className="tc-toasts">
      {toasts.map((t) => (
        <div key={t.id} className="tc-toast" style={{ borderLeftColor: t.color }}>
          <span className="tc-toast-dot" style={{ background: t.color }} />
          {t.text}
        </div>
      ))}
    </div>
  );
}

// helper: hex + alpha → rgba
function hexA(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

Object.assign(window, { Icon, Avatar, PresenceBar, RoleBadge, LiveDot, VoteChips, ItemCard, LiveCursors, ToastStack, hexA, initials });
