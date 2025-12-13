import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import SimpleHeader from "@/components/SimpleHeader";
import { MessageCircle } from "lucide-react";

export default function ThankYou() {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  // setup another env when have time to test
  // const businessPhone = import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER_E164;
  const businessPhone = +918700242804;
  const [trialId, setTrialId] = useState<string | null>(null);
  let trialId1 = null;
  useEffect(() => {
    // Extract trialId from URL query parameters
    const params = new URLSearchParams(window.location.search);
    console.log(params);

    const id = params.get("trialId");
    setTrialId(id);
  }, [location]);

  console.log(trialId, businessPhone);

  const handleWhatsAppClick = () => {
    if (!businessPhone || !trialId) return;

    const prefilledMessage = `Hi Vaani, I have placed an order by_${trialId} but didn't get any confirmation yet. Can you please help?`;
    const whatsappLink = `https://wa.me/${businessPhone}?text=${encodeURIComponent(prefilledMessage)}`;
    window.open(whatsappLink, "_blank");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-['Outfit']">
      <SimpleHeader />
      {/* Spacer to account for fixed header height */}
      <div className="h-16 md:h-20" />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Thank You Message */}
          <div className="space-y-6">
            <h1 className="text-3xl sm:text-5xl font-bold text-[#1B2632]">
              Your order is confirmed.
            </h1>

            <div className="space-y-6 text-lg sm:text-lg text-[#1B2632]/80 leading-relaxed max-w-xl mx-auto">
              <p>
                I am Vaani — and from today, I hold your family's stories close.
                In the days ahead, your loved one will speak and their memories
                will find a home that lasts beyond all of us.
              </p>

              <p>Thank you for choosing Kahani. It means more than you know.</p>

              <p className="font-medium text-[#A35139]">
                I shall reach out to you on Whatsapp shortly!
              </p>
            </div>
          </div>
          {/* WhatsApp Support Button */}
          {trialId && businessPhone && (
            <div className="flex flex-col items-center">
              <p className="text-sm text-[#1B2632]/70">
                Didn't receive my message on WhatsApp?
              </p>
              <Button
                size="lg"
                onClick={handleWhatsAppClick}
                className="w-auto px-8 text-lg h-14 bg-[#A35139] text-white rounded-2xl shadow-xl border border-[#A35139] hover:bg-[#A35139]/90 transition-all duration-300 flex items-center gap-2"
                data-testid="button-whatsapp-support"
              >
                <MessageCircle className="h-5 w-5" />
                Contact me on WhatsApp
              </Button>
            </div>
          )}
          <div className="flex justify-center">
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
