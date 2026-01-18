import { useLocation } from "wouter";
import {
  Play,
  Pause,
  Home,
  Search,
  User,
  SkipBack,
  SkipForward,
  RotateCcw,
} from "lucide-react";
import kahaniLogo from "@assets/Kahani Dummy Logo (1)_1762679074954.png";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface BottomHomeNavbarProps {
  isActive?: boolean;
  onInactive?: () => void;
}

const DadiImage =
  "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/dadi-image_bottomNav.png";

const DUMMY_AUDIO_URL =
  "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/voice-notes/nani_wedding_day.ogg";

export function BottomHomeNavbar({
  isActive,
  onInactive,
}: BottomHomeNavbarProps) {
  const [, setLocation] = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audio] = useState(new Audio(DUMMY_AUDIO_URL));

  // Audio Control
  useEffect(() => {
    const updateProgress = () => {
      if (
        audio.duration &&
        !isNaN(audio.duration) &&
        audio.duration !== Infinity
      ) {
        setProgress((audio.currentTime / audio.duration) * 100);
      } else {
        setProgress(0);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setIsEnded(true);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", handleEnded);

    if (isActive) {
      setIsPlaying(true);
      setIsEnded(false);
      audio.play().catch((e) => console.error("Audio playback failed", e));
    } else {
      setIsPlaying(false);
      audio.pause();
      audio.currentTime = 0;
      setProgress(0);
    }
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [isActive, audio]);

  // Auto-hide timer when paused (Mobile only)
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isMobile && !isPlaying && isActive && isEnded) {
      timeout = setTimeout(() => {
        if (onInactive) onInactive();
      }, 5000);
    }
    return () => clearTimeout(timeout);
  }, [isPlaying, isActive, isEnded, onInactive, isMobile]);

  const togglePlay = () => {
    if (isEnded) {
      audio.currentTime = 0;
      audio.play();
      setIsPlaying(true);
      setIsEnded(false);
    } else if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();

    const handleScroll = () => {
      const scrolledToBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
      setIsAtBottom(scrolledToBottom);
    };

    window.addEventListener("resize", checkMobile);
    window.addEventListener("scroll", handleScroll);

    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const isVisible = (!isMobile || !!isActive) && !isAtBottom;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 px-0 pb-0 pt-0 md:px-4 md:pb-4 md:pt-2 pointer-events-none flex justify-center transition-transform duration-500 ease-in-out ${isVisible ? "translate-y-0" : "translate-y-[120%]"}`}
    >
      <div
        className="pointer-events-auto relative w-full md:max-w-3xl bg-white/95 backdrop-blur-md border-t md:border border-black/10 md:shadow-2xl md:rounded-2xl p-3 flex items-center justify-between gap-4 transition-all"
        style={{
          boxShadow: isMobile
            ? "0 -4px 20px rgba(0,0,0,0.05)"
            : "0 8px 32px rgba(0, 0, 0, 0.12)",
        }}
      >
        {/* Left: Album Art & Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0 z-10">
          <div
            className="relative group cursor-pointer shrink-0"
            onClick={() =>
              setLocation(
                "/playlist-albums/f6258c48-043e-4b23-883b-dfb4ace3b43c",
              )
            }
          >
            <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-200 border border-black/10 shadow-sm">
              <img
                src={DadiImage}
                alt="Album Cover"
                className="w-full h-full object-cover opacity-90"
              />
            </div>
          </div>

          <div className="flex flex-col overflow-hidden min-w-0">
            {isMobile ? (
              <div className="flex overflow-hidden w-full mask-linear-fade">
                <motion.div
                  className="flex whitespace-nowrap"
                  animate={{ x: "-50%" }}
                  transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: 15,
                  }}
                >
                  <span className="font-outfit font-bold text-gray-900 text-sm leading-tight mr-4">
                    किसी त्योहार का खाना, जिसकी याद आज भी बहुत गहरी है
                  </span>
                  <span className="font-outfit font-bold text-gray-900 text-sm leading-tight mr-4">
                    किसी त्योहार का खाना, जिसकी याद आज भी बहुत गहरी है
                  </span>
                </motion.div>
              </div>
            ) : (
              <span className="font-outfit font-bold text-gray-900 truncate text-sm md:text-base leading-tight">
                किसी त्योहार का खाना, जिसकी याद आज भी बहुत गहरी है
              </span>
            )}
            {/* <span className="font-outfit text-xs text-gray-500 truncate">
              Narrated by Grandmother
            </span> */}
          </div>
        </div>

        {/* Right: Play Button */}
        <div className="flex items-center justify-end flex-none z-20">
          <button
            onClick={togglePlay}
            className="group relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#A35139] text-white shadow-md hover:bg-[#8B4430] hover:scale-105 transition-all active:scale-95"
            aria-label={isPlaying ? "Pause" : isEnded ? "Replay" : "Play"}
          >
            {isEnded ? (
              <RotateCcw
                size={20}
                fill="none"
                className="ml-0"
                strokeWidth={2.5}
              />
            ) : isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-0.5 md:ml-1" />
            )}
          </button>
          {/* Progress Bar (Desktop Only) */}
          {/* <div className="hidden md:flex w-32 h-1 bg-gray-200 rounded-full overflow-hidden mt-0.5">
            <div
              className="h-full bg-[#A35139] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div> */}
        </div>
      </div>

      {/* Mobile Progress Bar (Optional: edge of screen if not in center) 
                User asked for center progress, but on mobile ribbon, vertical stacking in center might be too tall.
                Alternatively, we can put it above the ribbon like typical audio players.
            */}
      <div className="md:hidden absolute bottom-[calc(100%-1px)] left-0 right-0 h-0.5 bg-gray-200">
        <div
          className="h-full bg-[#A35139] transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}
