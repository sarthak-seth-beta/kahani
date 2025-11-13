import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function AboutUsSection() {
  const [, setLocation] = useLocation();

  return (
    <section className="w-full bg-white px-4 sm:px-6 py-16 sm:py-20">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Section Title */}
        <h2
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1B2632] font-['Outfit']"
          data-testid="text-about-us-headline"
        >
          About Us
        </h2>

        {/* Content */}
        <div className="space-y-6 text-lg sm:text-xl text-[#1B2632]/70 leading-relaxed text-left max-w-3xl mx-auto">
          <p>
            Kahani is a storytelling platform by Sprism Culture Labs Pvt. Ltd.,
            designed to document and preserve the lived experiences of our
            elders. With curated themes and empathetic questions, Kahani enables
            meaningful reflection and conversation, helping families capture
            memories that might otherwise be lost.
          </p>

          <p>
            Built with cultural sensitivity and a deep respect for personal
            history, Kahani strengthens bonds, celebrates life journeys, and
            creates a lasting archive of wisdom for future generations.
          </p>
        </div>

        {/* Link to Full About Us Page */}
        <div className="pt-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/about-us")}
            className="px-6 py-3 text-base font-semibold border-[#1B2632] text-[#1B2632] hover:bg-[#1B2632] hover:text-[#EEE9DF] transition-colors"
            data-testid="button-learn-more-about-us"
          >
            Learn More
          </Button>
        </div>
      </div>
    </section>
  );
}
