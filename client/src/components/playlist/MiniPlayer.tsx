import { Play, Pause } from "lucide-react";

interface MiniPlayerProps {
  isVisible: boolean;
  isPlaying: boolean;
  trackTitle: string;
  albumTitle: string;
  coverImage: string;
  onPlayPause: () => void;
}

export function MiniPlayer({
  isVisible,
  isPlaying,
  trackTitle,
  albumTitle,
  coverImage,
  onPlayPause,
}: MiniPlayerProps) {
  if (!isVisible) return null;

  const truncatedTitle =
    trackTitle.length > 30 ? `${trackTitle.substring(0, 30)}...` : trackTitle;

  return (
    <div
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
      }}
    >
      <img
        src={coverImage}
        alt={albumTitle}
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
          {albumTitle}
        </p>
      </div>
      <button
        onClick={onPlayPause}
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
  );
}

