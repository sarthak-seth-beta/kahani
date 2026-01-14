import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/Footer";
import { type Album } from "@/components/AlbumCard";
import { AlbumMasonryGrid } from "@/components/AlbumMasonryGrid";
import { cn } from "@/lib/utils";

export default function AllAlbums() {
  const [, setLocation] = useLocation();

  // Get initial category from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const initialCategory = urlParams.get("category") || "All";

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: albums,
    isLoading,
    error,
  } = useQuery<Album[]>({
    queryKey: ["/api/albums"],
  });

  const allCategories = ["All", "Mom", "Dad", "Dadu", "Nanu", "Nani", "Dadi"];

  // toggle logic (single select)
  const toggleCategory = (category: string) => {
    setSelectedCategory(category);
  };

  // Sort categories: selected one first
  const sortedCategories = useMemo(() => {
    return [...allCategories].sort((a, b) => {
      const aSelected = a === selectedCategory;
      const bSelected = b === selectedCategory;
      if (aSelected === bSelected) return 0;
      return aSelected ? -1 : 1;
    });
  }, [selectedCategory]);

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
    // Use shuffledAlbums instead of raw albums
    if (!shuffledAlbums) return [];

    let result = shuffledAlbums;

    // Filter by Categories
    if (selectedCategory !== "All") {
      result = result.filter((album) =>
        album.best_fit_for?.some((cat) =>
          cat.toLowerCase().includes(selectedCategory.toLowerCase()),
        ),
      );
    }

    // Filter by Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (album) =>
          album.title.toLowerCase().includes(query) ||
          album.description.toLowerCase().includes(query),
      );
    }

    return result;
  }, [shuffledAlbums, selectedCategory, searchQuery]);

  // Inject Custom Card at index 2 (3rd position)
  const displayAlbums = useMemo(() => {
    if (!filteredAlbums) return [];

    // Only inject if we have enough albums or if it's the filtered view where we want it.
    // User said "in place of the 3rd card... addition to the cards list".
    // We'll inject it at index 2.
    const withCustom = [...filteredAlbums];
    const customPlaceholder: Album = {
      id: "custom-card-placeholder",
      title: "Create Your Own",
      description: "Customize a Kahani album",
      cover_image: "",
      questions: [],
      best_fit_for: [],
    };

    // Check if we should insert or push
    if (withCustom.length >= 2) {
      withCustom.splice(2, 0, customPlaceholder);
    } else {
      withCustom.push(customPlaceholder);
    }

    return withCustom;
  }, [filteredAlbums]);

  return (
    <div className="w-full min-h-screen bg-[#EEE9DF] relative overflow-x-hidden md:flex">
      {/* --- MOBILE HEADER & FILTERS (md:hidden) --- */}
      <div className="md:hidden">
        {/* Mobile Header - Back Arrow Only (Contact Us Style) */}
        <header className="absolute top-0 left-0 right-0 z-40 w-full pointer-events-none">
          <div className="flex items-center justify-between px-4 py-3 pointer-events-auto">
            {!isSearchOpen ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLocation("/")}
                  className="min-h-[40px] min-w-[40px] h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white/90 border border-[#C9C1B1]/20"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSearchOpen(true)}
                  className="min-h-[40px] min-w-[40px] h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white/90 border border-[#C9C1B1]/20"
                >
                  <Search className="h-5 w-5 text-[#1B2632]" />
                </Button>
              </>
            ) : (
              <div className="flex items-center w-full gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search albums..."
                    className="w-full h-10 pl-9 pr-4 rounded-lg border border-[#C9C1B1]/40 bg-white/95 backdrop-blur-md shadow-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A35139]/20 transition-all font-['Outfit']"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded-full"
                    >
                      <X className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery("");
                  }}
                  className="text-sm font-medium text-[#1B2632] hover:bg-transparent"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </header>
      </div>

      {/* --- DESKTOP SIDEBAR (hidden md:flex) --- */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-[#E5E0D5]/50 border-r border-[#C9C1B1]/20 p-6 z-50 backdrop-blur-sm">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/")}
          className="self-start mb-8 min-h-[40px] min-w-[40px] h-10 w-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white/90 border border-[#C9C1B1]/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Desktop Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search albums..."
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-[#C9C1B1]/40 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#A35139]/20 transition-all font-['Outfit']"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded-full"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Filters Title */}
        <h3 className="text-xs font-bold text-[#1B2632]/50 uppercase tracking-wider mb-4">
          Filters
        </h3>

        {/* Vertical Category List */}
        <div className="flex flex-col gap-2 relative">
          <AnimatePresence initial={false}>
            {sortedCategories.map((category) => (
              <motion.button
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                key={category}
                onClick={() => toggleCategory(category)}
                className={cn(
                  "w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200",
                  selectedCategory === category
                    ? "bg-[#1B2632] text-white shadow-md"
                    : "text-[#1B2632]/70 hover:bg-white/60 hover:text-[#1B2632]",
                )}
              >
                {category}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 min-w-0">
        <section className="w-full px-1 md:px-8 pt-12 md:pt-8 pb-4 min-h-screen flex flex-col items-center">
          <div className="w-full max-w-5xl mx-auto space-y-4 md:space-y-8">
            {/* Page Header - Sticky on Desktop, Normal on Mobile */}
            <div className="text-center space-y-2 sticky top-0 md:static z-30 pt-4 pb-2 md:pt-0 md:pb-0 bg-[#EEE9DF]/95 md:bg-transparent backdrop-blur-sm md:backdrop-blur-none">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#1B2632] font-['Outfit']">
                All Albums
              </h1>
            </div>

            {/* Mobile Filter Bar (md:hidden) */}
            <div className="w-full overflow-x-auto no-scrollbar py-1 md:hidden sticky top-12 z-30 bg-[#EEE9DF]/95 backdrop-blur-sm [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex items-center justify-start gap-1 px-1 min-w-max mx-auto">
                <AnimatePresence initial={false}>
                  {sortedCategories.map((category) => (
                    <motion.button
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.2 }}
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap",
                        selectedCategory === category
                          ? "bg-[#1B2632] text-white shadow-md"
                          : "bg-white/50 text-[#1B2632]/70 hover:bg-white hover:text-[#1B2632] hover:shadow-sm",
                      )}
                    >
                      {category}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-4 w-4 animate-spin text-[#A35139]" />
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

            {/* Staggered Masonry Grid */}
            {!isLoading && !error && displayAlbums.length > 0 && (
              <div className="w-full px-1">
                <AlbumMasonryGrid
                  albums={displayAlbums}
                  hideRelation={true}
                  hideLikeButton={true}
                  showCompactDescription={true}
                  onCustomCardClick={() => setLocation("/create-album")}
                />
              </div>
            )}

            {/* Empty State */}
            {displayAlbums.length === 0 && !isLoading && !error && (
              <div className="text-center py-20 flex flex-col items-center justify-center">
                <h3 className="text-xl font-bold text-[#1B2632] mb-2 font-['Outfit']">
                  No albums found
                </h3>
                <p className="text-[#1B2632]/70 text-base max-w-sm mx-auto">
                  Try selecting a different category.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedCategory("All")}
                  className="text-[#A35139] mt-4 hover:bg-[#A35139]/10"
                >
                  View All Albums
                </Button>
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
