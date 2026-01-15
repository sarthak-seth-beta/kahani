import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronDown, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "Why can't I just record my parents myself?",
    answer:
      "You absolutely can… but you never will. Life gets busy, parents get shy, recordings stay unfinished. Kahani makes it effortless - we ask the right questions, at the right pace, and turn everything into a real album your family can keep forever.",
  },
  {
    question: "Will they understand how to use this? They're not tech-savvy.",
    answer:
      "If they can send a WhatsApp voice note, they can create a Kahani. No app. No login. No password. Just open, talk, done.",
  },
  {
    question: "What language can they speak in?",
    answer:
      "Any language they live in - Hindi, English, Tamil, Bengali, Kannada, Gujarati, Punjabi… everything works. Their natural voice is the point.",
  },
  {
    question: "So… what exactly is Kahani?",
    answer:
      "Kahani captures your loved ones' stories and voice through simple WhatsApp messages and turns them into a private audio album your whole family can listen to forever.",
  },
  {
    question: "What do I receive at the end?",
    answer:
      "A beautiful Spotify-style album with 5–20 short stories, custom cover, and a private link you can share with your entire family. No app needed - just press play.",
  },
  {
    question: "How does Kahani talk to my parents/grandparents?",
    answer:
      "Exactly like family. Warm WhatsApp questions, gentle pacing, no pressure. They tap the mic, speak in their own way, and we do everything else.",
  },
  {
    question: "Is everything private?",
    answer:
      "Completely. Your album has no public page, no search, no listing. Only people with your private link can hear it. You can delete everything anytime.",
  },
  {
    question: "What if they stop halfway or skip days?",
    answer:
      "We pause gently. Continue whenever they want. This is not a course - it's a conversation.",
  },
  {
    question: "Will this be too emotional or heavy for them?",
    answer:
      "Not unless they want it to be. Most Kahani albums are sweet, funny, nostalgic - the kind of stories that come out over chai, not therapy sessions.",
  },
  {
    question: "Why should I pay for this?",
    answer:
      "Because one day, these stories will be the only way to hear them again - their laugh, their pauses, their way of telling a moment. You are not buying an album. You are preserving a piece of your family.",
  },
];

export default function FAQs() {
  const [, setLocation] = useLocation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    const wasOpen = openIndex === index;
    const newIndex = wasOpen ? null : index;
    setOpenIndex(newIndex);

    if (wasOpen) {
      trackEvent(AnalyticsEvents.FAQ_COLLAPSED, {
        faq_index: index + 1,
        faq_question: faqs[index]?.question,
      });
    } else {
      trackEvent(AnalyticsEvents.FAQ_EXPANDED, {
        faq_index: index + 1,
        faq_question: faqs[index]?.question,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Header - Only back arrow */}
      <header className="absolute top-0 left-0 right-0 z-40 w-full">
        <div className="flex items-start px-4 py-3 md:px-6 md:py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="min-h-[40px] min-w-[40px] h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white/90 border border-[#C9C1B1]/20"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="container max-w-3xl mx-auto space-y-8">
          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1B2632] text-center font-['Outfit']">
            Frequently Asked Questions
          </h1>

          {/* FAQ Accordion */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-[#EEE9DF]/50 rounded-2xl overflow-hidden shadow-sm"
              >
                {/* Question Header */}
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover-elevate active-elevate-2 transition-all duration-200"
                  aria-expanded={openIndex === index}
                >
                  <span className="text-base sm:text-lg font-semibold text-[#1B2632] pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`flex-shrink-0 w-5 h-5 text-[#A35139] transition-transform duration-300 ${
                      openIndex === index ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Answer Body */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openIndex === index
                      ? "max-h-96 opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  {openIndex === index && (
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">
                      <p className="text-[#1B2632]/70 leading-relaxed text-sm sm:text-base">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-8">
            <Button
              variant="ghost"
              onClick={() => setLocation("/contact-us")}
              className="text-lg font-medium text-[#1B2632] hover:text-[#A35139] hover:bg-transparent transition-colors gap-2"
            >
              Still have questions?{" "}
              <span className="underline decoration-[#A35139] underline-offset-4">
                Get in touch
              </span>
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
