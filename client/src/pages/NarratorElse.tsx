import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { RelationshipCard } from "@/components/RelationshipSelector/RelationshipCard";

const RELATIONS_ELSE = [
  { id: "mom", label: "Mom" },
  { id: "dad", label: "Dad" },
  { id: "dadu", label: "Dadu/Nanu" },
  { id: "dadi", label: "Dadi/Nani" },
  { id: "partner", label: "Partner" },
  { id: "sibling", label: "Sibling" },
];

export default function NarratorElse() {
  const [, setLocation] = useLocation();

  const handleSelectRelation = (id: string, label: string) => {
    const category = id.toLocaleLowerCase();
    setLocation(`/albums?category=${encodeURIComponent(category)}`);
  };

  const handleOtherClick = () => {
    setLocation("/all-albums");
  };

  return (
    <div className="w-full min-h-screen bg-[#EEE9DF] flex flex-col">
      <div className="relative w-full h-screen bg-[#EEE9DF] flex flex-col items-center overflow-hidden">
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
            id="narrator-else-back"
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/narrator")}
            className="min-h-[40px] min-w-[40px] h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white border border-[#C9C1B1]/20"
          >
            <ArrowLeft className="h-5 w-5 text-[#1B2632]" />
          </Button>
        </header>

        {/* Main Content */}
        <main className="relative z-10 flex-1 w-full max-w-4xl mx-auto px-4 md:py-16 flex flex-col items-center justify-center mb-10">
          <div className="text-center mb-5 md:mb-7 space-y-2 px-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-['Outfit'] text-[#1B2632] tracking-tight">
              Who is this for?
            </h2>
            <p className="text-sm text-[#4B5563] font-['Outfit']">
              Choose who you&apos;re creating this book for.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-[10px] sm:gap-[14px] w-full max-w-md mx-auto">
            {RELATIONS_ELSE.map((relation) => (
              <RelationshipCard
                key={relation.id}
                id={relation.id}
                label={relation.label}
                isSelected={false}
                variant="filled"
                onSelect={() =>
                  handleSelectRelation(relation.id, relation.label)
                }
              />
            ))}
          </div>

          <div className="w-full max-w-md mt-4">
            <button
              id="narrator-else-someone-else"
              onClick={handleOtherClick}
              className="w-full h-14 sm:h-16 rounded-[14px] bg-[#1B2632] text-white text-sm sm:text-base font-medium flex items-center justify-center transition-all duration-150 cursor-pointer active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1B2632]"
            >
              Someone else
            </button>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
