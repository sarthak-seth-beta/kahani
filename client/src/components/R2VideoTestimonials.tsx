import { useRef, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Play, Pause, Volume2, VolumeX } from "lucide-react";

type TestimonialVideo = {
  key: string;
  url: string;
  label: string;
};

export default function R2VideoTestimonials() {
  const { data: videos, isLoading } = useQuery<TestimonialVideo[]>({
    queryKey: ["/api/testimonial-videos"],
  });

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);

  const pauseAll = useCallback(() => {
    videoRefs.current.forEach((v) => {
      if (v) {
        v.pause();
        v.currentTime = 0;
      }
    });
  }, []);

  const playVideo = useCallback(
    (index: number) => {
      pauseAll();
      const video = videoRefs.current[index];
      if (video) {
        video.muted = muted;
        video.play().catch(() => {});
      }
      setActiveIndex(index);

      // Scroll card into view
      const container = scrollContainerRef.current;
      const card = cardRefs.current[index];
      if (container && card) {
        const containerRect = container.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const offset = cardRect.left - containerRect.left;
        const target =
          container.scrollLeft +
          offset -
          (containerRect.width - cardRect.width) / 2;
        container.scrollTo({ left: target, behavior: "smooth" });
      }
    },
    [muted, pauseAll],
  );

  const togglePlayPause = useCallback(
    (index: number) => {
      const video = videoRefs.current[index];
      if (!video) return;

      if (video.paused) {
        // If this video is paused but was active, just resume
        // Otherwise, pause all and play this one
        if (activeIndex !== index) {
          pauseAll();
        }
        video.muted = muted;
        video.play().catch(() => {});
        setActiveIndex(index);
      } else {
        video.pause();
        setActiveIndex(null);
      }
    },
    [activeIndex, muted, pauseAll],
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (activeIndex !== null) {
        const video = videoRefs.current[activeIndex];
        if (video) video.muted = next;
      }
      return next;
    });
  }, [activeIndex]);

  // Pause videos when the section scrolls out of the viewport
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          pauseAll();
          setActiveIndex(null);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [pauseAll]);

  if (isLoading) {
    return (
      <section className="w-full bg-white px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex justify-center items-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#C8553D]" />
        </div>
      </section>
    );
  }

  if (!videos || videos.length === 0) return null;

  return (
    <section
      id="why-kahani-videos"
      className="w-full bg-white px-4 sm:px-6 py-8 sm:py-12"
    >
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1B2632] text-center font-['Outfit'] mb-2">
          Why Kahani?
        </h2>

        <div
          ref={scrollContainerRef}
          className="w-full overflow-x-auto no-scrollbar snap-x snap-mandatory"
        >
          <div className="flex gap-4 sm:gap-5 py-2 justify-start md:justify-center">
            {videos.map((video, index) => {
              const isActive = activeIndex === index;

              return (
                <article
                  id={`r2-video-testimonial-card-${video.key}`}
                  key={video.key}
                  ref={(el) => {
                    cardRefs.current[index] = el as HTMLDivElement | null;
                  }}
                  className="flex-shrink-0 w-[60vw] max-w-[220px] sm:w-[50vw] sm:max-w-[240px] bg-white rounded-2xl shadow-md border border-[#C9C1B1]/40 overflow-hidden snap-center cursor-pointer"
                  onClick={() => {
                    togglePlayPause(index);
                  }}
                >
                  <div className="w-full aspect-[9/16] bg-black relative overflow-hidden">
                    <video
                      ref={(el) => {
                        videoRefs.current[index] =
                          el as HTMLVideoElement | null;
                      }}
                      src={video.url}
                      playsInline
                      muted={muted}
                      loop
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />

                    {/* Play/Pause overlay */}
                    <div
                      className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${isActive ? "bg-transparent opacity-0 hover:opacity-100" : "bg-black/20 opacity-100"}`}
                    >
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        {isActive ? (
                          <Pause className="w-5 h-5 text-[#1B2632]" />
                        ) : (
                          <Play className="w-5 h-5 text-[#1B2632] ml-0.5" />
                        )}
                      </div>
                    </div>

                    {/* Mute toggle when active */}
                    {isActive && (
                      <button
                        id={`r2-video-testimonial-mute-${video.key}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMute();
                        }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center z-10"
                      >
                        {muted ? (
                          <VolumeX className="w-4 h-4 text-white" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-white" />
                        )}
                      </button>
                    )}

                    {/* Bottom label */}
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end px-3 pb-2"
                      style={{ height: "20%" }}
                    >
                      <p className="text-xs sm:text-sm text-white font-['Outfit'] truncate">
                        {video.label}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
