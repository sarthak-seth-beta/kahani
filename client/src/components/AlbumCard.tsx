import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Share2,
  Copy,
  Mail,
  MessageCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AlbumCard as AlbumCardType } from "@/components/SectionFourAlbums";

export interface AlbumCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "style"> {
  album: AlbumCardType;
  /**
   * Number of questions to show in preview
   * @default 2
   */
  questionsToShow?: number;
  /**
   * Whether to show image before content
   * @default true
   */
  imageFirst?: boolean;
  /**
   * Additional className for the card container
   */
  className?: string;
  /**
   * Additional styles for the card container
   */
  style?: React.CSSProperties;
}

export function AlbumCard({
  album,
  questionsToShow = 2,
  imageFirst = true,
  className = "",
  style,
  ...restProps
}: AlbumCardProps) {
  const { toast } = useToast();

  const getShareUrl = (albumId: string) => {
    return `${window.location.origin}/free-trial?albumId=${encodeURIComponent(
      albumId,
    )}`;
  };

  const handleCopyLink = async (albumId: string, albumTitle: string) => {
    const url = getShareUrl(albumId);
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: `${albumTitle} link copied to clipboard.`,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShareWhatsApp = (albumId: string, albumTitle: string) => {
    const url = getShareUrl(albumId);
    const message = `Check out this Kahani album: ${albumTitle}\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleShareEmail = (albumId: string, albumTitle: string) => {
    const url = getShareUrl(albumId);
    const subject = `Check out this Kahani album: ${albumTitle}`;
    const body = `I found this interesting Kahani album that you might like:\n\n${albumTitle}\n\n${url}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  };

  const handleNativeShare = async (albumId: string, albumTitle: string) => {
    const url = getShareUrl(albumId);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Kahani Album: ${albumTitle}`,
          text: `Check out this Kahani album: ${albumTitle}`,
          url: url,
        });
      } catch (err) {
        // User cancelled or error occurred
        if ((err as Error).name !== "AbortError") {
          toast({
            title: "Share failed",
            description: "Please try another sharing method.",
            variant: "destructive",
          });
        }
      }
    }
  };

  const imageSection = (
    <div className="w-full aspect-video bg-[#C9C1B1]/30 overflow-hidden">
      <img
        src={album.cover_image}
        alt={album.title}
        className="w-full h-full object-cover"
      />
    </div>
  );

  const contentSection = (
    <div className="p-5 sm:p-6 space-y-3 sm:space-y-4">
      <h3 className="text-xl sm:text-2xl font-bold text-[#1B2632] font-['Outfit'] pr-10">
        {album.title}
      </h3>
      <p className="text-[#1B2632]/70 leading-relaxed text-sm sm:text-base line-clamp-3">
        {album.description}
      </p>

      {/* Questions Preview */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-[#1B2632]/80 uppercase tracking-wide">
          Questions
        </h4>
        <ul className="space-y-2 sm:space-y-3">
          {album.questions.slice(0, questionsToShow).map((question, index) => (
            <li
              key={index}
              className="text-[#1B2632]/70 text-sm sm:text-base leading-relaxed pl-4 border-l-2 border-[#A35139]/30"
            >
              {question}
            </li>
          ))}
        </ul>
        {album.questions.length > questionsToShow && (
          <p className="text-[#A35139] text-sm sm:text-base font-semibold pl-4">
            +{album.questions.length - questionsToShow} more{" "}
            {questionsToShow === 2 ? "questions" : ""}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg overflow-hidden relative ${className}`}
      style={style}
      data-testid={`album-${album.id}`}
      {...restProps}
    >
      {/* Share Icon - Top Right */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="absolute top-4 right-4 z-10 p-2 bg-white/90 hover:bg-white rounded-full shadow-md transition-all duration-200 hover:scale-110"
            aria-label={`Share ${album.title} album`}
            data-testid={`share-album-${album.id}`}
          >
            <Share2 className="h-5 w-5 text-[#A35139]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => handleCopyLink(album.id, album.title)}
            className="cursor-pointer"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy link
          </DropdownMenuItem>
          {typeof navigator.share === "function" && (
            <DropdownMenuItem
              onClick={() => handleNativeShare(album.id, album.title)}
              className="cursor-pointer"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Share...
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => handleShareWhatsApp(album.id, album.title)}
            className="cursor-pointer"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Share on WhatsApp
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleShareEmail(album.id, album.title)}
            className="cursor-pointer"
          >
            <Mail className="mr-2 h-4 w-4" />
            Share via Email
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Content Order: Image First or Content First */}
      {imageFirst ? (
        <>
          {imageSection}
          {contentSection}
        </>
      ) : (
        <>
          {contentSection}
          {imageSection}
        </>
      )}
    </div>
  );
}

