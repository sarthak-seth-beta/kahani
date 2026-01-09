import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { AlbumCard, type Album } from "@/components/AlbumCard";
import { Button } from "./ui/button";

interface SectionFourAlbumsNewProps {
  albums?: Album[];
  onTryDemo?: () => void;
}

export default function SectionFourAlbumsNew({
  albums: propAlbums,
}: SectionFourAlbumsNewProps) {
  const [, setLocation] = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const {
    data: fetchedAlbums,
    isLoading,
    error,
  } = useQuery<Album[]>({
    queryKey: ["/api/albums"],
    enabled: !propAlbums,
  });

  const allAlbums = propAlbums || fetchedAlbums || [];
  const displayAlbums = allAlbums;

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 340; // Approx card width + gap
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (isLoading && !propAlbums) {
    return (
      <section className="w-full bg-[#FAFAFA] py-20 min-h-[500px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#A35139]" />
      </section>
    );
  }

  if (error && !propAlbums) return null;

  return (
    <section className="w-full bg-[#FAFAFA] px-0 sm:px-6 py-16 sm:py-24 relative group/section">
      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-8 space-y-4 px-4">
          <h2 className="text-3xl md:text-5xl font-bold text-[#1B2632] font-['Outfit']">
            Explore Our Albums
          </h2>
          <p className="text-lg text-[#1B2632]/60 max-w-2xl mx-auto">
            Discover the perfect way to preserve your family's legacy with our
            curated albums.
          </p>
        </div>

        <div className="relative">
          {/* Navigation Buttons */}
          <button
            onClick={() => scroll("left")}
            className="absolute left-2 sm:left-0 top-1/2 -translate-y-1/2 sm:-ml-4 z-20 w-10 h-10 sm:w-12 sm:h-12 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center text-[#1B2632] shadow-lg hover:bg-white transition-all opacity-100 sm:opacity-0 sm:group-hover/section:opacity-100 disabled:opacity-0"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            onClick={() => scroll("right")}
            className="absolute right-2 sm:right-0 top-1/2 -translate-y-1/2 sm:-mr-4 z-20 w-10 h-10 sm:w-12 sm:h-12 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center text-[#1B2632] shadow-lg hover:bg-white transition-all opacity-100 sm:opacity-0 sm:group-hover/section:opacity-100 disabled:opacity-0"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Horizontal Scroll Container */}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto pb-8 scrollbar-hide"
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <div className="flex gap-6 w-max px-[7.5vw] sm:px-0 sm:mx-auto">
              {displayAlbums.map((album) => (
                <div
                  key={album.id}
                  className="h-[520px] w-[85vw] sm:w-[320px] flex-shrink-0"
                  style={{ scrollSnapAlign: "center" }}
                >
                  <AlbumCard
                    album={album}
                    onClick={() =>
                      setLocation(
                        `/free-trial?albumId=${encodeURIComponent(album.id)}`,
                      )
                    }
                  />
                </div>
              ))}

              {/* View All Albums Card */}
              <div
                className="h-[520px] w-[85vw] sm:w-[320px] flex-shrink-0 bg-[#F5F5F0] rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-[#1B2632]/10 hover:border-[#A35139]/30 hover:bg-[#F0F0EB] transition-all duration-300 cursor-pointer group/view-all"
                style={{ scrollSnapAlign: "center" }}
                onClick={() => setLocation("/all-albums")}
              >
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-md mb-6 group-hover/view-all:scale-110 transition-transform duration-300">
                  <ArrowRight className="w-8 h-8 text-[#A35139]" />
                </div>
                <h3 className="text-2xl font-bold text-[#1B2632] font-['Outfit'] mb-2">
                  View All
                </h3>
                <p className="text-[#1B2632]/60 text-sm font-medium">
                  Browse our full collection
                </p>
              </div>

              {/* Spacer for last item padding */}
              <div className="w-[7.5vw] sm:w-0 flex-shrink-0" />
            </div>
          </div>
        </div>
        {/* View All Button */}
        <div className="flex justify-center mt-2">
          <Button
            onClick={() => setLocation("/all-albums")}
            className="px-6 py-2 bg-transparent border-2 border-[#A35139] text-[#A35139] hover:bg-[#A35139] hover:text-white rounded-xl text-lg font-semibold transition-all duration-300 shadow-sm hover:shadow-md"
          >
            View All Albums
          </Button>
        </div>
      </div>
    </section>
  );
}
