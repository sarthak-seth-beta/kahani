import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";

const RELATIONS = [
    { id: "all", label: "Myself" },
    { id: "mom", label: "Mom" },
    { id: "dad", label: "Dad" },
    { id: "dadu", label: "Dadu" },
    { id: "dadi", label: "Dadi" },
    { id: "nanu", label: "Nanu" },
    { id: "nani", label: "Nani" },
];

export default function Narrator() {
    const [, setLocation] = useLocation();

    const getGradient = (id: string) => {
        // Female relations (Warm): Truffle Trouble -> Burning Flame
        if (["mom", "nani", "dadi"].includes(id)) {
            return "bg-gradient-to-br from-[#A35139] to-[#FFB162]";
        }
        // Male or All relations (Cool): Abyssal -> Blue Fantastic
        return "bg-gradient-to-br from-[#1B2632] to-[#2C3B4D]";
    };

    const handleSelectRelation = (id: string, label: string) => {
        // "Myself" goes to /all-albums (full catalog), others go to /albums (curated view)
        if (id === "all") {
            setLocation("/all-albums");
        } else {
            const category = label;
            setLocation(`/albums?category=${encodeURIComponent(category)}`);
        }
    };

    return (
        <div className="w-full min-h-screen bg-[#EEE9DF] flex flex-col items-center">
            {/* Header */}
            <header className="w-full relative z-40 max-w-7xl mx-auto flex items-center px-4 pt-4 pb-2 md:py-6">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocation("/")}
                    className="min-h-[40px] min-w-[40px] h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white border border-[#C9C1B1]/20"
                >
                    <ArrowLeft className="h-5 w-5 text-[#1B2632]" />
                </Button>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 md:py-16 flex flex-col items-center justify-center">
                <div className="text-center mb-8 md:mb-12 space-y-4 px-4">
                    <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-[#1B2632] font-['Outfit'] tracking-tight">
                        Whose Kahani is this?
                    </h1>
                </div>

                {/* Tiles Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full max-w-3xl pb-16">
                    {RELATIONS.map((relation, index) => (
                        <div
                            key={relation.id}
                            onClick={() => handleSelectRelation(relation.id, relation.label)}
                            className={cn(
                                "relative rounded-2xl shadow-md",
                                "flex flex-col items-center justify-center",
                                "cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
                                getGradient(relation.id),
                                "group overflow-hidden",
                                index === 0
                                    ? "col-span-2 md:col-span-4 aspect-[3/1] md:aspect-[4/1]"
                                    : "col-span-1 aspect-square"
                            )}
                        >
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-0" />
                            <span className="font-['Outfit'] font-bold text-2xl md:text-3xl text-white relative z-10 drop-shadow-sm transition-transform duration-300 group-hover:scale-110">
                                {relation.label}
                            </span>
                        </div>
                    ))}
                </div>
            </main>

            <Footer />
        </div>
    );
}
