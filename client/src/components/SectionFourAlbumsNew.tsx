import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Play,
  Share2,
  Loader2,
  Heart,
  Copy,
  Mail,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface Album {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  questions: string[];
  best_fit_for?: string[] | null;
}

interface SectionFourAlbumsNewProps {
  albums?: Album[];
  onTryDemo?: () => void;
}

const splitTitle = (title: string) => {
  const words = title.split(" ");
  if (words.length < 2) return title;
  const mid = Math.ceil(words.length / 2);
  return (
    <>
      {words.slice(0, mid).join(" ")}
      <br />
      {words.slice(mid).join(" ")}
    </>
  );
};

const AlbumCard = ({
  album,
  onClick,
}: {
  album: Album;
  onClick: () => void;
}) => {
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [isBeating, setIsBeating] = useState(false);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    setIsBeating(true);
    setTimeout(() => setIsBeating(false), 300); // Reset animation
  };

  const handleShare = (method: string) => {
    const url = window.location.href; // Or specific album link
    const text = `Check out this album: ${album.title}`;

    switch (method) {
      case "copy":
        navigator.clipboard.writeText(url);
        toast({
          title: "Link copied!",
          description: "Album link copied to clipboard.",
        });
        break;
      case "whatsapp":
        window.open(
          `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
          "_blank",
        );
        break;
      case "email":
        window.location.href = `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`;
        break;
      case "native":
        if (navigator.share) {
          navigator
            .share({ title: album.title, text: text, url: url })
            .catch(() => {});
        }
        break;
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col w-full h-full bg-white rounded-2xl overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 max-w-[300px] mx-auto border border-gray-100"
    >
      {/* 62% Image Area */}
      <div className="relative h-[65%] w-full flex-shrink-0 overflow-hidden">
        <img
          src={album.cover_image}
          alt={album.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />

        {/* Faded Bottom Overlay on Image - Connects to White Text Area */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/60 to-transparent" />

        {/* Share Dropdown (Top Right) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="absolute top-3 right-3 p-2 bg-[#1B2632] hover:bg-[#1B2632]/90 rounded-full transition-all duration-300 group/share shadow-md focus:outline-none"
            >
              <Share2 className="w-4 h-4 text-white" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-white/95 backdrop-blur-sm border-[#1B2632]/10 shadow-xl rounded-xl"
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleShare("copy");
              }}
              className="cursor-pointer"
            >
              <Copy className="mr-2 h-4 w-4" /> Copy link
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleShare("whatsapp");
              }}
              className="cursor-pointer"
            >
              <MessageCircle className="mr-2 h-4 w-4" /> Whatsapp
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleShare("email");
              }}
              className="cursor-pointer"
            >
              <Mail className="mr-2 h-4 w-4" /> Email
            </DropdownMenuItem>
            {typeof navigator.share === "function" && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare("native");
                }}
                className="cursor-pointer"
              >
                <Share2 className="mr-2 h-4 w-4" /> Share...
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Play Button - Floating on edge */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="absolute bottom-4 right-4 w-10 h-10 flex items-center justify-center bg-[#A35139] hover:bg-[#8B4430] text-white rounded-full shadow-lg transition-colors duration-300 z-10 active:scale-95"
        >
          <Play className="w-4 h-4 ml-0.5 fill-current" />
        </button>
      </div>

      {/* 38% Content Area */}
      <div className="relative h-[35%] px-5 pt-3 pb-3 flex flex-col justify-between bg-white z-0 gap-2">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-[#1B2632] font-['Outfit'] leading-snug">
            {splitTitle(album.title)}
          </h3>
          <p className="text-[#1B2632]/70 text-xs font-medium leading-relaxed line-clamp-2">
            {album.description}
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-auto">
          <span className="text-[9px] md:text-[10px] font-bold text-[#1B2632]/50 tracking-wider uppercase leading-tight truncate max-w-[80%]">
            {album.best_fit_for && album.best_fit_for.length > 0
              ? `PERFECT FOR ${album.best_fit_for.join(", ")}`
              : "AUDIO STORY • 12:34"}
          </span>

          <button
            onClick={handleLike}
            className={cn(
              "transition-all duration-300 transform",
              isBeating && "scale-125",
              !isBeating && "scale-100",
            )}
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-colors duration-300 ml-2",
                isLiked
                  ? "fill-[#E5484D] text-[#E5484D]"
                  : "text-[#1B2632]/30 hover:text-[#E5484D]",
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

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
          <h2 className="text-4xl md:text-5xl font-bold text-[#1B2632] font-['Outfit']">
            Explore our collection
          </h2>
          <p className="text-lg text-[#1B2632]/60 max-w-2xl mx-auto">
            Discover the perfect way to preserve your family's legacy with our
            curated templates.
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
      </div>
    </section>
  );
}
