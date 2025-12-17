import { useState } from "react";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Mail, MessageCircle, Heart, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AlbumCard as AlbumCardType } from "@/components/SectionFourAlbums";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

export interface AlbumCardProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "className" | "style"
> {
  album: AlbumCardType;
  /**
   * Number of questions to show in preview
   * @default 3
   */
  questionsToShow?: number;
  /**
   * Whether to show image before content (deprecated - now always shows title, image, questions)
   * @default false
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
  questionsToShow = 3,
  imageFirst = false,
  className = "",
  style,
  ...restProps
}: AlbumCardProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const getShareUrl = (albumId: string) => {
    return `${window.location.origin}/free-trial?albumId=${encodeURIComponent(
      albumId,
    )}`;
  };

  const handleCopyLink = async (albumId: string, albumTitle: string) => {
    const url = getShareUrl(albumId);
    try {
      await navigator.clipboard.writeText(url);
      trackEvent(AnalyticsEvents.ALBUM_CARD_SHARE, {
        album_id: albumId,
        album_title: albumTitle,
        share_method: "copy_link",
      });
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
    trackEvent(AnalyticsEvents.ALBUM_CARD_SHARE, {
      album_id: albumId,
      album_title: albumTitle,
      share_method: "whatsapp",
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleShareEmail = (albumId: string, albumTitle: string) => {
    const url = getShareUrl(albumId);
    const subject = `Check out this Kahani album: ${albumTitle}`;
    const body = `I found this interesting Kahani album that you might like:\n\n${albumTitle}\n\n${url}`;
    trackEvent(AnalyticsEvents.ALBUM_CARD_SHARE, {
      album_id: albumId,
      album_title: albumTitle,
      share_method: "email",
    });
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
        trackEvent(AnalyticsEvents.ALBUM_CARD_SHARE, {
          album_id: albumId,
          album_title: albumTitle,
          share_method: "native",
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

  const handleStartRecording = () => {
    trackEvent(AnalyticsEvents.START_RECORDING_CLICKED, {
      album_id: album.id,
      album_title: album.title,
      source: "album_card",
    });
    setLocation(`/free-trial?albumId=${encodeURIComponent(album.id)}`);
  };

  const displayedQuestions = isExpanded
    ? album.questions
    : album.questions.slice(0, questionsToShow);

  const remainingCount = album.questions.length - questionsToShow;

  // Format audience tag for display - more human and warm
  const formatAudience = () => {
    if (!album.best_fit_for || album.best_fit_for.length === 0) return null;
    if (album.best_fit_for.length === 1) return album.best_fit_for[0];
    if (album.best_fit_for.length === 2) return album.best_fit_for.join(" & ");
    return `${album.best_fit_for.slice(0, 2).join(", ")} & more`;
  };

  const audienceText = formatAudience();

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg overflow-hidden relative flex flex-col ${className}`}
      style={style}
      data-testid={`album-${album.id}`}
      {...restProps}
    >
      {/* Share Icon - Top Right */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="absolute top-3 right-3 z-10 p-1.5 bg-white/95 hover:bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-[#C9C1B1]/30"
            aria-label={`Share ${album.title} album`}
            data-testid={`share-album-${album.id}`}
          >
            <Share2 className="h-4 w-4 text-[#A35139]" />
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

      {/* Content Structure: Title → Explainer → Audience → Image → Questions → CTA */}
      <div className="flex flex-col h-full">
        {/* Title Section - Fixed height for consistent image positioning */}
        <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2 min-h-[120px] sm:min-h-[130px] flex flex-col">
          <div className="flex-1 flex flex-col justify-start min-h-0">
            <h3 className="text-lg sm:text-xl font-bold text-[#1B2632] font-['Outfit'] leading-tight mb-1.5 line-clamp-2 flex-shrink-0">
              {album.title}
            </h3>

            {/* One-line explainer - emotionally clear purpose */}
            {album.description ? (
              <p className="text-[#1B2632]/80 leading-relaxed text-xs sm:text-sm mb-2 line-clamp-3 flex-shrink-0">
                {album.description}
              </p>
            ) : (
              <div className="mb-2 h-[32px] sm:h-[36px] flex-shrink-0" />
            )}
          </div>

          {/* Audience Tag - Intentional, not decorative - placed between explainer and image */}
          <div className="mt-auto flex-shrink-0">
            {audienceText ? (
              <div className="inline-flex items-center gap-1 bg-[#A35139]/10 text-[#A35139] px-2 py-0.5 rounded-full w-fit">
                <Users className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs font-semibold whitespace-nowrap">
                  Perfect for {audienceText}
                </span>
              </div>
            ) : (
              <div className="h-[20px]" />
            )}
          </div>
        </div>

        {/* Image Section - Fixed height for consistent positioning */}
        <div className="w-full bg-[#C9C1B1]/20 overflow-hidden h-[120px] sm:h-[140px] flex-shrink-0">
          <img
            src={album.cover_image}
            alt={album.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Questions Section - More inviting with clear count */}
        <div className="px-4 sm:px-5 py-3 flex-grow flex flex-col min-h-0">
          <div className="space-y-2 flex-grow min-h-0">
            {/* Questions header with count - makes it informative */}
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs sm:text-sm font-semibold text-[#1B2632]">
                A tailored set of questions
              </h4>
              <span className="text-xs text-[#1B2632]/60 font-medium">
                {album.questions.length} total
              </span>
            </div>

            {/* Questions list - improved spacing and readability */}
            <ul className="space-y-1.5">
              {displayedQuestions.map((question, index) => (
                <li
                  key={index}
                  className="text-[#1B2632]/80 text-xs sm:text-sm leading-relaxed pl-3 border-l-2 border-[#A35139]/40"
                >
                  {question}
                </li>
              ))}
            </ul>

            {/* Show remaining questions count if there are more */}
            {album.questions.length > questionsToShow && (
              <button
                onClick={() => {
                  const wasExpanded = isExpanded;
                  setIsExpanded(!isExpanded);
                  trackEvent(
                    wasExpanded
                      ? AnalyticsEvents.ALBUM_QUESTIONS_EXPANDED
                      : AnalyticsEvents.ALBUM_QUESTIONS_EXPANDED,
                    {
                      album_id: album.id,
                      action: wasExpanded ? "collapsed" : "expanded",
                      total_questions: album.questions.length,
                    },
                  );
                }}
                className="text-[#1B2632]/60 text-xs sm:text-sm font-medium mt-2 pl-3 hover:text-[#A35139] transition-colors duration-200 cursor-pointer text-left"
              >
                {isExpanded ? "Show less" : `+${remainingCount} more`}
              </button>
            )}
          </div>

          {/* CTA Button - Emotionally grounded, clear action */}
          <div className="mt-4 pt-3 border-t border-[#C9C1B1]/40 flex-shrink-0">
            <Button
              onClick={handleStartRecording}
              className="w-full bg-[#A35139] text-white hover:bg-[#8B4229] rounded-xl font-semibold text-xs sm:text-sm py-2 shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-1.5"
              size="lg"
              data-testid={`button-start-recording-${album.id}`}
            >
              <Heart className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">Start Recording</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
