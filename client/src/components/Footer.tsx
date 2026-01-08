import { Link, useLocation } from "wouter";
import { SiWhatsapp, SiInstagram } from "react-icons/si";

export function Footer() {
  const [, setLocation] = useLocation();

  return (
    <footer className="relative w-full bg-[#1B1B1B] text-[#EEE9DF] pt-8 pb-4 px-6 overflow-hidden flex flex-col items-center justify-center text-center">
      {/* 1. Circular Backdrop Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none opacity-20 blur-[100px]"
        style={{
          background:
            "radial-gradient(circle, #FFB162 0%, rgba(255, 177, 98, 0) 70%)",
        }}
      />

      {/* 2. Main Content Container (z-10 to be above glow) */}
      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center space-y-6">
        {/* Main Heading */}
        <h2 className="text-3xl md:text-6xl lg:text-7xl font-bold font-['Outfit'] leading-tight tracking-tight">
          Before they're <br />
          <span className="text-[#FFB162]">just memories</span>
        </h2>

        <p className="text-lg md:text-xl text-[#EEE9DF]/80 max-w-2xl font-light italic mt-4">
          "We ask the questions you have always wanted to ask - and life got
          busy."
        </p>

        {/* Record Button */}
        <button
          onClick={() => setLocation("/all-albums")}
          className="group relative px-8 py-4 bg-transparent border border-[#EEE9DF]/30 rounded-full text-lg font-medium hover:bg-[#EEE9DF] hover:text-[#1B1B1B] transition-all duration-300 overflow-hidden"
        >
          <span className="relative z-10">Record Now</span>
        </button>

        {/* Divider Line */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#EEE9DF]/20 to-transparent w-full max-w-2xl" />

        {/* middle section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-2">
          {/* Brand Tagline */}
          <div className="space-y-2">
            <p className="text-2xl font-serif text-[#FFB162]">Kahani</p>
            <span className="text-[#EEE9DF]/60 text-base font-sans font-normal">
              by families, for families
            </span>
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-6">
            <a
              href="https://wa.me/918510889286"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#EEE9DF] text-[#1B1B1B] hover:bg-[#FFB162] hover:text-white transition-all transform hover:scale-110"
            >
              <SiWhatsapp className="w-5 h-5" />
            </a>
            <a
              href="https://www.instagram.com/kahani.xyz?igsh=b3oyNXJwZ3g5bHR2"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[#EEE9DF] text-[#1B1B1B] hover:bg-[#FFB162] hover:text-white transition-all transform hover:scale-110"
            >
              <SiInstagram className="w-5 h-5" />
            </a>
          </div>

          {/* Bottom Links */}
          <div className="flex gap-8 text-sm text-[#EEE9DF]/60 mt-4">
            <Link href="/company-legal">
              <span className="hover:text-[#FFB162] transition-colors cursor-pointer">
                Privacy
              </span>
            </Link>
            <Link href="/about-us">
              <span className="hover:text-[#FFB162] transition-colors cursor-pointer">
                About Us
              </span>
            </Link>
            <Link href="/contact-us">
              <span className="hover:text-[#FFB162] transition-colors cursor-pointer">
                Contact Us
              </span>
            </Link>
          </div>
        </div>

        {/* Divider Line */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#EEE9DF]/20 to-transparent w-full max-w-2xl" />

        {/* Copyright */}
        <div className="space-y-1 text-xs text-[#EEE9DF]/40">
          <p>© 2025 Kahani. All rights reserved.</p>
          <p>by Sprism Culture Labs Pvt Ltd</p>
        </div>
      </div>
    </footer>
  );
}
