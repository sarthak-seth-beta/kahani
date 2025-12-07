import { Link, useLocation } from "wouter";
import { SiFacebook, SiInstagram } from "react-icons/si";

export function Footer() {
  const [, setLocation] = useLocation();

  const scrollToSection = (id: string) => {
    // If not on home page, go to home page first
    if (window.location.pathname !== "/") {
      setLocation("/");
      // Short timeout to allow navigation to complete
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <footer className="w-full bg-[#1B2632] text-[#EEE9DF] py-8 px-6 md:px-12">
      <div className="max-w-6xl mx-auto">
        {/* Social Media Icons - Top Right */}
        <div className="flex justify-end mb-8">
          <div className="flex gap-4">
            <a
              href="https://www.instagram.com/kahani.xyz?igsh=b3oyNXJwZ3g5bHR2"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-[#EEE9DF]/10 hover:bg-[#FFB162]/20 flex items-center justify-center transition-colors"
              data-testid="link-instagram"
              aria-label="Instagram"
            >
              <SiInstagram className="w-5 h-5 text-[#EEE9DF]" />
            </a>
          </div>
        </div>

        {/* Footer Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-8">
          {/* Explore */}
          <div>
            <h3
              className="text-lg font-semibold mb-4"
              data-testid="heading-explore"
            >
              Explore
            </h3>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => scrollToSection("how-it-works")}
                  className="text-[#EEE9DF]/80 hover:text-[#FFB162] transition-colors cursor-pointer text-left"
                  data-testid="link-how-it-works"
                >
                  How it works
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection("why-kahani")}
                  className="text-[#EEE9DF]/80 hover:text-[#FFB162] transition-colors cursor-pointer text-left"
                  data-testid="link-why-kahani"
                >
                  Why Kahani
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection("albums")}
                  className="text-[#EEE9DF]/80 hover:text-[#FFB162] transition-colors cursor-pointer text-left"
                  data-testid="link-albums"
                >
                  Albums
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection("faqs")}
                  className="text-[#EEE9DF]/80 hover:text-[#FFB162] transition-colors cursor-pointer text-left"
                  data-testid="link-faqs"
                >
                  FAQs
                </button>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3
              className="text-lg font-semibold mb-4"
              data-testid="heading-company"
            >
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about-us">
                  <span className="text-[#EEE9DF]/80 hover:text-[#FFB162] transition-colors cursor-pointer">
                    About us
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/affiliate">
                  <span className="text-[#EEE9DF]/80 hover:text-[#FFB162] transition-colors cursor-pointer">
                    Affiliate
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/contact-us">
                  <span className="text-[#EEE9DF]/80 hover:text-[#FFB162] transition-colors cursor-pointer">
                    Contact us
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/blogs">
                  <span className="text-[#EEE9DF]/80 hover:text-[#FFB162] transition-colors cursor-pointer">
                    Blogs
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3
              className="text-lg font-semibold mb-4"
              data-testid="heading-legal"
            >
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy-policy">
                  <span className="text-[#EEE9DF]/80 hover:text-[#FFB162] transition-colors cursor-pointer">
                    Privacy policy
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service">
                  <span className="text-[#EEE9DF]/80 hover:text-[#FFB162] transition-colors cursor-pointer">
                    Terms of Service
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-[#EEE9DF]/20 text-center">
          <p className="text-[#EEE9DF]/60 text-sm">
            © 2025 Kahani. All rights reserved.
          </p>
          <p className="text-[#EEE9DF]/60 text-sm mt-2">
            by Sprism Culture Labs Pvt Ltd
          </p>
        </div>
      </div>
    </footer>
  );
}
