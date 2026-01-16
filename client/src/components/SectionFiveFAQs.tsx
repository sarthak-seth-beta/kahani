import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

interface FAQItem {
  question: string;
  answer: string;
}

interface SectionFiveFAQsProps {
  faqs?: FAQItem[];
}

const defaultFAQs: FAQItem[] = [
  {
    question: "Why can I not just record them myself?",
    answer:
      "You can. Most people do not finish it. Life gets busy, it feels awkward, and the recordings stay scattered. Kahani makes it easy: we guide them on WhatsApp and turn it into one clean book.",
  },
  {
    question: "So, what exactly is Kahani?",
    answer:
      "Kahani helps you turn your loved one’s WhatsApp voice notes into a book you can keep and come back to.",
  },
  {
    question: "What do I receive at the end?",
    answer:
      "A private link with their recorded stories. Based on what you choose, you can also get an e-book and a printed book.",
  },
  {
    question: "Who records the stories? Me or them?",
    answer:
      "They do. You only share the WhatsApp invite. Once they start, we guide them.",
  },
  {
    question: "Will they understand how to use this?",
    answer:
      "They are not tech-savvy. If they can send a WhatsApp voice note, they can do this. No app, no login—just tap mic and speak.",
  },
  {
    question: "What language can they speak in?",
    answer:
      "Whatever you select at checkout (for now: Hindi / English / Hinglish in Devanagari).",
  },
  {
    question: "Is it private?",
    answer:
      "Yes. We do not message your loved one first. They choose to start by clicking your invite link. The final album/book link is private and shareable.",
  },
  {
    question: "What if they stop halfway or skip days?",
    answer:
      "That is okay. You can pause and resume. This is meant to feel like a conversation, not a deadline.",
  },
  {
    question: "Will this be too emotional or heavy?",
    answer:
      "Only if they want it to be. It can be light, funny, nostalgic—everyday stories also make the best books.",
  },
  {
    question: "Why should I pay for this?",
    answer:
      "Because this is not just a recording. It is their voice, their stories, shaped into something you can keep—so you can hear them again years later.",
  },
];

export default function SectionFiveFAQs({
  faqs = defaultFAQs,
}: SectionFiveFAQsProps) {
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
    <section id="faqs" className="w-full bg-white px-4 sm:px-6 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto space-y-8 sm:space-y-10">
        {/* FAQs Heading */}
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-[#1B2632] text-center font-['Outfit']">
          Frequently Asked Questions
        </h2>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-[#EEE9DF]/50 rounded-2xl overflow-hidden shadow-sm"
              data-testid={`faq-${index + 1}`}
            >
              {/* Question Header */}
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover-elevate active-elevate-2 gap-4"
                aria-expanded={openIndex === index}
                data-testid={`faq-question-${index + 1}`}
              >
                <span className="text-sm sm:text-base md:text-lg font-semibold text-[#1B2632] flex-1">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`flex-shrink-0 w-5 h-5 text-[#A35139] transition-transform duration-300 ${openIndex === index ? "rotate-180" : ""
                    }`}
                />
              </button>

              {/* Answer Body */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index
                  ? "max-h-96 opacity-100"
                  : "max-h-0 opacity-0"
                  }`}
              >
                {openIndex === index && (
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">
                    <p
                      className="text-[#1B2632]/70 leading-relaxed text-sm sm:text-base"
                      data-testid={`faq-answer-${index + 1}`}
                    >
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
