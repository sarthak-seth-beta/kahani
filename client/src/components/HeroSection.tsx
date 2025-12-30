import { useState, useEffect } from "react";
import heroImage from "@assets/Generated Image November 08, 2025 - 8_27PM_1762623023120.png";
import { Button } from "@/components/ui/button";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

interface HeroSectionProps {
  imageSrc?: string;
  onStartTrialClick?: () => void;
}

const storyTexts = [
  "DADI'S",
  "NANI'S",
  "DADA'S",
  "PAPA'S",
  "NANA'S",
  "MUMMY'S",
];

export default function HeroSection({
  imageSrc = heroImage,
  onStartTrialClick,
}: HeroSectionProps) {
  return (
    <section className="relative w-full h-screen flex flex-col overflow-hidden">
      {/* Full Screen Background Image */}
      <div className="absolute inset-0 w-full h-full">
        <img
          src={imageSrc}
          alt="Kahani storytelling experience"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1B2632]/80 via-[#1B2632]/40 to-transparent" />
      </div>

      {/* Content - Center-Middle */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center pb-24">
        {/* Text Overlay */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight mb-4 font-['Outfit'] max-w-5xl"
          data-testid="text-hero-headline"
        >
          Spotify for your family’s stories
        </h1>

        <p className="text-base sm:text-xl md:text-2xl text-white/90 font-medium mb-8 max-w-2xl whitespace-nowrap">
          They speak on WhatsApp. <br /> You keep it forever.
        </p>

        <div className="flex flex-col items-center gap-4">
          <Button
            onClick={onStartTrialClick}
            className="px-10 py-3 bg-[#E5484D] hover:bg-[#D93D42] text-white rounded-2xl text-lg font-semibold shadow-md hover:scale-105 transition-all duration-300"
          >
            Hear a Kahani
          </Button>

          <p className="text-[10px] sm:text-sm text-white/70 font-medium tracking-normal sm:tracking-wider uppercase whitespace-nowrap">
            WhatsApp-first. Grandparent-friendly. Private.
          </p>
        </div>
      </div>
    </section>
  );
}
