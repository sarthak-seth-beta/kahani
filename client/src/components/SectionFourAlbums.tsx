import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Music, Loader2 } from "lucide-react";

export interface AlbumCard {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  questions: string[];
}

export interface SectionFourAlbumsProps {
  albums?: AlbumCard[];
  onTryDemo?: () => void;
}

export default function SectionFourAlbums({
  albums: propAlbums,
  onTryDemo,
}: SectionFourAlbumsProps) {
  const {
    data: fetchedAlbums,
    isLoading,
    error,
  } = useQuery<AlbumCard[]>({
    queryKey: ["/api/albums"],
    enabled: !propAlbums, // Only fetch if albums not provided as prop
  });

  // Use prop albums if provided, otherwise use fetched albums
  const albums = propAlbums || fetchedAlbums || [];

  if (isLoading && !propAlbums) {
    return (
      <section className="w-full bg-[#EEE9DF] px-4 sm:px-6 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-[#A35139]" />
        </div>
      </section>
    );
  }

  if (error && !propAlbums) {
    return (
      <section className="w-full bg-[#EEE9DF] px-4 sm:px-6 py-16 sm:py-20">
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
    <section className="w-full bg-[#EEE9DF] px-4 sm:px-6 py-16 sm:py-20">
      <div className="max-w-6xl mx-auto space-y-10 sm:space-y-12">
        {/* Heading */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1B2632] text-center font-['Outfit']">
          Explore albums
        </h2>

        {/* Albums Slider */}
        <div
          className="overflow-x-auto scrollbar-hide -mx-6 px-6 pb-8"
          role="region"
          aria-label="Albums carousel"
          aria-roledescription="carousel"
          style={{
            scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div className="flex gap-6 pb-4" style={{ width: "max-content" }}>
            {albums.map((album) => (
              <div
                key={album.id}
                className="flex-shrink-0 w-[85vw] max-w-[500px] bg-white rounded-2xl shadow-lg overflow-hidden"
                style={{ scrollSnapAlign: "start" }}
                aria-roledescription="carousel item"
                data-testid={`album-${album.id}`}
              >
                {/* Content - Title and Description First */}
                <div className="p-5 sm:p-6 space-y-3 sm:space-y-4">
                  <h3 className="text-xl sm:text-2xl font-bold text-[#1B2632] font-['Outfit']">
                    {album.title}
                  </h3>
                  <p className="text-[#1B2632]/70 leading-relaxed text-sm sm:text-base">
                    {album.description}
                  </p>
                </div>

                {/* Cover Image */}
                <div className="w-full aspect-video bg-[#C9C1B1]/30 overflow-hidden">
                  <img
                    src={album.cover_image}
                    alt={album.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Questions */}
                <div className="p-5 sm:p-6 space-y-3 sm:space-y-4">
                  <h4 className="text-sm font-semibold text-[#1B2632]/80 uppercase tracking-wide">
                    Questions
                  </h4>
                  <ul className="space-y-3">
                    {album.questions.slice(0, 3).map((question, index) => (
                      <li
                        key={index}
                        className="text-[#1B2632]/70 text-sm sm:text-base leading-relaxed pl-4 border-l-2 border-[#A35139]/30"
                      >
                        {question}
                      </li>
                    ))}
                  </ul>
                  {album.questions.length > 3 && (
                    <p className="text-[#A35139] text-sm sm:text-base font-semibold pl-4">
                      +{album.questions.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            ))}
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
              className="px-8 py-4 bg-[#A35139] text-white border-[#A35139] rounded-xl font-semibold text-lg shadow-lg"
              size="lg"
              data-testid="button-try-demo"
            >
              <Music className="h-5 w-5 mr-2" />
              Try Interactive Demo
            </Button>
            <p className="text-[#1B2632]/60 text-sm mt-3">
              Experience a sample Kahani album
            </p>
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
