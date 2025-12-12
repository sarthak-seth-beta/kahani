import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import kahaniLogo from "@assets/Kahani Dummy Logo (1)_1762679074954.png";
import { Footer } from "@/components/Footer";

export default function AboutUs() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full bg-[#EEE9DF] border-b border-[#C9C1B1]/30">
          <div className="flex items-center justify-between px-6 py-4 md:px-12">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              className="min-h-[44px] min-w-[44px]"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <img
              src={kahaniLogo}
              alt="Kahani Logo"
              className="h-12 w-auto object-contain"
            />

            <div className="w-[44px]" />
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-16">
          <div className="text-center space-y-8">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <img
                src={kahaniLogo}
                alt="Kahani Logo"
                className="h-24 w-auto object-contain"
              />
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
              ABOUT US
            </h1>

            {/* Content */}
            <div className="space-y-6 text-lg sm:text-xl text-muted-foreground leading-relaxed text-left">
              <p>
                Kahani is a storytelling platform by Sprism Culture Labs Pvt.
                Ltd., designed to document and preserve the lived experiences of
                our elders. With curated themes and empathetic questions, Kahani
                enables meaningful reflection and conversation, helping families
                capture memories that might otherwise be lost.
              </p>

              <p>
                Built with cultural sensitivity and a deep respect for personal
                history, Kahani strengthens bonds, celebrates life journeys, and
                creates a lasting archive of wisdom for future generations.
              </p>
            </div>

            {/* Return Home Button */}
            <div className="pt-8">
              <Button
                size="lg"
                onClick={() => setLocation("/")}
                className="px-8 py-6 text-lg font-semibold min-h-[56px]"
                data-testid="button-home"
              >
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
