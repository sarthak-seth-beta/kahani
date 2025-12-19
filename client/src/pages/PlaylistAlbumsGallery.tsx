import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Share2, Play, Pause, Shuffle, Globe } from "lucide-react";
import { MiniPlayer } from "@/components/playlist/MiniPlayer";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

const FALLBACK_AUDIO_URL =
  "https://bvkaurviswhrjldeuabx.supabase.co/storage/v1/object/public/voice-notes/demo_audio.m4a";

interface Track {
  questionIndex: number;
  questionText: string;
  mediaUrl: string | null;
  duration?: number;
}

interface AlbumData {
  trial: {
    id: string;
    storytellerName: string;
    buyerName: string;
    selectedAlbum: string;
  };
  album: {
    description: string;
    coverImage: string;
  };
  tracks: Array<{
    questionIndex: number;
    questionText: string;
    mediaUrl: string | null;
  }>;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatTotalDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  return `${mins} min`;
}

export default function PlaylistAlbumsGallery() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/playlist-albums/:trialId");
  const trialId = params?.trialId || "";

  // Initialize language from URL param, fallback to English
  const getInitialLanguage = () => {
    const urlLocale = new URLSearchParams(window.location.search)
      .get("locale")
      ?.toLowerCase();
    if (urlLocale === "hi" || urlLocale === "hn") {
      return "hi";
    }
    return "en";
  };

  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "hi">(
    getInitialLanguage,
  );

  // Update normalized locale based on selected language
  const normalizedLocale = selectedLanguage === "hi" ? "hn" : "en";
  const albumApiPath = `/api/albums/${trialId}?locale=${normalizedLocale}`;

  const {
    data: albumData,
    isLoading,
    error,
  } = useQuery<AlbumData>({
    queryKey: [albumApiPath],
    enabled: !!trialId,
  });

  const [playingTrackIndex, setPlayingTrackIndex] = useState<number | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [durations, setDurations] = useState<Map<number, number>>(new Map());
  const audioRefs = useRef<Map<number, HTMLAudioElement>>(new Map());
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // State for shuffle mode and tracking played tracks
  const [isShuffleMode, setIsShuffleMode] = useState(false);
  const [playedTracksInShuffle, setPlayedTracksInShuffle] = useState<
    Set<number>
  >(new Set());

  // State for language dropdown
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle language change
  const handleLanguageChange = useCallback(
    (language: "en" | "hi") => {
      trackEvent(AnalyticsEvents.LANGUAGE_CHANGED, {
        from_language: selectedLanguage,
        to_language: language,
        trial_id: trialId,
      });
      setSelectedLanguage(language);
      setIsLanguageDropdownOpen(false);

      // Update URL with new locale
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("locale", language);
      window.history.pushState({}, "", currentUrl.toString());
    },
    [selectedLanguage, trialId],
  );

  // Register audio element refs
  const handleAudioRef = useCallback(
    (trackIndex: number, audio: HTMLAudioElement | null) => {
      if (audio) {
        audioRefs.current.set(trackIndex, audio);
      } else {
        audioRefs.current.delete(trackIndex);
      }
    },
    [],
  );

  // Load duration for a track
  const loadDuration = useCallback((trackIndex: number, audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.addEventListener("loadedmetadata", () => {
      setDurations((prev) => new Map(prev).set(trackIndex, audio.duration));
    });
    audio.load();
  }, []);

  // Sync language with URL on mount or URL change
  useEffect(() => {
    const urlLocale = new URLSearchParams(window.location.search)
      .get("locale")
      ?.toLowerCase();
    if (urlLocale === "hi" || urlLocale === "hn") {
      if (selectedLanguage !== "hi") {
        setSelectedLanguage("hi");
      }
    } else {
      if (selectedLanguage !== "en") {
        setSelectedLanguage("en");
      }
    }
  }, []); // Only run on mount

  // Load durations for all tracks
  useEffect(() => {
    if (albumData?.tracks) {
      albumData.tracks.forEach((track: any, index: number) => {
        if (track.mediaUrl && !durations.has(index)) {
          loadDuration(index, track.mediaUrl);
        }
      });
    }
  }, [albumData, loadDuration, durations]);

  // Handle play/pause
  const handlePlayPause = useCallback(
    (trackIndex: number, isShufflePlay: boolean = false) => {
      const track = albumData?.tracks[trackIndex];
      if (!track) return;

      const audioUrl = track.mediaUrl || FALLBACK_AUDIO_URL;

      // If clicking the same track, toggle play/pause
      if (playingTrackIndex === trackIndex && currentAudioRef.current) {
        if (isPlaying) {
          currentAudioRef.current.pause();
          setIsPlaying(false);
        } else {
          currentAudioRef.current.play();
          setIsPlaying(true);
        }
        return;
      }

      // Stop and cleanup current audio if playing
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.removeEventListener("ended", () => {});
        currentAudioRef.current.removeEventListener("pause", () => {});
        currentAudioRef.current.removeEventListener("play", () => {});
        currentAudioRef.current = null;
      }

      // Play new track
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      setPlayingTrackIndex(trackIndex);
      setIsPlaying(true);

      // Track play event
      trackEvent(AnalyticsEvents.TRACK_PLAYED, {
        track_index: trackIndex,
        track_question: track.questionText,
        trial_id: albumData?.trial.id,
        album_title: albumData?.trial.selectedAlbum,
        is_shuffle: isShufflePlay || isShuffleMode,
      });

      // Track this track as played in shuffle mode (only when starting to play)
      if (
        (isShuffleMode || isShufflePlay) &&
        !playedTracksInShuffle.has(trackIndex)
      ) {
        setPlayedTracksInShuffle((prev) => new Set(prev).add(trackIndex));
      }

      const handleEnded = () => {
        // Get next track (using current state values)
        const currentShuffleMode = isShuffleMode;
        const currentPlayedTracks = playedTracksInShuffle;

        let nextIndex: number | null = null;

        if (currentShuffleMode) {
          // In shuffle mode, pick from unplayed tracks
          if (!albumData?.tracks) {
            setIsPlaying(false);
            setPlayingTrackIndex(null);
            currentAudioRef.current = null;
            return;
          }

          const unplayedTracks = albumData.tracks
            .map((_, index) => index)
            .filter((index) => !currentPlayedTracks.has(index));

          if (unplayedTracks.length === 0) {
            // All tracks played, reset and pick any track
            setPlayedTracksInShuffle(new Set());
            nextIndex = Math.floor(Math.random() * albumData.tracks.length);
          } else {
            // Pick random from unplayed tracks
            const randomUnplayedIndex = Math.floor(
              Math.random() * unplayedTracks.length,
            );
            nextIndex = unplayedTracks[randomUnplayedIndex];
          }
        } else {
          // Normal mode: play next sequential track
          const nextSeqIndex = trackIndex + 1;
          if (albumData?.tracks && nextSeqIndex < albumData.tracks.length) {
            nextIndex = nextSeqIndex;
          }
        }

        if (nextIndex !== null) {
          // Autoplay next track
          setTimeout(() => {
            handlePlayPause(nextIndex!, currentShuffleMode);
          }, 100);
        } else {
          // No more tracks to play
          setIsPlaying(false);
          setPlayingTrackIndex(null);
          currentAudioRef.current = null;
        }
      };

      const handlePause = () => {
        setIsPlaying(false);
        trackEvent(AnalyticsEvents.TRACK_PAUSED, {
          track_index: trackIndex,
          track_question: track.questionText,
          trial_id: albumData?.trial.id,
          album_title: albumData?.trial.selectedAlbum,
        });
      };

      const handlePlay = () => {
        setIsPlaying(true);
      };

      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("pause", handlePause);
      audio.addEventListener("play", handlePlay);

      audio.play().catch((error) => {
        console.error("Error playing audio:", error);
        setIsPlaying(false);
        setPlayingTrackIndex(null);
        currentAudioRef.current = null;
      });
    },
    [
      albumData,
      playingTrackIndex,
      isPlaying,
      isShuffleMode,
      playedTracksInShuffle,
    ],
  );

  // Handle play button (first track)
  const handlePlay = useCallback(() => {
    if (albumData?.tracks && albumData.tracks.length > 0) {
      trackEvent(AnalyticsEvents.PLAYLIST_PLAY_CLICKED, {
        trial_id: albumData.trial.id,
        album_title: albumData.trial.selectedAlbum,
        total_tracks: albumData.tracks.length,
      });
      setIsShuffleMode(false);
      setPlayedTracksInShuffle(new Set());
      handlePlayPause(0, false);
    }
  }, [albumData, handlePlayPause]);

  // Handle shuffle button
  const handleShuffle = useCallback(() => {
    if (albumData?.tracks && albumData.tracks.length > 0) {
      trackEvent(AnalyticsEvents.PLAYLIST_SHUFFLE_CLICKED, {
        trial_id: albumData.trial.id,
        album_title: albumData.trial.selectedAlbum,
        total_tracks: albumData.tracks.length,
      });
      setIsShuffleMode(true);

      // Get unplayed tracks
      const unplayedTracks = albumData.tracks
        .map((_, index) => index)
        .filter((index) => !playedTracksInShuffle.has(index));

      let randomIndex: number;

      if (unplayedTracks.length === 0) {
        // All tracks played, reset and pick any track
        setPlayedTracksInShuffle(new Set());
        randomIndex = Math.floor(Math.random() * albumData.tracks.length);
      } else {
        // Pick random from unplayed tracks
        const randomUnplayedIndex = Math.floor(
          Math.random() * unplayedTracks.length,
        );
        randomIndex = unplayedTracks[randomUnplayedIndex];
      }

      handlePlayPause(randomIndex, true);
    }
  }, [albumData, handlePlayPause, playedTracksInShuffle]);

  // Calculate total duration
  const totalDuration = Array.from(durations.values()).reduce(
    (sum, duration) => sum + duration,
    0,
  );

  if (!trialId) {
    return (
      <div
        style={{
          background: "#FDF4DC",
          width: "100%",
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ fontFamily: "Outfit", fontSize: "1.5rem", color: "#000" }}>
          Invalid album link
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: "#FDF4DC",
          width: "100%",
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <p style={{ fontFamily: "Outfit", fontSize: "1.5rem", color: "#000" }}>
          Failed to load album
        </p>
        <button
          onClick={() => setLocation("/")}
          style={{
            fontFamily: "Outfit",
            padding: "0.5rem 1rem",
            background: "#000",
            color: "#FDF4DC",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
          }}
        >
          Go Home
        </button>
      </div>
    );
  }

  if (isLoading || !albumData) {
    return (
      <div
        style={{
          background: "#FDF4DC",
          width: "100%",
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ fontFamily: "Outfit", fontSize: "1.5rem", color: "#000" }}>
          Loading album...
        </p>
      </div>
    );
  }

  const { trial, album, tracks } = albumData;
  const trackCount = tracks.length;
  const currentTrack =
    playingTrackIndex !== null ? tracks[playingTrackIndex] : null;

  return (
    <div
      style={{
        background: "#FDF4DC",
        minHeight: "100dvh",
        paddingBottom: isPlaying ? "80px" : "0",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#FDF4DC",
          borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
          padding: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={() => setLocation("/")}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            transition: "background 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0, 0, 0, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
          aria-label="Back"
        >
          <ArrowLeft size={24} color="#000" />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Language Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              style={{
                background: "transparent",
                border: "1px solid rgba(0, 0, 0, 0.2)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "8px",
                transition: "all 0.2s ease",
                fontFamily: "Outfit, sans-serif",
                fontSize: "0.875rem",
                color: "#000",
                minWidth: "100px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
              aria-label="Select language"
            >
              <Globe size={18} color="#000" />
              <span>{selectedLanguage === "hi" ? "हिंदी" : "English"}</span>
            </button>
            {isLanguageDropdownOpen && (
              <>
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 998,
                  }}
                  onClick={() => setIsLanguageDropdownOpen(false)}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 0.5rem)",
                    right: 0,
                    background: "#FFF",
                    border: "1px solid rgba(0, 0, 0, 0.1)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    zIndex: 999,
                    minWidth: "140px",
                    overflow: "hidden",
                  }}
                >
                  <button
                    onClick={() => handleLanguageChange("en")}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      background:
                        selectedLanguage === "en"
                          ? "rgba(163, 81, 57, 0.1)"
                          : "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "Outfit, sans-serif",
                      fontSize: "0.875rem",
                      color: "#000",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      transition: "background 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedLanguage !== "en") {
                        e.currentTarget.style.background =
                          "rgba(0, 0, 0, 0.05)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedLanguage !== "en") {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    English
                  </button>
                  <button
                    onClick={() => handleLanguageChange("hi")}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      background:
                        selectedLanguage === "hi"
                          ? "rgba(163, 81, 57, 0.1)"
                          : "transparent",
                      border: "none",
                      borderTop: "1px solid rgba(0, 0, 0, 0.1)",
                      cursor: "pointer",
                      fontFamily: "Outfit, sans-serif",
                      fontSize: "0.875rem",
                      color: "#000",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      transition: "background 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedLanguage !== "hi") {
                        e.currentTarget.style.background =
                          "rgba(0, 0, 0, 0.05)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedLanguage !== "hi") {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    हिंदी
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={async () => {
              if (!albumData) return;
              const url = window.location.href;
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: albumData.trial.selectedAlbum,
                    text: `Check out this Kahani album: ${albumData.trial.selectedAlbum}`,
                    url: url,
                  });
                  trackEvent(AnalyticsEvents.ALBUM_SHARED, {
                    trial_id: albumData.trial.id,
                    album_title: albumData.trial.selectedAlbum,
                    share_method: "native",
                  });
                } catch (error) {
                  // User cancelled or error occurred
                  if (error instanceof Error && error.name !== "AbortError") {
                    console.error("Error sharing:", error);
                  }
                }
              } else {
                // Fallback: copy to clipboard
                try {
                  await navigator.clipboard.writeText(url);
                  trackEvent(AnalyticsEvents.ALBUM_SHARED, {
                    trial_id: albumData.trial.id,
                    album_title: albumData.trial.selectedAlbum,
                    share_method: "copy_link",
                  });
                  // You could show a toast notification here
                  alert("Link copied to clipboard!");
                } catch (error) {
                  console.error("Failed to copy link:", error);
                  alert("Failed to copy link. Please copy manually: " + url);
                }
              }
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            aria-label="Share album"
          >
            <Share2 size={24} color="#000" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 0 }}>
        {/* Cover Image Section - Full Width */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: isMobile ? "180px" : "220px",
            overflow: "visible",
            backgroundColor: "#C9C1B1",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <img
              src="https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/coverImage.jpg"
              alt="Cover"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>

          {/* Circular Profile Image - Overlapping on Left */}
          <div
            style={{
              position: "absolute",
              bottom: isMobile ? "-60px" : "-70px",
              left: isMobile ? "1rem" : "1.5rem",
              width: isMobile ? "120px" : "140px",
              height: isMobile ? "120px" : "140px",
              borderRadius: "50%",
              border: "4px solid white",
              backgroundColor: "white",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
              overflow: "hidden",
              zIndex: 10,
            }}
          >
            <img
              src={album.coverImage}
              alt={trial.selectedAlbum}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        </div>

        {/* Content Below Cover */}
        <div
          style={{
            padding: "0 1rem 1rem",
            paddingTop: isMobile ? "3.5rem" : "4.5rem",
          }}
        >
          {/* Album Title */}
          <h1
            style={{
              fontFamily: "Outfit, sans-serif",
              fontSize: isMobile ? "1.25rem" : "1.5rem",
              fontWeight: "700",
              color: "#000",
              margin: "0 0 0.75rem",
              textAlign: "left",
            }}
          >
            {trial.selectedAlbum}
          </h1>

          {/* Storyteller Tag and Description */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "Outfit, sans-serif",
                fontSize: "0.75rem",
                fontWeight: "500",
                color: "#A35139",
                background: "rgba(163, 81, 57, 0.1)",
                padding: "0.25rem 0.75rem",
                borderRadius: "12px",
              }}
            >
              {trial.storytellerName}
            </span>
            <span
              style={{
                fontFamily: "Outfit, sans-serif",
                fontSize: "0.8125rem",
                color: "rgba(0, 0, 0, 0.6)",
              }}
            >
              Recorded with love for {trial.buyerName} by{" "}
              {trial.storytellerName}.
            </span>
          </div>

          {/* Duration and Count */}
          <p
            style={{
              fontFamily: "Outfit, sans-serif",
              fontSize: "0.875rem",
              color: "rgba(0, 0, 0, 0.6)",
              margin: "0 0 1.5rem",
              textAlign: "left",
            }}
          >
            {totalDuration > 0
              ? `${formatTotalDuration(totalDuration)} • ${trackCount} stories`
              : `${trackCount} stories`}
          </p>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <button
              onClick={handlePlay}
              style={{
                flex: 1,
                padding: "0.875rem 1.5rem",
                background: "#A35139",
                color: "#FFF",
                border: "none",
                borderRadius: "50px",
                fontSize: "1rem",
                fontWeight: "600",
                fontFamily: "Outfit, sans-serif",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "all 0.2s ease",
                minHeight: "48px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#8B4229";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#A35139";
              }}
            >
              <Play size={20} fill="currentColor" />
              Play
            </button>
            <button
              onClick={handleShuffle}
              style={{
                padding: "0.875rem 1.5rem",
                background: "#FFF",
                color: "#000",
                border: "1px solid rgba(0, 0, 0, 0.2)",
                borderRadius: "50px",
                fontSize: "1rem",
                fontWeight: "600",
                fontFamily: "Outfit, sans-serif",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "all 0.2s ease",
                minHeight: "48px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#F5F5F5";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#FFF";
              }}
            >
              <Shuffle size={20} />
              Shuffle
            </button>
          </div>

          {/* Album Description Box */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.5)",
              borderRadius: "12px",
              padding: "1rem",
              marginBottom: "1.5rem",
              border: "1px solid rgba(0, 0, 0, 0.05)",
            }}
          >
            <p
              style={{
                fontFamily: "Outfit, sans-serif",
                fontSize: "0.875rem",
                color: "rgba(0, 0, 0, 0.7)",
                margin: 0,
                lineHeight: "1.6",
              }}
            >
              {album.description}
            </p>
          </div>

          {/* Track List */}
          <div>
            {tracks.map((track: any, index: number) => {
              const duration = durations.get(index) || 0;
              const isCurrentTrack = playingTrackIndex === index;

              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0.75rem 0",
                    borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    trackEvent(AnalyticsEvents.TRACK_CLICKED, {
                      track_index: index,
                      track_question: track.questionText,
                      trial_id: albumData?.trial.id,
                      album_title: albumData?.trial.selectedAlbum,
                    });
                    handlePlayPause(index);
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: "Outfit, sans-serif",
                        fontSize: "0.9375rem",
                        fontWeight: isCurrentTrack ? "600" : "400",
                        color: "#000",
                        margin: 0,
                        marginBottom: "0.25rem",
                      }}
                    >
                      {track.questionText}
                    </p>
                    {duration > 0 && (
                      <p
                        style={{
                          fontFamily: "Outfit, sans-serif",
                          fontSize: "0.8125rem",
                          color: "rgba(0, 0, 0, 0.6)",
                          margin: 0,
                        }}
                      >
                        {formatDuration(duration)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayPause(index);
                    }}
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: isCurrentTrack
                        ? "#A35139"
                        : "rgba(0, 0, 0, 0.1)",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: isCurrentTrack ? "#FFF" : "#000",
                      transition: "all 0.2s ease",
                      marginLeft: "1rem",
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrentTrack) {
                        e.currentTarget.style.background = "rgba(0, 0, 0, 0.2)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCurrentTrack) {
                        e.currentTarget.style.background = "rgba(0, 0, 0, 0.1)";
                      }
                    }}
                    aria-label={`Play ${track.questionText}`}
                  >
                    {isCurrentTrack && isPlaying ? (
                      <Pause size={16} fill="currentColor" />
                    ) : (
                      <Play size={16} fill="currentColor" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mini Player */}
      {currentTrack && (
        <MiniPlayer
          isVisible={isPlaying || playingTrackIndex !== null}
          isPlaying={isPlaying}
          trackTitle={currentTrack.questionText}
          albumTitle={trial.selectedAlbum}
          coverImage={album.coverImage}
          onPlayPause={() => {
            if (playingTrackIndex !== null) {
              handlePlayPause(playingTrackIndex);
            }
          }}
        />
      )}
    </div>
  );
}
