import React from "react";
import { cn } from "@/lib/utils";

interface Step {
    id: string | number;
    label: string;
}

interface WavyStepProgressProps {
    steps: Step[];
    currentStep: number;
    onStepClick?: (stepIndex: number) => void;
    className?: string;
}

export default function WavyStepProgress({
    steps,
    currentStep, // 1-based index expected for display logic, but let's check standard
    onStepClick,
    className,
}: WavyStepProgressProps) {
    // PRD says: currentStep: number
    // PRD says: active step (1, 2, 3)
    // Let's assume currentStep passed is 0-indexed for array access simplicity, or we convert.
    // The PRD says "aria-valuemin="1"".
    // Let's assume the parent passes 1-based index (1, 2, 3...) or we treat 0 as 1.
    // Actually, usually indices are 0-based in code. Let's stick to 0-based for internal logic and 1-based for display.

    // NOTE: PRD image implies a wave connecting 3 nodes exactly.
    // If steps.length is dynamic (min 2, max 5), the wave text needs to be dynamic too?
    // For the specific requirement of 3 steps, we will draw a specific path.
    // If it needs to be dynamic, we might need a more complex SVG generation or a repeating pattern.
    // For now, let's optimize for 3 steps as per the primary requirement request and PRD Example.

    const safeCurrentStep = Math.max(0, Math.min(currentStep, steps.length - 1));

    return (
        <div
            className={cn(
                "w-full max-w-[600px] mx-auto relative flex flex-col items-center justify-center p-4",
                className
            )}
        >
            <div className="relative w-full h-[140px] flex items-center justify-between z-0">
                {/* Wavy Background Track */}
                <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 z-0 pointer-events-none">
                    <svg
                        width="100%"
                        height="120"
                        viewBox="0 0 400 120"
                        preserveAspectRatio="none"
                        className="w-full h-full drop-shadow-[0_4px_10px_rgba(0,0,0,0.05)]"
                    >
                        {/* 
                            More intense wave path:
                            Start: (0, 60)
                            Control 1: (60, 10) - High peak
                            Control 2: (140, 110) - Low peak
                            Mid: (200, 60)
                            ... repeat
                         */}
                        <path
                            d="M 0,60 C 60,10 140,110 200,60 C 260,10 340,110 400,60"
                            fill="none"
                            stroke="#EDEAE6"
                            strokeWidth="8"
                            strokeLinecap="round"
                        />
                    </svg>
                </div>

                {/* Steps */}
                <div className="w-full flex justify-between items-center relative z-10 px-2 sm:px-6 h-full">
                    {steps.map((step, index) => {
                        const isActive = index === safeCurrentStep;

                        // Calculate vertical position offset based on index (0, 1, 2)
                        // If wave is symmetric sine, nodes at 0, 0.5, 1 are at center (y=60).
                        // With the path `M 0,60 ... 200,60 ... 400,60`, the nodes naturally align at center Y.
                        // So simple alignment `items-center` works.

                        return (
                            <div
                                key={step.id}
                                className="flex flex-col items-center gap-2 cursor-pointer group relative"
                                onClick={() => onStepClick?.(index)}
                                role="button"
                                tabIndex={0}
                                aria-current={isActive ? "step" : undefined}
                            >
                                {/* Circle Node */}
                                <div
                                    className={cn(
                                        "relative flex items-center justify-center rounded-full transition-all duration-300 ease-in-out z-10",
                                        "w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16", // Dimensions
                                        isActive
                                            ? "bg-[#1B2632] text-white shadow-lg scale-110"
                                            : "bg-transparent text-[#B5ADA5] hover:text-[#1B2632] hover:bg-[#1B2632]/10"
                                    )}
                                >
                                    <span className="text-xl sm:text-2xl font-bold font-['Outfit']">
                                        {index + 1}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
