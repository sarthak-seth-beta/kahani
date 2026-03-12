import { Switch, Route, useLocation } from "wouter";
import { useEffect, lazy, Suspense, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { trackPageView } from "@/lib/analytics";
import { apiRequest } from "./lib/queryClient";
import { GeneratedAlbumProvider } from "@/stores/generatedAlbumStore";
import ScrollToTop from "@/components/ScrollToTop";
import SmoothScroll from "@/components/SmoothScroll";
import LazySection from "@/components/LazySection";

const LazyToaster = lazy(() =>
  import("@/components/ui/toaster").then((m) => ({ default: m.Toaster })),
);
const LazyTooltipProvider = lazy(() =>
  import("@/components/ui/tooltip").then((m) => ({
    default: m.TooltipProvider,
  })),
);

// Above-fold landing components — loaded eagerly (part of initial bundle)
import SimpleHeader from "@/components/SimpleHeader";
import HeroSection from "@/components/HeroSection";
import ValueProposition from "@/components/ValueProposition";

// Below-fold landing components — lazy loaded (JS only downloads when near viewport)
const R2VideoTestimonials = lazy(
  () => import("@/components/R2VideoTestimonials"),
);
const HowItWorksSection = lazy(() => import("@/components/HowItWorksSection"));
const GetStartedSection = lazy(() => import("@/components/GetStartedSection"));
const SectionFourAlbumsNew = lazy(
  () => import("@/components/SectionFourAlbumsNew"),
);
const SectionFiveFAQs = lazy(() => import("@/components/SectionFiveFAQs"));
const Footer = lazy(() =>
  import("@/components/Footer").then((m) => ({ default: m.Footer })),
);

// Other Pages (lazy loaded)
const Checkout = lazy(() => import("@/pages/Checkout"));
const FreeTrial = lazy(() => import("@/pages/FreeTrial"));
const HowToUse = lazy(() => import("@/pages/HowToUse"));
const ThankYou = lazy(() => import("@/pages/ThankYou"));
const OrderConfirmed = lazy(() => import("@/pages/OrderConfirmed"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const RefundPolicy = lazy(() => import("@/pages/RefundPolicy"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const DataDeletion = lazy(() => import("@/pages/DataDeletion"));
const Affiliate = lazy(() => import("@/pages/Affiliate"));
const AboutUs = lazy(() => import("@/pages/AboutUs"));
const ContactUs = lazy(() => import("@/pages/ContactUs"));
const OrderDetails = lazy(() => import("@/pages/OrderDetails"));
const CompanyLegal = lazy(() => import("@/pages/CompanyLegal"));
const Blogs = lazy(() => import("@/pages/Blogs"));
const BlogDetail = lazy(() => import("@/pages/BlogDetail"));
const AlbumsGallery = lazy(() => import("@/pages/AlbumsGallery"));
const PlaylistAlbumsGallery = lazy(
  () => import("@/pages/PlaylistAlbumsGallery"),
);
const VinylGallery = lazy(() => import("@/pages/VinylGallery"));
const AllAlbums = lazy(() => import("@/pages/AllAlbums"));
const Albums = lazy(() => import("@/pages/Albums"));
const Narrator = lazy(() => import("@/pages/Narrator"));
const NarratorElse = lazy(() => import("@/pages/NarratorElse"));
const CreateAlbum = lazy(() => import("@/pages/CreateAlbum"));
const GeneratedAlbum = lazy(() => import("@/pages/GeneratedAlbum"));
const CustomAlbumCover = lazy(() => import("@/pages/CustomAlbumCover"));
const YlPersonalSupport = lazy(() => import("@/pages/YlPersonalSupport"));
const Admin = lazy(() => import("@/pages/Admin"));
const ManageAlbums = lazy(() => import("@/pages/ManageAlbums"));
const SampleAlbum = lazy(() => import("@/pages/SampleAlbum"));
const SamplePage = lazy(() => import("@/pages/SamplePage"));
const Payment = lazy(() => import("@/pages/Payment"));
const PaymentCallback = lazy(() => import("@/pages/PaymentCallback"));
const NotFound = lazy(() => import("@/pages/not-found"));
const AddressForm = lazy(() => import("@/pages/AddressForm"));

function HomePage() {
  const [, setLocation] = useLocation();

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
            console.error(
              "[QR Tracking] Failed to track traffic source:",
              error,
            );
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
    // Handler for HeroSection
  };

  const handleRecordClick = () => {
    setLocation("/narrator");
  };

  const handleLearnMore = () => {
    setLocation("/how-to-use");
  };

  return (
    <div className="w-full min-h-screen bg-[#EEE9DF]">
      {/* Always loaded — above the fold */}
      <SimpleHeader onRecordClick={handleRecordClick} />
      <HeroSection onHearKahaniClick={handleHearKahaniClick} />
      <ValueProposition />

      {/* Below-fold sections — rendered only when the user scrolls near them.
          Suspense handles the async JS chunk load; LazySection handles DOM mount/unmount. */}
      <LazySection>
        <Suspense fallback={null}>
          <R2VideoTestimonials />
        </Suspense>
      </LazySection>

      <LazySection>
        <Suspense fallback={null}>
          <HowItWorksSection />
        </Suspense>
      </LazySection>

      <LazySection>
        <Suspense fallback={null}>
          <GetStartedSection />
        </Suspense>
      </LazySection>

      <LazySection>
        <Suspense fallback={null}>
          <SectionFourAlbumsNew />
        </Suspense>
      </LazySection>

      <LazySection>
        <Suspense fallback={null}>
          <SectionFiveFAQs />
        </Suspense>
      </LazySection>

      <LazySection>
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </LazySection>
    </div>
  );
}

function App() {
  const [location] = useLocation();

  // Track page views on route changes
  useEffect(() => {
    trackPageView(location, document.title);
  }, [location]);

  const [uiReady, setUiReady] = useState(false);
  useEffect(() => {
    setUiReady(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ScrollToTop />
      <SmoothScroll />
      <Suspense fallback={null}>
        <Switch>
          {/* foundational pages */}
          <Route path="/" component={HomePage} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/free-trial" component={FreeTrial} />
          <Route path="/thank-you" component={ThankYou} />
          <Route path="/book-order-confirmation" component={OrderConfirmed} />
          <Route path="/about-us" component={AboutUs} />
          <Route path="/order-details" component={OrderDetails} />
          <Route path="/contact-us" component={ContactUs} />

          {/* payment pages */}
          <Route path="/payment" component={Payment} />
          <Route path="/payment/callback" component={PaymentCallback} />

          <Route path="/blogs" component={Blogs} />
          <Route path="/blogs/:slug" component={BlogDetail} />
          <Route path="/vinyl-albums/:trialId" component={AlbumsGallery} />
          <Route
            path="/playlist-albums/:trialId"
            component={PlaylistAlbumsGallery}
          />
          <Route path="/albums" component={Albums} />
          <Route path="/all-albums" component={AllAlbums} />
          <Route path="/narrator" component={Narrator} />
          <Route path="/narrator-else" component={NarratorElse} />
          <Route path="/address-form/:trialId" component={AddressForm} />
          <Route path="/sample-album" component={SampleAlbum} />
          <Route path="/sample" component={SamplePage} />

          {/* GeneratedAlbumProvider scoped only to routes that use the store */}
          <Route path="/create-album">
            <GeneratedAlbumProvider>
              <CreateAlbum />
            </GeneratedAlbumProvider>
          </Route>
          <Route path="/generated-album">
            <GeneratedAlbumProvider>
              <GeneratedAlbum />
            </GeneratedAlbumProvider>
          </Route>

          <Route path="/vinyl-gallery/:trialId?" component={VinylGallery} />
          <Route
            path="/custom-album-cover/:trialId"
            component={CustomAlbumCover}
          />
          <Route path="/yl-personal-support" component={YlPersonalSupport} />

          {/* static pages */}
          <Route path="/how-to-use" component={HowToUse} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route path="/refund-policy" component={RefundPolicy} />
          <Route path="/terms-of-service" component={TermsOfService} />
          <Route path="/data-deletion" component={DataDeletion} />
          <Route path="/affiliate" component={Affiliate} />
          <Route path="/company-legal" component={CompanyLegal} />

          {/* admin pages */}
          <Route path="/enzo-xyz" component={Admin} />
          <Route path="/enzo-xyz/albums" component={ManageAlbums} />

          {/* 404 */}
          <Route component={NotFound} />
        </Switch>
      </Suspense>
      {uiReady && (
        <Suspense fallback={null}>
          <LazyTooltipProvider>
            <LazyToaster />
          </LazyTooltipProvider>
        </Suspense>
      )}
    </QueryClientProvider>
  );
}

export default App;
