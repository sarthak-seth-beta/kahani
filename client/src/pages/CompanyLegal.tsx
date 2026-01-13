import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Footer } from "@/components/Footer";

const legalLinks = [
  { href: "/privacy-policy", label: "Privacy policy" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
  { href: "/data-deletion", label: "Data Deletion" },
];

export default function CompanyLegal() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background relative flex flex-col">
      {/* Header - Back Button */}
      <header className="absolute top-0 left-0 right-0 z-40 w-full px-4 py-3 md:px-6 md:py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/")}
          className="min-h-[40px] min-w-[40px] h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white/90 border border-[#C9C1B1]/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-24 sm:px-6">
        <div className="w-full max-w-2xl space-y-12">
          {/* Legal Section */}
          <section className="space-y-6">
            <h1 className="text-3xl font-bold text-[#1B2632] font-['Outfit'] border-b border-[#1B2632]/10 pb-4 text-center">
              Legal
            </h1>
            <div className="grid gap-4">
              {legalLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <div className="group flex items-center justify-between p-4 rounded-xl bg-white border border-[#1B2632]/5 hover:border-[#1B2632]/20 hover:shadow-md transition-all cursor-pointer">
                    <span className="text-lg font-medium text-[#1B2632] group-hover:text-[#A35139] transition-colors">
                      {link.label}
                    </span>
                    <ArrowRight className="w-5 h-5 text-[#1B2632]/30 group-hover:text-[#A35139] group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
