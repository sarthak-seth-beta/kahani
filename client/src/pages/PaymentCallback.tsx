import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type PaymentState = "verifying" | "success" | "failed";

export default function PaymentCallback() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [state, setState] = useState<PaymentState>("verifying");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    verifyPayment().catch((err) => {
      console.error("Payment verification failed:", err);
      setState("failed");
      setError(err.message || "Payment verification failed");
    });
  }, []);

  const verifyPayment = async () => {
    const params = new URLSearchParams(window.location.search);
    const merchantOrderId = params.get("merchantOrderId");
    const albumId = params.get("albumId");
    const packageType = params.get("packageType");

    if (!merchantOrderId) {
      setState("failed");
      setError("Missing order ID");
      return;
    }

    try {
      // Check payment status with PhonePe
      const response = await apiRequest("POST", "/api/phonepe/check-status", {
        merchantOrderId,
      });

      if (!response.ok) {
        throw new Error("Failed to verify payment");
      }

      const data = await response.json();

      // Amount verification is now handled server-side via stored expected_amount_paise
      // The PUT endpoint below will reject mismatched amounts

      // Check if payment was successful
      if (data.isSuccess && data.state === "COMPLETED") {
        // Update transactions table with payment information
        try {
          await apiRequest(
            "PUT",
            `/api/transactions/payment/${merchantOrderId}`,
            {
              paymentStatus: "success",
              paymentId: data.transactionId,
              paymentTransactionId: data.transactionId,
              paymentOrderId: merchantOrderId,
              paymentAmount: data.amount,
            },
          );
        } catch (updateError) {
          console.error("Failed to update payment info:", updateError);
          // Don't block the flow if this fails
        }

        setState("success");

        toast({
          title: "Payment Successful!",
          description: "Redirecting to order details...",
        });

        // Redirect to order details page
        setTimeout(() => {
          const orderParams = new URLSearchParams({
            albumId: albumId || "",
            paymentOrderId: merchantOrderId,
            paymentTransactionId: data.transactionId || "",
            paymentStatus: "success",
            paymentAmount: data.amount?.toString() || "",
            packageType: packageType || "",
          });
          setLocation(`/order-details?${orderParams.toString()}`);
        }, 2000);
      } else {
        setState("failed");
        setError(data.message || "Payment was not successful");

        toast({
          title: "Payment Failed",
          description: "Your payment could not be processed",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Payment verification error:", err);
      setState("failed");
      setError(err.message || "Failed to verify payment");

      toast({
        title: "Verification Error",
        description: "Could not verify payment status",
        variant: "destructive",
      });
    }
  };

  const handleRetry = () => {
    const params = new URLSearchParams(window.location.search);
    const albumId = params.get("albumId");
    setLocation(albumId ? `/free-trial?albumId=${albumId}` : "/free-trial");
  };

  // Verifying state
  if (state === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EEE9DF]">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <Loader2 className="w-16 h-16 animate-spin text-[#C8553D] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Verifying Payment
          </h2>
          <p className="text-gray-600">
            Please wait while we confirm your payment...
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (state === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EEE9DF]">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Payment Successful!
          </h2>
          <p className="text-gray-600 mb-4">
            Your payment has been confirmed. Redirecting you to order details...
          </p>
          <div className="flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-[#C8553D]" />
          </div>
        </div>
      </div>
    );
  }

  // Failed state
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEE9DF]">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Payment Failed
        </h2>
        <p className="text-gray-600 mb-6">
          {error || "Your payment could not be processed. Please try again."}
        </p>
        <Button
          onClick={handleRetry}
          className="bg-[#C8553D] hover:bg-[#A94438] text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
