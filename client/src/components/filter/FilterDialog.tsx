import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

interface FilterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  filterType: "all" | "family" | "wisdom" | "love" | "career";
  onFilterTypeChange: (
    type: "all" | "family" | "wisdom" | "love" | "career",
  ) => void;
  filterBestFitFor: string | null;
  onFilterBestFitForChange: (bestFit: string | null) => void;
  uniqueBestFitFor: string[];
}

export function FilterDialog({
  isOpen,
  onOpenChange,
  filterType,
  onFilterTypeChange,
  filterBestFitFor,
  onFilterBestFitForChange,
  uniqueBestFitFor,
}: FilterDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#1B2632]">
            Filter Albums
          </DialogTitle>
          <DialogDescription>
            Filter albums by type or best fit category
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide py-4">
          <Accordion type="single" collapsible className="w-full">
            {/* Filter by Type */}
            <AccordionItem value="type">
              <AccordionTrigger className="text-lg font-semibold text-[#1B2632]">
                Filter by Type
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => onFilterTypeChange("all")}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                      filterType === "all"
                        ? "border-[#A35139] bg-[#A35139]/5 text-[#A35139] font-semibold"
                        : "border-gray-200 hover:border-[#A35139]/30"
                    }`}
                  >
                    All Albums
                  </button>
                  <button
                    onClick={() => onFilterTypeChange("family")}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                      filterType === "family"
                        ? "border-[#A35139] bg-[#A35139]/5 text-[#A35139] font-semibold"
                        : "border-gray-200 hover:border-[#A35139]/30"
                    }`}
                  >
                    Family & Childhood
                  </button>
                  <button
                    onClick={() => onFilterTypeChange("wisdom")}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                      filterType === "wisdom"
                        ? "border-[#A35139] bg-[#A35139]/5 text-[#A35139] font-semibold"
                        : "border-gray-200 hover:border-[#A35139]/30"
                    }`}
                  >
                    Wisdom & Life Lessons
                  </button>
                  <button
                    onClick={() => onFilterTypeChange("love")}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                      filterType === "love"
                        ? "border-[#A35139] bg-[#A35139]/5 text-[#A35139] font-semibold"
                        : "border-gray-200 hover:border-[#A35139]/30"
                    }`}
                  >
                    Love & Home
                  </button>
                  <button
                    onClick={() => onFilterTypeChange("career")}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                      filterType === "career"
                        ? "border-[#A35139] bg-[#A35139]/5 text-[#A35139] font-semibold"
                        : "border-gray-200 hover:border-[#A35139]/30"
                    }`}
                  >
                    Career & Money
                  </button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Filter by Best Fit For */}
            {uniqueBestFitFor.length > 0 && (
              <AccordionItem value="bestFitFor">
                <AccordionTrigger className="text-lg font-semibold text-[#1B2632]">
                  Filter by Best Fit For
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => onFilterBestFitForChange(null)}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                        !filterBestFitFor
                          ? "border-[#A35139] bg-[#A35139]/5 text-[#A35139] font-semibold"
                          : "border-gray-200 hover:border-[#A35139]/30"
                      }`}
                    >
                      All Categories
                    </button>
                    {uniqueBestFitFor.map((bestFit) => (
                      <button
                        key={bestFit}
                        onClick={() =>
                          onFilterBestFitForChange(
                            filterBestFitFor === bestFit ? null : bestFit,
                          )
                        }
                        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                          filterBestFitFor === bestFit
                            ? "border-[#A35139] bg-[#A35139]/5 text-[#A35139] font-semibold"
                            : "border-gray-200 hover:border-[#A35139]/30"
                        }`}
                      >
                        {bestFit}
                      </button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => {
              onFilterTypeChange("all");
              onFilterBestFitForChange(null);
            }}
          >
            Clear All
          </Button>
          <Button
            className="bg-[#A35139] text-white hover:bg-[#A35139]/90"
            onClick={() => onOpenChange(false)}
          >
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
