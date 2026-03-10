import { RelationshipCard } from "./RelationshipCard";

export type RelationshipId =
  | "mom"
  | "dad"
  | "dadu-nanu"
  | "dadi-nani"
  | "partner"
  | "sibling";

const RELATIONS: { id: RelationshipId; label: string }[] = [
  { id: "mom", label: "Mom" },
  { id: "dad", label: "Dad" },
  { id: "dadu-nanu", label: "Dadu / Nanu" },
  { id: "dadi-nani", label: "Dadi / Nani" },
  { id: "partner", label: "Partner" },
  { id: "sibling", label: "Sibling" },
];

interface RelationshipSelectorProps {
  selected: RelationshipId | null;
  onChange: (relation: RelationshipId) => void;
  cardVariant?: "outline" | "filled";
  cardColorScheme?: "brand" | "dark";
}

export function RelationshipSelector({
  selected,
  onChange,
  cardVariant = "outline",
  cardColorScheme = "brand",
}: RelationshipSelectorProps) {
  return (
    <div
      className="grid grid-cols-2 gap-[14px] w-full max-w-md mx-auto"
      role="listbox"
      aria-label="Select who this book is for"
    >
      {RELATIONS.map((relation) => (
        <RelationshipCard
          key={relation.id}
          id={relation.id}
          label={relation.label}
          isSelected={selected === relation.id}
          variant={cardVariant}
          colorScheme={cardColorScheme}
          onSelect={() => onChange(relation.id)}
        />
      ))}
    </div>
  );
}

