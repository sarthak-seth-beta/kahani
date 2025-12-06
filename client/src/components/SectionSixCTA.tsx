import { Button } from "@/components/ui/button";

interface SectionSixCTAProps {
  onStartTrial?: () => void;
}

export default function SectionSixCTA({ onStartTrial }: SectionSixCTAProps) {
  return (
    <section className="w-full bg-[#EEE9DF] px-4 sm:px-6 py-8 sm:py-12">
      <div className="max-w-2xl mx-auto flex justify-center">
        <Button
          onClick={onStartTrial}
          className="px-8 bg-[#1B2632] text-[#EEE9DF] border-[#1B2632] rounded-2xl font-semibold text-lg shadow-2xl"
          size="lg"
          data-testid="button-record-now"
        >
          Record Now
        </Button>
      </div>
    </section>
  );
}
