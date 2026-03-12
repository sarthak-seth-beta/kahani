import { KeyboardEvent } from "react";

interface RelationshipCardProps {
  label: string;
  id: string;
  isSelected: boolean;
  onSelect: () => void;
  variant?: "outline" | "filled";
  colorScheme?: "brand" | "dark";
}

export function RelationshipCard({
  label,
  id,
  isSelected,
  onSelect,
  variant = "outline",
  colorScheme = "brand",
}: RelationshipCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      id={`relationship-card-${id}`}
      role="button"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`flex items-center justify-center h-16 rounded-[14px] border text-sm sm:text-base font-medium transition-all duration-150 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#A35139]
        ${
          variant === "filled"
            ? colorScheme === "dark"
              ? "bg-[#1B2632] hover:bg-[#2C3B4D] border-none text-white shadow-md shadow-black/10 active:scale-95"
              : "bg-[#A35139] hover:bg-[#8B4430] border-none text-white shadow-md shadow-black/10 active:scale-95"
            : isSelected
              ? "bg-[#A35139] hover:bg-[#8B4430] border-none text-white shadow-md shadow-black/10 scale-[0.98] active:scale-95"
              : "bg-[#F3F4F6] border-[#A35139] text-[#A35139] hover:bg-[#E5E7EB] active:scale-95"
        }
      `}
    >
      <span className="px-2 text-center">{label}</span>
    </div>
  );
}
