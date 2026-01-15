import { useRef, useState, useEffect } from "react";
import { Lock } from "lucide-react";
import { useLocation } from "wouter";

const imgURL =
  "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/family_image.png";

const ACTIVE_RELATIONS = [
  // Active
  { id: "mom", label: "Mom", type: "active", image: imgURL },
  { id: "dad", label: "Dad", type: "active", image: imgURL },
  { id: "dadu", label: "Dadu", type: "active", image: imgURL },
  { id: "nanu", label: "Nanu", type: "active", image: imgURL },
  { id: "nani", label: "Nani", type: "active", image: imgURL },
  { id: "dadi", label: "Dadi", type: "active", image: imgURL },
  { id: "mom_2", label: "Mom", type: "active", image: imgURL },
  { id: "dad_2", label: "Dad", type: "active", image: imgURL },
];

const LOCKED_RELATIONS = [
  { id: "husband", label: "Husband", type: "coming-soon", image: imgURL },
  { id: "wife", label: "Wife", type: "coming-soon", image: imgURL },
  { id: "nana", label: "Nana", type: "coming-soon", image: imgURL },
  { id: "dada", label: "Dada", type: "coming-soon", image: imgURL },
  { id: "mentor", label: "Mentor", type: "coming-soon", image: imgURL },
  { id: "teacher", label: "Teacher", type: "coming-soon", image: imgURL },
  {
    id: "best_friend",
    label: "Best Friend",
    type: "coming-soon",
    image: imgURL,
  },
  { id: "grandchild", label: "Grandchild", type: "coming-soon", image: imgURL },
];

const ITEMS_ROW_1 = [...ACTIVE_RELATIONS, ...LOCKED_RELATIONS];
const ITEMS_ROW_2 = [...LOCKED_RELATIONS, ...ACTIVE_RELATIONS];

