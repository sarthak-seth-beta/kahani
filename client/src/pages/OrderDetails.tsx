import { useLocation } from "wouter";
import {
  ArrowLeft,
  Loader2,
  Check,
  User,
  Phone,
  MessageCircle,
  Globe,
  Package,
  BookOpen,
  Share2,
  Mail,
  Copy,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiWhatsapp } from "react-icons/si";
import { FreeTrialForm } from "@/components/FreeTrialForm";
import { Footer } from "@/components/Footer";
import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

interface Album {
  id: string;
  title: string;
  cover_image: string;
}

interface TransactionData {
  id: string;
  name: string;
  phone: string;
  storytellerName?: string;
  storytellerLanguagePreference?: string;
  packageType?: string;
  paymentStatus?: string;
  paymentAmount?: number;
}

const PACKAGE_LABELS: Record<string, string> = {
  digital: "Digital Voice Album",
  ebook: "Voice Album + E-Book",
  printed: "Voice Album + E-Book + Printed Book",
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  hn: "हिंदी (Hindi)",
};

const SHARE_TEXT =
  "I just started preserving precious memories with Kahani! You should try it too:";

function ShareButton({ onCopied }: { onCopied: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentUrl = window.location.href;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleWhatsApp = () => {
    const message = `${SHARE_TEXT} ${currentUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
    setIsOpen(false);
  };

  const handleEmail = () => {
    const subject = "Check out Kahani - Preserve Your Stories";
    const body = `${SHARE_TEXT}\n\n${currentUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setIsOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      onCopied();
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="absolute top-4 right-4 z-10" ref={menuRef}>
      <button
        id="order-details-set-is-open"
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-[#F5F3EF] hover:bg-[#E8E4DC] flex items-center justify-center transition-colors shadow-sm mt-5"
        aria-label="Share"
      >
        {isOpen ? (
          <X className="w-4 h-4 text-[#1B2632]" />
        ) : (
          <Share2 className="w-4 h-4 text-[#1B2632]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-[#C9C1B1]/30 py-2">
          <button
            id="order-details-whats-app"
            onClick={handleWhatsApp}
            className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#F5F3EF] transition-colors text-left"
          >
            <SiWhatsapp className="w-4 h-4 text-[#25D366]" />
            <span className="text-sm text-[#1B2632]">WhatsApp</span>
          </button>
          <button
            id="order-details-email"
            onClick={handleEmail}
            className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#F5F3EF] transition-colors text-left"
          >
            <Mail className="w-4 h-4 text-[#A35139]" />
            <span className="text-sm text-[#1B2632]">Email</span>
          </button>
          <button
            id="order-details-copy-link"
            onClick={handleCopyLink}
            className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#F5F3EF] transition-colors text-left"
          >
            <Copy className="w-4 h-4 text-[#1B2632]/70" />
            <span className="text-sm text-[#1B2632]">Copy link</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function OrderDetails() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const urlParams = new URLSearchParams(window.location.search);
  let albumId = urlParams.get("albumId") || "";
  const paymentOrderId = urlParams.get("paymentOrderId");
  const packageType = urlParams.get("packageType") || "digital";
  const modeFromUrl = urlParams.get("mode") === "solo";

  // Clean up albumId - remove any trailing query params or fragments
  if (albumId.includes("&")) {
    albumId = albumId.split("&")[0];
  }
  if (albumId.includes("#")) {
    albumId = albumId.split("#")[0];
  }
  albumId = albumId.trim();

  // Payment verification guard: verify the payment is actually successful
  // before allowing access to this page.
  const [paymentVerified, setPaymentVerified] = useState<boolean | null>(null);
  const [transactionData, setTransactionData] =
    useState<TransactionData | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (!paymentOrderId) {
      setLocation(`/free-trial${albumId ? `?albumId=${albumId}` : ""}`);
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await apiRequest(
          "GET",
          `/api/transactions/by-payment-order/${paymentOrderId}`,
        );
        if (response.ok) {
          const txn = await response.json();
          if (txn.paymentStatus === "success") {
            setPaymentVerified(true);
            setTransactionData(txn);
            return;
          }
        }
      } catch (error) {
        console.error("Payment verification failed:", error);
      }
      setPaymentVerified(false);
      setLocation(`/free-trial${albumId ? `?albumId=${albumId}` : ""}`);
    };

    verifyPayment();
  }, [paymentOrderId]);

  const { data: albums } = useQuery<Album[]>({
    queryKey: ["/api/albums"],
  });

  const { data: albumById } = useQuery<Album>({
    queryKey: ["/api/album", albumId],
    enabled: !!albumId,
  });

  const albumTitle = useMemo(() => {
    if (albumId && albumById) return albumById.title;
    if (albums && albumId) {
      const found = albums.find((a) => a.id === albumId);
      return found?.title ?? "";
    }
    return "";
  }, [albumId, albumById, albums]);

  // Determine if this is solo mode - either from URL param or by checking if storytellerName is missing
  // (solo transactions don't have storytellerName)
  const isSoloMode = useMemo(() => {
    if (modeFromUrl) return true;
    // If transaction has language preference but no storytellerName, it's a solo transaction
    if (
      transactionData?.storytellerLanguagePreference &&
      !transactionData?.storytellerName
    ) {
      return true;
    }
    return false;
  }, [modeFromUrl, transactionData]);

  // Check if we have all required data from transaction
  // Solo mode doesn't need storytellerName
  const hasAllDetails = useMemo(() => {
    if (isSoloMode) {
      return !!transactionData?.storytellerLanguagePreference;
    }
    return !!(
      transactionData?.storytellerName &&
      transactionData?.storytellerLanguagePreference
    );
  }, [transactionData, isSoloMode]);

  // Mutation to create free trial or solo trial from existing transaction data
  const freeTrialMutation = useMutation({
    mutationFn: async () => {
      if (!transactionData) throw new Error("No transaction data");

      trackEvent(AnalyticsEvents.FREE_TRIAL_FORM_STARTED, {
        album_id: albumId,
        album_title: albumTitle,
        language_preference: transactionData.storytellerLanguagePreference,
        is_solo: isSoloMode,
      });

      // Use different API endpoint for solo mode
      const endpoint = isSoloMode ? "/api/solo-trial" : "/api/free-trial";
      const payload = isSoloMode
        ? {
            customerPhone: transactionData.phone,
            buyerName: transactionData.name,
            albumId: albumId,
            languagePreference:
              transactionData.storytellerLanguagePreference || "en",
          }
        : {
            customerPhone: transactionData.phone,
            buyerName: transactionData.name,
            storytellerName: transactionData.storytellerName,
            albumId: albumId,
            storytellerLanguagePreference:
              transactionData.storytellerLanguagePreference || "en",
          };

      const response = await apiRequest("POST", endpoint, payload);

      if (!response.ok) {
        const errorData = await response.json();
        trackEvent(AnalyticsEvents.FREE_TRIAL_FORM_ERROR, {
          error_message: errorData.error || "Failed to create order",
          album_id: albumId,
          is_solo: isSoloMode,
        });
        throw new Error(errorData.error || "Failed to create order");
      }
      return response.json();
    },
    onSuccess: async (trial) => {
      queryClient.invalidateQueries({
        queryKey: isSoloMode ? ["/api/solo-trial"] : ["/api/free-trial"],
      });

      trackEvent(AnalyticsEvents.FREE_TRIAL_FORM_SUBMITTED, {
        trial_id: trial.id,
        album_id: albumId,
        album_title: albumTitle,
        language_preference: transactionData?.storytellerLanguagePreference,
        is_solo: isSoloMode,
      });

      // Send email for premium packages (ebook or printed)
      if (packageType === "ebook" || packageType === "printed") {
        try {
          const emailPayload = {
            packageType,
            buyerName: transactionData?.name,
            customerPhone: transactionData?.phone,
            storytellerName: isSoloMode
              ? undefined
              : transactionData?.storytellerName,
            languagePreference: transactionData?.storytellerLanguagePreference,
            albumId,
            albumTitle,
            isSoloMode,
          };

          await apiRequest("POST", "/api/premium-order-email", emailPayload);
        } catch (emailError) {
          console.error("Error sending premium order email:", emailError);
        }
      }

      // Navigate to thank-you with appropriate ID
      if (isSoloMode) {
        setLocation(`/thank-you?soloTrialId=${trial.id}`);
      } else {
        setLocation(`/thank-you?trialId=${trial.id}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to complete order. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (paymentVerified !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EEE9DF]">
        <div className="text-center p-8">
          <Loader2 className="w-10 h-10 animate-spin text-[#C8553D] mx-auto mb-4" />
          <p className="text-gray-600">Verifying payment...</p>
        </div>
      </div>
    );
  }

  // Show Order Summary if we have all the details from the transaction
  if (hasAllDetails && transactionData) {
    return (
      <div className="min-h-screen bg-[#EEE9DF]">
        <header className="sticky top-0 z-50 bg-[#EEE9DF]/90 backdrop-blur-sm border-b border-[#C9C1B1]/30">
          <div className="container mx-auto px-4 h-16 flex items-center">
            <Button
              id="order-details-go-back"
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              className="mr-4 hover:bg-black/5"
            >
              <ArrowLeft className="h-5 w-5 text-[#1B2632]" />
            </Button>
            <h1 className="text-xl font-bold text-[#1B2632] font-['Outfit']">
              Order Summary
            </h1>
          </div>
        </header>

        <main className="container mx-auto px-3 py-4 sm:px-4 sm:py-8 max-w-lg">
          <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm flex flex-col gap-5 sm:gap-6 relative min-h-[calc(100vh-112px)]">
            {/* Share Button - Top Right */}
            <ShareButton
              onCopied={() =>
                toast({
                  title: "Link copied!",
                  description: "Share it with your friends and family.",
                })
              }
            />

            {/* Success message */}
            <div className="text-center mb-6">
              <p className="text-xs font-semibold tracking-[0.18em] text-[#A35139] uppercase mb-2">
                ONE LAST STEP REQUIRED!
              </p>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-[#1B2632]">
                Payment Successful!
              </h2>
              {isSoloMode ? (
                <div className="text-muted-foreground text-sm space-y-3 text-left">
                  <p>
                    Thank you for placing your order! We'll get back to you
                    within <span className="font-bold">24 hours</span>.
                  </p>
                  <p>
                    You will receive updates on your WhatsApp number regarding
                    the status of your order.
                  </p>
                  <p>
                    Questions?{" "}
                    <a
                      href="https://wa.me/8510889286"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#A35139] font-medium hover:underline"
                    >
                      Drop a text on WhatsApp
                    </a>
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Please review your order details and confirm to begin your
                  Kahani journey.
                </p>
              )}
            </div>

            {/* Order Details */}
            <div className="space-y-3 sm:space-y-4">
              <button
                type="button"
                onClick={() => setDetailsOpen((open) => !open)}
                className="w-full flex items-center justify-between rounded-lg bg-[#F5F3EF] px-3 py-2 text-left"
                aria-expanded={detailsOpen}
              >
                <h3 className="text-sm font-semibold text-[#1B2632]/80">
                  Your Details
                </h3>
                <ChevronDown
                  className={`w-4 h-4 text-[#1B2632]/60 transition-transform duration-200 ${
                    detailsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {detailsOpen && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-[#F5F3EF] rounded-lg">
                    <User className="w-5 h-5 text-[#A35139]" />
                    <div>
                      <p className="text-xs text-[#1B2632]/60">Your Name</p>
                      <p className="font-medium text-[#1B2632]">
                        {transactionData.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-[#F5F3EF] rounded-lg">
                    <Phone className="w-5 h-5 text-[#A35139]" />
                    <div>
                      <p className="text-xs text-[#1B2632]/60">
                        WhatsApp Number
                      </p>
                      <p className="font-medium text-[#1B2632]">
                        {transactionData.phone}
                      </p>
                    </div>
                  </div>

                  {!isSoloMode && (
                    <div className="flex items-center gap-3 p-3 bg-[#F5F3EF] rounded-lg">
                      <MessageCircle className="w-5 h-5 text-[#A35139]" />
                      <div>
                        <p className="text-xs text-[#1B2632]/60">
                          Your Loved One
                        </p>
                        <p className="font-medium text-[#1B2632]">
                          {transactionData.storytellerName}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 bg-[#F5F3EF] rounded-lg">
                    <Globe className="w-5 h-5 text-[#A35139]" />
                    <div>
                      <p className="text-xs text-[#1B2632]/60">
                        {isSoloMode
                          ? "Your Preferred Language"
                          : "Preferred Language"}
                      </p>
                      <p className="font-medium text-[#1B2632]">
                        {LANGUAGE_LABELS[
                          transactionData.storytellerLanguagePreference || "en"
                        ] || "English"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Package Info */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-sm font-semibold text-[#1B2632]/60 uppercase tracking-wider">
                Package
              </h3>

              <div className="flex items-center gap-3 p-3 bg-[#A35139]/5 border border-[#A35139]/20 rounded-lg">
                <BookOpen className="w-5 h-5 text-[#A35139]" />
                <div className="flex-1">
                  <p className="font-medium text-[#1B2632]">
                    {PACKAGE_LABELS[packageType] || "Digital Voice Album"}
                  </p>
                  {albumTitle && (
                    <p className="text-xs text-[#1B2632]/60">{albumTitle}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-auto pt-2 sm:pt-4 space-y-3">
              {isSoloMode ? (
                <>
                  <Button
                    id="order-details-view-other-albums"
                    onClick={() => setLocation("/albums")}
                    className="w-full bg-[#A35139] hover:bg-[#A35139]/90 text-white font-bold h-12 text-base rounded-xl shadow-md"
                  >
                    View Other Albums
                  </Button>

                  <p className="text-xs text-center text-[#1B2632]/50">
                    Explore more albums to preserve stories for your loved ones.
                  </p>
                </>
              ) : (
                <>
                  <Button
                    id="order-details-start-free-trial"
                    onClick={() => freeTrialMutation.mutate()}
                    disabled={freeTrialMutation.isPending}
                    className="w-full bg-[#A35139] hover:bg-[#A35139]/90 text-white font-bold h-12 text-base rounded-xl shadow-md"
                  >
                    {freeTrialMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Continue to WhatsApp"
                    )}
                  </Button>

                  <p className="text-xs text-center text-[#1B2632]/50">
                    By confirming, you'll receive an invite message on WhatsApp
                    to share with your loved one.
                  </p>
                </>
              )}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // Fallback: Show the form if storyteller details are not present
  return (
    <div className="min-h-screen bg-[#EEE9DF]">
      <header className="sticky top-0 z-50 bg-[#EEE9DF]/90 backdrop-blur-sm border-b border-[#C9C1B1]/30">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Button
            id="order-details-back-fallback"
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="mr-4 hover:bg-black/5"
          >
            <ArrowLeft className="h-5 w-5 text-[#1B2632]" />
          </Button>
          <h1 className="text-xl font-bold text-[#1B2632] font-['Outfit']">
            Enter Details
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
          <FreeTrialForm
            albumId={albumId}
            albumTitle={albumTitle}
            onSuccess={() => {
              // The form component handles navigation to thank-you
            }}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
