import React from "react";
import { Play } from "lucide-react";
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
    description: "Choose a theme for Mom/Dad/Dadu/Nani.",
    imageSrc:
      "https://opkrioqnroyckxqcclav.supabase.co/storage/v1/object/public/static_image_assets/how_it_works_1.jpg",
  },
  {
    number: "2",
    title: "They speak on WhatsApp",
    description: "We send one question. They reply with a voice note.",
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
    {/* Mobile Vertical Arrow */}
    <svg
      className="block md:hidden h-12 w-6 overflow-visible"
      viewBox="0 0 2 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 0V64"
        stroke="#E5E7EB"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M1 0V64"
        stroke="#A35139"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="4 80"
        className="animate-flow-vertical"
      />
    </svg>

    {/* Desktop Horizontal Curved Arrow */}
    <svg
      className="hidden md:block w-16 lg:w-24 h-6 overflow-visible"
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
  return (
    <section
      id="how-it-works"
      className="w-full bg-white px-4 sm:px-6 min-h-screen flex flex-col pt-5 pb-16"
    >
      {/* 1. Heading Top - Centered */}
      <div className="flex-none mb-4 sm:mb-8">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1B2632] text-center font-['Outfit']">
          How It Works
        </h2>
      </div>

      {/* 2. Content Middle - Centered vertically in remaining space */}
      <div className="flex-1 flex flex-col justify-center w-full max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-8 md:gap-4 lg:gap-6 w-full">
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              {/* Step Card */}
              <div
                className="w-full max-w-sm flex-1 flex flex-col items-start text-left md:items-center md:text-center space-y-4 md:space-y-6 relative z-10"
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
                  <h3 className="text-xl sm:text-2xl font-bold text-[#1B2632] mb-1 sm:mb-3 font-['Outfit']">
                    {step.title}
                  </h3>
                  <p className="text-[#1B2632]/70 leading-relaxed text-sm sm:text-base">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connector */}
              {index < steps.length - 1 && (
                <FlowConnector className="hidden md:flex py-2 md:py-0 md:px-0 flex-shrink-0 md:mt-[11%] -my-4 md:my-0 relative z-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 3. CTA Bottom */}
      <div className="sticky bottom-24 z-40 flex mx-auto mt-6 sm:mt-0 text-center">
        <Button
          onClick={onVideoClick}
          className="inline-flex items-center gap-2 px-8 py-6 bg-transparent border-2 border-[#1B2632]/10 hover:border-[#A35139] text-[#1B2632] hover:text-[#A35139] rounded-full text-lg font-semibold transition-all duration-300 group"
          variant="outline"
        >
          <Play className="w-5 h-5 fill-current" />
          See how it works
        </Button>
      </div>

      <style>{`
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
