/* tier-flip.jsx — FLIP layout animation.
 * Wrap the board in <LayoutGroup>. Any card registered via useLayoutItem(id)
 * will smoothly glide when its on-screen position changes between renders
 * (e.g. a bot/remote move). The local user's own drops are "suppressed" so they
 * land instantly (optimistic), giving the satisfying contrast the brief asks for. */

const LayoutCtx = React.createContext(null);

function LayoutGroup({ children }) {
  const nodes = React.useRef(new Map());   // id -> DOM node
  const prev = React.useRef(new Map());    // id -> {left, top}
  const suppress = React.useRef(new Set()); // ids that should NOT animate next commit

  const register = React.useCallback((id, node) => {
    if (node) nodes.current.set(id, node);
    else if (nodes.current.get(id)) nodes.current.delete(id);
  }, []);

  const suppressNext = React.useCallback((id) => { suppress.current.add(id); }, []);

  React.useLayoutEffect(() => {
    const next = new Map();
    const animate = !window.__tcDragging && !document.hidden; // never glide in a throttled/bg iframe
    nodes.current.forEach((node, id) => {
      if (!node || !node.isConnected) return;
      // Clear any in-flight transform FIRST so we always measure the true layout
      // position. This makes FLIP self-correcting — even if a previous rAF reset
      // was throttled, positions never compound.
      node.style.transition = "none";
      node.style.transform = "";
      const r = node.getBoundingClientRect();
      next.set(id, { left: r.left, top: r.top });
      const p = prev.current.get(id);
      const skip = suppress.current.has(id);
      if (p && !skip && animate) {
        const dx = p.left - r.left;
        const dy = p.top - r.top;
        // animate only sane, on-screen deltas
        if ((Math.abs(dx) > 1 || Math.abs(dy) > 1) && Math.abs(dx) < 4000 && Math.abs(dy) < 4000) {
          node.style.transform = `translate(${dx}px, ${dy}px)`;
          node.getBoundingClientRect(); // force reflow
          requestAnimationFrame(() => {
            node.style.transition = "transform 460ms cubic-bezier(.22,1,.36,1)";
            node.style.transform = "";
          });
        }
      }
    });
    suppress.current.clear();
    prev.current = next;
  });

  return (
    <LayoutCtx.Provider value={{ register, suppressNext }}>
      {children}
    </LayoutCtx.Provider>
  );
}

// Ref callback for a card. Pass the item id; returns a ref to spread onto the node.
function useLayoutItem(id) {
  const ctx = React.useContext(LayoutCtx);
  return React.useCallback((node) => { if (ctx) ctx.register(id, node); }, [ctx, id]);
}

function useSuppressFlip() {
  const ctx = React.useContext(LayoutCtx);
  return ctx ? ctx.suppressNext : () => {};
}

Object.assign(window, { LayoutGroup, useLayoutItem, useSuppressFlip });