export default function GetStartedSection() {
  const [, setLocation] = useLocation();
  const scrollRef1 = useRef<HTMLDivElement>(null);
  const scrollRef2 = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);


  // Duplicate arrays to create seamless loop
  const SCROLL_ITEMS_1 = [
    ...ITEMS_ROW_1,
    ...ITEMS_ROW_1,
    ...ITEMS_ROW_1,
    ...ITEMS_ROW_1,
  ];
  const SCROLL_ITEMS_2 = [
    ...ITEMS_ROW_2,
    ...ITEMS_ROW_2,
    ...ITEMS_ROW_2,
    ...ITEMS_ROW_2,
  ];

  useEffect(() => {
    let animationFrameId: number;

    // Initialize Row 2 scroll position to the middle so it can scroll "left" (visually moving right)
    if (scrollRef2.current) {
      // We set it to half the scroll width to start in the middle of our duplicated content
      scrollRef2.current.scrollLeft = scrollRef2.current.scrollWidth / 2;
    }

    const animate = () => {
      // Only run JS animation on mobile/tablet (below md breakpoint)
      if (window.innerWidth < 768 && !isPaused) {

        // Row 1: Move Left (Viewport moves Right, Content moves Left)
        if (scrollRef1.current) {
          scrollRef1.current.scrollLeft += 1;
          // Reset when we've scrolled past half (since we have 4x duplication, half is safe)
          if (scrollRef1.current.scrollLeft >= scrollRef1.current.scrollWidth / 2) {
            scrollRef1.current.scrollLeft = 0;
          }
        }

        // Row 2: Move Right (Viewport moves Left, Content moves Right)
        if (scrollRef2.current) {
          scrollRef2.current.scrollLeft -= 1;
          // Reset when we hit the start
          if (scrollRef2.current.scrollLeft <= 0) {
            scrollRef2.current.scrollLeft = scrollRef2.current.scrollWidth / 2;
          }
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused]);

  // Pause on interaction
  const handleInteractionStart = () => setIsPaused(true);
  const handleInteractionEnd = () => {
    // Resume after a short delay to prevent instant movement after swipe
    setTimeout(() => setIsPaused(false), 1500);
  };


  return (
    <section className="relative py-12 bg-white overflow-hidden">
      {/* Top Fade Gradient from Previous Section Color (#FAFAFA) to White */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#FAFAFA] via-[#FAFAFA]/40 to-white pointer-events-none z-10" />

      <div className="relative z-20 container mx-auto px-4 md:px-6 mb-10 text-center">
        <h2 className="text-3xl md:text-5xl font-bold font-['Outfit'] text-[#1B2632] tracking-wider">
          Get Started For
        </h2>
      </div>

      <div className="space-y-6 relative z-10 w-full">
        {/* Row 1: Left Scroll */}
        <div
          ref={scrollRef1}
          className="relative w-full overflow-x-auto md:overflow-hidden no-scrollbar group"
          onTouchStart={handleInteractionStart}
          onTouchEnd={handleInteractionEnd}
          onMouseEnter={handleInteractionStart}
          onMouseLeave={handleInteractionEnd}
        >
          <div className="flex gap-4 w-max md:w-max md:animate-marquee-left group-hover:[animation-play-state:paused] pl-4 md:pl-4">
            {SCROLL_ITEMS_1.map((item, index) => (
              <Card key={`r1-${index}`} item={item} setLocation={setLocation} />
            ))}
          </div>
        </div>

        {/* Row 2: Right Scroll */}
        <div
          ref={scrollRef2}
          className="relative w-full overflow-x-auto md:overflow-hidden no-scrollbar group"
          onTouchStart={handleInteractionStart}
          onTouchEnd={handleInteractionEnd}
          onMouseEnter={handleInteractionStart}
          onMouseLeave={handleInteractionEnd}
        >
          <div className="flex gap-4 w-max md:w-max md:animate-marquee-right group-hover:[animation-play-state:paused] pl-4 md:pl-4">
            {SCROLL_ITEMS_2.map((item, index) => (
              <Card key={`r2-${index}`} item={item} setLocation={setLocation} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
                @keyframes marquee-left {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @keyframes marquee-right {
                    0% { transform: translateX(-50%); }
                    100% { transform: translateX(0); }
                }
                .animate-marquee-left {
                    animation: marquee-left 75s linear infinite;
                }
                .animate-marquee-right {
                    animation: marquee-right 75s linear infinite;
                }
                /* Hide scrollbar for Chrome, Safari and Opera */
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                /* Hide scrollbar for IE, Edge and Firefox */
                .no-scrollbar {
                    -ms-overflow-style: none;  /* IE and Edge */
                    scrollbar-width: none;  /* Firefox */
                }
            `}</style>
    </section>
  );
}

function Card({ item, setLocation }: { item: any; setLocation: any }) {
  // Generate gradient based on label/id using specific brand colors
  const getGradient = (id: string, type: string) => {
    if (type === "coming-soon")
      return "bg-gradient-to-br from-[#EEE9DF] to-[#C9C1B1]"; // Palladian -> Oatmeal

    // Female relations (Warm): Truffle Trouble -> Burning Flame
    if (
      ["mom", "nani", "dadi", "mom_2", "wife", "grandchild"].some((k) =>
        id.includes(k),
      )
    ) {
      return "bg-gradient-to-br from-[#A35139] to-[#FFB162]";
    }

    // Male relations (Cool): Abyssal -> Blue Fantastic (Default for others)
    return "bg-gradient-to-br from-[#1B2632] to-[#2C3B4D]";
  };

  return (
    <div
      onClick={() => {
        if (item.type === "active") {
          setLocation(`/all-albums?category=${encodeURIComponent(item.label)}`);
        }
      }}
      className={`
                relative flex-none w-[200px] h-[120px] md:w-[240px] md:h-[150px]
                rounded-xl overflow-hidden cursor-pointer transition-all duration-300
                ${item.type === "coming-soon" ? "opacity-90 cursor-not-allowed" : "hover:scale-105 shadow-md hover:shadow-xl"}
                ${getGradient(item.id, item.type)}
            `}
    >
      {/* Background Image - Commented out as requested
            <img
                src={item.image}
                alt={item.label}
                className="absolute inset-0 w-full h-full object-cover"
            />
            */}

      {/* Content - Centered Middle */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
        <span
          className={`font-['Outfit'] font-bold text-xl md:text-2xl tracking-wide ${item.type === "coming-soon" ? "text-gray-400" : "text-white"}`}
        >
          {item.label}
        </span>

        {item.type === "coming-soon" && (
          <div className="absolute top-2 right-2 bg-gray-200/50 p-1.5 rounded-full">
            <Lock className="w-3 h-3 text-gray-500" />
          </div>
        )}
      </div>
    </div>
  );
}
