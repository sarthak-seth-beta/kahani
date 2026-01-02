import { useRef, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { useLocation } from "wouter";

const imgURL = "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/family_image.png";

const ITEMS = [
    { id: "mom", label: "Mom", type: "active", image: imgURL },
    { id: "dad", label: "Dad", type: "active", image: imgURL },
    { id: "dadu", label: "Dadu", type: "active", image: imgURL },
    { id: "nanu", label: "Nanu", type: "active", image: imgURL },
    { id: "nani", label: "Nani", type: "active", image: imgURL },
    { id: "dadi", label: "Dadi", type: "active", image: imgURL },
    { id: "mentor", label: "Mentor", type: "coming-soon", image: imgURL },
    { id: "friend", label: "Friend", type: "coming-soon", image: imgURL },
    { id: "teacher", label: "Teacher", type: "coming-soon", image: imgURL },
];

export default function GetStartedSection() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [, setLocation] = useLocation();
    const [isPaused, setIsPaused] = useState(false);

    // Massive duplication for smoother infinite scroll without complex jump logic glitches
    const INFINITE_ITEMS = Array(20).fill(ITEMS).flat();

    useEffect(() => {
        const scrollContainer = scrollRef.current;
        if (!scrollContainer) return;

        // Initial Scroll to middle to allow backward scrolling immediately
        const singleSetWidth = (scrollContainer.scrollWidth / 20);
        scrollContainer.scrollLeft = singleSetWidth * 8; // Start somewhere in the middle

        const scrollInterval = setInterval(() => {
            if (isPaused) return;

            const card = scrollContainer.children[0] as HTMLElement;
            if (!card) return;

            const cardWidth = card.offsetWidth;
            const gap = 16;
            const itemWidth = cardWidth + gap;

            // Check if we are near end
            if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth - scrollContainer.clientWidth - itemWidth * 2) {
                // Silently jump back to middle
                scrollContainer.scrollTo({ left: singleSetWidth * 8, behavior: 'auto' });
            }
            else {
                scrollContainer.scrollBy({ left: itemWidth, behavior: 'smooth' });
            }
        }, 2500);

        return () => clearInterval(scrollInterval);
    }, [isPaused]);

    return (
        <section className="relative py-12 bg-white overflow-hidden">
            {/* Top Fade Gradient from Previous Section Color (#FAFAFA) to White */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#FAFAFA] via-[#FAFAFA]/40 to-white pointer-events-none z-10" />

            <div className="relative z-20 container mx-auto px-4 md:px-6 mb-8 text-center">
                <h2 className="text-3xl md:text-5xl font-bold font-['Outfit'] text-[#1B2632] tracking-wider">
                    Get started for
                </h2>
            </div>

            <div
                ref={scrollRef}
                className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-6 pb-8 no-scrollbar touch-pan-x"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
            >
                {INFINITE_ITEMS.map((item, index) => (
                    <div
                        key={`${item.id}-${index}`}
                        onClick={() => {
                            if (item.type === 'active') {
                                // TODO: Add navigation
                            }
                        }}
                        className={`
              relative flex-none w-[220px] h-[140px] md:w-[280px] md:h-[180px] 
              snap-center rounded-xl overflow-hidden cursor-pointer transition-all duration-300
              ${item.type === 'coming-soon' ? 'opacity-80 grayscale cursor-not-allowed' : 'hover:scale-105 shadow-md hover:shadow-xl'}
            `}
                    >
                        {/* Background Image */}
                        <img
                            src={item.image}
                            alt={item.label}
                            className="absolute inset-0 w-full h-full object-cover"
                        />

                        {/* Dark Overlay */}
                        <div className="absolute inset-0 bg-black/40 mix-blend-multiply" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                        {/* Content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 p-4 text-center">
                            <span className="text-white font-['Outfit'] font-bold text-xl md:text-2xl tracking-widest uppercase">
                                {item.label}
                            </span>

                            {item.type === 'coming-soon' && (
                                <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm p-1.5 rounded-full border border-white/20">
                                    <Lock className="w-3 h-3 text-white/80" />
                                </div>
                            )}

                            {item.type === 'coming-soon' && (
                                <span className="text-[10px] uppercase tracking-widest text-[#FFB162] font-semibold mt-1">
                                    Coming Soon
                                </span>
                            )}
                        </div>
                    </div>
                ))}

                {/* Padding active items to ensure last item can be centered if needed, 
            though snap-center usually handles it well enough. 
            Standard padding-right on container (px-6) is usually sufficient. */}
            </div>

            <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </section>
    );
}
