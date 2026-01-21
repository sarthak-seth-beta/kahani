import { useRef, useEffect, useState } from "react";
import { useLocation } from "wouter";

const ACTIVE_RELATIONS = [
  // Active
  { id: "mom", label: "Mom" },
  { id: "dad", label: "Dad" },
  { id: "dadu", label: "Dadu" },
  { id: "dadi", label: "Dadi" },
  { id: "nanu", label: "Nanu" },
  { id: "nani", label: "Nani" },
  { id: "brother", label: "Brother" },
  { id: "sister", label: "Sister" },
];

export default function GetStartedSection2() {
  const [, setLocation] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const resumeTimeoutRef = useRef<NodeJS.Timeout>();

  // Duplicate array to ensure seamless infinite scroll
  // 4x duplication to fill wide screens and ensure no gaps during loop reset
  const marqueeItems = ACTIVE_RELATIONS.slice(2);
  const SCROLL_ITEMS = [
    ...marqueeItems,
    ...marqueeItems,
    ...marqueeItems,
    ...marqueeItems,
  ];

  const STATIC_ITEMS = [ACTIVE_RELATIONS[0], ACTIVE_RELATIONS[1]]; // Mom and Dad

  useEffect(() => {
    let animationFrameId: number;
    const scrollContainer = scrollRef.current;

    const animate = () => {
      if (scrollContainer && !isPaused) {
        // Move Left (Viewport moves Right, Content moves Left)
        scrollContainer.scrollLeft += 1; // Adjust speed as needed

        // Reset scroll position to create infinite effect
        if (scrollContainer.scrollLeft >= scrollContainer.scrollWidth / 2) {
          scrollContainer.scrollLeft = 0;
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused]);

  // Interaction Handlers
  const handleInteractionStart = () => {
    setIsPaused(true);
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }
  };

  const handleInteractionEnd = () => {
    resumeTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 2000);
  };

  return (
    <section className="py-12 bg-white overflow-hidden flex flex-col items-center">
      {/* Heading */}
      <h2 className="text-3xl md:text-5xl font-bold font-['Outfit'] text-[#1B2632] tracking-wider mb-8 text-center">
        Make a book for
      </h2>

      {/* Static Cards */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        {STATIC_ITEMS.map((item, index) => (
          <Card key={`static-${index}`} item={item} setLocation={setLocation} />
        ))}
      </div>

      {/* Marquee Container */}
      <div
        ref={scrollRef}
        className="relative w-full overflow-x-auto no-scrollbar"
        onTouchStart={handleInteractionStart}
        onTouchEnd={handleInteractionEnd}
        onMouseDown={handleInteractionStart}
        onMouseUp={handleInteractionEnd}
        onMouseLeave={handleInteractionEnd}
      >
        <div className="flex gap-4 w-max px-4">
          {SCROLL_ITEMS.map((item, index) => (
            <Card
              key={`${item.id}-${index}`}
              item={item}
              setLocation={setLocation}
            />
          ))}
        </div>
      </div>

      <style>{`
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
      ["mom", "nani", "dadi", "mom_2", "wife", "grandchild", "sister"].some(
        (k) => id.includes(k),
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
        relative flex-none 
        w-[160px] h-[80px] 
        rounded-lg shadow-sm 
        flex items-center justify-center 
        cursor-pointer hover:shadow-md hover:scale-105 transition-all duration-300
        ${getGradient(item.id, item.type)}
        ${item.type === "coming-soon" ? "opacity-90 cursor-not-allowed" : ""}
      `}
    >
      <span
        className={`font-['Outfit'] font-medium text-lg ${item.type === "coming-soon" ? "text-gray-400" : "text-white"}`}
      >
        {item.label}
      </span>
    </div>
  );
}
