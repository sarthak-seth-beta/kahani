import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Payment() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  // useRef persists across React StrictMode remounts (unlike useState which resets)
  const hasCreatedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate order creation (React StrictMode calls useEffect twice in dev)
    if (hasCreatedRef.current) return;
    hasCreatedRef.current = true;
    
    createPaymentOrder();
  }, []);

  const createPaymentOrder = async () => {
    
    try {
      const params = new URLSearchParams(window.location.search);
      const albumId = params.get("albumId");
      const packageType = params.get("packageType");
      const transactionId = params.get("transactionId");

      if (!albumId || !packageType) {
        throw new Error("Missing album or package information");
      }

      if (!transactionId) {
        throw new Error("Missing transaction information");
      }

      // Calculate amount based on package type
      const packagePrices: Record<string, number> = {
        // remove krde bhai test ko
        test: 100,        // ₹1
        digital: 19900,   // ₹199
        ebook: 59900,     // ₹599
        printed: 99900,   // ₹999
      };

      const amount = packagePrices[packageType];
      if (!amount) {
        throw new Error("Invalid package type");
      }

      // Create PhonePe order
      const response = await apiRequest("POST", "/api/phonepe/create-order", {
        albumId,
        packageType,
        amount,
        transactionId,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create payment order");
      }

      const data = await response.json();

      // Redirect to PhonePe payment page
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error("No payment URL received");
      }
    } catch (err: any) {
      console.error("Payment order error:", err);
      setError(err.message || "Failed to initiate payment");
      hasCreatedRef.current = false; // Allow retry on error
      
      // Redirect back after 3 seconds
      setTimeout(() => {
        setLocation("/free-trial");
      }, 3000);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EEE9DF]">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">✕</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Payment Error
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting back...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EEE9DF]">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
        <Loader2 className="w-16 h-16 animate-spin text-[#C8553D] mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Preparing Payment
        </h2>
        <p className="text-gray-600">
          Please wait while we redirect you to the payment page...
        </p>
      </div>
    </div>
  );
}
