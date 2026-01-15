import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, Play, Globe, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FreeTrialForm } from "@/components/FreeTrialForm";
import type { Album } from "@shared/schema";

export default function FreeTrial() {
  const [, setLocation] = useLocation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [lang, setLang] = useState<"en" | "hn">("en");
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const albumIdFromUrl = urlParams.get("albumId") || "";
  const albumTitleFromUrl = urlParams.get("album") || ""; // Backward compatibility

  // Fetch albums to get full album data including questions
  const { data: albums } = useQuery<
    Array<{
      id: string;
      title: string;
      cover_image: string;
      description: string;
      questions: string[];
      questions_hn: string[];
      question_set_titles?: Album["questionSetTitles"];
    }>
  >({
    queryKey: ["/api/albums"],
  });

  // Determine selected album details
  // Determine selected album details
  const selectedAlbum = useMemo(() => {
    if (albumIdFromUrl && albums) {
      return albums.find((a) => a.id === albumIdFromUrl);
    }
    // Fallback: try to find by title from URL (backward compatibility)
    if (albumTitleFromUrl && albums) {
      return albums.find((a) => a.title === albumTitleFromUrl);
    }
    return null;
  }, [albumIdFromUrl, albumTitleFromUrl, albums]);

  // Determine current questions based on language
  const currentQuestions = useMemo(() => {
    if (!selectedAlbum) return [];
    if (lang === "hn" && selectedAlbum.questions_hn?.length > 0) {
      return selectedAlbum.questions_hn;
    }
    return selectedAlbum.questions;
  }, [selectedAlbum, lang]);

  // Helper to chunk questions into chapters
  const chapters = useMemo(() => {
    if (!currentQuestions) return [];
    const chunkSize = 3;
    const result = [];
    for (let i = 0; i < currentQuestions.length; i += chunkSize) {
      result.push(currentQuestions.slice(i, i + chunkSize));
    }
    return result;
  }, [currentQuestions]);

  if (!selectedAlbum) {
    return (
      <div className="min-h-screen bg-[#EEE9DF] flex items-center justify-center">
        <p>Loading album details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEE9DF] relative pb-24">
      {/* Container - Constrained but full width on mobile for image */}
      <div className="container mx-auto px-0 md:px-4 max-w-2xl md:pt-4">
        {/* 1. Cover Photo with Back Button Overlay */}
        <div className="relative w-full aspect-square md:aspect-video md:rounded-2xl overflow-hidden bg-gray-100 shadow-sm group">
          <img
            src={selectedAlbum.cover_image}
            alt={selectedAlbum.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 md:rounded-2xl" />

          {/* Circular Back Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="absolute top-4 left-4 z-50 min-h-[40px] min-w-[40px] h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white/90 border border-[#C9C1B1]/20 no-default-hover-elevate !absolute"
          >
            <ArrowLeft className="h-5 w-5 text-[#1B2632]" />
          </Button>
        </div>

        <div className="px-4 py-6 md:px-0 space-y-6">
          {/* Title Section */}
          <div>
            <div className="flex justify-between items-start gap-4 mb-2">
              <h1 className="text-2xl md:text-4xl font-bold text-[#1B2632] font-['Outfit'] leading-tight">
                {selectedAlbum.title}
              </h1>
            </div>
            <p className="text-[#1B2632]/70 text-sm md:text-base leading-relaxed">
              {selectedAlbum.description ||
                "Capture your family's precious memories with this guided audio album."}
            </p>
            <div className="flex items-center gap-4 mt-4 text-xs font-semibold text-[#1B2632]/60 uppercase tracking-wider">
              <span>{chapters.length} Chapters</span>
              <span>•</span>
              <span>{selectedAlbum.questions?.length || 0} Questions</span>
            </div>
          </div>

          {/* 3. Collapsible Chapter-wise Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#1B2632] font-['Outfit']">
                What you'll cover
              </h2>

              {selectedAlbum.questions_hn?.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() =>
                      setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
                    }
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-transparent border border-black/20 rounded-lg min-w-[100px] transition-all duration-200 hover:bg-black/5"
                  >
                    <Globe className="w-4 h-4 text-black" />
                    <span className="font-['Outfit'] text-sm text-black">
                      {lang === "hn" ? "हिंदी" : "English"}
                    </span>
                    <ChevronDown className="w-3 h-3 text-black/60 ml-1" />
                  </button>

                  {isLanguageDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsLanguageDropdownOpen(false)}
                      />
                      <div className="absolute top-full right-0 mt-2 bg-white border border-black/10 rounded-lg shadow-lg z-50 min-w-[140px] overflow-hidden">
                        <button
                          onClick={() => {
                            setLang("en");
                            setIsLanguageDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-3 text-left font-['Outfit'] text-sm flex items-center transition-colors ${
                            lang === "en"
                              ? "bg-[#A35139]/10 text-black"
                              : "text-black hover:bg-black/5"
                          }`}
                        >
                          English
                        </button>
                        <button
                          onClick={() => {
                            setLang("hn");
                            setIsLanguageDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-3 text-left font-['Outfit'] text-sm flex items-center border-t border-black/10 transition-colors ${
                            lang === "hn"
                              ? "bg-[#A35139]/10 text-black"
                              : "text-black hover:bg-black/5"
                          }`}
                        >
                          हिंदी
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <Accordion type="single" collapsible className="w-full space-y-3">
              {chapters.map((chapterQuestions, idx) => (
                <AccordionItem
                  key={idx}
                  value={`chapter-${idx}`}
                  className="bg-white rounded-xl border border-[#C9C1B1]/20 shadow-sm px-5 data-[state=open]:pb-2 overflow-hidden"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3 w-full text-left">
                      <div className="h-8 w-8 rounded-full bg-[#A35139]/10 flex items-center justify-center text-[#A35139] flex-shrink-0">
                        <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                      </div>
                      <div className="flex flex-col text-left">
                        {(() => {
                          // Strictly fetch from 'en' array as requested
                          const titles = selectedAlbum.question_set_titles;
                          const title =
                            titles?.[lang]?.[idx] ||
                            titles?.en?.[idx] ||
                            `Chapter ${idx + 1}`;

                          const toRoman = (num: number) => {
                            const map = {
                              M: 1000,
                              CM: 900,
                              D: 500,
                              CD: 400,
                              C: 100,
                              XC: 90,
                              L: 50,
                              XL: 40,
                              X: 10,
                              IX: 9,
                              V: 5,
                              IV: 4,
                              I: 1,
                            };
                            let result = "";
                            for (const key in map) {
                              const val = map[key as keyof typeof map];
                              while (num >= val) {
                                result += key;
                                num -= val;
                              }
                            }
                            return result;
                          };

                          return (
                            <span className="text-base font-bold text-[#1B2632] font-['Outfit'] leading-tight">
                              {toRoman(idx + 1)}. {title}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <ul className="space-y-3 pt-1">
                      {chapterQuestions.map((q, qIdx) => (
                        <li
                          key={qIdx}
                          className="flex items-start gap-3 text-[#1B2632]/80 text-sm leading-relaxed"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#1B2632]/30 flex-shrink-0" />
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* 5. Less Prominent Info (Included / How it works) */}
          <div className="pt-8 space-y-8 pb-8 border-t border-[#C9C1B1]/30">
            {/* What's Included */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-[#1B2632]/90">
                What's Included
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {[
                  "Private digital voice album (shareable link)",
                  "Listen anytime (replay forever)",
                  "Download anytime",
                  "WhatsApp prompts + support",
                  "No deadlines (record at your pace)",
                  "Gift plaque with QR (coming soon)",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#A35139]" />
                    <span className="text-sm text-[#1B2632]/70">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Our Ethos */}
            <div className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                {/* How It Works (Moved & Collapsible) */}
                <AccordionItem value="how-it-works" className="border-b">
                  <AccordionTrigger className="text-lg font-semibold text-[#1B2632]/90 hover:no-underline py-4">
                    How It Works
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-4">
                    <div className="space-y-4">
                      {[
                        {
                          step: 1,
                          title: "You message us on WhatsApp",
                          desc: "No app. Just WhatsApp.",
                        },
                        {
                          step: 2,
                          title: "Your loved one shares voice notes",
                          desc: "One story at a time",
                        },
                        {
                          step: 3,
                          title: "You get a private album link",
                          desc: "And you can track progress live",
                        },
                      ].map((item) => (
                        <div key={item.step} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1B2632]/5 flex items-center justify-center text-xs font-bold text-[#1B2632]">
                            {item.step}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#1B2632]">
                              {item.title}
                            </p>
                            <p className="text-xs text-[#1B2632]/60">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ethos" className="border-b-0">
                  <AccordionTrigger className="text-lg font-semibold text-[#1B2632]/90 hover:no-underline py-4">
                    Our Ethos
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-0">
                    <div className="space-y-2 text-sm text-[#1B2632]/70 leading-relaxed">
                      <p>We keep this safe and simple.</p>
                      <p>That is why I do not message your loved one first.</p>
                      <p>You share the link. They choose to start.</p>
                      <p className="font-medium text-[#A35139]">
                        Your stories stay private. Always.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Trust / Contact */}
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#1B2632]/50 pt-4">
              <span>1,000+ kahaniya recorded</span>
              <span>•</span>
              <a
                href="https://wa.me/"
                className="underline hover:text-[#A35139]"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar (Mobile/Desktop) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#C9C1B1]/30 z-50 flex items-center justify-between md:justify-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="md:w-full md:max-w-2xl flex items-center justify-between w-full gap-4">
          <div className="flex flex-col items-start">
            <span className="text-xs text-[#1B2632]/60 font-medium ml-1">
              Total
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#1B2632]/40 line-through">
                ₹499
              </span>
              <span className="text-xl font-bold text-[#A35139]">Free</span>
            </div>
          </div>

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="flex-none w-auto px-8 bg-[#A35139] hover:bg-[#8B4430] text-white rounded-xl shadow-lg text-lg font-semibold h-12 max-w-[200px]"
              >
                Place an Order
              </Button>
            </DialogTrigger>
            <DialogContent
              data-lenis-prevent
              className="max-w-md md:max-w-lg w-[90vw] sm:w-full max-h-[85vh] overflow-y-auto rounded-2xl p-6 bg-[#EEE9DF] [scrollbar-width:none] md:[scrollbar-width:auto] [-ms-overflow-style:none] md:[-ms-overflow-style:auto] [&::-webkit-scrollbar]:hidden md:[&::-webkit-scrollbar]:block md:[&::-webkit-scrollbar]:w-1.5 md:[&::-webkit-scrollbar-thumb]:bg-black/10 md:[&::-webkit-scrollbar-thumb]:rounded"
            >
              <FreeTrialForm
                albumId={selectedAlbum.id}
                albumTitle={selectedAlbum.title}
                onSuccess={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
