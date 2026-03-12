import { CheckCircle2, MessageCircle } from "lucide-react";

const BUSINESS_WHATSAPP_E164 = "918700242804";

export default function OrderConfirmed() {
  const whatsappUrl = `https://wa.me/${BUSINESS_WHATSAPP_E164}?text=${encodeURIComponent(
    "Hi Vaani, I just placed a Kahani book order and had a quick question.",
  )}`;

  return (
    <div className="min-h-screen bg-[#EEE9DF] flex flex-col items-center justify-center px-6 font-['Outfit']">
      <div className="max-w-sm w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <CheckCircle2
            className="h-20 w-20 text-[#A35139]"
            strokeWidth={1.5}
          />
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1B2632] tracking-tight">
            Thank you!
          </h1>
          <p className="text-base text-[#4B5563] leading-relaxed">
            We've received your details and will get your book ready soon.
          </p>
        </div>

        {/* Support via WhatsApp */}
        <div className="rounded-2xl bg-white/70 border border-[#D4C9BB] px-6 py-5 space-y-2">
          <p className="text-xs text-[#6B7280] uppercase tracking-widest font-medium">
            Need help?
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-[#25D366] text-white text-sm font-semibold shadow-md hover:bg-[#1EBE58] transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Chat with us on WhatsApp
          </a>
          <p className="text-xs text-[#9CA3AF]">
            Tap to open WhatsApp and message our team.
          </p>
        </div>
      </div>
    </div>
  );
}
