import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Footer } from "@/components/Footer";

interface Album {
  id: string;
  title: string;
  description: string;
  cover_image: string;
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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => setLocation("/")}
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
        {albums && albums.length > 0 && (
          <div className="space-y-6">
            {albums.map((album) => (
              <Card
                key={album.id}
                className="overflow-hidden shadow-lg transition-all hover-elevate"
                data-testid={`album-card-${album.id}`}
              >
                <CardContent className="p-0">
                  {/* Album Image */}
                  <div className="relative h-48 sm:h-64 w-full overflow-hidden">
                    <img
                      src={album.cover_image}
                      alt={album.title}
                      className="w-full h-full object-cover"
                      data-testid={`album-image-${album.id}`}
                    />
                  </div>

                  {/* Album Content */}
                  <div className="p-6 sm:p-8 space-y-6">
                    {/* Title and Description */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h2
                          className="text-2xl sm:text-3xl font-bold text-[#1B2632] mb-3"
                          data-testid={`album-title-${album.id}`}
                        >
                          {album.title}
                        </h2>
                        <p
                          className="text-[#1B2632]/70 text-base sm:text-lg leading-relaxed"
                          data-testid={`album-description-${album.id}`}
                        >
                          {album.description}
                        </p>
                      </div>
                    </div>

                    {/* Quantity Display (Fixed at 1) */}
                    <div className="flex items-center gap-2 text-[#1B2632]/70">
                      <span className="font-medium">Quantity:</span>
                      <span
                        className="text-xl font-bold text-[#1B2632]"
                        data-testid={`quantity-${album.id}`}
                      >
                        1
                      </span>
                      <span className="text-sm">(Free Trial)</span>
                    </div>

                    {/* Direct Detail Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto border-2 border-[#A35139] text-[#A35139] rounded-2xl"
                        onClick={() =>
                          setLocation(
                            `/free-trial?albumId=${encodeURIComponent(album.id)}`,
                          )
                        }
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
