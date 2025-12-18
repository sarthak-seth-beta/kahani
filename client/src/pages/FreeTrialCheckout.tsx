import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Filter } from "lucide-react";
import { FilterDialog } from "@/components/filter/FilterDialog";
import { useAlbumFilters } from "@/components/filter/useAlbumFilters";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

interface Album {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  questions?: string[];
  best_fit_for?: string[] | null;
  keywords?: string[];
}

export default function FreeTrialCheckout() {
  const [, setLocation] = useLocation();
  const {
    data: albums,
    isLoading,
    error,
  } = useQuery<Album[]>({
    queryKey: ["/api/albums"],
  });

  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set());

  // Track page view
  useEffect(() => {
    trackEvent(AnalyticsEvents.FREE_TRIAL_CHECKOUT_PAGE_VIEWED, {
      albums_count: albums?.length || 0,
    });
  }, [albums?.length]);

  const {
    searchInput,
    setSearchInput,
    filterType,
    setFilterType,
    filterBestFitFor,
    setFilterBestFitFor,
    uniqueBestFitFor,
    filteredAlbums,
  } = useAlbumFilters(albums);

  const toggleQuestions = (albumId: string) => {
    setExpandedAlbums((prev) => {
      const next = new Set(prev);
      if (next.has(albumId)) {
        next.delete(albumId);
      } else {
        next.add(albumId);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => {
                trackEvent(AnalyticsEvents.BACK_BUTTON_CLICKED, {
                  source_page: "free_trial_checkout",
                });
                setLocation("/");
              }}
              className="flex items-center gap-2 text-[#1B2632] hover-elevate active-elevate-2 px-3 py-2 rounded-lg"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1B2632]">
              Choose One Album
            </h1>
            <div className="w-20" />
          </div>
        </div>
      </div>

      {/* Album Selection */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl py-8 sm:py-12">
        {/* Filters */}
        <div className="flex flex-row items-center gap-3 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search albums..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (e.target.value.length > 0) {
                  trackEvent(AnalyticsEvents.SEARCH_PERFORMED, {
                    search_query: e.target.value,
                    search_length: e.target.value.length,
                  });
                }
              }}
              className="h-11"
            />
          </div>
          <div className="flex-shrink-0">
            <Button
              variant="outline"
              className="h-11 border-2 border-[#A35139]/30 text-[#A35139] hover:bg-[#A35139]/5 px-3 sm:px-4"
              onClick={() => {
                trackEvent(AnalyticsEvents.FILTER_DIALOG_OPENED, {
                  current_filters: {
                    filter_type: filterType,
                    filter_best_fit_for: filterBestFitFor,
                  },
                });
                setIsFilterDialogOpen(true);
              }}
            >
              <Filter className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Filter</span>
              {(filterType !== "all" || filterBestFitFor) && (
                <span className="ml-1.5 sm:ml-2 bg-[#A35139] text-white rounded-full px-1.5 sm:px-2 py-0.5 text-xs">
                  {
                    [
                      filterType !== "all" ? "1" : "",
                      filterBestFitFor ? "1" : "",
                    ].filter(Boolean).length
                  }
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Filter Dialog */}
        <FilterDialog
          isOpen={isFilterDialogOpen}
          onOpenChange={setIsFilterDialogOpen}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          filterBestFitFor={filterBestFitFor}
          onFilterBestFitForChange={setFilterBestFitFor}
          uniqueBestFitFor={uniqueBestFitFor}
        />

        {/* Trial Info Banner */}
        <div className="mb-8 p-6 bg-[#A35139]/5 rounded-2xl border border-[#A35139]/20">
          <p className="text-[#1B2632] text-lg sm:text-xl font-medium text-center font-['Outfit']">
            Pick the kind of stories you want to preserve -{" "}
            <span className="text-[#A35139] font-bold">childhood</span>,{" "}
            <span className="text-[#A35139] font-bold">love</span>,{" "}
            <span className="text-[#A35139] font-bold">wisdom</span>, or{" "}
            <span className="text-[#A35139] font-bold">family moments</span>.
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-[#A35139]" />
          </div>
        )}
        {error && (
          <div className="text-center py-12">
            <p className="text-[#1B2632]/70">Failed to load albums</p>
          </div>
        )}
        {filteredAlbums && filteredAlbums.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 lg:gap-8">
            {filteredAlbums.map((album) => (
              <Card
                key={album.id}
                className="overflow-hidden shadow-lg transition-all hover-elevate h-full flex flex-col"
                data-testid={`album-card-${album.id}`}
              >
                <CardContent className="p-0 flex flex-col h-full">
                  {/* Album Image */}
                  <div className="relative h-44 sm:h-44 md:h-40 lg:h-44 w-full overflow-hidden">
                    <img
                      src={album.cover_image}
                      alt={album.title}
                      className="w-full h-full object-cover"
                      data-testid={`album-image-${album.id}`}
                    />
                  </div>

                  {/* Album Content */}
                  <div className="p-5 sm:p-6 lg:p-6 xl:p-6 space-y-4 flex-1 flex flex-col">
                    {/* Title and Description */}
                    <div className="flex-1">
                      <h2
                        className="text-2xl sm:text-2xl lg:text-2xl xl:text-3xl font-bold text-[#1B2632] mb-2"
                        data-testid={`album-title-${album.id}`}
                      >
                        {album.title}
                      </h2>
                      <p
                        className="text-[#1B2632]/70 text-base sm:text-base lg:text-base xl:text-lg leading-relaxed line-clamp-3"
                        data-testid={`album-description-${album.id}`}
                      >
                        {album.description}
                      </p>
                    </div>

                    {/* Show Questions Button */}
                    {album.questions && album.questions.length > 0 && (
                      <div className="pt-1">
                        <Button
                          variant="ghost"
                          className="w-full text-[#A35139] hover:text-[#A35139]/80 hover:bg-[#A35139]/5 text-sm font-medium"
                          onClick={() => toggleQuestions(album.id)}
                          data-testid={`button-show-questions-${album.id}`}
                        >
                          {expandedAlbums.has(album.id)
                            ? "Hide Questions"
                            : `Show Questions (${album.questions.length})`}
                        </Button>
                        {expandedAlbums.has(album.id) && (
                          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                            <ul className="space-y-2">
                              {album.questions.map((question, index) => (
                                <li
                                  key={index}
                                  className="text-[#1B2632]/80 text-sm leading-relaxed pl-3 border-l-2 border-[#A35139]/40"
                                >
                                  {question}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Direct Detail Button */}
                    <div className="pt-1 flex">
                      <Button
                        variant="outline"
                        className="w-full border-2 border-[#A35139] text-[#A35139] rounded-2xl"
                        onClick={() => {
                          trackEvent(AnalyticsEvents.ALBUM_SELECTED, {
                            album_id: album.id,
                            album_title: album.title,
                            source: "free_trial_checkout",
                          });
                          trackEvent(AnalyticsEvents.ALBUM_VIEW_DETAILS, {
                            album_id: album.id,
                            album_title: album.title,
                          });
                          setLocation(
                            `/free-trial?albumId=${encodeURIComponent(album.id)}`,
                          );
                        }}
                        data-testid={`button-select-album-${album.id}`}
                      >
                        View Details &amp; Start Free Trial
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {albums && albums.length > 0 && (
          <div className="mt-8 p-6 bg-[#EEE9DF]/50 rounded-2xl">
            <p className="text-center text-[#1B2632]/70 text-sm sm:text-base">
              Each album contains thoughtfully crafted questions. To customise
              your questions, please{" "}
              <a
                href="https://wa.me/?text=Hi%2C%20I%20would%20like%20to%20customize%20my%20album%20questions."
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#A35139] hover:underline"
              >
                contact us
              </a>
              .
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
