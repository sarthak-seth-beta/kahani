import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { type Album } from "@/components/AlbumCard";
import { LargeAlbumCard } from "@/components/LargeAlbumCard";

export default function Albums() {
  const [, setLocation] = useLocation();

  // Get initial category from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const initialCategory = urlParams.get("category") || "All";

  const [selectedCategory] = useState<string>(initialCategory);

  const {
    data: albums,
    isLoading,
    error,
  } = useQuery<Album[]>({
    queryKey: ["/api/albums"],
  });

  // Shuffle albums randomly on load and when category changes
  const shuffledAlbums = useMemo(() => {
    if (!albums) return [];
    const array = [...albums];
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }, [albums, selectedCategory]);

  const filteredAlbums = useMemo(() => {
    if (!shuffledAlbums) return [];

    let result = shuffledAlbums;

    // Filter by Categories (based on best_fit_for)
    if (selectedCategory !== "All") {
      result = result.filter((album) =>
        album.best_fit_for?.some((cat) =>
          cat.toLowerCase().includes(selectedCategory.toLowerCase()),
        ),
      );
    }

    return result;
  }, [shuffledAlbums, selectedCategory]);

  // Limit to 3 albums to leave room for the custom trailing card
  const displayAlbums = useMemo(() => {
    if (!filteredAlbums) return [];
    return filteredAlbums.slice(0, 3);
  }, [filteredAlbums]);

  const getPageTitle = (category: string) => {
    if (category === "All") return "All Themes";
    if (category === "dadu" || category === "nanu") {
      return "Themes for Dadu/Nanu";
    }
    if (category === "dadi" || category === "nani") {
      return "Themes for Dadi/Nani";
    }
    return `Themes for ${category}`;
  };

  const pageTitle = getPageTitle(selectedCategory);

  return (
    <div className="relative w-full min-h-screen bg-[#EEE9DF] flex flex-col overflow-hidden">
      {/* Subtle mandala background accents */}
      {/* Top-right for all viewports */}
      <div className="pointer-events-none absolute -top-8 right-[-10px] sm:top-4 sm:right-16 opacity-[0.2] w-72 sm:w-96 aspect-square mix-blend-multiply">
        <img
          src="/attached_assets/mandala.png"
          alt="Decorative mandala"
          className="w-full h-full object-contain"
          aria-hidden="true"
        />
      </div>
      {/* On xs, show the second mandala around mid-page; on sm+ keep it near the bottom */}
      <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 left-[-10px] sm:top-auto sm:translate-y-0 sm:bottom-4 sm:left-16 opacity-[0.2] w-72 sm:w-96 aspect-square rotate-180 mix-blend-multiply">
        <img
          src="/attached_assets/mandala.png"
          alt="Decorative mandala"
          className="w-full h-full object-contain"
          aria-hidden="true"
        />
      </div>

      {/* Header with back button + centered title */}
      <header className="relative z-10 w-full px-4 pt-4 pb-2 flex items-center">
        <Button
          id="albums-back"
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/narrator-else")}
          className="min-h-[40px] min-w-[40px] h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white/90 border border-[#C9C1B1]/20"
        >
          <ArrowLeft className="h-5 w-5 text-[#1B2632]" />
        </Button>
        <h1 className="flex-1 text-lg sm:text-2xl md:text-3xl font-bold text-[#1B2632] font-['Outfit'] text-center truncate">
          {pageTitle}
        </h1>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 w-full">
        <section className="w-full px-2 md:px-8 pt-4 pb-8 min-h-[calc(100vh-64px)] flex flex-col items-center">
          <div className="w-full max-w-5xl mx-auto flex flex-col flex-1 space-y-4 md:space-y-8">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center min-h-[300px]">
                <Loader2 className="h-4 w-4 animate-spin text-[#A35139]" />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <p className="text-[#1B2632]/70 text-lg">
                  Failed to load albums. Please try again later.
                </p>
              </div>
            )}

            {/* Albums grid + custom card */}
            {!isLoading && !error && displayAlbums.length > 0 && (
              <div className="w-full px-1 flex-1 flex flex-col justify-center pb-8 md:pb-16">
                <div className="grid grid-cols-2 gap-3 md:gap-6 w-full max-w-lg md:max-w-4xl mx-auto content-center">
                  {displayAlbums.map((album) => (
                    <LargeAlbumCard
                      key={album.id}
                      album={album}
                      hideRelation={true}
                      hideLikeButton={true}
                      onClick={() =>
                        setLocation(
                          `/free-trial?albumId=${encodeURIComponent(album.id)}`,
                        )
                      }
                    />
                  ))}

                  {/* Custom 'Create Album' Card mimicking original CustomAlbumCard but sized like LargeAlbumCard */}
                  <div
                    id="albums-create-custom-card"
                    onClick={() => setLocation("/create-album")}
                    className="group relative flex flex-col w-full bg-[#EEE9DF] rounded-xl overflow-hidden shadow-sm cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-500 border border-gray-200"
                  >
                    <div className="relative w-full flex-1 min-h-0 aspect-square flex flex-col items-center justify-center bg-white group-hover:bg-[#fcfbf9] transition-colors duration-300">
                      <div className="absolute inset-3 md:inset-4 border-2 border-dashed border-[#1B2632]/20 rounded-lg flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-[#A35139]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Plus className="w-5 h-5 md:w-7 md:h-7 text-[#A35139]" />
                        </div>

                        <div className="flex flex-col items-center text-center px-2">
                          <span className="text-xs md:text-sm font-bold text-[#1B2632]/80 font-['Outfit'] uppercase tracking-wide">
                            Customise your Questions
                          </span>
                          {/* <span className="text-[10px] md:text-xs text-[#1B2632]/50 font-medium mt-1">
                            Craft your own album
                          </span> */}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {displayAlbums.length === 0 && !isLoading && !error && (
              <div className="flex-1 text-center py-20 flex flex-col items-center justify-center">
                <h3 className="text-xl font-bold text-[#1B2632] mb-2 font-['Outfit']">
                  Coming Soon
                </h3>
                <p className="text-[#1B2632]/70 text-base max-w-sm mx-auto">
                  Try a different relation from the previous screen.
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="md:hidden">
          <Footer />
        </div>
      </main>
    </div>
  );
}
