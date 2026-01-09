import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Globe,
  Share2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import kahaniLogo from "@assets/Kahani Dummy Logo (1)_1762679074954.png";
import heroImage from "@assets/Generated Image November 08, 2025 - 8_27PM_1762623023120.png";

const FALLBACK_AUDIO_URL =
  "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/voice-notes/nani_wedding_day.ogg";

interface Track {
  questionIndex: number;
  questionText: string;
  mediaUrl: string | null;
  duration?: number;
}

interface TrackBatch {
  title: string;
  tracks: Array<Track>;
}

// Hardcoded Sample Data
const SAMPLE_ALBUM_DATA = {
  trial: {
    id: "sample",
    storytellerName: "Nani",
    buyerName: "Family",
    selectedAlbum: "Nani's Life Story",
  },
  album: {
    description:
      "A collection of memories from Nani's childhood, wedding, and life lessons.",
    coverImage: heroImage,
    isConversationalAlbum: true,
    questionSetTitles: {
      en: ["Childhood Memories", "Wedding & Family", "Life Lessons"],
      hn: ["बचपन की यादें", "शादी और परिवार", "जीवन की सीख"],
    },
  },
  tracks: [
    // Batch 1: Childhood
    {
      questionIndex: 0,
      questionText: "Tell us about your favorite childhood memory.",
      mediaUrl: FALLBACK_AUDIO_URL,
    },
    {
      questionIndex: 1,
      questionText: "What games did you play as a child?",
      mediaUrl: FALLBACK_AUDIO_URL,
    },
    {
      questionIndex: 2,
      questionText: "Who was your best friend growing up?",
      mediaUrl: FALLBACK_AUDIO_URL,
    },
    // Batch 2: Wedding
    {
      questionIndex: 3,
      questionText: "How did you meet Nana ji?",
      mediaUrl: FALLBACK_AUDIO_URL,
    },
    {
      questionIndex: 4,
      questionText: "Tell us about your wedding day.",
      mediaUrl: FALLBACK_AUDIO_URL,
    },
    {
      questionIndex: 5,
      questionText: "What was your first home like?",
      mediaUrl: FALLBACK_AUDIO_URL,
    },
    // Batch 3: Wisdom
    {
      questionIndex: 6,
      questionText: "What is the most important lesson you've learned?",
      mediaUrl: FALLBACK_AUDIO_URL,
    },
    {
      questionIndex: 7,
      questionText: "What is your advice for the grandchildren?",
      mediaUrl: FALLBACK_AUDIO_URL,
    },
    {
      questionIndex: 8,
      questionText: "What makes you happiest today?",
      mediaUrl: FALLBACK_AUDIO_URL,
    },
  ],
};

