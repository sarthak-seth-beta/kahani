import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, Mic, Book } from "lucide-react";
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

  const [selectedId, setSelectedId] = useState("digital");

  const handleContinue = () => {
    // Navigate to OrderDetails page with albumId and selected package
    setLocation(`/order-details?albumId=${albumId}&package=${selectedId}`);
    if (onContinue) onContinue();
  };

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
              onClick={() => setSelectedId(product.id)}
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
                    <span className="text-xs text-gray-400 line-through decoration-gray-400">
                      {product.price}
                    </span>
                    <span className="font-bold text-xs text-[#A35139]">
                      FREE
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

      <Button
        onClick={handleContinue}
        className="w-full bg-[#A35139] hover:bg-[#A35139]/90 text-white font-bold h-10 text-base rounded-xl shadow-md"
      >
        Continue
      </Button>
    </div >
  );
}
