import { useEffect } from "react";
import { useLocation } from "wouter";

const SAMPLE_PAGE_PATH = "/sample";

export const SmoothScroll = () => {
  const [location] = useLocation();

  useEffect(() => {
    if (location === SAMPLE_PAGE_PATH) return;
    if (typeof window === "undefined") return;

    let lenis: InstanceType<typeof import("lenis").default> | null = null;
    let rafId: number;

    import("lenis").then(({ default: Lenis }) => {
      lenis = new Lenis({
        duration: 0.8,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 0.9,
      });

      function raf(time: number) {
        lenis!.raf(time);
        rafId = requestAnimationFrame(raf);
      }
      rafId = requestAnimationFrame(raf);
    });

    return () => {
      lenis?.destroy();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [location]);

  return null;
};

export default SmoothScroll;
