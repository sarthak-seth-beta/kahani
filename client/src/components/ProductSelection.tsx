import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Mic, Book, Loader2, Tag, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserInfoForm } from "@/components/UserInfoForm";
import { apiRequest } from "@/lib/queryClient";
import { PACKAGE_PRICES } from "@shared/schema";

interface ProductSelectionProps {
  albumId: string;
  onContinue?: () => void;
}

const PRODUCTS = [
  {
    id: "digital",
    title: "Digital Voice Album",
    pricePaise: PACKAGE_PRICES["digital"],
    subtitle: "A private link to listen and share",
    icon: Mic,
  },
  {
    id: "ebook",
    title: "Voice Album + E-Book",
    pricePaise: PACKAGE_PRICES["ebook"],
    subtitle: "Listen + read. Same stories, in a clean e-book format",
    icon: BookOpen,
    popular: true,
  },
  {
    id: "printed",
    title: "Voice Album + E-Book + Printed Book",
    pricePaise: PACKAGE_PRICES["printed"],
    subtitle: "A printed keepsake book delivered to you",
    icon: Book,
  },
];

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

interface DiscountInfo {
  code: string;
  discountType: string;
  discountValue: number;
  baseAmountPaise: number;
  discountAmountPaise: number;
  finalAmountPaise: number;
}

export function ProductSelection({
  albumId,
  onContinue,
}: ProductSelectionProps) {
  const [, setLocation] = useLocation();

  const [selectedId, setSelectedId] = useState("digital");
  const [showUserForm, setShowUserForm] = useState(false);

  // Discount state
  const [discountInput, setDiscountInput] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountInfo | null>(
    null,
  );
  const [showDiscountField, setShowDiscountField] = useState(false);

  const handleApplyDiscount = async () => {
    const code = discountInput.trim();
    if (!code) return;

    setDiscountLoading(true);
    setDiscountError(null);

    try {
      const response = await apiRequest("POST", "/api/discounts/validate", {
        code,
        packageType: selectedId,
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        setDiscountError(data.error || "Invalid discount code");
        setAppliedDiscount(null);
      } else {
        setAppliedDiscount(data as DiscountInfo);
        setDiscountError(null);
      }
    } catch {
      setDiscountError("Failed to validate discount code");
      setAppliedDiscount(null);
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscount(null);
    setDiscountInput("");
    setDiscountError(null);
  };

  // When package selection changes, re-validate discount if one is applied
  const handleSelectPackage = async (id: string) => {
    setSelectedId(id);

    if (appliedDiscount) {
      // Re-validate for the new package type
      try {
        const response = await apiRequest("POST", "/api/discounts/validate", {
          code: appliedDiscount.code,
          packageType: id,
        });
        const data = await response.json();
        if (response.ok && data.valid) {
          setAppliedDiscount(data as DiscountInfo);
        } else {
          // Discount doesn't apply to this package — keep it but show error
          setAppliedDiscount(null);
          setDiscountError(data.error || "Discount not valid for this package");
        }
      } catch {
        // silently keep existing state
      }
    }
  };

  const handleContinue = () => {
    setShowUserForm(true);
  };

  const handleBack = () => {
    setShowUserForm(false);
  };

  // If user info form should be shown, render it instead of package selection
  if (showUserForm) {
    return (
      <div className="space-y-6">
        <UserInfoForm
          albumId={albumId}
          packageType={selectedId as "digital" | "ebook" | "printed"}
          discountCode={appliedDiscount?.code}
          onBack={handleBack}
          onSuccess={onContinue}
        />
      </div>
    );
  }

  const selectedProduct = PRODUCTS.find((p) => p.id === selectedId);
  const basePrice = selectedProduct?.pricePaise ?? 0;
  const finalPrice = appliedDiscount
    ? appliedDiscount.finalAmountPaise
    : basePrice;
  const savings = appliedDiscount ? appliedDiscount.discountAmountPaise : 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-[#1B2632] font-['Outfit']">
          Choose your Kahani
        </h2>
      </div>

      <div className="space-y-2.5">
        {PRODUCTS.map((product) => {
          const isSelected = selectedId === product.id;
          return (
            <div
              key={product.id}
              onClick={() => handleSelectPackage(product.id)}
              className={cn(
                "relative flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200",
                isSelected
                  ? "border-[#A35139] bg-[#A35139]/5"
                  : "border-[#1B2632]/10 hover:border-[#1B2632]/20 bg-white",
              )}
            >
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "font-bold text-sm text-[#1B2632]",
                      isSelected ? "text-[#A35139]" : "",
                    )}
                  >
                    {product.title}
                  </span>
                  <div className="flex flex-col items-end leading-none">
                    <span className="text-xs text-gray-400 decoration-gray-400">
                      {formatPaise(product.pricePaise)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#1B2632]/70 leading-normal">
                  {product.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Discount code section */}
      {!showDiscountField ? (
        <button
          type="button"
          onClick={() => setShowDiscountField(true)}
          className="flex items-center gap-1.5 text-sm text-[#A35139] hover:text-[#A35139]/80 transition-colors mx-auto"
        >
          <Tag className="w-3.5 h-3.5" />
          Have a discount code?
        </button>
      ) : (
        <div className="space-y-2">
          {appliedDiscount ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  {appliedDiscount.code}
                </span>
                <span className="text-xs text-green-600">
                  — You save {formatPaise(savings)}!
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemoveDiscount}
                className="p-1 text-green-600 hover:text-green-800 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={discountInput}
                onChange={(e) => {
                  setDiscountInput(e.target.value.toUpperCase());
                  if (discountError) setDiscountError(null);
                }}
                placeholder="Enter code"
                className="h-9 text-sm uppercase flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleApplyDiscount();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleApplyDiscount}
                disabled={discountLoading || !discountInput.trim()}
                variant="outline"
                size="sm"
                className="h-9 px-4 border-[#A35139] text-[#A35139] hover:bg-[#A35139]/5"
              >
                {discountLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
          )}
          {discountError && (
            <p className="text-xs text-red-500">{discountError}</p>
          )}
        </div>
      )}

      {/* Price summary when discount is applied */}
      {appliedDiscount && (
        <div className="bg-[#A35139]/5 border border-[#A35139]/20 rounded-lg px-3 py-2 text-center">
          <span className="text-sm text-[#1B2632]/60 line-through mr-2">
            {formatPaise(basePrice)}
          </span>
          <span className="text-base font-bold text-[#A35139]">
            {formatPaise(finalPrice)}
          </span>
        </div>
      )}

      <Button
        onClick={handleContinue}
        className="w-full bg-[#A35139] hover:bg-[#A35139]/90 text-white font-bold h-10 text-base rounded-xl shadow-md"
      >
        Continue
      </Button>
    </div>
  );
}
