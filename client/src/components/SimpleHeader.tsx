import { Link, useLocation } from "wouter";
import { BookOpen, Mic, ArrowRight } from "lucide-react";
import kahaniLogo from "@assets/Kahani Dummy Logo (1)_1762679074954.png";
import { useState, useEffect } from "react";

interface SimpleHeaderProps {
  logoSrc?: string;
  onRecordClick?: () => void;
}

const ROLES = ["Mom", "Dad", "Dadu", "Nanu", "Nani", "Dadi"];

export default function SimpleHeader({
  logoSrc = kahaniLogo,
  onRecordClick,
}: SimpleHeaderProps) {
  const [, setLocation] = useLocation();
  const [roleIndex, setRoleIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRoleIndex((prev) => (prev + 1) % ROLES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="absolute md:relative top-0 left-0 right-0 z-50 w-full bg-[#EEE9DF]/95 backdrop-blur-sm border-b border-[#C9C1B1]/30 shadow-sm transition-all">
      <style>
        {`
          @keyframes scrollUp {
            0% { transform: translateY(100%); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .animate-scroll-up {
            animation: scrollUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}
      </style>
      <div className="flex items-center justify-center md:justify-between px-4 py-2 md:px-8 gap-4 h-[70px]">
        {/* Logo */}
        <div onClick={() => setLocation("/")} className="hidden md:block cursor-pointer shrink-0">
          <img
            src={logoSrc}
            alt="Kahani Logo"
            className="h-14 md:h-16 w-auto object-contain"
          />
        </div>

        {/* Navigation / CTA */}
        <div className="flex items-center gap-3 md:gap-4">
          <span className="text-[#1B2632] font-medium text-sm md:text-base whitespace-nowrap">
            Get started for
          </span>

          {onRecordClick && (
            <button
              onClick={onRecordClick}
              className="w-[100px] md:w-[110px] h-10 bg-[#1B2632] text-[#EEE9DF] border-[#1B2632] rounded-full font-bold text-sm md:text-base shadow-md hover:bg-[#1B2632]/90 hover:scale-105 active:scale-95 transition-all flex items-center justify-center overflow-hidden"
              data-testid="button-record"
            >
              <span key={roleIndex} className="animate-scroll-up block">
                {ROLES[roleIndex]}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
