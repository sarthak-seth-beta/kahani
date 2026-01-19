import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onHearKahaniClick?: () => void;
}

const storyTexts = [
  "DADI'S",
  "NANI'S",
  "DADA'S",
  "PAPA'S",
  "NANA'S",
  "MUMMY'S",
];

const LargeImage =
  "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/hero_section.jpg";
const SmallImage =
  "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/hero_section_mobile.jpg";

export default function HeroSection({ onHearKahaniClick }: HeroSectionProps) {
  return (
    <section className="relative w-full h-screen flex flex-col overflow-hidden">
      {/* Full Screen Background Image */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src={LargeImage}
          alt="Kahani storytelling experience"
          className="hidden md:block absolute inset-0 w-full h-full object-cover object-center"
        />
        <img
          src={SmallImage}
          alt="Kahani storytelling experience"
          className="md:hidden absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Dark gradient overlay for text readability (Centered) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#1B2632]/70 to-transparent" />

        {/* Specific bottom fade for the image to blend with next section - Aggressive blend */}
        <div className="absolute bottom-0 left-0 right-0 h-[50vh] bg-gradient-to-t from-[#1C2632] via-[#1C2632]/80 to-transparent" />
      </div>

      {/* Large Devices */}
      {/* Content - Left-Middle */}
      <div className="hidden md:flex flex-col relative z-10 flex-1 items-left justify-center px-4 sm:px-10 text-left pb-24 w-1/2">
        {/* Text Overlay */}
        <h1
          className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight mb-8 max-w-6xl"
          data-testid="text-hero-headline"
        >
          Turn your parents stories into a book.
        </h1>

        {/* Removed: "They speak on WhatsApp. You keep it forever." */}

        <div className="flex flex-col items-left gap-4">
          <Button
            onClick={onHearKahaniClick}
            className="px-10 py-3 bg-[#A35139] hover:bg-[#8B4430] text-white rounded-2xl text-lg font-semibold shadow-md hover:scale-105 transition-all duration-300 w-fit"
          >
            Hear a Sample Kahani
          </Button>

          <div className="flex flex-col items-left gap-1">
            <p className="text-[10px] sm:text-sm text-white/70 font-medium tracking-normal sm:tracking-wider uppercase whitespace-nowrap">
              You invite them on WhatsApp. They speak. <br />
              We make the book
            </p>
          </div>
        </div>
      </div>

      {/* Small Devices */}
      {/* Content - Center-Middle */}
      <div className="md:hidden relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center pb-24 gap-60">
        {/* Text Overlay */}
        <h1
          className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight mb-8 max-w-6xl mx-auto"
          data-testid="text-hero-headline"
        >
          Turn your parents stories into a book.
        </h1>

        {/* Removed: "They speak on WhatsApp. You keep it forever." */}

        <div className="flex flex-col items-center gap-4 z-50">
          <Button
            onClick={onHearKahaniClick}
            className="px-10 py-3 bg-[#A35139] hover:bg-[#8B4430] text-white rounded-2xl text-lg font-semibold shadow-md hover:scale-105 transition-all duration-300"
          >
            Hear a Sample Kahani
          </Button>

          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] sm:text-sm text-white/70 font-medium tracking-normal sm:tracking-wider uppercase whitespace-nowrap">
              You invite them on WhatsApp. They speak.
            </p>
            <p className="text-sm sm:text-lg text-white/70 font-medium tracking-normal sm:tracking-wider uppercase whitespace-nowrap">
              We make the book
            </p>
          </div>
        </div>
      </div>

      {/* Smooth Fade Transition to Next Section */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-b from-transparent to-[#1C2632] z-20 pointer-events-none" />
    </section>
  );
}
