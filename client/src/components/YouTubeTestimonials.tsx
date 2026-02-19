import { useRef, useState, useEffect } from "react";

type YouTubeShort = {
  id: string;
  label: string;
};

const SHORTS: YouTubeShort[] = [
  { id: "cdN28u7KGZo", label: "Rama Devi Lath" },
  { id: "wAOqDrpMMF0", label: "Sudarshan Kumar" },
  { id: "CouWSxKFOy4", label: "Rajeev Mimani" },
];

function buildEmbedUrl(id: string, autoplay: boolean, muted: boolean) {
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    mute: muted ? "1" : "0",
    playsinline: "1",
    modestbranding: "1",
    rel: "0", // no related videos at end
    controls: "1", // show controls so user can unmute/play
    fs: "0",
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

export default function YouTubeTestimonials() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [clickedId, setClickedId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Whenever the clicked card changes, gently center it in view
  useEffect(() => {
    if (!clickedId) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const index = SHORTS.findIndex((v) => v.id === clickedId);
    if (index === -1) return;

    const cardEl = cardRefs.current[index];
    if (!cardEl) return;

    const containerRect = container.getBoundingClientRect();
    const cardRect = cardEl.getBoundingClientRect();

    const currentScroll = container.scrollLeft;
    const offsetLeft = cardRect.left - containerRect.left;
    const targetScroll =
      currentScroll + offsetLeft - (containerRect.width - cardRect.width) / 2;

    container.scrollTo({
      left: targetScroll,
      behavior: "smooth",
    });
  }, [clickedId]);

  return (
    <section
      id="why-kahani"
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
            {SHORTS.map((video, index) => {
              const isHovered = hoveredId === video.id;
              const isActive = video.id === (clickedId ?? hoveredId);

              // Only the active card renders an iframe (so only one plays at a time).
              // Desktop hover: autoplay muted. Click (tap) on a card: autoplay with sound.
              const autoplay = isActive;
              const muted = clickedId === video.id ? false : true;

              const embedUrl = buildEmbedUrl(video.id, autoplay, muted);

              return (
                <article
                  key={video.id}
                  ref={(el) => {
                    cardRefs.current[index] = el as HTMLDivElement | null;
                  }}
                  className="flex-shrink-0 w-[60vw] max-w-[220px] sm:w-[50vw] sm:max-w-[240px] bg-white rounded-2xl shadow-md border border-[#C9C1B1]/40 overflow-hidden snap-center"
                  onMouseEnter={() => setHoveredId(video.id)}
                  onMouseLeave={() =>
                    setHoveredId((prev) => (prev === video.id ? null : prev))
                  }
                  onClick={() => setClickedId(video.id)}
                >
                  <div className="w-full aspect-[9/16] bg-black/5 relative overflow-hidden">
                    {isActive ? (
                      <iframe
                        key={embedUrl}
                        src={embedUrl}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full"
                        loading="lazy"
                      />
                    ) : (
                      // Static thumbnail only
                      <img
                        src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    {/* Bottom fade with name – covers ~20% of card height */}
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
