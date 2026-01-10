import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ScrollToTop from "@/components/ScrollToTop";
import SimpleHeader from "@/components/SimpleHeader";
import HeroSection from "@/components/HeroSection";
import { BottomHomeNavbar } from "@/components/BottomHomeNavbar";
import ValueProposition from "@/components/ValueProposition";
import HowItWorksSection from "@/components/HowItWorksSection";
import GetStartedSection from "@/components/GetStartedSection";
import SectionThreeTestimonials from "@/components/SectionThreeTestimonials";
import SectionFourAlbumsNew from "@/components/SectionFourAlbumsNew";
import SectionFiveFAQs from "@/components/SectionFiveFAQs";
import { Footer } from "@/components/Footer";
import Checkout from "@/pages/Checkout";
import FreeTrial from "@/pages/FreeTrial";
import HowToUse from "@/pages/HowToUse";
import ThankYou from "@/pages/ThankYou";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import DataDeletion from "@/pages/DataDeletion";
import Affiliate from "@/pages/Affiliate";
import AboutUs from "@/pages/AboutUs";
import ContactUs from "@/pages/ContactUs";
import FAQs from "@/pages/FAQs";
import CompanyLegal from "@/pages/CompanyLegal";
import Blogs from "@/pages/Blogs";
import AlbumsGallery from "@/pages/AlbumsGallery";
import PlaylistAlbumsGallery from "@/pages/PlaylistAlbumsGallery";
import VinylGallery from "@/pages/VinylGallery";
import AllAlbums from "@/pages/AllAlbums";
import CreateAlbum from "@/pages/CreateAlbum";
import CustomAlbumCover from "@/pages/CustomAlbumCover";
import YlPersonalSupport from "@/pages/YlPersonalSupport";
import Admin from "@/pages/Admin";
import ManageAlbums from "@/pages/ManageAlbums";
import SampleAlbum from "@/pages/SampleAlbum";
import NotFound from "@/pages/not-found";
import { trackPageView } from "@/lib/analytics";
import { apiRequest } from "./lib/queryClient";

function HomePage() {
  const [, setLocation] = useLocation();
  const [isPlayerActive, setIsPlayerActive] = useState(false);

  // Track traffic source from URL parameter (e.g., ?source=qr)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get("source");

    if (source) {
      // Check if we've already tracked this source in this session
      const storageKey = `tracked_source_${source}`;
      const alreadyTracked = sessionStorage.getItem(storageKey);

      if (!alreadyTracked) {
        // Track the source
        apiRequest("POST", "/api/tracking/source", { source })
          .then(async (response) => {
            const data = await response.json();
            if (import.meta.env.DEV) {
              console.log("[QR Tracking] Successfully tracked:", data);
            }
            // Mark as tracked in sessionStorage
            sessionStorage.setItem(storageKey, "true");
          })
          .catch((error) => {
            // Log error for debugging
            console.error("[QR Tracking] Failed to track traffic source:", error);
          });

        // Clean URL by removing the source parameter
        urlParams.delete("source");
        const newSearch = urlParams.toString();
        const newUrl =
          window.location.pathname + (newSearch ? `?${newSearch}` : "");
        window.history.replaceState({}, "", newUrl);
      } else {
        // Already tracked, just clean the URL
        urlParams.delete("source");
        const newSearch = urlParams.toString();
        const newUrl =
          window.location.pathname + (newSearch ? `?${newSearch}` : "");
        window.history.replaceState({}, "", newUrl);
      }
    }
  }, []); // Run only once on mount

  const handleHearKahaniClick = () => {
    setIsPlayerActive(true);
  };

  const handlePlayerInactive = () => {
    setIsPlayerActive(false);
  };

  const handleRecordClick = () => {
    setLocation("/all-albums");
  };

  const handleLearnMore = () => {
    setLocation("/how-to-use");
  };

  return (
    <div className="w-full min-h-screen bg-[#EEE9DF]">
      {/* Simple Header - Fixed at top (Restored) */}
      <SimpleHeader onRecordClick={handleRecordClick} />

      {/* Bottom Home Navbar - Fixed at bottom */}
      <BottomHomeNavbar
        isActive={isPlayerActive}
        onInactive={handlePlayerInactive}
      />

      {/* Spacer to prevent content from being hidden behind fixed bottom bar */}
      {/* <div className="h-20" /> */}

      {/* Hero Section - Full Screen with Button */}
      <HeroSection onHearKahaniClick={handleHearKahaniClick} />

      {/* Value Proposition with Logo */}
      <ValueProposition />

      {/* Section 3 - Testimonials */}
      <SectionThreeTestimonials onLearnMore={handleLearnMore} />

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Get Started Section */}
      <GetStartedSection />

      {/* Section 4 - Albums (Moved above Testimonials) */}
      <SectionFourAlbumsNew />

      {/* Section 5 - FAQs */}
      <SectionFiveFAQs />

      {/* Footer */}
      <Footer />
    </div>
  );
}

function App() {
  const [location] = useLocation();

  // Track page views on route changes
  useEffect(() => {
    trackPageView(location, document.title);
  }, [location]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ScrollToTop />
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/checkout" component={Checkout} />
          {/* FreeTrialCheckout route removed */}
          <Route path="/free-trial" component={FreeTrial} />
          <Route path="/how-to-use" component={HowToUse} />
          <Route path="/thank-you" component={ThankYou} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/terms-of-service" component={TermsOfService} />
          <Route path="/data-deletion" component={DataDeletion} />
          <Route path="/about-us" component={AboutUs} />
          <Route path="/affiliate" component={Affiliate} />
          <Route path="/contact-us" component={ContactUs} />
          <Route path="/faqs" component={FAQs} />
          <Route path="/blogs" component={Blogs} />
          <Route path="/vinyl-albums/:trialId" component={AlbumsGallery} />
          <Route
            path="/playlist-albums/:trialId"
            component={PlaylistAlbumsGallery}
          />
          <Route path="/all-albums" component={AllAlbums} />
          <Route path="/sample-album" component={SampleAlbum} />
          <Route path="/create-album" component={CreateAlbum} />
          <Route path="/vinyl-gallery/:trialId?" component={VinylGallery} />
          <Route
            path="/custom-album-cover/:trialId"
            component={CustomAlbumCover}
          />
          <Route path="/yl-personal-support" component={YlPersonalSupport} />
          <Route path="/company-legal" component={CompanyLegal} />
          <Route path="/enzo-xyz" component={Admin} />
          <Route path="/enzo-xyz/albums" component={ManageAlbums} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
