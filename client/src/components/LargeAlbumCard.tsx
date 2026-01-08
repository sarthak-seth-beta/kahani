import { useState } from "react";
import { Play, Share2, Heart, Copy, Mail, MessageCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Album } from "./AlbumCard"; // Importing type from original card to keep consistent

export const LargeAlbumCard = ({
  album,
  onClick,
  hideRelation = false,
  hideLikeButton = false,
}: {
  album: Album;
  onClick: () => void;
  hideRelation?: boolean;
  hideLikeButton?: boolean;
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
    const url = window.location.href;
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
      className="group relative flex flex-col w-full bg-white rounded-xl overflow-hidden shadow-md cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border border-gray-100"
    >
      {/* Image Area - Aspect Ratio Square or similar for mobile consistency */}
      <div className="relative aspect-square w-full flex-shrink-0 overflow-hidden">
        <img
          src={album.cover_image}
          alt={album.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />

        {/* Faded Bottom Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/60 to-transparent" />

        {/* Share Dropdown (Top Right) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2 right-2 p-1.5 bg-[#1B2632] hover:bg-[#1B2632]/90 rounded-full transition-all duration-300 group/share shadow-sm focus:outline-none"
            >
              <Share2 className="w-3 h-3 text-white" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-40 bg-white/95 backdrop-blur-sm border-[#1B2632]/10 shadow-xl rounded-lg"
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleShare("copy");
              }}
              className="cursor-pointer text-xs md:text-sm"
            >
              <Copy className="mr-2 h-3 w-3 md:h-4 md:w-4" /> Copy link
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleShare("whatsapp");
              }}
              className="cursor-pointer text-xs md:text-sm"
            >
              <MessageCircle className="mr-2 h-3 w-3 md:h-4 md:w-4" /> Whatsapp
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleShare("email");
              }}
              className="cursor-pointer text-xs md:text-sm"
            >
              <Mail className="mr-2 h-3 w-3 md:h-4 md:w-4" /> Email
            </DropdownMenuItem>
            {typeof navigator.share === "function" && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare("native");
                }}
                className="cursor-pointer text-xs md:text-sm"
              >
                <Share2 className="mr-2 h-3 w-3 md:h-4 md:w-4" /> Share...
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
          className="absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center bg-[#A35139] hover:bg-[#8B4430] text-white rounded-full shadow-md transition-colors duration-300 z-10 active:scale-95"
        >
          <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
        </button>
      </div>

      {/* Content Area */}
      <div
        className={cn(
          "flex flex-col flex-grow bg-white z-0 gap-1 md:gap-1.5",
          !hideRelation || !hideLikeButton
            ? "px-2.5 pt-2 pb-2"
            : "px-2.5 pt-2 pb-1.5",
        )}
      >
        <div className="space-y-0.5">
          <h3 className="text-sm md:text-base lg:text-lg font-bold text-[#1B2632] font-['Outfit'] leading-tight line-clamp-2">
            {album.title}
          </h3>
          <p className="text-[#1B2632]/70 text-[10px] md:text-xs lg:text-sm font-medium leading-normal line-clamp-2">
            {album.description}
          </p>
        </div>

        {(!hideRelation || !hideLikeButton) && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-1.5 mt-auto">
            {!hideRelation && (
              <span className="text-[8px] md:text-[10px] lg:text-xs font-bold text-[#1B2632]/50 tracking-wider uppercase leading-none truncate max-w-[75%]">
                {album.best_fit_for && album.best_fit_for.length > 0
                  ? `FOR ${album.best_fit_for.join(", ")}`
                  : "AUDIO STORY • 12:34"}
              </span>
            )}

            {!hideLikeButton && (
              <button
                onClick={handleLike}
                className={cn(
                  "transition-all duration-300 transform ml-auto",
                  isBeating && "scale-125",
                  !isBeating && "scale-100",
                )}
              >
                <Heart
                  className={cn(
                    "w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 transition-colors duration-300 ml-1.5",
                    isLiked
                      ? "fill-[#E5484D] text-[#E5484D]"
                      : "text-[#1B2632]/30 hover:text-[#E5484D]",
                  )}
                />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
