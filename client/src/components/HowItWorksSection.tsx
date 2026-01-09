import React, { useRef, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

interface Step {
  number: string;
  title: string;
  description: string;
  imageSrc: string;
}

interface HowItWorksSectionProps {
  steps?: Step[];
  onVideoClick?: () => void;
}

const defaultSteps: Step[] = [
  {
    number: "1",
    title: "Pick an album",
    description: "Choose a theme for Mom / Dad / Dadu / Nani.",
    imageSrc:
      "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/how_it_works_1.jpg",
  },
  {
    number: "2",
    title: "They record on WhatsApp",
    description: "We send them questions. They reply with a voice note.",
    imageSrc:
      "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/how_it_works_2.jpg",
  },
  {
    number: "3",
    title: "You get the album",
    description:
      "A private link with their stories — ready to replay and share.",
    imageSrc:
      "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/how_it_works_3.jpg",
  },
];

const FlowConnector = ({ className }: { className?: string }) => (
  <div className={`flex items-center justify-center ${className} z-0`}>
    <svg
      className="block w-16 lg:w-24 h-6 overflow-visible"
      viewBox="0 0 96 2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 1H96"
        stroke="#E5E7EB"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M0 1H96"
        stroke="#A35139"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="6 150"
        className="animate-flow-horizontal"
      />
    </svg>
  </div>
);

export default function HowItWorksSection({
  steps = defaultSteps,
  onVideoClick = () => window.open("https://youtube.com", "_blank"),
}: HowItWorksSectionProps) {
  const [, setLocation] = useLocation();
  const [activeStep, setActiveStep] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, clientWidth } = scrollContainerRef.current;
        const newIndex = Math.round(scrollLeft / clientWidth);
        const clampedIndex = Math.min(Math.max(newIndex, 0), steps.length - 1);
        setActiveStep(clampedIndex);
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [steps.length]);

  return (
    <section
      id="how-it-works"
      className="w-full bg-[#EEE9DF] px-4 sm:px-6 py-12 flex flex-col relative overflow-hidden"
    >
      {/* Top Fade Gradient */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
      {/* 1. Heading Top - Centered */}
      <div className="flex-none mb-4 sm:mb-8 relative z-20">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1B2632] text-center font-['Outfit']">
          How It Works
        </h2>
      </div>

      {/* 2. Content Middle - Centered vertically in remaining space */}
      <div className="flex-1 flex flex-col justify-center w-full max-w-7xl mx-auto relative z-20">
        <div
          ref={scrollContainerRef}
          className="flex flex-row items-start md:items-start justify-start md:justify-center gap-4 md:gap-4 lg:gap-6 w-full overflow-x-auto snap-x snap-mandatory pb-6 no-scrollbar"
        >
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              {/* Step Card */}
              <div
                className="w-[85vw] md:w-full max-w-sm flex-none md:flex-1 snap-center flex flex-col items-start text-left md:items-center md:text-center space-y-4 md:space-y-6 relative z-10"
                style={{ scrollSnapStop: "always" }}
                data-testid={`step-${index + 1}`}
              >
                {/* Image Container */}
                <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-[#1B2632] shadow-xl hover:scale-[1.02] transition-transform duration-300">
                  <img
                    src={step.imageSrc}
                    alt={step.title}
                    className="w-full h-full object-cover opacity-90"
                  />
                  {/* Step Number */}
                  <div className="absolute top-4 left-4 sm:top-6 sm:left-6 w-10 h-10 sm:w-12 sm:h-12 bg-[#A35139] rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg sm:text-xl">
                      {step.number}
                    </span>
                  </div>
                </div>

                {/* Text Content */}
                <div className="px-2 w-full">
                  <h3 className="text-xl sm:text-2xl font-bold text-[#1B2632] mb-3 sm:mb-4 font-['Outfit']">
                    {step.title}
                  </h3>
                  <p className="text-[#1B2632]/70 leading-loose text-sm sm:text-base">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connector */}
              {index < steps.length - 1 && (
                <FlowConnector className="flex flex-shrink-0 mt-[35vw] md:mt-[11%] relative z-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Navigation Dots for Mobile */}
      <div className="flex md:hidden justify-center gap-2 mb-6">
        {steps.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${index === activeStep ? "w-8 bg-[#A35139]" : "w-2 bg-[#1B2632]/20"
              }`}
          />
        ))}
      </div>

      {/* 3. CTA Bottom to sample-albums page */}
      <div className="relative z-40 flex mx-auto mt-2 sm:mt-0 text-center">
        <Button
          onClick={() => setLocation("/sample-album")}
          className="px-6 py-2 bg-transparent border-2 border-[#A35139] text-[#A35139] hover:bg-[#A35139] hover:text-white rounded-xl text-lg font-semibold transition-all duration-300 shadow-sm hover:shadow-md"
        >
          See Sample Album
        </Button>
      </div>

      {/* Bottom Fade Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FAFAFA] to-transparent pointer-events-none z-10" />

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes flowHorizontal {
          from { stroke-dashoffset: 156; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes flowVertical {
          from { stroke-dashoffset: 84; }
          to { stroke-dashoffset: 0; }
        }
        .animate-flow-horizontal {
          animation: flowHorizontal 2s linear infinite;
        }
        .animate-flow-vertical {
          animation: flowVertical 2s linear infinite;
        }
      `}</style>
    </section>
  );
}
