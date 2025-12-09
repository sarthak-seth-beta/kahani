import { useState } from "react";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Mail, MessageCircle, ChevronDown, ChevronUp, Heart, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AlbumCard as AlbumCardType } from "@/components/SectionFourAlbums";

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
  const [showAllQuestions, setShowAllQuestions] = useState(false);

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

  const handleStartRecording = () => {
    setLocation(`/free-trial?albumId=${encodeURIComponent(album.id)}`);
  };

  const displayedQuestions = showAllQuestions
    ? album.questions
    : album.questions.slice(0, questionsToShow);
  const remainingQuestions = album.questions.length - questionsToShow;

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

      {/* Content Structure: Title → Explainer → Audience → Image → Questions → CTA */}
      <div className="flex flex-col h-full">
        {/* Title Section - Larger, clearer hierarchy */}
        <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4">
          <h3 className="text-2xl sm:text-3xl font-bold text-[#1B2632] font-['Outfit'] leading-tight mb-3">
            {album.title}
          </h3>
          
          {/* One-line explainer - emotionally clear purpose */}
          {album.description && (
            <p className="text-[#1B2632]/80 leading-relaxed text-base sm:text-lg mb-4">
              {album.description}
            </p>
          )}

          {/* Audience Tag - Intentional, not decorative - placed between explainer and image */}
          {audienceText && (
            <div className="inline-flex items-center gap-2 bg-[#A35139]/10 text-[#A35139] px-4 py-2 rounded-full mb-4">
              <Users className="h-4 w-4" />
              <span className="text-sm font-semibold">
                Perfect for {audienceText}
              </span>
            </div>
          )}
        </div>

        {/* Image Section - Clean, no text overlay, reinforces emotion */}
        <div className="w-full bg-[#C9C1B1]/20 overflow-hidden">
          <img
            src={album.cover_image}
            alt={album.title}
            className="w-full h-[200px] sm:h-[240px] object-cover"
          />
        </div>

        {/* Questions Section - More inviting with clear count */}
        <div className="px-6 sm:px-8 py-6 flex-grow flex flex-col min-h-0">
          <div className="space-y-4 flex-grow min-h-0">
            {/* Questions header with count - makes it informative */}
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-[#1B2632]">
                Sample Questions
              </h4>
              <span className="text-sm text-[#1B2632]/60 font-medium">
                {album.questions.length} total
              </span>
            </div>
            
            {/* Questions list - improved spacing and readability */}
            <ul className="space-y-3">
              {displayedQuestions.map((question, index) => (
                <li
                  key={index}
                  className="text-[#1B2632]/80 text-base leading-relaxed pl-5 border-l-3 border-[#A35139]/40"
                >
                  {question}
                </li>
              ))}
            </ul>
            
            {/* Expand/Collapse - clearer, more accessible */}
            {remainingQuestions > 0 && (
              <button
                onClick={() => setShowAllQuestions(!showAllQuestions)}
                className="flex items-center gap-2 text-[#A35139] text-base font-semibold hover:text-[#8B4229] transition-colors mt-1 pl-5 py-2"
                aria-label={showAllQuestions ? "Show fewer questions" : `Show ${remainingQuestions} more questions`}
              >
                {showAllQuestions ? (
                  <>
                    <ChevronUp className="h-5 w-5" />
                    Show fewer questions
                  </>
                ) : (
                  <>
                    See {remainingQuestions} more questions
                    <ChevronDown className="h-5 w-5" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* CTA Button - Emotionally grounded, clear action */}
          <div className="mt-8 pt-6 border-t border-[#C9C1B1]/40 flex-shrink-0">
            <Button
              onClick={handleStartRecording}
              className="w-full bg-[#A35139] text-white hover:bg-[#8B4229] rounded-xl font-semibold text-base sm:text-lg py-3.5 shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
              size="lg"
              data-testid={`button-start-recording-${album.id}`}
            >
              <Heart className="h-5 w-5" />
              Start Recording Their Story
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
