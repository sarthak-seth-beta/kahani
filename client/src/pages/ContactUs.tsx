import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart, Mail, Check } from "lucide-react";
import { useState } from "react";
import { SiInstagram, SiWhatsapp } from "react-icons/si";
import kahaniLogo from "@assets/Kahani Dummy Logo (1)_1762679074954.png";
import { Footer } from "@/components/Footer";

export default function ContactUs() {
  const [, setLocation] = useLocation();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const email = "vaani@kahani.xyz";
  const whatsappNumber = "+91 85108 89286"; // Update with actual WhatsApp number
  const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\s/g, "").replace(/\+/g, "")}`;
  const instagramUrl = "https://www.instagram.com/kahani.xyz?igsh=b3oyNXJwZ3g5bHR2";

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch (err) {
      console.error("Failed to copy email:", err);
    }
  };

  const handleCopyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(whatsappNumber);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch (err) {
      console.error("Failed to copy WhatsApp number:", err);
    }
  };

  return (
    <div className="h-screen bg-background overflow-y-auto relative">
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

      {/* Main Content - Centered in viewport */}
      <div className="h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="container max-w-3xl w-full text-center space-y-6 sm:space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <img
              src={kahaniLogo}
              alt="Kahani Logo"
              className="h-20 sm:h-24 w-auto object-contain"
            />
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
            CONTACT US
          </h1>

          {/* Content */}
          <div className="space-y-4 sm:space-y-6 text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground flex items-center justify-center gap-2">
              We'd love to hear from you!{" "}
              <Heart className="h-5 w-5 text-[#FFB162] fill-[#FFB162]" />
            </p>

            <p>
              Whether you have questions, ideas, or just want to share a
              story, feel free to reach out to us:
            </p>

            {/* Simple Contact List */}
            <div className="flex flex-col items-start gap-4 sm:gap-5 mt-6 sm:mt-8 w-full max-w-md mx-auto">
              {/* Email */}
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-4 cursor-pointer group w-full"
                onClick={handleCopyEmail}
                data-testid="contact-email"
              >
                <div className="w-12 h-12 rounded-full border border-[#C9C1B1]/40 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-[#1B2632]" />
                </div>
                <span className="text-base sm:text-lg text-[#1B2632] group-hover:text-[#A35139] transition-colors">
                  {email}
                </span>
                {copiedEmail && (
                  <span className="text-xs text-[#A35139] flex items-center gap-1 ml-auto">
                    <Check className="h-3 w-3" />
                    Copied
                  </span>
                )}
              </a>

              {/* WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 cursor-pointer group w-full"
                onClick={handleCopyWhatsApp}
                data-testid="contact-whatsapp"
              >
                <div className="w-12 h-12 rounded-full border border-[#C9C1B1]/40 flex items-center justify-center flex-shrink-0">
                  <SiWhatsapp className="h-5 w-5 text-[#1B2632]" />
                </div>
                <span className="text-base sm:text-lg text-[#1B2632] group-hover:text-[#A35139] transition-colors">
                  {whatsappNumber}
                </span>
                {copiedPhone && (
                  <span className="text-xs text-[#A35139] flex items-center gap-1 ml-auto">
                    <Check className="h-3 w-3" />
                    Copied
                  </span>
                )}
              </a>

              {/* Instagram */}
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 group w-full"
                data-testid="contact-instagram"
              >
                <div className="w-12 h-12 rounded-full border border-[#C9C1B1]/40 flex items-center justify-center flex-shrink-0">
                  <SiInstagram className="h-5 w-5 text-[#1B2632]" />
                </div>
                <span className="text-base sm:text-lg text-[#1B2632] group-hover:text-[#A35139] transition-colors">
                  @kahani.xyz
                </span>
              </a>
            </div>

            <p className="text-foreground pt-2">
              Our team at Kahani is always happy to listen, help, and
              celebrate your stories with you.
            </p>
          </div>
        </div>
      </div>

      {/* Footer - Below viewport, appears on scroll */}
      <div className="relative">
        <Footer />
      </div>
    </div>
  );
}
