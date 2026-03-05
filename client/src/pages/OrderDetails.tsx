import { useLocation } from "wouter";
import { ArrowLeft, Loader2, Check, User, Phone, MessageCircle, Globe, Package, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FreeTrialForm } from "@/components/FreeTrialForm";
import { Footer } from "@/components/Footer";
import { useEffect, useMemo, useState } from "react";
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

export default function OrderDetails() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const urlParams = new URLSearchParams(window.location.search);
  let albumId = urlParams.get("albumId") || "";
  const paymentOrderId = urlParams.get("paymentOrderId");
  const packageType = urlParams.get("packageType") || "digital";

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
  const [transactionData, setTransactionData] = useState<TransactionData | null>(null);

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

  // Check if we have all required data from transaction
  const hasAllDetails = useMemo(() => {
    return !!(
      transactionData?.storytellerName &&
      transactionData?.storytellerLanguagePreference
    );
  }, [transactionData]);

  // Mutation to create free trial from existing transaction data
  const freeTrialMutation = useMutation({
    mutationFn: async () => {
      if (!transactionData) throw new Error("No transaction data");
      
      trackEvent(AnalyticsEvents.FREE_TRIAL_FORM_STARTED, {
        album_id: albumId,
        album_title: albumTitle,
        language_preference: transactionData.storytellerLanguagePreference,
      });

      const response = await apiRequest("POST", "/api/free-trial", {
        customerPhone: transactionData.phone,
        buyerName: transactionData.name,
        storytellerName: transactionData.storytellerName,
        albumId: albumId,
        storytellerLanguagePreference: transactionData.storytellerLanguagePreference || "en",
      });

      if (!response.ok) {
        const errorData = await response.json();
        trackEvent(AnalyticsEvents.FREE_TRIAL_FORM_ERROR, {
          error_message: errorData.error || "Failed to create order",
          album_id: albumId,
        });
        throw new Error(errorData.error || "Failed to create order");
      }
      return response.json();
    },
    onSuccess: async (trial) => {
      queryClient.invalidateQueries({ queryKey: ["/api/free-trial"] });

      trackEvent(AnalyticsEvents.FREE_TRIAL_FORM_SUBMITTED, {
        trial_id: trial.id,
        album_id: albumId,
        album_title: albumTitle,
        language_preference: transactionData?.storytellerLanguagePreference,
      });

      // Send email for premium packages (ebook or printed)
      if (packageType === "ebook" || packageType === "printed") {
        try {
          const emailPayload = {
            packageType,
            buyerName: transactionData?.name,
            customerPhone: transactionData?.phone,
            storytellerName: transactionData?.storytellerName,
            languagePreference: transactionData?.storytellerLanguagePreference,
            albumId,
            albumTitle,
          };

          await apiRequest("POST", "/api/premium-order-email", emailPayload);
        } catch (emailError) {
          console.error("Error sending premium order email:", emailError);
        }
      }

      setLocation(`/thank-you?trialId=${trial.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete order. Please try again.",
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

        <main className="container mx-auto px-4 py-8 max-w-lg">
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            {/* Success message */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-2 text-[#1B2632]">
                Payment Successful!
              </h2>
              <p className="text-muted-foreground text-sm">
                Please review your order details and confirm to begin your Kahani journey.
              </p>
            </div>

            {/* Order Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#1B2632]/60 uppercase tracking-wider">
                Your Details
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-[#F5F3EF] rounded-lg">
                  <User className="w-5 h-5 text-[#A35139]" />
                  <div>
                    <p className="text-xs text-[#1B2632]/60">Your Name</p>
                    <p className="font-medium text-[#1B2632]">{transactionData.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-[#F5F3EF] rounded-lg">
                  <Phone className="w-5 h-5 text-[#A35139]" />
                  <div>
                    <p className="text-xs text-[#1B2632]/60">WhatsApp Number</p>
                    <p className="font-medium text-[#1B2632]">{transactionData.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-[#F5F3EF] rounded-lg">
                  <MessageCircle className="w-5 h-5 text-[#A35139]" />
                  <div>
                    <p className="text-xs text-[#1B2632]/60">Your Loved One</p>
                    <p className="font-medium text-[#1B2632]">{transactionData.storytellerName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-[#F5F3EF] rounded-lg">
                  <Globe className="w-5 h-5 text-[#A35139]" />
                  <div>
                    <p className="text-xs text-[#1B2632]/60">Preferred Language</p>
                    <p className="font-medium text-[#1B2632]">
                      {LANGUAGE_LABELS[transactionData.storytellerLanguagePreference || "en"] || "English"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Package Info */}
            <div className="space-y-4">
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

            {/* Confirm Button */}
            <Button
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
                "Confirm & Continue to WhatsApp"
              )}
            </Button>

            <p className="text-xs text-center text-[#1B2632]/50">
              By confirming, you'll receive an invite message on WhatsApp to share with your loved one.
            </p>
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
