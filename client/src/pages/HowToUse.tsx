import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import kahaniLogo from "@assets/Kahani Dummy Logo (1)_1762679074954.png";
import { Footer } from "@/components/Footer";

export default function HowToUse() {
  const [, setLocation] = useLocation();

  const steps = [
    {
      number: 1,
      title: "Share Your Details",
      description:
        "Start by entering your name and phone number on our website. This lets us reach out to guide you through the process.",
    },
    {
      number: 2,
      title: "Receive a WhatsApp Message",
      description:
        "We'll send you a welcome message on WhatsApp explaining how everything works. In this message, we'll also ask you for the name of the relative whose stories you want to capture.",
    },
    {
      number: 3,
      title: "Recording Stories Made Easy",
      description:
        "Once we know who will share their memories, we'll start sending them questions at regular intervals on WhatsApp. Each question is simple and story-focused — your relative can just speak their answer aloud. No typing, no pressure.",
    },
    {
      number: 4,
      title: "Stories Come to Life",
      description:
        "Your relative's recorded answers are automatically collected, forming a beautiful narrative of memories, lessons, and family moments.",
    },
    {
      number: 5,
      title: "Your Album is Ready",
      description:
        "Once all the questions are answered, we create a personalized Kahani Album. It's a treasure of voices, stories, and laughter — perfectly preserved.",
    },
    {
      number: 6,
      title: "Relish and Share",
      description:
        "Enjoy listening to the album with your loved ones. Laugh together, feel nostalgic, and celebrate the unique story of your family. Your Kahani is now eternal.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-[#EEE9DF] border-b border-[#C9C1B1]/30">
        <div className="flex items-center justify-between px-4 py-3 md:px-12 md:py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/company-legal")}
            className="min-h-[40px] min-w-[40px] h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white/90 border border-[#C9C1B1]/20"
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
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl py-8 md:py-16">
        {/* Hero Section */}
        <div className="text-center mb-10 md:mb-16">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 md:mb-6 leading-tight text-foreground">
            How to Use Your Kahani Album
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Preserving memories has never been easier. Follow these simple steps
            to create your family's eternal story.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-8 md:space-y-12">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="flex gap-4 md:gap-6 items-start"
              data-testid={`step-${step.number}`}
            >
              {/* Step Number */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-lg md:text-2xl font-bold text-primary-foreground">
                    {step.number}
                  </span>
                </div>
              </div>

              {/* Step Content */}
              <div className="flex-1 pt-1 md:pt-2">
                <h2 className="text-xl md:text-2xl font-semibold mb-2 md:mb-3 text-foreground">
                  Step {step.number}: {step.title}
                </h2>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-12 md:mt-20 text-center space-y-6">
          <div className="w-full h-px bg-border" />
          <h3 className="text-xl md:text-2xl font-semibold text-foreground">
            Ready to Begin?
          </h3>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Start your free trial today and experience the joy of preserving
            precious memories.
          </p>
          <Button
            size="lg"
            onClick={() => setLocation("/free-trial-checkout")}
            className="w-full sm:w-auto px-8 py-6 text-lg font-semibold min-h-[56px]"
            data-testid="button-start-trial"
          >
            Start Your Free Trial
          </Button>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
