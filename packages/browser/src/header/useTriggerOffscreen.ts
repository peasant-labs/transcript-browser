import { useEffect, useState, type RefObject } from "react";

/**
 * Returns true once the bottom of the referenced element has scrolled above the
 * given threshold (default 64px below the top of the viewport). Used by the
 * StickyHeader to appear once the hero is no longer visible. Ported verbatim
 * from peasant's `header/useTriggerOffscreen.ts`.
 */
export function useTriggerOffscreen(triggerRef: RefObject<HTMLElement | null>, threshold = 64): boolean {
  const [offscreen, setOffscreen] = useState(false);

  useEffect(() => {
    let rafId = 0;
    let cancelled = false;

    function update() {
      if (cancelled) return;
      const el = triggerRef.current;
      if (!el) {
        rafId = requestAnimationFrame(update);
        return;
      }
      const rect = el.getBoundingClientRect();
      setOffscreen(rect.bottom < threshold);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [triggerRef, threshold]);

  return offscreen;
}
