import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import Vinyl from "@/components/Vinyl";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
} from "lucide-react";

// Custom icon component for skip backward 10 seconds
const SkipBack10Icon = ({ size = 20 }: { size?: number }) => (
  <div
    style={{
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
    }}
  >
    <RotateCcw size={size} strokeWidth={2} />
    <span
      style={{
        position: "absolute",
        fontSize: Math.max(8, size * 0.35),
        fontWeight: "bold",
        lineHeight: 1,
        marginTop: size * 0.1,
      }}
    >
      10
    </span>
  </div>
);

// Custom icon component for skip forward 10 seconds
const SkipForward10Icon = ({ size = 20 }: { size?: number }) => (
  <div
    style={{
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: size,
      height: size,
    }}
  >
    <RotateCw size={size} strokeWidth={2} />
    <span
      style={{
        position: "absolute",
        fontSize: Math.max(8, size * 0.35),
        fontWeight: "bold",
        lineHeight: 1,
        marginTop: size * 0.1,
      }}
    >
      10
    </span>
  </div>
);

interface ExpandedPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  trackTitle: string;
  albumTitle: string;
  coverImage: string;
  audioUrl: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onNextTrack?: () => void;
  onPreviousTrack?: () => void;
  hasNextTrack?: boolean;
  hasPreviousTrack?: boolean;
  autoplay: boolean;
  onAutoplayChange: (enabled: boolean) => void;
}

