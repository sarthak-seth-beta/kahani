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
        <div className="relative w-full overflow-hidden group">
          <div className="flex gap-4 w-max animate-marquee-left group-hover:[animation-play-state:paused] pl-4">
            {SCROLL_ITEMS_1.map((item, index) => (
              <Card key={`r1-${index}`} item={item} setLocation={setLocation} />
            ))}
          </div>
        </div>

        {/* Row 2: Right Scroll */}
        <div className="relative w-full overflow-hidden group">
          <div className="flex gap-4 w-max animate-marquee-right group-hover:[animation-play-state:paused] pl-4">
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
