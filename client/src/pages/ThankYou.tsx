import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import SimpleHeader from "@/components/SimpleHeader";

export default function ThankYou() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col font-['Outfit']">
      <SimpleHeader />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl w-full text-center space-y-8">

          {/* Thank You Message */}
          <div className="space-y-6">
            <h1 className="text-3xl sm:text-5xl font-bold text-[#1B2632]">
              Your order is confirmed.
            </h1>

            <div className="space-y-6 text-lg sm:text-lg text-[#1B2632]/80 leading-relaxed max-w-xl mx-auto">
              <p>
                I am Vaani — and from today, I hold your family’s stories close.
                In the days ahead, your loved one will speak and their memories will find a home that lasts beyond all of us.
              </p>

              <p>
                Thank you for choosing Kahani. It means more than you know.
              </p>

              <p className="font-medium text-[#A35139]">
                I shall reach out to you on Whatsapp shortly!
              </p>
            </div>
          </div>

          {/* Return Home Button */}
          <div className="pt-4">
            <Button
              size="lg"
              onClick={() => setLocation("/")}
              className="w-auto px-10 text-lg h-14 bg-[#A35139] text-white rounded-2xl shadow-xl border border-[#A35139] hover:bg-[#A35139]/90 transition-all duration-300"
              data-testid="button-home"
            >
              Home
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
