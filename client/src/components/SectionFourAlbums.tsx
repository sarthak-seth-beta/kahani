import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Music, Loader2, ArrowRight } from "lucide-react";
import { AlbumCard } from "@/components/AlbumCard";

export interface AlbumCard {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  questions: string[];
  best_fit_for?: string[] | null;
}

export interface SectionFourAlbumsProps {
  albums?: AlbumCard[];
  onTryDemo?: () => void;
}

export default function SectionFourAlbums({
  albums: propAlbums,
  onTryDemo,
}: SectionFourAlbumsProps) {
  const [, setLocation] = useLocation();
  const {
    data: fetchedAlbums,
    isLoading,
    error,
  } = useQuery<AlbumCard[]>({
    queryKey: ["/api/albums"],
    enabled: !propAlbums, // Only fetch if albums not provided as prop
  });

  // Use prop albums if provided, otherwise use fetched albums
  const allAlbums = propAlbums || fetchedAlbums || [];
  // Show only first 4 albums
  const albums = allAlbums.slice(0, 4);

  if (isLoading && !propAlbums) {
    return (
      <section className="w-full bg-[#EEE9DF] px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-[#A35139]" />
        </div>
      </section>
    );
  }

  if (error && !propAlbums) {
    return (
      <section className="w-full bg-[#EEE9DF] px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-[#1B2632]/70">Failed to load albums</p>
        </div>
      </section>
    );
  }

  if (!albums || albums.length === 0) {
    return null;
  }
  return (
    <section
      id="albums"
      className="w-full bg-[#EEE9DF] px-4 sm:px-6 py-8 sm:py-12"
    >
      <div className="max-w-6xl mx-auto space-y-8 sm:space-y-10">
        {/* Heading */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1B2632] text-center font-['Outfit']">
          Explore albums
        </h2>

        {/* Albums Slider */}
        <div
          className="overflow-x-auto scrollbar-hide -mx-4 sm:-mx-6 pl-6 pr-4 sm:pl-6 sm:pr-6 pb-8"
          role="region"
          aria-label="Albums carousel"
          aria-roledescription="carousel"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div className="flex gap-6 pb-4" style={{ width: "max-content" }}>
            {albums.map((album, index) => (
              <AlbumCard
                key={album.id}
                album={album}
                questionsToShow={3}
                className="flex-shrink-0 w-[85vw] max-w-[500px]"
                style={{ scrollSnapAlign: "start" }}
                aria-roledescription="carousel item"
              />
            ))}

            {/* View All Albums CTA - Right side of 4th album */}
            {allAlbums && allAlbums.length > 0 && (
              <div
                className="flex-shrink-0 w-[85vw] max-w-[500px] bg-white rounded-2xl shadow-lg overflow-hidden relative"
                style={{ scrollSnapAlign: "start" }}
                data-testid="cta-view-all-albums"
              >
                <div className="p-5 sm:p-6 h-full min-h-[600px] flex flex-col items-center justify-center space-y-4 sm:space-y-6 text-center">
                  <div className="w-full aspect-video bg-gradient-to-br from-[#A35139]/10 to-[#C9C1B1]/30 rounded-xl flex items-center justify-center mb-4">
                    <ArrowRight className="h-16 w-16 text-[#A35139]/40" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#1B2632] font-['Outfit']">
                    Explore More
                  </h3>
                  <p className="text-[#1B2632]/70 text-sm sm:text-base leading-relaxed px-4">
                    {allAlbums.length > 4
                      ? `View all ${allAlbums.length} albums in our collection`
                      : "View all albums in our collection"}
                  </p>
                  <Button
                    onClick={() => setLocation("/all-albums")}
                    className="px-8 py-3 bg-[#1B2632] text-[#EEE9DF] border-[#1B2632] rounded-2xl font-semibold text-base shadow-xl hover:bg-[#1B2632]/90 transition-colors mt-4"
                    size="lg"
                    data-testid="button-view-all-albums"
                  >
                    View All Albums
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scroll Indicator Dots */}
        <div className="flex justify-center gap-3 pt-4">
          {albums.map((_, index) => (
            <div
              key={index}
              className="w-2.5 h-2.5 rounded-full bg-[#A35139]/40 hover:bg-[#A35139] transition-colors duration-300"
            />
          ))}
        </div>

        {/* Try Interactive Demo Button */}
        {onTryDemo && (
          <div className="text-center pt-8">
            <Button
              onClick={onTryDemo}
              className="px-8 py-4 bg-[#1B2632] text-[#EEE9DF] border-[#1B2632] rounded-2xl font-semibold text-lg shadow-xl"
              size="lg"
              data-testid="button-try-demo"
            >
              <Music className="h-5 w-5 mr-2" />
              View Sample Album
            </Button>
          </div>
        )}
      </div>

      {/* Hide scrollbar styling */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
}
