import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Share2, Play, Pause, Shuffle, Globe, Edit2 } from "lucide-react";
import { MiniPlayer } from "@/components/playlist/MiniPlayer";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ProfilePictureDialog from "@/components/ProfilePictureDialog";
import { useToast } from "@/hooks/use-toast";

const FALLBACK_AUDIO_URL =
  "https://bvkaurviswhrjldeuabx.supabase.co/storage/v1/object/public/voice-notes/demo_audio.m4a";

interface Track {
  questionIndex: number;
  questionText: string;
  mediaUrl: string | null;
  duration?: number;
}

interface TrackBatch {
  title: string;
  tracks: Array<{
    questionIndex: number;
    questionText: string;
    mediaUrl: string | null;
  }>;
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
    isConversationalAlbum: boolean;
    questionSetTitles?: { en: string[]; hn: string[] } | null;
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

function groupTracksIntoBatches(
  tracks: Array<{
    questionIndex: number;
    questionText: string;
    mediaUrl: string | null;
  }>,
  isConversational: boolean,
  language: "en" | "hi",
  questionSetTitles?: { en: string[]; hn: string[] } | null,
):
  | TrackBatch[]
  | Array<{
    questionIndex: number;
    questionText: string;
    mediaUrl: string | null;
  }> {
  if (!isConversational) {
    return tracks;
  }

  const batches: TrackBatch[] = [];
  const titleArray = questionSetTitles
    ? language === "hi"
      ? questionSetTitles.hn
      : questionSetTitles.en
    : null;

  for (let i = 0; i < tracks.length; i += 3) {
    const batchTracks = tracks.slice(i, i + 3);
    const batchIndex = Math.floor(i / 3);

    let title: string;
    if (titleArray && titleArray[batchIndex]) {
      title = titleArray[batchIndex];
    } else {
      const start = i + 1;
      const end = Math.min(i + 3, tracks.length);
      title = `Questions ${start}-${end}`;
    }

    batches.push({
      title,
      tracks: batchTracks,
    });
  }

  return batches;
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
  const [currentTime, setCurrentTime] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [lastTrackIndex, setLastTrackIndex] = useState<number | null>(null);
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

  // Profile Picture State
  const [customProfileImage, setCustomProfileImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleProfileImageSave = async (croppedBlob: Blob) => {
    try {
      const formData = new FormData();
      // Filename doesn't matter much for backend usually, but gives it a context
      formData.append("image", croppedBlob, "profile-pic.jpg");

      const response = await fetch(`/api/free-trial/${trialId}/upload-cover`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      // Append timestamp to force reload
      setCustomProfileImage(`${data.imageUrl}?t=${Date.now()}`);

      toast({
        title: "Success",
        description: "Profile picture updated successfully.",
      });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      toast({
        title: "Error",
        description: "Failed to update profile picture. Please try again.",
        variant: "destructive",
      });
    }
  };

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
        currentAudioRef.current.removeEventListener("ended", () => { });
        currentAudioRef.current.removeEventListener("pause", () => { });
        currentAudioRef.current.removeEventListener("play", () => { });
        currentAudioRef.current = null;
      }

      // Play new track
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      setPlayingTrackIndex(trackIndex);
      setLastTrackIndex(trackIndex);
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
            .map((_: Track, index: number) => index)
            .filter((index: number) => !currentPlayedTracks.has(index));

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

        if (nextIndex !== null && autoplay) {
          // Autoplay next track (only if autoplay is enabled)
          setTimeout(() => {
            handlePlayPause(nextIndex!, currentShuffleMode);
          }, 100);
        } else {
          // No more tracks to play or autoplay disabled
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

      const handleTimeUpdate = () => {
        if (audio) {
          setCurrentTime(audio.currentTime);
        }
      };

      const handleLoadedMetadata = () => {
        if (audio) {
          setDurations((prev) => new Map(prev).set(trackIndex, audio.duration));
        }
      };

      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("pause", handlePause);
      audio.addEventListener("play", handlePlay);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("loadedmetadata", handleLoadedMetadata);

      // Load metadata immediately
      audio.load();

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
      autoplay,
    ],
  );

  // Audio control handlers
  const handleSeek = useCallback((time: number) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const handleSkipForward = useCallback(() => {
    if (currentAudioRef.current && playingTrackIndex !== null) {
      const duration = durations.get(playingTrackIndex) || 0;
      const newTime = Math.min(
        currentAudioRef.current.currentTime + 10,
        duration,
      );
      currentAudioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [playingTrackIndex, durations]);

  const handleSkipBackward = useCallback(() => {
    if (currentAudioRef.current) {
      const newTime = Math.max(currentAudioRef.current.currentTime - 10, 0);
      currentAudioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, []);

  const handleNextTrack = useCallback(() => {
    if (playingTrackIndex === null || !albumData?.tracks) return;
    const nextIndex = playingTrackIndex + 1;
    if (nextIndex < albumData.tracks.length) {
      handlePlayPause(nextIndex);
    }
  }, [playingTrackIndex, albumData, handlePlayPause]);

  const handlePreviousTrack = useCallback(() => {
    if (playingTrackIndex === null || !albumData?.tracks) return;
    const prevIndex = playingTrackIndex - 1;
    if (prevIndex >= 0) {
      handlePlayPause(prevIndex);
    }
  }, [playingTrackIndex, albumData, handlePlayPause]);

  const handleAutoplayChange = useCallback((enabled: boolean) => {
    setAutoplay(enabled);
  }, []);

  // Update currentTime when audio is playing
  useEffect(() => {
    if (!currentAudioRef.current) return;

    const audio = currentAudioRef.current;
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [isPlaying, playingTrackIndex]);

  // Reset currentTime when track changes
  useEffect(() => {
    setCurrentTime(0);
  }, [playingTrackIndex]);

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
        .map((_: Track, index: number) => index)
        .filter((index: number) => !playedTracksInShuffle.has(index));

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
  // Use lastTrackIndex to keep track info during transitions
  const displayTrackIndex =
    playingTrackIndex !== null ? playingTrackIndex : lastTrackIndex;
  const currentTrack =
    displayTrackIndex !== null ? tracks[displayTrackIndex] : null;

  // Group tracks into batches for conversational albums
  const groupedTracks = groupTracksIntoBatches(
    tracks,
    album.isConversationalAlbum,
    selectedLanguage,
    album.questionSetTitles || undefined,
  );
  const isGrouped =
    album.isConversationalAlbum &&
    Array.isArray(groupedTracks) &&
    groupedTracks.length > 0 &&
    "title" in groupedTracks[0];

  // Check if player ribbon is visible
  const isPlayerVisible = currentTrack !== null;

  return (
    <div
      style={{
        background: "#FDF4DC",
        minHeight: "100dvh",
        paddingBottom: isPlayerVisible ? "100px" : "0",
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
              src={album.coverImage}
              alt={trial.selectedAlbum}
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

            <ProfilePictureDialog
              initialImage={album.coverImage}
              onSave={handleProfileImageSave}
            >
              <div style={{ width: "100%", height: "100%", cursor: "pointer", position: "relative" }}>
                <img
                  src={customProfileImage || album.coverImage}
                  alt={trial.selectedAlbum}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
                {/* Pencil Icon Overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "10%",
                    right: "15%",
                    background: "white",
                    borderRadius: "50%",
                    padding: "6px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 20,
                  }}
                >
                  <Edit2 size={12} color="#000" />
                </div>
              </div>
            </ProfilePictureDialog>

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
          {isGrouped ? (
            <Accordion
              type="multiple"
              defaultValue={(groupedTracks as TrackBatch[]).map(
                (_, index) => `batch-${index}`,
              )}
              className="font-['Outfit']"
            >
              {(groupedTracks as TrackBatch[]).map((batch, batchIndex) => {
                // Calculate the starting index for tracks in this batch
                const startIndex = batchIndex * 3;

                return (
                  <AccordionItem
                    key={`batch-${batchIndex}`}
                    value={`batch-${batchIndex}`}
                    className="border-b-2 border-black/25 mb-3 last:mb-0"
                  >
                    <AccordionTrigger className="font-['Outfit'] text-base font-semibold text-black py-4 text-left hover:no-underline">
                      {batch.title}
                    </AccordionTrigger>
                    <AccordionContent className="py-2">
                      {batch.tracks.map((track, trackIndexInBatch) => {
                        const globalIndex = startIndex + trackIndexInBatch;
                        const duration = durations.get(globalIndex) || 0;
                        const isCurrentTrack =
                          playingTrackIndex === globalIndex;

                        return (
                          <div
                            key={globalIndex}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              padding: "0.75rem 0",
                              borderBottom:
                                trackIndexInBatch < batch.tracks.length - 1
                                  ? "1px solid rgba(0, 0, 0, 0.05)"
                                  : "none",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              trackEvent(AnalyticsEvents.TRACK_CLICKED, {
                                track_index: globalIndex,
                                track_question: track.questionText,
                                trial_id: albumData?.trial.id,
                                album_title: albumData?.trial.selectedAlbum,
                              });
                              handlePlayPause(globalIndex);
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
                                handlePlayPause(globalIndex);
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
                                  e.currentTarget.style.background =
                                    "rgba(0, 0, 0, 0.2)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isCurrentTrack) {
                                  e.currentTarget.style.background =
                                    "rgba(0, 0, 0, 0.1)";
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
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div>
              {(groupedTracks as typeof tracks).map(
                (track: any, index: number) => {
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
                            e.currentTarget.style.background =
                              "rgba(0, 0, 0, 0.2)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isCurrentTrack) {
                            e.currentTarget.style.background =
                              "rgba(0, 0, 0, 0.1)";
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
                },
              )}
            </div>
          )}
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
          audioUrl={currentTrack.mediaUrl || FALLBACK_AUDIO_URL}
          currentTime={currentTime}
          duration={durations.get(displayTrackIndex || 0) || 0}
          onSeek={handleSeek}
          onSkipForward={handleSkipForward}
          onSkipBackward={handleSkipBackward}
          onNextTrack={handleNextTrack}
          onPreviousTrack={handlePreviousTrack}
          hasNextTrack={
            playingTrackIndex !== null && albumData?.tracks
              ? playingTrackIndex < albumData.tracks.length - 1
              : false
          }
          hasPreviousTrack={playingTrackIndex !== null && playingTrackIndex > 0}
          autoplay={autoplay}
          onAutoplayChange={handleAutoplayChange}
        />
      )}
    </div>
  );
}
