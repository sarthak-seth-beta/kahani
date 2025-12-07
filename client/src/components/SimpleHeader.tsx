import { Link, useLocation } from "wouter";
import { BookOpen, Mic } from "lucide-react";
import kahaniLogo from "@assets/Kahani Dummy Logo (1)_1762679074954.png";

interface SimpleHeaderProps {
  logoSrc?: string;
  onRecordClick?: () => void;
}

export default function SimpleHeader({
  logoSrc = kahaniLogo,
  onRecordClick,
}: SimpleHeaderProps) {
  const [, setLocation] = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full bg-[#EEE9DF] border-b border-[#C9C1B1]/30">
      <div className="flex items-center justify-between px-4 py-0 md:px-8 gap-4">
        {/* Logo - Adjusted to be compact but visible */}
        <div
          onClick={() => setLocation("/")}
          className="cursor-pointer"
        >
          <img
            src={logoSrc}
            alt="Kahani Logo"
            className="h-16 md:h-20 w-auto object-contain"
            style={{ minHeight: '60px' }}
          />
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-3">
          {/* Record Now Button */}
          {onRecordClick && (
            <button
              onClick={onRecordClick}
              className="px-6 py-2 bg-[#1B2632] text-[#EEE9DF] border-[#1B2632] rounded-2xl font-semibold text-sm shadow-md hover:bg-[#1B2632]/90 transition-colors flex items-center gap-2 min-h-[40px]"
              data-testid="button-record"
            >
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">Record Now</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