export function ExpandedPlayer({
  isOpen,
  onClose,
  trackTitle,
  albumTitle,
  coverImage,
  audioUrl,
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onSkipForward,
  onSkipBackward,
  onNextTrack,
  onPreviousTrack,
  hasNextTrack = false,
  hasPreviousTrack = false,
  autoplay,
  onAutoplayChange,
}: ExpandedPlayerProps) {
  const [isSeeking, setIsSeeking] = useState(false);
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayTrackTitle, setDisplayTrackTitle] = useState(trackTitle);
  const [displayCoverImage, setDisplayCoverImage] = useState(coverImage);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevTrackTitleRef = useRef(trackTitle);
  const prevCoverImageRef = useRef(coverImage);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSeek = (value: number[]) => {
    if (!isNaN(value[0])) {
      onSeek(value[0]);
      setIsSeeking(true);
      setTimeout(() => setIsSeeking(false), 100);
    }
  };

  // Swipe down gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setSwipeStartY(e.touches[0].clientY);
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (swipeStartY === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - swipeStartY;
    if (diff > 0) {
      // Only allow downward swipes
      setSwipeOffset(diff);
      e.preventDefault(); // Prevent page scroll
    }
  };

  const handleTouchEnd = () => {
    if (swipeStartY === null) return;
    const threshold = 100;
    if (swipeOffset > threshold) {
      onClose();
    }
    setSwipeStartY(null);
    setSwipeOffset(0);
  };

  // Mouse drag handling for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    setSwipeStartY(e.clientY);
    setSwipeOffset(0);
  };

  useEffect(() => {
    if (swipeStartY === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientY - swipeStartY;
      if (diff > 0) {
        setSwipeOffset(diff);
      }
    };

    const handleMouseUp = () => {
      if (swipeStartY !== null) {
        const threshold = 100;
        if (swipeOffset > threshold) {
          onClose();
        }
        setSwipeStartY(null);
        setSwipeOffset(0);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [swipeStartY, swipeOffset, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Smooth transition when track changes
  useEffect(() => {
    if (
      trackTitle !== prevTrackTitleRef.current ||
      coverImage !== prevCoverImageRef.current
    ) {
      setIsTransitioning(true);
      // Fade out (150ms)
      setTimeout(() => {
        setDisplayTrackTitle(trackTitle);
        setDisplayCoverImage(coverImage);
        prevTrackTitleRef.current = trackTitle;
        prevCoverImageRef.current = coverImage;
        // Fade in (150ms)
        setTimeout(() => {
          setIsTransitioning(false);
        }, 10);
      }, 150);
    } else {
      setDisplayTrackTitle(trackTitle);
      setDisplayCoverImage(coverImage);
    }
  }, [trackTitle, coverImage]);

  const vinylSize =
    typeof window !== "undefined" && window.innerWidth < 480
      ? Math.min(window.innerWidth * 0.75, 320)
      : 320;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        pointerEvents: isOpen ? "auto" : "none",
      }}
    >
      {/* Content - slides from bottom */}
      <div
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          top: 0,
          background: "#FDF4DC",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1rem",
          gap: "2rem",
          width: "100%",
          height: "100%",
          transform: isOpen
            ? `translateY(${swipeOffset}px)`
            : "translateY(100%)",
          transition:
            swipeStartY === null
              ? "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              : "none",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#000000",
            zIndex: 10,
          }}
          aria-label="Close player"
        >
          <X size={24} />
        </button>

        {/* Track Title */}
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            textAlign: "center",
            marginTop: "2rem",
            marginBottom: "1rem",
            color: "#000000",
            opacity: isTransitioning ? 0 : 1,
            transition: "opacity 0.15s ease-in-out",
          }}
        >
          {displayTrackTitle}
        </h2>

        {/* Vinyl Record */}
        <div
          style={{
            opacity: isTransitioning ? 0 : 1,
            transition: "opacity 0.15s ease-in-out",
          }}
        >
          <Vinyl
            isPlaying={isPlaying}
            onToggle={onPlayPause}
            size={vinylSize}
            albumCoverSrc={displayCoverImage}
          />
        </div>

        {/* Player Controls */}
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
            padding: "0 1rem",
            maxWidth: "500px",
          }}
        >
          {/* Timeline Slider */}
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="w-full"
              style={{
                cursor: "pointer",
                transition: isTransitioning ? "none" : "all 0.2s ease-out",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.875rem",
                color: "#000000",
                width: "100%",
                opacity: isTransitioning ? 0 : 1,
                transition: "opacity 0.15s ease-in-out",
              }}
            >
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
              width: "100%",
            }}
          >
            {/* Previous Track */}
            <button
              onClick={onPreviousTrack}
              disabled={!hasPreviousTrack}
              style={{
                background: "transparent",
                border: "none",
                cursor: hasPreviousTrack ? "pointer" : "not-allowed",
                opacity: hasPreviousTrack ? 1 : 0.4,
                padding: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#000000",
              }}
              aria-label="Previous track"
            >
              <ChevronLeft size={24} />
            </button>

            {/* Skip Backward 10s */}
            <button
              onClick={onSkipBackward}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#000000",
              }}
              aria-label="Skip backward 10 seconds"
            >
              <SkipBack10Icon size={24} />
            </button>

            {/* Play/Pause */}
            <button
              onClick={onPlayPause}
              style={{
                background: "#000000",
                border: "none",
                borderRadius: "50%",
                width: "48px",
                height: "48px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                flexShrink: 0,
              }}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            {/* Skip Forward 10s */}
            <button
              onClick={onSkipForward}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#000000",
              }}
              aria-label="Skip forward 10 seconds"
            >
              <SkipForward10Icon size={24} />
            </button>

            {/* Next Track */}
            <button
              onClick={() => onNextTrack?.()}
              disabled={!hasNextTrack}
              style={{
                background: "transparent",
                border: "none",
                cursor: hasNextTrack ? "pointer" : "not-allowed",
                opacity: hasNextTrack ? 1 : 0.4,
                padding: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#000000",
              }}
              aria-label="Next track"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>

        {/* Autoplay Toggle */}
        {/* <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginTop: "0.5rem",
          }}
        >
          <label
            htmlFor="expanded-autoplay-toggle"
            style={{
              fontSize: "0.875rem",
              color: "#000000",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            Autoplay
          </label>
          <Switch
            id="expanded-autoplay-toggle"
            checked={autoplay}
            onCheckedChange={onAutoplayChange}
          />
        </div> */}
      </div>
    </div>
  );
}
