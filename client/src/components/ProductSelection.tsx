import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Check, BookOpen, Mic, Book } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductSelectionProps {
  albumId: string;
  onContinue?: () => void;
}

const PRODUCTS = [
  {
    id: "digital",
    title: "Digital Voice Album",
    price: "₹199",
    subtitle: "A private link to listen and share",
    icon: Mic,
  },
  {
    id: "ebook",
    title: "Voice Album + E-Book",
    price: "₹599",
    subtitle: "Listen + read. Same stories, in a clean e-book format",
    icon: BookOpen,
    popular: true,
  },
  {
    id: "printed",
    title: "Voice Album + E-Book + Printed Book",
    price: "₹999",
    subtitle: "A printed keepsake book delivered to you",
    icon: Book,
  },
];

export function ProductSelection({
  albumId,
  onContinue,
}: ProductSelectionProps) {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<string>("ebook"); // Default to middle option? Or first? Let's default to middle (popular) or first. Prompt said "Choose your Kahani". Let's default to digital (first).
  // Actually, let's default to the first one 'digital' as it's the base.
  // Wait, commonly 'ebook' might be the target upsell. Let's stick to 'digital' as safe default or 'ebook' if marked popular.
  // The user didn't specify default. I'll default to 'digital'.

  const [selectedId, setSelectedId] = useState("digital");

  const handleContinue = () => {
    // Navigate to OrderDetails page with albumId and selected package
    setLocation(`/order-details?albumId=${albumId}&package=${selectedId}`);
    if (onContinue) onContinue();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-[#1B2632] font-['Outfit']">
          Choose your Kahani
        </h2>
      </div>

      <div className="space-y-3">
        {PRODUCTS.map((product) => {
          const isSelected = selectedId === product.id;
          return (
            <div
              key={product.id}
              onClick={() => setSelectedId(product.id)}
              className={cn(
                "relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                isSelected
                  ? "border-[#A35139] bg-[#A35139]/5"
                  : "border-[#1B2632]/10 hover:border-[#1B2632]/20 bg-white",
              )}
            >
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary ring-offset-background mt-1",
                  isSelected
                    ? "bg-[#A35139] border-[#A35139] text-white"
                    : "border-gray-400",
                )}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "font-bold text-[#1B2632]",
                      isSelected ? "text-[#A35139]" : "",
                    )}
                  >
                    {product.title}
                  </span>
                  <span className="font-bold text-[#1B2632]">
                    {product.price}
                  </span>
                </div>
                <p className="text-sm text-[#1B2632]/70 leading-normal">
                  {product.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        onClick={handleContinue}
        size="lg"
        className="w-full bg-[#A35139] hover:bg-[#A35139]/90 text-white font-bold h-12 text-lg rounded-xl shadow-md"
      >
        Continue
      </Button>
    </div>
  );
}
