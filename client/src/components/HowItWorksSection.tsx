import React, { useRef, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import WavyStepProgress from "./WavyStepProgress";

interface Step {
  number: string;
  title: string;
  description: string;
}

interface HowItWorksSectionProps {
  steps?: Step[];
  onVideoClick?: () => void;
}

const defaultSteps: Step[] = [
  {
    number: "1",
    title: "Pick a theme",
    description: "Choose the best theme for your parents.",
  },
  {
    number: "2",
    title: "Invite them on WhatsApp",
    description:
      "We send gentle prompts on Whatsapp. They reply with voice notes.",
  },
  {
    number: "3",
    title: "You get the book",
    description: "Their stories, saved as a book you can read and listen to.",
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

  // Calculate the width of a single card including gap
  const getCardScrollWidth = () => {
    // Card width is 85vw on mobile, gap is 16px (gap-4)
    const cardWidth = window.innerWidth * 0.85;
    const gap = 16;
    // Connector width is approximately 64px (w-16)
    const connectorWidth = 64;
    return cardWidth + gap + connectorWidth;
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const newStep =
        direction === "left"
          ? Math.max(0, activeStep - 1)
          : Math.min(steps.length - 1, activeStep + 1);

      if (newStep !== activeStep) {
        const scrollAmount = getCardScrollWidth();
        const targetScrollLeft = newStep * scrollAmount;

        scrollContainerRef.current.scrollTo({
          left: targetScrollLeft,
          behavior: "smooth",
        });
        setActiveStep(newStep);
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft } = scrollContainerRef.current;
        const scrollAmount = getCardScrollWidth();
        const newIndex = Math.round(scrollLeft / scrollAmount);
        const clampedIndex = Math.min(Math.max(newIndex, 0), steps.length - 1);
        if (clampedIndex !== activeStep) {
          setActiveStep(clampedIndex);
        }
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [steps.length, activeStep]);

  return (
    <section
      id="how-it-works"
      className="w-full bg-[#EEE9DF] px-4 sm:px-6 py-2 flex flex-col relative overflow-hidden"
    >
      {/* Top Fade Gradient */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
      {/* 1. Heading Top - Centered */}
      <div className="flex-none mb-1 sm:mb-2 relative z-20">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1B2632] text-center font-['Outfit']">
          How It Works
        </h2>
        <p className="text-sm sm:text-xs text-[#1B2632]/80 text-center mt-2 font-['Outfit'] font-medium whitespace-nowrap">
          (pick someone you want to make a book for)
        </p>
      </div>

      {/* 2. Content Middle - Centered vertically in remaining space */}
      <div className="flex-1 flex flex-col justify-center w-full max-w-7xl mx-auto relative z-20">
        {/* Navigation Wavy Steps for Mobile - Placed at Top */}
        <div className="block md:hidden w-full mb-1">
          <WavyStepProgress
            steps={[
              { id: "1", label: "Select Theme" },
              { id: "2", label: "Invite Parents" },
              { id: "3", label: "Get Book" },
            ]}
            currentStep={activeStep}
            onStepClick={(index) => {
              if (scrollContainerRef.current) {
                const scrollAmount = getCardScrollWidth();
                const targetScrollLeft = index * scrollAmount;

                scrollContainerRef.current.scrollTo({
                  left: targetScrollLeft,
                  behavior: "smooth",
                });
                setActiveStep(index);
              }
            }}
          />
        </div>

        <div className="relative">
          <div
            ref={scrollContainerRef}
            className="flex flex-row items-start md:items-start justify-start md:justify-center gap-4 md:gap-4 lg:gap-6 w-full overflow-x-auto snap-x snap-mandatory pb-6 no-scrollbar"
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {/* Spacer for centering first card on mobile */}
            <div className="flex-shrink-0 w-[calc((100vw-85vw)/2)] md:w-0" />

            {steps.map((step, index) => (
              <React.Fragment key={index}>
                {/* Step Card */}
                <div
                  className="w-[85vw] md:w-full max-w-sm flex-none md:flex-1 snap-center flex flex-col items-start text-left md:items-center md:text-center space-y-1 md:space-y-6 relative z-10"
                  style={{ scrollSnapStop: "always" }}
                  data-testid={`step-${index + 1}`}
                >
                  {/* Image Container */}
                  {/* Number Container - Hidden on Mobile, Visible on Desktop */}
                  <div className="hidden md:flex relative w-full aspect-[4/3] rounded-3xl overflow-hidden bg-[#FAFAFA] shadow-[8px_8px_0px_0px_rgba(27,38,50,0.1)] border-2 border-[#1B2632]/10 items-center justify-center group hover:-translate-y-1 transition-transform duration-300">
                    <span className="text-[140px] sm:text-[180px] font-bold text-[#A35139] font-['Outfit'] opacity-10 absolute -bottom-10 -right-10 rotate-12 select-none transform transition-transform duration-500 group-hover:scale-110">
                      {step.number}
                    </span>
                    <span className="text-8xl sm:text-9xl font-bold text-[#1B2632] font-['Outfit'] relative z-10 transition-colors duration-300 group-hover:text-[#A35139]">
                      {step.number}
                    </span>
                  </div>

                  {/* Text Content */}
                  <div className="px-2 w-full mt-1 md:mt-6 text-center md:text-left">
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
                  <FlowConnector className="hidden md:flex flex-shrink-0 mt-[11%] relative z-0" />
                )}
              </React.Fragment>
            ))}

            {/* Spacer for centering last card on mobile */}
            <div className="flex-shrink-0 w-[calc((100vw-85vw)/2)] md:w-0" />
          </div>
        </div>
      </div>

      {/* Restored Navigation Dots for Mobile with Arrows */}
      <div className="flex md:hidden items-center justify-center gap-4 mb-1">
        <button
          onClick={() => scroll("left")}
          className="w-8 h-8 bg-[#EEE9DF] hover:bg-white rounded-full flex items-center justify-center text-[#1B2632] transition-all duration-300 border border-[#1B2632]/10"
          aria-label="Previous step"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex gap-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === activeStep
                  ? "w-8 bg-[#1B2632]"
                  : "w-2 bg-[#1B2632]/20"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => scroll("right")}
          className="w-8 h-8 bg-[#EEE9DF] hover:bg-white rounded-full flex items-center justify-center text-[#1B2632] transition-all duration-300 border border-[#1B2632]/10"
          aria-label="Next step"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 3. CTA Bottom to sample-albums page */}
      <div className="relative z-40 flex mx-auto mt-2 sm:mt-0 text-center">
        <Button
          onClick={() => setLocation("/sample")}
          className="px-6 py-2 bg-transparent border-2 border-[#1B2632] text-[#1B2632] hover:bg-[#1B2632] hover:text-white rounded-xl text-lg font-semibold transition-all duration-300 shadow-sm hover:shadow-md"
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
