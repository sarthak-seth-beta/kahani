import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Loader2,
  Play,
  Sparkles,
  Globe,
  ChevronDown,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useGeneratedAlbum } from "@/stores/generatedAlbumStore";
import { useToast } from "@/hooks/use-toast";
import { apiFetchJson } from "@/lib/queryClient";
import { getOrCreateSessionId } from "@/lib/sessionId";

const STORAGE_KEY = "generatedAlbum";

const toRoman = (num: number) => {
  const map: Record<string, number> = {
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
    const val = map[key];
    while (num >= val) {
      result += key;
      num -= val;
    }
  }
  return result;
};

export default function GeneratedAlbum() {
  const [, setLocation] = useLocation();
  const { album, formData, setGeneratedAlbum } = useGeneratedAlbum();
  const { toast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [lang, setLang] = useState<"en" | "hn">("en");
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

  useEffect(() => {
    if (album && !formData) {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            formData?: Record<string, unknown>;
          };
          const fd = parsed?.formData;
          if (
            fd &&
            typeof fd.yourName === "string" &&
            fd.yourName.trim() &&
            typeof fd.phone === "string" &&
            fd.phone.trim() &&
            typeof fd.recipientName === "string" &&
            fd.recipientName.trim() &&
            typeof fd.occasion === "string" &&
            fd.occasion.trim()
          ) {
            setGeneratedAlbum(album, {
              yourName: fd.yourName,
              phone: fd.phone,
              recipientName: fd.recipientName,
              occasion: fd.occasion,
              instructions:
                typeof fd.instructions === "string"
                  ? fd.instructions
                  : undefined,
              title: typeof fd.title === "string" ? fd.title : undefined,
              email: typeof fd.email === "string" ? fd.email : undefined,
              language:
                typeof fd.language === "string" ? fd.language : undefined,
              questions: Array.isArray(fd.questions) ? fd.questions : undefined,
            });
          }
        }
      } catch {
        /* ignore */
      }
    }
  }, [album, formData, setGeneratedAlbum]);

  const currentQuestions = useMemo(() => {
    if (!album) return [];
    if (lang === "hn" && album.questionsHn?.length) return album.questionsHn;
    return album.questions;
  }, [album, lang]);

  const chapters = useMemo(() => {
    const chunkSize = 3;
    const out: string[][] = [];
    for (let i = 0; i < currentQuestions.length; i += chunkSize) {
      out.push(currentQuestions.slice(i, i + chunkSize));
    }
    return out;
  }, [currentQuestions]);

  const handleRegenerateAlbum = async () => {
    if (!formData) {
      toast({
        title: "Missing form data",
        description:
          "Please generate an album from the Create Album page first.",
        variant: "destructive",
      });
      return;
    }

    setIsRegenerating(true);
    try {
      const validQuestions = formData.questions?.filter(
        (q) => q.text.trim().length > 0,
      );
      const payload = {
        ...formData,
        title: formData.title || undefined,
        questions: validQuestions,
      };

      const isDevMode =
        new URLSearchParams(window.location.search).get("mode") === "enzo";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Session-Id": getOrCreateSessionId(),
      };
      if (isDevMode) headers["X-Dev-Mode"] = "enzo";

      const response = await fetch("/api/generate-album", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to generate album");
      }

      setGeneratedAlbum(result, formData);
      toast({
        title: "Album Regenerated!",
        description: "Your album has been regenerated with new content.",
      });
    } catch (error) {
      console.error("Regenerate album error:", error);
      toast({
        title: "Regeneration Failed",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRequestAlbum = async () => {
    if (!album || !formData) {
      toast({
        title: "Missing form data",
        description:
          "Please generate an album from the Create Album page first.",
        variant: "destructive",
      });
      return;
    }

    setIsRequesting(true);
    try {
      const payload = {
        album: {
          title: album.title,
          description: album.description,
          questions: album.questions,
          questionsHn: album.questionsHn,
          questionSetTitles: album.questionSetTitles,
          questionSetPremise: album.questionSetPremise,
        },
        formData: {
          yourName: formData.yourName,
          phone: formData.phone,
          recipientName: formData.recipientName,
          occasion: formData.occasion,
          instructions: formData.instructions ?? "",
          title: formData.title ?? "",
          email: formData.email ?? "",
          language: formData.language ?? "en",
          questions: formData.questions ?? [],
        },
      };

      const result = await apiFetchJson<{
        success?: boolean;
        albumId?: string;
      }>("/api/request-generated-album", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setGeneratedAlbum(null, null);

      const albumId = result?.albumId;

      // Validate albumId exists
      if (!albumId) {
        console.error("No albumId returned from API:", result);
        toast({
          title: "Album Creation Failed",
          description:
            "The album was created but we couldn't retrieve its ID. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(albumId)) {
        console.error("Invalid albumId format:", albumId);
        toast({
          title: "Invalid Album ID",
          description: "The album ID format is invalid. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log("Redirecting to free-trial with albumId:", albumId);
      window.location.href = `/free-trial?albumId=${encodeURIComponent(albumId)}`;
    } catch (error) {
      console.error("Request album error:", error);
      toast({
        title: "Submission Failed",
        description:
          error instanceof Error ? error.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsRequesting(false);
    }
  };

  if (!album) {
    return (
      <div className="min-h-screen bg-[#EEE9DF] flex flex-col items-center justify-center py-6 px-4">
        <div className="max-w-md text-center space-y-4">
          <p className="text-[#1B2632]/80 font-['Outfit']">
            No generated album found. Generate one from the Create Album page.
          </p>
          <Button
            onClick={() => setLocation("/create-album")}
            className="bg-[#A35139] hover:bg-[#8B4430] text-white"
          >
            Back to Create Album
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEE9DF] relative pb-20">
      <div className="container mx-auto px-4 max-w-2xl pt-4">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/create-album")}
            className="min-h-[40px] min-w-[40px] h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white/90 border border-[#C9C1B1]/20"
          >
            <ArrowLeft className="h-5 w-5 text-[#1B2632]" />
          </Button>
          <h1 className="text-lg md:text-xl font-bold text-[#1B2632] font-['Outfit']">
            Generated Album Preview
          </h1>
        </div>

        {/* Title Section */}
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1B2632] font-['Outfit'] leading-tight mb-2">
            {album.title}
          </h2>
          <p className="text-[#1B2632]/70 text-sm md:text-base leading-relaxed">
            {album.description}
          </p>
          <div className="flex items-center gap-4 mt-4 text-xs font-semibold text-[#1B2632]/60 uppercase tracking-wider">
            <span>{chapters.length} Chapters</span>
            <span>•</span>
            <span>{currentQuestions.length} Questions</span>
          </div>
        </div>

        {/* Inside This Book */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-[#1B2632] font-['Outfit']">
              Inside This Book
            </h3>
            {album.questionsHn?.length ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
                  }
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-transparent border border-[#1B2632]/20 rounded-lg min-w-[100px] transition-all duration-200 hover:bg-[#1B2632]/5"
                >
                  <Globe className="w-4 h-4 text-[#1B2632]" />
                  <span className="font-['Outfit'] text-sm text-[#1B2632]">
                    {lang === "hn" ? "हिंदी" : "English"}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#1B2632]/60 ml-1" />
                </button>
                {isLanguageDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      aria-hidden
                      onClick={() => setIsLanguageDropdownOpen(false)}
                    />
                    <div className="absolute top-full right-0 mt-2 bg-white border border-[#C9C1B1]/20 rounded-lg shadow-lg z-50 min-w-[140px] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setLang("en");
                          setIsLanguageDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left font-['Outfit'] text-sm flex items-center transition-colors ${
                          lang === "en"
                            ? "bg-[#A35139]/10 text-[#1B2632]"
                            : "text-[#1B2632] hover:bg-black/5"
                        }`}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLang("hn");
                          setIsLanguageDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left font-['Outfit'] text-sm flex items-center border-t border-[#C9C1B1]/20 transition-colors ${
                          lang === "hn"
                            ? "bg-[#A35139]/10 text-[#1B2632]"
                            : "text-[#1B2632] hover:bg-black/5"
                        }`}
                      >
                        हिंदी
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            {chapters.map((chapterQuestions, idx) => {
              const chapterTitle =
                album.questionSetTitles?.en?.[idx] || `Chapter ${idx + 1}`;
              return (
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
                      <span className="text-base font-bold text-[#1B2632] font-['Outfit'] leading-tight">
                        {toRoman(idx + 1)}. {chapterTitle}
                      </span>
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
              );
            })}
          </Accordion>
        </div>

        {/* CTA Buttons */}
        <div className="mt-8 space-y-3">
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleRequestAlbum}
              disabled={!formData || isRequesting || isRegenerating}
              className="flex-1 h-12 sm:h-14 text-base sm:text-lg bg-[#A35139] hover:bg-[#8B4430] text-white rounded-xl shadow-md transition-all duration-300"
            >
              {isRequesting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Continue
                </>
              )}
            </Button>
            <Button
              onClick={handleRegenerateAlbum}
              disabled={!formData || isRegenerating || isRequesting}
              variant="outline"
              className="flex-1 h-12 sm:h-14 text-base sm:text-lg border-[#A35139] text-[#A35139] hover:bg-[#A35139]/10 rounded-xl transition-all duration-300"
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-5 w-5" />
                  Regenerate Album
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
