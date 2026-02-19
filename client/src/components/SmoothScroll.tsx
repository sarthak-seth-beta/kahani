import { useEffect } from "react";
import { useLocation } from "wouter";
import Lenis from "lenis";

const SAMPLE_PAGE_PATH = "/sample";

export const SmoothScroll = () => {
  const [location] = useLocation();

  useEffect(() => {
    if (location === SAMPLE_PAGE_PATH) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const lenis = new Lenis({
      // Keep the easing but lower \"intensity\" so it feels close
      // to native scroll, just slightly smoothed.
      duration: 0.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      // Vertical only; don't interfere with horizontal swipes.
      orientation: "vertical",
      gestureOrientation: "vertical",
      // Smooth wheel/trackpad scroll.
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 0.9,
      // Leave syncTouch off to avoid iOS quirks; we let the browser
      // handle most of the native feel and just nudge it.
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, [location]);

  return null;
};

export default SmoothScroll;
