import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FreeTrialForm } from "@/components/FreeTrialForm";
import { Footer } from "@/components/Footer";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

interface Album {
  id: string;
  title: string;
  cover_image: string;
}

export default function OrderDetails() {
  const [, setLocation] = useLocation();
  const urlParams = new URLSearchParams(window.location.search);
  let albumId = urlParams.get("albumId") || "";
  
  // Clean up albumId - remove any trailing query params or fragments
  if (albumId.includes("&")) {
    albumId = albumId.split("&")[0];
  }
  if (albumId.includes("#")) {
    albumId = albumId.split("#")[0];
  }
  albumId = albumId.trim();

  const { data: albums } = useQuery<Album[]>({
    queryKey: ["/api/albums"],
  });

  const { data: albumById } = useQuery<Album>({
    queryKey: ["/api/album", albumId],
    enabled: !!albumId,
  });

  const albumTitle = useMemo(() => {
    if (albumId && albumById) return albumById.title;
    if (albums && albumId) {
      const found = albums.find((a) => a.id === albumId);
      return found?.title ?? "";
    }
    return "";
  }, [albumId, albumById, albums]);

  return (
    <div className="min-h-screen bg-[#EEE9DF]">
      {/* Re-using SimpleHeader or just a custom header */}
      <header className="sticky top-0 z-50 bg-[#EEE9DF]/90 backdrop-blur-sm border-b border-[#C9C1B1]/30">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="mr-4 hover:bg-black/5"
          >
            <ArrowLeft className="h-5 w-5 text-[#1B2632]" />
          </Button>
          <h1 className="text-xl font-bold text-[#1B2632] font-['Outfit']">
            Enter Details
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm">
          <FreeTrialForm
            albumId={albumId}
            albumTitle={albumTitle}
            onSuccess={() => {
              // The form component handles navigation to thank-you
            }}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
