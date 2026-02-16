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

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      wheelMultiplier: 1,
      touchMultiplier: 1,
      // @ts-ignore
      syncTouch: true,
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
