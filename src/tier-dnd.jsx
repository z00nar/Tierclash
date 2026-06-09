/* tier-dnd.jsx — lightweight, touch-friendly drag & drop tuned for this app.
 * Hand-rolled on Pointer Events so we get full control over the lift/scale overlay,
 * the live insertion indicator, and cross-container sorting (pool <-> tiers).
 *
 * Public API:
 *   <DndProvider onDrop={(itemId, toTier, index)=>...} renderOverlay={(item)=>jsx}>
 *   const { dragHandlers, isDragging } = useDraggable(item, { disabled });
 *   const { activeId, overTier, index } = useDndState();
 *   A drop zone just needs: data-droppable={tierId}; cards need data-card data-id data-tier. */

const DndCtx = React.createContext({ activeId: null, overTier: null, index: -1, beginDrag: () => {} });
const useDndState = () => React.useContext(DndCtx);

function computeTarget(px, py, activeId) {
  const zones = Array.from(document.querySelectorAll("[data-droppable]"));
  let zone = null;
  for (const z of zones) {
    const r = z.getBoundingClientRect();
    if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) { zone = z; break; }
  }
  if (!zone) { // nearest zone so the indicator never disappears mid-drag
    let best = null, bestD = Infinity;
    for (const z of zones) {
      const r = z.getBoundingClientRect();
      const cy = (r.top + r.bottom) / 2;
      const dx = px < r.left ? r.left - px : px > r.right ? px - r.right : 0;
      const d = Math.abs(py - cy) + dx;
      if (d < bestD) { bestD = d; best = z; }
    }
    zone = best;
  }
  if (!zone) return null;
  const tier = zone.getAttribute("data-droppable");
  const cards = Array.from(zone.querySelectorAll("[data-card]")).filter((c) => c.getAttribute("data-id") !== activeId);
  let index = cards.length;
  for (let i = 0; i < cards.length; i++) {
    const r = cards[i].getBoundingClientRect();
    const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2, h = r.height;
    const before = cy < py - h / 2 || (Math.abs(cy - py) <= h / 2 && px < cx);
    if (!before) { index = i; break; }
  }
  return { tier, index };
}

function DndProvider({ children, onDrop, renderOverlay }) {
  const [active, setActive] = React.useState(null); // { id, item, w, offX, offY }
  const [target, setTarget] = React.useState(null); // { tier, index }
  const overlayRef = React.useRef(null);
  const stateRef = React.useRef({ active: null, target: null });

  const move = React.useCallback((e) => {
    const a = stateRef.current.active;
    if (!a) return;
    const x = e.clientX, y = e.clientY;
    if (overlayRef.current) overlayRef.current.style.transform = `translate(${x - a.offX}px, ${y - a.offY}px)`;
    const t = computeTarget(x, y, a.id);
    const prev = stateRef.current.target;
    if (!prev || !t || prev.tier !== t.tier || prev.index !== t.index) {
      stateRef.current.target = t;
      setTarget(t);
    }
  }, []);

  const end = React.useCallback(() => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", end);
    window.removeEventListener("pointercancel", end);
    const a = stateRef.current.active, t = stateRef.current.target;
    window.__tcDragging = false;
    document.body.classList.remove("tc-dragging");
    if (a && t && onDrop) onDrop(a.id, t.tier, t.index);
    stateRef.current = { active: null, target: null };
    setActive(null); setTarget(null);
  }, [move, onDrop]);

  const beginDrag = React.useCallback((item, e, node) => {
    const r = node.getBoundingClientRect();
    const a = { id: item.id, item, w: r.width, offX: e.clientX - r.left, offY: e.clientY - r.top };
    stateRef.current = { active: a, target: { tier: item.tier, index: 0 } };
    window.__tcDragging = true;
    document.body.classList.add("tc-dragging");
    setActive(a);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    // place overlay immediately under the pointer
    requestAnimationFrame(() => {
      if (overlayRef.current) overlayRef.current.style.transform = `translate(${e.clientX - a.offX}px, ${e.clientY - a.offY}px)`;
    });
  }, [move, end]);

  const ctx = { activeId: active ? active.id : null, overTier: target ? target.tier : null, index: target ? target.index : -1, beginDrag };

  return (
    <DndCtx.Provider value={ctx}>
      {children}
      {active && (
        <div ref={overlayRef} className="tc-drag-overlay" style={{ width: active.w }}>
          {renderOverlay ? renderOverlay(active.item) : null}
        </div>
      )}
    </DndCtx.Provider>
  );
}

// Attach to a card. Starts a drag after a small movement threshold so taps/clicks survive.
function useDraggable(item, opts) {
  const { beginDrag, activeId } = useDndState();
  const disabled = opts && opts.disabled;
  const ref = React.useRef(null);
  const down = React.useRef(null);

  const onPointerDown = React.useCallback((e) => {
    if (disabled || e.button === 1 || e.button === 2) return;
    // Ignore drags that start on interactive controls inside the card (vote buttons, remove).
    if (e.target.closest("[data-nodrag]")) return;
    down.current = { x: e.clientX, y: e.clientY, started: false };
    const node = ref.current;
    const onMove = (ev) => {
      if (!down.current) return;
      const dx = ev.clientX - down.current.x, dy = ev.clientY - down.current.y;
      if (!down.current.started && Math.hypot(dx, dy) > 5) {
        down.current.started = true;
        cleanup();
        beginDrag(item, ev, node);
      }
    };
    const onUp = () => cleanup();
    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [disabled, beginDrag, item]);

  return { ref, dragHandlers: { ref, onPointerDown }, isDragging: activeId === item.id, draggableDisabled: disabled };
}

Object.assign(window, { DndProvider, useDraggable, useDndState });
