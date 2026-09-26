import { type RefObject, useLayoutEffect, useRef } from "react";

/**
 * Slides children of `container` from their previous position to their new one whenever `order`
 * changes (the FLIP technique), so re-sorted rows glide instead of jumping. Children opt in with
 * a `data-flip="<stable id>"` attribute. New children aren't moved; they use their own entrance.
 */
export function useFlip(container: RefObject<HTMLElement | null>, order: string) {
  const positions = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const el = container.current;
    if (!el) return;
    const animate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, number>();
    for (const child of Array.from(el.children) as HTMLElement[]) {
      const id = child.dataset.flip;
      if (!id) continue;
      const top = child.offsetTop;
      next.set(id, top);
      const previous = positions.current.get(id);
      if (animate && previous !== undefined && previous !== top) {
        child.animate([{ transform: `translateY(${previous - top}px)` }, { transform: "translateY(0)" }], {
          duration: 380,
          easing: "cubic-bezier(0.2, 0.7, 0.2, 1)",
        });
      }
    }
    positions.current = next;
  }, [container, order]);
}
