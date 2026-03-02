import { useRef, useState, useEffect, type ReactNode } from "react";

interface LazySectionProps {
  children: ReactNode;
  /**
   * How many px ahead of the viewport to start rendering (and re-rendering).
   * Default: 400 — section mounts 400px before it enters the screen.
   */
  preloadPx?: number;
  /**
   * How many px from the viewport before the section is removed from the DOM.
   * A height placeholder is kept so the page layout never shifts.
   * Default: 2500 — roughly 3-4 sections away.
   */
  unloadPx?: number;
}

/**
 * Wraps a section so it is:
 *  - Not rendered on initial page load (below-fold sections skip the first paint)
 *  - Mounted when the user scrolls within `preloadPx` of it
 *  - Unmounted (replaced by a same-height placeholder) when `unloadPx` away
 *
 * Works with React.lazy() children: the JS chunk only starts downloading
 * when the section is about to enter the viewport.
 */
export default function LazySection({
  children,
  preloadPx = 400,
  unloadPx = 2500,
}: LazySectionProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const [savedHeight, setSavedHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    // Fires when section comes within `preloadPx` → mount it
    const loadObs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isMountedRef.current) {
          isMountedRef.current = true;
          setVisible(true);
        }
      },
      { rootMargin: `${preloadPx}px 0px` },
    );

    // Fires when section moves beyond `unloadPx` → save height + unmount
    const unloadObs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && isMountedRef.current) {
          setSavedHeight(el.offsetHeight);
          isMountedRef.current = false;
          setVisible(false);
        }
      },
      { rootMargin: `${unloadPx}px 0px` },
    );

    loadObs.observe(el);
    unloadObs.observe(el);

    return () => {
      loadObs.disconnect();
      unloadObs.disconnect();
    };
  }, [preloadPx, unloadPx]);

  return (
    <div
      ref={wrapperRef}
      style={!visible && savedHeight ? { minHeight: savedHeight } : undefined}
    >
      {visible && children}
    </div>
  );
}