function groupTracksIntoBatches(
  tracks: Track[],
  isConversational: boolean,
  language: "en" | "hi",
  questionSetTitles?: { en: string[]; hn: string[] } | null,
): TrackBatch[] | Track[] {
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

export default function SampleAlbum() {
  const [, setLocation] = useLocation();
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "hi">("en");
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

  // Player State
  const [playingTrackIndex, setPlayingTrackIndex] = useState<number | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [durations, setDurations] = useState<Map<number, number>>(new Map());
  const audioRefs = useRef<Map<number, HTMLAudioElement>>(new Map());
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [autoplay] = useState(true);

  // Load durations
  useEffect(() => {
    SAMPLE_ALBUM_DATA.tracks.forEach((track, index) => {
      const audio = new Audio(track.mediaUrl);
      audio.addEventListener("loadedmetadata", () => {
        setDurations((prev) => new Map(prev).set(index, audio.duration));
      });
      audio.load();
    });
  }, []);

  const handlePlayPause = useCallback(
    (trackIndex: number) => {
      const track = SAMPLE_ALBUM_DATA.tracks[trackIndex];
      if (!track) return;

      const audioUrl = track.mediaUrl;

      // Toggle current
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

      // Stop previous
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      // Start new
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      setPlayingTrackIndex(trackIndex);
      setIsPlaying(true);

      audio.addEventListener("ended", () => {
        setIsPlaying(false);
        // Autoplay next
        if (autoplay && trackIndex + 1 < SAMPLE_ALBUM_DATA.tracks.length) {
          handlePlayPause(trackIndex + 1);
        } else {
          setPlayingTrackIndex(null);
        }
      });

      audio.addEventListener("timeupdate", () => {
        setCurrentTime(audio.currentTime);
      });

      audio.play().catch(console.error);
    },
    [playingTrackIndex, isPlaying, autoplay],
  );

  const handleNextTrack = () => {
    if (
      playingTrackIndex !== null &&
      playingTrackIndex < SAMPLE_ALBUM_DATA.tracks.length - 1
    ) {
      handlePlayPause(playingTrackIndex + 1);
    }
  };

  const handlePreviousTrack = () => {
    if (playingTrackIndex !== null && playingTrackIndex > 0) {
      handlePlayPause(playingTrackIndex - 1);
    }
  };

  const groupedTracks = groupTracksIntoBatches(
    SAMPLE_ALBUM_DATA.tracks,
    SAMPLE_ALBUM_DATA.album.isConversationalAlbum,
    selectedLanguage,
    SAMPLE_ALBUM_DATA.album.questionSetTitles,
  );

  const currentTrack =
    playingTrackIndex !== null
      ? SAMPLE_ALBUM_DATA.tracks[playingTrackIndex]
      : null;

  return (
    <div className="min-h-screen bg-[#FDF4DC] pb-[100px] relative">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#FDF4DC]/95 backdrop-blur-sm border-b border-black/5 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setLocation("/")}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-[#1B2632]" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-black/10 hover:bg-black/5 transition-colors font-['Outfit'] text-sm text-[#1B2632]"
          >
            <Globe className="w-4 h-4" />
            {selectedLanguage === "hi" ? "हिंदी" : "English"}
          </button>
          {isLanguageDropdownOpen && (
            <div className="absolute top-full right-4 mt-2 bg-white rounded-xl shadow-xl border border-black/5 overflow-hidden min-w-[120px]">
              <button
                onClick={() => {
                  setSelectedLanguage("en");
                  setIsLanguageDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-[#A35139]/10 text-sm font-['Outfit']"
              >
                English
              </button>
              <button
                onClick={() => {
                  setSelectedLanguage("hi");
                  setIsLanguageDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-[#A35139]/10 text-sm font-['Outfit']"
              >
                हिंदी
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Album Info */}
      <div className="pt-8 px-6 pb-6 text-center">
        <div className="w-40 h-40 mx-auto rounded-2xl overflow-hidden shadow-2xl mb-6 relative group">
          <img
            src={SAMPLE_ALBUM_DATA.album.coverImage}
            alt="Album Cover"
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-3xl font-bold text-[#1B2632] font-['Outfit'] mb-2">
          {SAMPLE_ALBUM_DATA.trial.selectedAlbum}
        </h1>
        <p className="text-[#1B2632]/60 text-sm font-medium font-['Outfit']">
          {SAMPLE_ALBUM_DATA.album.description}
        </p>
      </div>

      {/* Tracks List */}
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        {/* @ts-ignore */}
        {groupedTracks.map((batch: TrackBatch, batchIndex: number) => (
          <div key={batchIndex} className="space-y-4">
            <h3 className="text-xl font-bold text-[#A35139] px-2 font-['Outfit']">
              {batch.title}
            </h3>
            <div className="space-y-3">
              {batch.tracks.map((track) => {
                // Find absolute index in tracks array
                const absoluteIndex = SAMPLE_ALBUM_DATA.tracks.findIndex(
                  (t) => t.questionIndex === track.questionIndex,
                );
                const isTrackPlaying = playingTrackIndex === absoluteIndex;

                return (
                  <div
                    key={absoluteIndex}
                    onClick={() => handlePlayPause(absoluteIndex)}
                    className={`
                              relative p-4 rounded-xl transition-all duration-300 cursor-pointer border
                              ${
                                isTrackPlaying
                                  ? "bg-white border-[#A35139] shadow-md scale-[1.02]"
                                  : "bg-white/60 border-transparent hover:bg-white hover:shadow-sm"
                              }
                           `}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`
                                 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
                                 ${isTrackPlaying ? "bg-[#A35139] text-white" : "bg-[#F0F0F0] text-[#1B2632]/40"}
                              `}
                      >
                        {isTrackPlaying && isPlaying ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5 ml-0.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`font-['Outfit'] font-medium text-base mb-1 ${isTrackPlaying ? "text-[#A35139]" : "text-[#1B2632]"}`}
                        >
                          {selectedLanguage === "hi" ? "प्रश्न " : "Question "}
                          {absoluteIndex + 1}
                        </p>
                        <p className="text-[#1B2632]/70 text-sm leading-relaxed">
                          {track.questionText}
                        </p>
                      </div>
                      <div className="text-xs font-medium text-[#1B2632]/40 mt-1">
                        {durations.get(absoluteIndex)
                          ? `${Math.floor(durations.get(absoluteIndex)! / 60)}:${Math.floor(
                              durations.get(absoluteIndex)! % 60,
                            )
                              .toString()
                              .padStart(2, "0")}`
                          : "--:--"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Player Ribbon */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-black/5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] px-4 py-3 pb-8 sm:pb-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                <img
                  src={SAMPLE_ALBUM_DATA.album.coverImage}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="font-['Outfit'] font-bold text-[#1B2632] truncate text-sm">
                  {selectedLanguage === "hi" ? "प्रश्न " : "Question "}
                  {playingTrackIndex! + 1}
                </p>
                <p className="font-['Outfit'] text-xs text-[#1B2632]/60 truncate">
                  {currentTrack.questionText}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={handlePreviousTrack}
                className="p-2 text-[#1B2632]/40 hover:text-[#1B2632]"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={() => handlePlayPause(playingTrackIndex!)}
                className="w-12 h-12 rounded-full bg-[#A35139] text-white flex items-center justify-center shadow-lg hover:bg-[#8B4430] active:scale-95 transition-all"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-1" />
                )}
              </button>
              <button
                onClick={handleNextTrack}
                className="p-2 text-[#1B2632]/40 hover:text-[#1B2632]"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-black/5">
            <div
              className="h-full bg-[#A35139] transition-all duration-100"
              style={{
                width: `${(currentTime / (durations.get(playingTrackIndex!) || 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
