import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import {
  RelationshipSelector,
  type RelationshipId,
} from "./RelationshipSelector/RelationshipSelector";

export default function GetStartedSection2() {
  const [, setLocation] = useLocation();
  const [selectedRelation, setSelectedRelation] =
    useState<RelationshipId | null>(null);

  const handleRelationChange = (relation: RelationshipId) => {
    setSelectedRelation(relation);
    // Map relation ids to category labels used by /albums
    const relationToLabel: Record<RelationshipId, string> = {
      mom: "Mom",
      dad: "Dad",
      "dadu-nanu": "Dadu",
      "dadi-nani": "Dadi",
      partner: "Partner",
      sibling: "Sibling",
    };

    const categoryLabel = relationToLabel[relation];
    setLocation(`/albums?category=${encodeURIComponent(categoryLabel)}`);
  };

  const handleGetStarted = () => {
    // if (!selectedRelation) return;
    setLocation("/narrator");
  };

  const isCtaDisabled = !selectedRelation;

  return (
    <section className="relative py-12 bg-[#EEE9DF] overflow-hidden flex flex-col items-center px-4">
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#FAFAFA] to-[#EEE9DF] z-0" />

      <div className="relative z-10 flex flex-col items-center w-full">
        <h2 className="text-3xl md:text-5xl font-bold font-['Outfit'] text-[#1B2632] tracking-wider mb-4 text-center">
          Make a book for
        </h2>
        <p className="text-sm text-[#4B5563] mb-6 text-center font-['Outfit']">
          Choose who you&apos;re creating this book for.
        </p>

        <RelationshipSelector
          selected={selectedRelation}
          onChange={handleRelationChange}
          cardVariant="filled"
          cardColorScheme="dark"
        />

        <div className="relative flex mx-auto mt-8 text-center">
          <Button
            id="get-started"
            onClick={() => setLocation("/narrator")}
            className="px-10 py-3 bg-[#A35139] hover:bg-[#8B4430] border-none text-white rounded-2xl text-lg shadow-md transition-all duration-300 w-fit disabled:opacity-100"
          >
            Get Started
          </Button>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-[#FAFAFA] z-0" />
    </section>
  );
}
