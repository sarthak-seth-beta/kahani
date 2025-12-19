import {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import Vinyl from "./Vinyl";
import kahaniLogo from "@assets/Kahani Dummy Logo (1)_1762679074954.png";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

// Custom icon component for skip backward 10 seconds
const SkipBack10Icon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Circular arrow pointing counter-clockwise (left/backward) */}
    <path d="M12 4 C7.6 4 4 7.6 4 12 C4 16.4 7.6 20 12 20" fill="none" />
    {/* Arrowhead pointing left */}
    <path d="M8 8 L4 12 L8 16" fill="none" />
    {/* Number 10 in center */}
    <text
      x="12"
      y="15.5"
      textAnchor="middle"
      fontSize="7"
      fontWeight="bold"
      fill="currentColor"
      fontFamily="system-ui, -apple-system, sans-serif"
    >
      10
    </text>
  </svg>
);

// Custom icon component for skip forward 10 seconds
const SkipForward10Icon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Circular arrow pointing clockwise (right/forward) */}
    <path d="M12 4 C16.4 4 20 7.6 20 12 C20 16.4 16.4 20 12 20" fill="none" />
    {/* Arrowhead pointing right */}
    <path d="M16 8 L20 12 L16 16" fill="none" />
    {/* Number 10 in center */}
    <text
      x="12"
      y="15.5"
      textAnchor="middle"
      fontSize="7"
      fontWeight="bold"
      fill="currentColor"
      fontFamily="system-ui, -apple-system, sans-serif"
    >
      10
    </text>
  </svg>
);

interface TrackSlideProps {
  trackTitle: string;
  audioSrc: string;
  albumCoverSrc: string;
  onNextTrack?: (fromAutoplay?: boolean) => void;
  onPreviousTrack?: () => void;
  hasNextTrack?: boolean;
  hasPreviousTrack?: boolean;
  autoplay?: boolean;
  onAutoplayChange?: (enabled: boolean) => void;
}

export interface TrackSlideRef {
  pause: () => void;
  togglePlayPause: () => void;
}

const TrackSlide = forwardRef<TrackSlideRef, TrackSlideProps>(
  (
    {
      trackTitle,
      audioSrc,
      albumCoverSrc,
      onNextTrack,
      onPreviousTrack,
      hasNextTrack = false,
      hasPreviousTrack = false,
      autoplay: externalAutoplay,
      onAutoplayChange,
    },
    ref,
  ) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [autoplay, setAutoplay] = useState(externalAutoplay ?? false);
    const [isSeeking, setIsSeeking] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlayPause = () => {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          // Optimistically set playing state for UI feedback
          setIsPlaying(true);
          audioRef.current.play().catch((err) => {
            console.warn(
              "Playback failed (using placeholder audio):",
              err.message,
            );
            // Keep UI in playing state even if audio fails - vinyl still spins
          });
        }
      }
    };

    const handleSeek = (value: number[]) => {
      if (audioRef.current && !isNaN(value[0])) {
        const newTime = value[0];
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        setIsSeeking(true);
        // Reset seeking flag after a short delay
        setTimeout(() => setIsSeeking(false), 100);
      }
    };

    const handleSkipForward = () => {
      if (audioRef.current) {
        const newTime = Math.min(audioRef.current.currentTime + 10, duration);
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    };

    const handleSkipBackward = () => {
      if (audioRef.current) {
        const newTime = Math.max(audioRef.current.currentTime - 10, 0);
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    };

    const handleAutoplayToggle = (checked: boolean) => {
      setAutoplay(checked);
      onAutoplayChange?.(checked);
    };

    useImperativeHandle(ref, () => ({
      pause: () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      },
      togglePlayPause,
    }));

    useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
      };

      const handleTimeUpdate = () => {
        // Only update if not currently seeking (to avoid slider jitter)
        if (!isSeeking) {
          setCurrentTime(audio.currentTime);
        }
      };

      const handlePlay = () => {
        setIsPlaying(true);
      };

      const handlePause = () => {
        setIsPlaying(false);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        // If autoplay is enabled, move to next track
        if (autoplay && onNextTrack && hasNextTrack) {
          // Small delay to ensure audio is fully stopped
          setTimeout(() => {
            onNextTrack(true); // Pass true to indicate this is from autoplay
          }, 100);
        }
      };

      const handleError = (e: Event) => {
        e.preventDefault();
        console.warn("Audio failed to load (using placeholder source)");
        // Don't set isPlaying to false - UI should still show playing state
      };

      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("play", handlePlay);
      audio.addEventListener("pause", handlePause);
      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("error", handleError);

      return () => {
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("play", handlePlay);
        audio.removeEventListener("pause", handlePause);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
      };
    }, [autoplay, hasNextTrack, onNextTrack]);

    // Sync external autoplay prop
    useEffect(() => {
      if (externalAutoplay !== undefined) {
        setAutoplay(externalAutoplay);
      }
    }, [externalAutoplay]);

    const formatTime = (seconds: number): string => {
      if (isNaN(seconds)) return "0:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const vinylSize =
      typeof window !== "undefined" && window.innerWidth < 480
        ? Math.min(window.innerWidth * 0.75, 320)
        : 320;

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1rem",
          gap: "2rem",
          maxWidth: "640px",
          margin: "0 auto",
        }}
      >
        {/* Track Title */}
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            textAlign: "center",
            marginBottom: "1rem",
          }}
          data-testid="text-track-title"
        >
          {trackTitle}
        </h2>

        {/* Vinyl Record */}
        <Vinyl
          isPlaying={isPlaying}
          onToggle={togglePlayPause}
          size={vinylSize}
          albumCoverSrc={albumCoverSrc}
        />

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
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.875rem",
                color: "#000000",
                width: "100%",
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
              onClick={handleSkipBackward}
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
              onClick={togglePlayPause}
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
              onClick={handleSkipForward}
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

          {/* Autoplay Toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <label
              htmlFor="autoplay-toggle"
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
              id="autoplay-toggle"
              checked={autoplay}
              onCheckedChange={handleAutoplayToggle}
            />
          </div>
        </div>

        {/* Hidden Audio Element */}
        <audio ref={audioRef} src={audioSrc} preload="metadata" />

        {/* Kahani Logo */}
        <img
          src={kahaniLogo}
          alt="Kahani Logo"
          style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: "16px",
            width: "120px",
            height: "auto",
          }}
          data-testid="kahani-logo"
        />
      </div>
    );
  },
);

TrackSlide.displayName = "TrackSlide";

export default TrackSlide;
