import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
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
import SectionThreeTestimonials from "@/components/SectionThreeTestimonials";
// import SectionFourAlbums from "@/components/SectionFourAlbums";
import SectionFourAlbumsNew from "@/components/SectionFourAlbumsNew";
import SectionFiveFAQs from "@/components/SectionFiveFAQs";
import SectionSixCTA from "@/components/SectionSixCTA";
import { Footer } from "@/components/Footer";
import Checkout from "@/pages/Checkout";
import FreeTrialCheckout from "@/pages/FreeTrialCheckout";
import FreeTrial from "@/pages/FreeTrial";
import HowToUse from "@/pages/HowToUse";
import ThankYou from "@/pages/ThankYou";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import DataDeletion from "@/pages/DataDeletion";
import Affiliate from "@/pages/Affiliate";
import AboutUs from "@/pages/AboutUs";
import ContactUs from "@/pages/ContactUs";
import Blogs from "@/pages/Blogs";
import AlbumsGallery from "@/pages/AlbumsGallery";
import PlaylistAlbumsGallery from "@/pages/PlaylistAlbumsGallery";
import VinylGallery from "@/pages/VinylGallery";
import AllAlbums from "@/pages/AllAlbums";
import CustomAlbumCover from "@/pages/CustomAlbumCover";
import YlPersonalSupport from "@/pages/YlPersonalSupport";
import Admin from "@/pages/Admin";
import ManageAlbums from "@/pages/ManageAlbums";
import NotFound from "@/pages/not-found";
import { trackPageView } from "@/lib/analytics";

function HomePage() {
  const [, setLocation] = useLocation();

  const handleRecordClick = () => {
    setLocation("/free-trial-checkout");
  };

  const handleStartTrialClick = () => {
    setLocation("/free-trial-checkout");
  };

  const handleLearnMore = () => {
    setLocation("/how-to-use");
  };

  const handleTryDemo = () => {
    setLocation("/playlist-albums/demo-album-id");
  };

  return (
    <div className="w-full min-h-screen bg-[#EEE9DF] overflow-x-hidden">
      {/* Simple Header - Fixed at top (Restored) */}
      <SimpleHeader onRecordClick={handleRecordClick} />

      {/* Bottom Home Navbar - Fixed at bottom */}
      <BottomHomeNavbar onRecordClick={handleRecordClick} />

      {/* Spacer to prevent content from being hidden behind fixed bottom bar */}
      {/* <div className="h-20" /> */}

      {/* Hero Section - Full Screen with Button */}
      <HeroSection onStartTrialClick={handleStartTrialClick} />

      {/* Value Proposition with Logo */}
      <ValueProposition />

      {/* Section 3 - Testimonials */}
      <SectionThreeTestimonials onLearnMore={handleLearnMore} />

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Section 4 - Albums (Moved above Testimonials) */}
      {/* <SectionFourAlbums onTryDemo={handleTryDemo} /> */}
      <SectionFourAlbumsNew />

      {/* Section 5 - FAQs */}
      <SectionFiveFAQs />

      {/* Section 6 - Final CTA */}
      <SectionSixCTA onStartTrial={handleStartTrialClick} />

      {/* Footer */}
      <Footer />

      {/* Spacer for bottom navbar */}
      <div className="h-24 md:h-20" />
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
          <Route path="/free-trial-checkout" component={FreeTrialCheckout} />
          <Route path="/free-trial" component={FreeTrial} />
          <Route path="/how-to-use" component={HowToUse} />
          <Route path="/thank-you" component={ThankYou} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/terms-of-service" component={TermsOfService} />
          <Route path="/data-deletion" component={DataDeletion} />
          <Route path="/about-us" component={AboutUs} />
          <Route path="/affiliate" component={Affiliate} />
          <Route path="/contact-us" component={ContactUs} />
          <Route path="/blogs" component={Blogs} />
          <Route path="/vinyl-albums/:trialId" component={AlbumsGallery} />
          <Route
            path="/playlist-albums/:trialId"
            component={PlaylistAlbumsGallery}
          />
          <Route path="/all-albums" component={AllAlbums} />
          <Route path="/vinyl-gallery/:trialId?" component={VinylGallery} />
          <Route
            path="/custom-album-cover/:trialId"
            component={CustomAlbumCover}
          />
          <Route path="/yl-personal-support" component={YlPersonalSupport} />
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
