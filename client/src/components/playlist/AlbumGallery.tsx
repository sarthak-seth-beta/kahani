import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Pause } from "lucide-react";
import { MiniPlayer } from "@/components/playlist/MiniPlayer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FALLBACK_AUDIO_URL =
  "https://bvkaurviswhrjldeuabx.supabase.co/storage/v1/object/public/voice-notes/demo_audio.m4a";

const TRIAL_ID = "f6258c48-043e-4b23-883b-dfb4ace3b43c";

interface Track {
  questionIndex: number;
  questionText: string;
  mediaUrl: string | null;
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
    cover_image?: string | null;
    isConversationalAlbum: boolean;
    questionSetTitles?: { en: string[]; hn: string[] } | null;
  };
  tracks: Array<{
    questionIndex: number;
    questionText: string;
    mediaUrl: string | null;
  }>;
}

function groupTracksIntoBatches(
  tracks: Array<{
    questionIndex: number;
    questionText: string;
    mediaUrl: string | null;
  }>,
  isConversational: boolean,
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
  const titleArray = questionSetTitles ? questionSetTitles.en : null;

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

interface AlbumGalleryProps {
  trialId?: string;
  isEmbedded?: boolean;
}

export default function AlbumGallery({
  trialId,
  isEmbedded = false,
}: AlbumGalleryProps) {
  const actualTrialId = TRIAL_ID;
  const albumApiPath = `/api/albums/${actualTrialId}?locale=en`;

  const {
    data: albumData,
    isLoading,
    error,
  } = useQuery<AlbumData>({
    queryKey: [albumApiPath],
    enabled: !!actualTrialId,
  });

  const [playingTrackIndex, setPlayingTrackIndex] = useState<number | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [lastTrackIndex, setLastTrackIndex] = useState<number | null>(null);
  const [duration, setDuration] = useState(0);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePlayPause = useCallback(
    (trackIndex: number) => {
      const track = albumData?.tracks[trackIndex];
      if (!track || !track.mediaUrl) {
        return;
      }

      const audioUrl = track.mediaUrl;

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

      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.removeEventListener("ended", () => {});
        currentAudioRef.current.removeEventListener("pause", () => {});
        currentAudioRef.current.removeEventListener("play", () => {});
        currentAudioRef.current.removeEventListener("timeupdate", () => {});
        currentAudioRef.current.removeEventListener("loadedmetadata", () => {});
        currentAudioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      setPlayingTrackIndex(trackIndex);
      setLastTrackIndex(trackIndex);
      setIsPlaying(true);

      const handleEnded = () => {
        setIsPlaying(false);
        setPlayingTrackIndex(null);
        currentAudioRef.current = null;
      };

      const handlePause = () => {
        setIsPlaying(false);
      };

      const handlePlay = () => {
        setIsPlaying(true);
      };

      const handleTimeUpdate = () => {
        if (audio) setCurrentTime(audio.currentTime);
      };

      const handleLoadedMetadata = () => {
        if (audio) {
          setDuration(audio.duration);
        }
      };

      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("pause", handlePause);
      audio.addEventListener("play", handlePlay);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.load();

      audio.play().catch((error) => {
        console.error("Error playing audio:", error);
        setIsPlaying(false);
        setPlayingTrackIndex(null);
        currentAudioRef.current = null;
      });
    },
    [albumData, playingTrackIndex, isPlaying],
  );

  const handleSeek = useCallback((time: number) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  useEffect(() => {
    if (!currentAudioRef.current) return;
    const audio = currentAudioRef.current;
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => audio.removeEventListener("timeupdate", handleTimeUpdate);
  }, [isPlaying, playingTrackIndex]);

  useEffect(() => {
    setCurrentTime(0);
  }, [playingTrackIndex]);

  const handlePlay = useCallback(() => {
    if (albumData?.tracks && albumData.tracks.length > 0) {
      const firstPlayableIndex = albumData.tracks.findIndex(
        (t: Track) => t.mediaUrl,
      );
      if (firstPlayableIndex !== -1) {
        handlePlayPause(firstPlayableIndex);
      }
    }
  }, [albumData, handlePlayPause]);

  if (isLoading || !albumData) {
    return (
      <div
        style={{
          background: "#FDF4DC",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ fontFamily: "Outfit", fontSize: "1.25rem", color: "#000" }}>
          Loading album...
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
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ fontFamily: "Outfit", fontSize: "1.25rem", color: "#000" }}>
          Failed to load album
        </p>
      </div>
    );
  }

  const { trial, album, tracks } = albumData;
  const trackCount = tracks.length;
  const displayTrackIndex =
    playingTrackIndex !== null ? playingTrackIndex : lastTrackIndex;
  const currentTrack =
    displayTrackIndex !== null ? tracks[displayTrackIndex] : null;

  const groupedTracks = groupTracksIntoBatches(
    tracks,
    album.isConversationalAlbum,
    album.questionSetTitles || undefined,
  );
  const isGrouped =
    album.isConversationalAlbum &&
    Array.isArray(groupedTracks) &&
    groupedTracks.length > 0 &&
    "title" in groupedTracks[0];

  const isPlayerVisible = currentTrack !== null;

  return (
    <div
      className={isEmbedded ? "h-full min-h-0" : ""}
      style={{
        background: "#FDF4DC",
        width: "100%",
        ...(isEmbedded
          ? {
              height: "100%",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }
          : {
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }),
      }}
    >
      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch" as any,
          touchAction: "pan-y",
        }}
      >
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
              src={album.cover_image || album.coverImage}
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
            <img
              src="/attached_assets/dummy_avatar.webp"
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
            {trackCount} stories
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
                              cursor: !track.mediaUrl ? "default" : "pointer",
                              opacity: !track.mediaUrl ? 0.5 : 1,
                            }}
                            onClick={() => {
                              if (!track.mediaUrl) return;
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
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!track.mediaUrl) return;
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
                  const isCurrentTrack = playingTrackIndex === index;

                  return (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "0.75rem 0",
                        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
                        cursor: !track.mediaUrl ? "default" : "pointer",
                        opacity: !track.mediaUrl ? 0.5 : 1,
                      }}
                      onClick={() => {
                        if (!track.mediaUrl) return;
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
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!track.mediaUrl) return;
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
          duration={duration}
          onSeek={handleSeek}
          onSkipForward={() => {}}
          onSkipBackward={() => {}}
          onNextTrack={undefined}
          onPreviousTrack={undefined}
          hasNextTrack={false}
          hasPreviousTrack={false}
          autoplay={false}
          onAutoplayChange={() => {}}
          isEmbedded={true}
        />
      )}
    </div>
  );
}
