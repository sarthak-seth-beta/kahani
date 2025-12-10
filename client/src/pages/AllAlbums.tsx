import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import SimpleHeader from "@/components/SimpleHeader";
import { Footer } from "@/components/Footer";
import type { AlbumCard } from "@/components/SectionFourAlbums";
import { AlbumCard as AlbumCardComponent } from "@/components/AlbumCard";

export default function AllAlbums() {
  const {
    data: albums,
    isLoading,
    error,
  } = useQuery<AlbumCard[]>({
    queryKey: ["/api/albums"],
  });

  return (
    <div className="w-full min-h-screen bg-[#EEE9DF]">
      <SimpleHeader />

      <section className="w-full px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto space-y-8 sm:space-y-10">
          {/* Back Button */}
          {/* <div className="flex justify-start mb-4">
            <Button
              onClick={() => setLocation("/")}
              variant="ghost"
              className="text-[#A35139] hover:text-[#8B4229] hover:bg-[#A35139]/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div> */}

          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1B2632] font-['Outfit']">
              All Albums
            </h1>
            <p className="text-lg text-[#1B2632]/70 max-w-2xl mx-auto">
              Explore our complete collection of Kahani albums
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-[#A35139]" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <p className="text-[#1B2632]/70 text-lg">
                Failed to load albums. Please try again later.
              </p>
            </div>
          )}

          {/* Albums Grid */}
          {albums && albums.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {albums.map((album) => (
                <AlbumCardComponent
                  key={album.id}
                  album={album}
                  questionsToShow={3}
                  className="hover:shadow-xl transition-shadow duration-300"
                />
              ))}
            </div>
          )}

          {/* Empty State */}
          {albums && albums.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#1B2632]/70 text-lg">
                No albums available at the moment.
              </p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
