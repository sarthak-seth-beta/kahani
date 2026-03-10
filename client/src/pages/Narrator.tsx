import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";

const RELATIONS = [
  { id: "all", label: "Myself" },
  { id: "else", label: "Somebody else" },
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
    if (id === "all") {
      // Flow remains same for "Myself"
      setLocation("/all-albums?mode=solo");
    } else if (id === "else") {
      // New flow for "Somebody else"
      setLocation("/narrator-else");
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#EEE9DF] flex flex-col">
      <div className="relative w-full h-screen flex flex-col items-center overflow-hidden">
        {/* Subtle mandala accents */}
        <div className="pointer-events-none absolute -top-12 right-[-20px] sm:top-4 sm:right-16 opacity-[0.18] w-64 sm:w-80 aspect-square mix-blend-multiply z-0">
          <img
            src="/attached_assets/mandala.png"
            alt="Decorative mandala"
            className="w-full h-full object-contain"
            aria-hidden="true"
          />
        </div>
        <div className="pointer-events-none absolute bottom-[-40px] left-[-40px] sm:bottom-0 sm:left-8 opacity-[0.12] w-56 sm:w-72 aspect-square rotate-180 mix-blend-multiply z-0">
          <img
            src="/attached_assets/mandala.png"
            alt="Decorative mandala"
            className="w-full h-full object-contain"
            aria-hidden="true"
          />
        </div>
        {/* Header */}
        <header className="w-full relative z-20 max-w-7xl mx-auto flex items-center px-4 pt-4 pb-2 md:py-6">
          <Button
            id="narrator-back-home"
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="min-h-[40px] min-w-[40px] h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white border border-[#C9C1B1]/20"
          >
            <ArrowLeft className="h-5 w-5 text-[#1B2632]" />
          </Button>
        </header>

        {/* Main Content */}
        <main className="relative z-10 flex-1 w-full max-w-4xl mx-auto px-4 md:py-16 flex flex-col items-center justify-center">
          <div className="text-center mb-6 md:mb-10 space-y-3 px-4">
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-[#1B2632] font-['Outfit'] tracking-tight">
              Whose Kahani is this?
            </h1>
          </div>

          {/* Primary choice: Myself vs Somebody else */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full max-w-3xl pb-10">
            {RELATIONS.map((relation) => (
              <div
                id={`narrator-tiles-${relation.id}`}
                key={relation.id}
                onClick={() => handleSelectRelation(relation.id, relation.label)}
                className={cn(
                  "relative rounded-2xl shadow-md",
                  "flex flex-col items-center justify-center",
                  "cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
                  getGradient(relation.id),
                  "group overflow-hidden",
                  "col-span-1 h-20 sm:h-24",
                )}
              >
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-0" />
                <span className="font-['Outfit'] font-semibold text-lg sm:text-xl md:text-2xl text-white relative z-10 drop-shadow-sm transition-transform duration-300 group-hover:scale-110">
                  {relation.label}
                </span>
              </div>
            ))}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
