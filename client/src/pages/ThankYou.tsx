import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

import { MessageCircle, ArrowLeft } from "lucide-react";

export default function ThankYou() {
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  // setup another env when have time to test
  // const businessPhone = import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER_E164;
  const businessPhone = "918700242804"; // E.164 format without + for URL
  const [trialId, setTrialId] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState<string>(
    "Redirecting to WhatsApp...",
  );
  const [hasRedirected, setHasRedirected] = useState<boolean>(false);

  useEffect(() => {
    // Extract trialId from URL query parameters
    const params = new URLSearchParams(window.location.search);
    console.log(params);

    const id = params.get("trialId");
    setTrialId(id);
  }, [location]);

  const handleWhatsAppRedirect = useCallback(() => {
    if (!businessPhone || !trialId) return;

    const prefilledMessage = `Hi Vaani, I just placed an order on Kahani.xyz. My order ID is by_${trialId} `;
    const whatsappLink = `https://wa.me/${businessPhone}?text=${encodeURIComponent(prefilledMessage)}`;
    // Use window.location.href for better mobile compatibility
    // This will open WhatsApp app on mobile devices and WhatsApp Web on desktop
    window.location.href = whatsappLink;
  }, [businessPhone, trialId]);

  useEffect(() => {
    // Auto-redirect after 3 seconds if trialId and businessPhone are available
    if (trialId && businessPhone && !hasRedirected) {
      const timer = setTimeout(() => {
        setButtonText("Contact me on WhatsApp");
        handleWhatsAppRedirect();
        setHasRedirected(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [trialId, businessPhone, hasRedirected, handleWhatsAppRedirect]);

  const handleWhatsAppClick = () => {
    if (!businessPhone || !trialId) return;

    // If already redirected, just open again
    if (hasRedirected) {
      handleWhatsAppRedirect();
      return;
    }

    // Otherwise, redirect immediately
    setButtonText("Contact me on WhatsApp");
    setHasRedirected(true);
    handleWhatsAppRedirect();
  };

  return (
    <div className="min-h-screen bg-[#EEE9DF] flex flex-col font-['Outfit'] relative overflow-hidden">
      {/* Circular Back Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setLocation("/")}
        className="absolute top-4 left-4 z-50 min-h-[40px] min-w-[40px] h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white/90 border border-[#C9C1B1]/20 no-default-hover-elevate !absolute"
      >
        <ArrowLeft className="h-5 w-5 text-[#1B2632]" />
      </Button>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="max-w-xl w-full text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#1B2632] tracking-tight">
              Final Step!
            </h1>

            <p className="text-xl sm:text-2xl text-[#1B2632] font-medium leading-relaxed">
              To start Kahani, you need to message Vaani on WhatsApp.
            </p>
          </div>

          {trialId && businessPhone && (
            <div className="flex flex-col items-center gap-4 w-full">
              <p className="text-sm text-[#1B2632]/70 max-w-md mx-auto leading-relaxed">
                If you were not redirected, tap below. A message with your Order
                ID is ready — just press Send.
              </p>

              <Button
                size="lg"
                onClick={handleWhatsAppClick}
                className="w-full sm:w-auto px-8 py-4 text-lg h-auto bg-[#A35139] text-white rounded-xl shadow-lg border border-[#A35139] hover:bg-[#A35139]/90 transition-all duration-300 flex items-center justify-center gap-2"
                data-testid="button-whatsapp-support"
              >
                <MessageCircle className="h-5 w-5" />
                Open WhatsApp
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="p-6 text-center">
        <p className="text-xs sm:text-sm text-[#1B2632]/50 max-w-2xl mx-auto leading-relaxed">
          Note: We do not ask for any information of your storyteller. This is
          absolutely safe and secure. For more information, refer to our{" "}
          <a href="/faqs" className="underline hover:text-[#A35139]">
            FAQs
          </a>{" "}
          and{" "}
          <a href="/privacy-policy" className="underline hover:text-[#A35139]">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
