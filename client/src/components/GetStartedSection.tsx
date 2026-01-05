import { Lock } from "lucide-react";
import { useLocation } from "wouter";

const imgURL = "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/family_image.png";

const ITEMS_ROW_1 = [
    { id: "mom", label: "Mom", type: "active", image: imgURL },
    { id: "dad", label: "Dad", type: "active", image: imgURL },
    { id: "dadu", label: "Dadu", type: "active", image: imgURL },
    { id: "nanu", label: "Nanu", type: "active", image: imgURL },
    { id: "nani", label: "Nani", type: "active", image: imgURL },
    { id: "dadi", label: "Dadi", type: "active", image: imgURL },
];

const ITEMS_ROW_2 = [
    { id: "mentor", label: "Mentor", type: "coming-soon", image: imgURL },
    { id: "friend", label: "Friend", type: "coming-soon", image: imgURL },
    { id: "teacher", label: "Teacher", type: "coming-soon", image: imgURL },
    // Fill row 2 with some active items too for balance if needed, or repeat
    { id: "mom_2", label: "Mom", type: "active", image: imgURL },
    { id: "dad_2", label: "Dad", type: "active", image: imgURL },
    { id: "dadu_2", label: "Dadu", type: "active", image: imgURL },
];

export default function GetStartedSection() {
    const [, setLocation] = useLocation();

    // Duplicate arrays to create seamless loop
    const SCROLL_ITEMS_1 = [...ITEMS_ROW_1, ...ITEMS_ROW_1, ...ITEMS_ROW_1, ...ITEMS_ROW_1];
    const SCROLL_ITEMS_2 = [...ITEMS_ROW_2, ...ITEMS_ROW_2, ...ITEMS_ROW_2, ...ITEMS_ROW_2];

    return (
        <section className="relative py-12 bg-white overflow-hidden">
            {/* Top Fade Gradient from Previous Section Color (#FAFAFA) to White */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#FAFAFA] via-[#FAFAFA]/40 to-white pointer-events-none z-10" />

            <div className="relative z-20 container mx-auto px-4 md:px-6 mb-10 text-center">
                <h2 className="text-3xl md:text-5xl font-bold font-['Outfit'] text-[#1B2632] tracking-wider">
                    Get started for
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
                    animation: marquee-left 40s linear infinite;
                }
                .animate-marquee-right {
                    animation: marquee-right 45s linear infinite;
                }
            `}</style>
        </section>
    );
}

function Card({ item, setLocation }: { item: any; setLocation: any }) {
    return (
        <div
            onClick={() => {
                if (item.type === "active") {
                    setLocation("/all-albums");
                }
            }}
            className={`
                relative flex-none w-[200px] h-[120px] md:w-[240px] md:h-[150px] 
                rounded-xl overflow-hidden cursor-pointer transition-all duration-300
                ${item.type === "coming-soon" ? "opacity-90 grayscale cursor-not-allowed" : "hover:scale-105 shadow-md hover:shadow-xl"}
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
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 p-3 text-center">
                <span className="text-white font-['Outfit'] font-bold text-lg md:text-xl tracking-widest uppercase">
                    {item.label}
                </span>

                {item.type === "coming-soon" && (
                    <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm p-1 rounded-full border border-white/20">
                        <Lock className="w-3 h-3 text-white/80" />
                    </div>
                )}

                {item.type === "coming-soon" && (
                    <span className="text-[9px] uppercase tracking-widest text-[#FFB162] font-bold mt-1">
                        Coming Soon
                    </span>
                )}
            </div>
        </div>
    );
}
