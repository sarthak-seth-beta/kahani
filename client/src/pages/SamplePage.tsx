import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import PdfViewerSection from "@/components/PdfViewerSection";
import { ArrowLeft } from "lucide-react";
import { trackPageView } from "@/lib/analytics";
import AlbumGallery from "@/components/playlist/AlbumGallery";

export default function SamplePage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"read" | "listen">("read");

  useEffect(() => {
    trackPageView("/sample", "Sample Page");
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  const YAJUR_NANI_TRIAL_ID = "f6258c48-043e-4b23-883b-dfb4ace3b43c";

  return (
    <div className="bg-[#EEE9DF] w-full flex flex-col items-center p-3 xs:p-4 md:p-0 min-h-screen">
      {/* Header for Back Nav and Tabs */}
      <div className="w-full flex flex-col items-center justify-center pt-3 pb-2 xs:pt-4 xs:pb-3 sm:pt-4 sm:pb-4 sticky top-0 z-50 bg-[#EEE9DF]/90 backdrop-blur-sm">
        <div className="w-full max-w-4xl flex items-center justify-center px-3 xs:px-4 sm:px-4 mb-2 xs:mb-3 sm:mb-4 relative">
          <button
            onClick={() => setLocation("/")}
            className="w-9 h-9 xs:w-10 xs:h-10 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center hover:bg-white/80 transition-all shadow-sm absolute left-2 xs:left-4"
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-4 h-4 xs:w-5 xs:h-5 text-[#1B2632]" />
          </button>

          {/* Tabs - compact on mobile, center-aligned */}
          <div className="flex bg-white/50 rounded-full p-0.5 xs:p-1 sm:p-1 shadow-sm backdrop-blur-sm z-10">
            <button
              onClick={() => setActiveTab("read")}
              className={`px-3 py-1.5 xs:px-4 xs:py-2 sm:px-6 sm:py-2 rounded-full text-xs xs:text-sm font-semibold transition-all duration-300 ${
                activeTab === "read"
                  ? "bg-[#1B2632] text-white shadow-md"
                  : "text-[#1B2632]/70 hover:bg-white/50"
              }`}
            >
              Read
            </button>
            <button
              onClick={() => setActiveTab("listen")}
              className={`px-3 py-1.5 xs:px-4 xs:py-2 sm:px-6 sm:py-2 rounded-full text-xs xs:text-sm font-semibold transition-all duration-300 ${
                activeTab === "listen"
                  ? "bg-[#1B2632] text-white shadow-md"
                  : "text-[#1B2632]/70 hover:bg-white/50"
              }`}
            >
              Listen
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`w-full max-w-7xl flex flex-col items-center justify-center flex-1 ${
          activeTab === "listen"
            ? "min-h-[calc(100dvh-8rem)] overflow-hidden"
            : "mb-8"
        }`}
      >
        {activeTab === "read" ? (
          <div
            key="read"
            className="w-full animate-in slide-in-from-left duration-500 ease-in-out flex flex-col items-center"
          >
            {/* Copy 1 - heading above PDF */}
            <h2 className="text-center font-['Outfit'] font-semibold text-[#1B2632] text-sm xs:text-base sm:text-lg px-3 xs:px-4 mb-2 xs:mb-3 max-w-md mx-auto leading-snug">
              A real book made from your loved one's stories.
            </h2>
            <PdfViewerSection />
            {/* Copy 2 - subheading below PDF */}
            <p className="text-center font-['Outfit'] text-[#1B2632]/80 text-xs xs:text-sm sm:text-base px-3 xs:px-4 mt-2 xs:mt-3 max-w-md mx-auto leading-snug">
              Voice notes become clear chapters your family can read forever.
            </p>
          </div>
        ) : (
          <div
            key="listen"
            className="w-full animate-in slide-in-from-right duration-500 ease-in-out flex flex-col items-center justify-center px-0"
          >
            {/* Copy 1 - heading above listen content */}
            <h2 className="text-center font-['Outfit'] font-semibold text-[#1B2632] text-sm xs:text-base sm:text-lg px-2 xs:px-1 mb-2 xs:mb-3 max-w-md mx-auto leading-snug w-full">
              Hear the stories in their own voice.
            </h2>
            {/* Phone frame: minimal side gap, center-aligned; xs/sm use most of width */}
            <div className="w-full max-w-[calc(100%-1.5rem)] xs:max-w-[calc(100%-2rem)] sm:max-w-md mx-auto h-[calc(100dvh-8rem)] max-h-[calc(100dvh-8rem)] md:aspect-[9/16] md:flex-none md:max-h-[calc(100vh-8rem)] md:h-auto bg-[#FDF4DC] rounded-[32px] overflow-hidden border-8 border-white relative flex flex-col shrink-0">
              {/* Status Bar Imitation */}
              <div className="w-full h-8 shrink-0 bg-black flex items-center justify-between px-6 z-20">
                <div className="text-[10px] text-white font-medium">9:41</div>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 bg-white rounded-full opacity-20"></div>
                  <div className="w-3 h-3 bg-white rounded-full opacity-20"></div>
                  <div className="w-4 h-3 bg-white rounded-[2px] opacity-20"></div>
                </div>
              </div>

              {/* Interactive Window Content - fixed height so AlbumGallery is stable */}
              <div className="w-full flex-1 min-h-0 h-full bg-[#FDF4DC] flex flex-col overflow-hidden">
                <AlbumGallery trialId={YAJUR_NANI_TRIAL_ID} isEmbedded={true} />
              </div>

              {/* Home Indicator */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-black/20 rounded-full z-50 pointer-events-none"></div>
            </div>
            {/* Copy 2 - subheading below listen content */}
            <p className="text-center font-['Outfit'] text-[#1B2632]/80 text-xs xs:text-sm sm:text-base px-3 xs:px-4 mt-2 xs:mt-3 max-w-md mx-auto leading-snug">
              Their tone, pauses, and laughter stay exactly as they are.
            </p>
          </div>
        )}
      </div>

      {/* What you get - next section, mobile-first */}
      <section className="w-full px-3 xs:px-4 sm:px-6 py-6 xs:py-8 sm:py-10 bg-[#EEE9DF]">
        <h2 className="font-['Outfit'] font-semibold text-[#1B2632] text-lg xs:text-xl sm:text-2xl text-center mb-4 xs:mb-5 sm:mb-6">
          What you get
        </h2>
        <ul className="list-none max-w-md mx-auto space-y-2.5 xs:space-y-3 sm:space-y-3.5 text-[#1B2632]/90 text-xs xs:text-sm sm:text-base font-['Outfit']">
          <li className="flex gap-2.5 xs:gap-3 items-start">
            <span className="text-[#A35139] mt-0.5 shrink-0" aria-hidden>
              •
            </span>
            <span>A finished family book you can keep and gift</span>
          </li>
          <li className="flex gap-2.5 xs:gap-3 items-start">
            <span className="text-[#A35139] mt-0.5 shrink-0" aria-hidden>
              •
            </span>
            <span>A private listening album in their original voice</span>
          </li>
          <li className="flex gap-2.5 xs:gap-3 items-start">
            <span className="text-[#A35139] mt-0.5 shrink-0" aria-hidden>
              •
            </span>
            <span>Chapter-wise stories that are easy to revisit</span>
          </li>
          <li className="flex gap-2.5 xs:gap-3 items-start">
            <span className="text-[#A35139] mt-0.5 shrink-0" aria-hidden>
              •
            </span>
            <span>Guided WhatsApp prompts that make recording simple</span>
          </li>
          <li className="flex gap-2.5 xs:gap-3 items-start">
            <span className="text-[#A35139] mt-0.5 shrink-0" aria-hidden>
              •
            </span>
            <span>Human support from start to final book</span>
          </li>
          <li className="flex gap-2.5 xs:gap-3 items-start">
            <span className="text-[#A35139] mt-0.5 shrink-0" aria-hidden>
              •
            </span>
            <span>Long-term access for your family</span>
          </li>
          <li className="flex gap-2.5 xs:gap-3 items-start">
            <span className="text-[#A35139] mt-0.5 shrink-0" aria-hidden>
              •
            </span>
            <span>The freedom to pause and continue anytime</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
