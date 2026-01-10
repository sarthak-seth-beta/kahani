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

export interface Album {
  id: string;
  title: string;
  description: string;
  cover_image: string;
  questions: string[];
  best_fit_for?: string[] | null;
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

export const AlbumCard = ({
  album,
  variant = "default",
  onClick,
}: {
  album: Album;
  variant?: "default" | "simple";
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
    const url = `${window.location.origin}/free-trial?albumId=${encodeURIComponent(album.id)}`;
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
      className="group relative flex flex-col w-full h-full bg-white rounded-2xl overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 border border-gray-100"
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
            <span className="md:hidden block h-14 line-clamp-2 overflow-hidden text-ellipsis">
              {album.title}
            </span>
            <span className="hidden md:block">{splitTitle(album.title)}</span>
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
