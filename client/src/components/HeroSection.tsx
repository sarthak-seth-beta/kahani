import { useState, useEffect } from "react";
import heroImage from "@assets/Generated Image November 08, 2025 - 8_27PM_1762623023120.png";
import { Button } from "@/components/ui/button";

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
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prevIndex) => (prevIndex + 1) % storyTexts.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#1B2632]/70 via-[#1B2632]/30 to-transparent" />
      </div>

      {/* Content - Centered with More Space */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start px-4 sm:px-6 pb-8 sm:pb-12 pt-24 sm:pt-24">
        {/* Text Overlay - Three Lines */}
        <h1
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center leading-tight tracking-tight mb-8 sm:mb-12 font-['Outfit'] max-w-4xl"
          data-testid="text-hero-headline"
        >
          <span
            key={currentTextIndex}
            className="inline-block animate-fade-in text-[#FFB162]"
          >
            {storyTexts[currentTextIndex]}
          </span>
          <br />
          STORIES AND VOICE
          <br />
          NOW AND FOREVER
        </h1>
      </div>
    </section>
  );
}
