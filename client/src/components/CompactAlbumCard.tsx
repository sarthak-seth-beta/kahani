import { useState } from "react";
import { Play, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Album } from "./AlbumCard";

export const CompactAlbumCard = ({
  album,
  onClick,
  hideRelation = false,
  hideLikeButton = false,
  showDescription = false,
}: {
  album: Album;
  onClick: () => void;
  hideRelation?: boolean;
  hideLikeButton?: boolean;
  showDescription?: boolean;
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isBeating, setIsBeating] = useState(false);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    setIsBeating(true);
    setTimeout(() => setIsBeating(false), 300);
  };

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col w-full bg-gray-100 rounded-xl overflow-hidden shadow-sm cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-500 border border-gray-200"
    >
      {/* Image fills the whole card */}
      <div className="relative w-full aspect-[4/3] overflow-hidden">
        <img
          src={album.cover_image}
          alt={album.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />

        {/* Full Gradient Overlay for Text Visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

        {/* Play Button - Centered or Top Right? Let's go Top Right for compact */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-white/20 backdrop-blur-md hover:bg-[#A35139] text-white rounded-full shadow-sm transition-colors duration-300 active:scale-95 border border-white/20"
        >
          <Play className="w-3 h-3 ml-0.5 fill-current" />
        </button>

        {/* Content Overlay */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 flex flex-col gap-0.5",
            !hideRelation || !hideLikeButton ? "p-2" : "px-2 pt-2 pb-1.5",
          )}
        >
          <h3 className="text-sm md:text-base lg:text-lg font-bold text-white font-['Outfit'] leading-tight drop-shadow-sm line-clamp-2">
            {album.title}
          </h3>

          <p
            className={cn(
              "text-[#EEE9DF]/90 font-medium leading-relaxed line-clamp-2",
              // Using specific sizes to match LargeAlbumCard as requested
              "text-[10px] md:text-xs lg:text-sm",
              showDescription ? "block" : "hidden md:block",
            )}
          >
            {album.description}
          </p>

          {(!hideRelation || !hideLikeButton) && (
            <div className="flex items-center justify-between mt-0.5 min-h-[1rem]">
              {!hideRelation && (
                <span className="text-[9px] md:text-[10px] lg:text-xs font-medium text-white/80 uppercase tracking-wider truncate max-w-[80%]">
                  {album.best_fit_for && album.best_fit_for.length > 0
                    ? album.best_fit_for[0]
                    : "Audio Story"}
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
                      "w-3.5 h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 transition-colors duration-300",
                      isLiked
                        ? "fill-[#E5484D] text-[#E5484D]"
                        : "text-white/60 hover:text-[#E5484D]",
                    )}
                  />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
