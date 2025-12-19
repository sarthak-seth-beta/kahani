import { useState, useEffect, useRef } from "react";
import { Play, Pause } from "lucide-react";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { ExpandedPlayer } from "./ExpandedPlayer";

interface MiniPlayerProps {
  isVisible: boolean;
  isPlaying: boolean;
  trackTitle: string;
  albumTitle: string;
  coverImage: string;
  onPlayPause: () => void;
  audioUrl: string;
  currentTime: number;
  duration: number;
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

export function MiniPlayer({
  isVisible,
  isPlaying,
  trackTitle,
  albumTitle,
  coverImage,
  onPlayPause,
  audioUrl,
  currentTime,
  duration,
  onSeek,
  onSkipForward,
  onSkipBackward,
  onNextTrack,
  onPreviousTrack,
  hasNextTrack = false,
  hasPreviousTrack = false,
  autoplay,
  onAutoplayChange,
}: MiniPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const lastTrackInfoRef = useRef<{
    trackTitle: string;
    albumTitle: string;
    coverImage: string;
    audioUrl: string;
  } | null>(null);

  // Keep track info even when track ends (for smooth transitions)
  useEffect(() => {
    if (trackTitle && albumTitle && coverImage && audioUrl) {
      lastTrackInfoRef.current = {
        trackTitle,
        albumTitle,
        coverImage,
        audioUrl,
      };
    }
  }, [trackTitle, albumTitle, coverImage, audioUrl]);

  // Use current or last track info
  const displayTrackInfo = lastTrackInfoRef.current || {
    trackTitle,
    albumTitle,
    coverImage,
    audioUrl,
  };

  if (!isVisible && !isExpanded) return null;

  const truncatedTitle =
    displayTrackInfo.trackTitle.length > 30
      ? `${displayTrackInfo.trackTitle.substring(0, 30)}...`
      : displayTrackInfo.trackTitle;

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleClose = () => {
    setIsExpanded(false);
  };

  const handlePlayButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering expand
    trackEvent(AnalyticsEvents.MINI_PLAYER_PLAY_PAUSE, {
      is_playing: isPlaying,
      track_title: trackTitle,
      album_title: albumTitle,
    });
    onPlayPause();
  };

  return (
    <>
      <div
        onClick={handleExpand}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "80px",
          background: "#FDF4DC",
          borderTop: "1px solid rgba(0, 0, 0, 0.1)",
          display: "flex",
          alignItems: "center",
          padding: "0 1rem",
          zIndex: 1000,
          boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.1)",
          transition: "transform 0.3s ease-in-out",
          transform: isVisible ? "translateY(0)" : "translateY(100%)",
          cursor: "pointer",
        }}
      >
        <img
          src={displayTrackInfo.coverImage}
          alt={displayTrackInfo.albumTitle}
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "8px",
            objectFit: "cover",
            marginRight: "12px",
          }}
        />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <p
            style={{
              fontFamily: "Outfit, sans-serif",
              fontSize: "0.875rem",
              fontWeight: "500",
              color: "#000",
              margin: 0,
              marginBottom: "4px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {truncatedTitle}
          </p>
          <p
            style={{
              fontFamily: "Outfit, sans-serif",
              fontSize: "0.75rem",
              color: "rgba(0, 0, 0, 0.6)",
              margin: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {displayTrackInfo.albumTitle}
          </p>
        </div>
        <button
          onClick={handlePlayButtonClick}
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "#000",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#FDF4DC",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#333";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#000";
          }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause size={24} fill="currentColor" />
          ) : (
            <Play size={24} fill="currentColor" />
          )}
        </button>
      </div>

      {/* Expanded Player */}
      <ExpandedPlayer
        isOpen={isExpanded}
        onClose={handleClose}
        trackTitle={displayTrackInfo.trackTitle}
        albumTitle={displayTrackInfo.albumTitle}
        coverImage={displayTrackInfo.coverImage}
        audioUrl={displayTrackInfo.audioUrl}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onPlayPause={onPlayPause}
        onSeek={onSeek}
        onSkipForward={onSkipForward}
        onSkipBackward={onSkipBackward}
        onNextTrack={onNextTrack}
        onPreviousTrack={onPreviousTrack}
        hasNextTrack={hasNextTrack}
        hasPreviousTrack={hasPreviousTrack}
        autoplay={autoplay}
        onAutoplayChange={onAutoplayChange}
      />
    </>
  );
}
