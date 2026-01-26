import { useState, useRef } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import SimpleHeader from "@/components/SimpleHeader";
import { Footer } from "@/components/Footer";
import {
  Loader2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function CustomAlbumCover() {
  const [, params] = useRoute("/custom-album-cover/:trialId");
  const trialId = params?.trialId || "";
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch trial details to validate and show info
  const { data: trialData, isLoading: isLoadingTrial } = useQuery({
    queryKey: [`/api/albums/${trialId}`],
    queryFn: async () => {
      const response = await fetch(`/api/albums/${trialId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Trial not found");
        }
        throw new Error("Failed to fetch trial details");
      }
      return response.json();
    },
    enabled: !!trialId,
    retry: false,
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, GIF, or WebP)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setIsSuccess(false);
    setUploadedImageUrl(null);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !trialId) return;

    setIsUploading(true);
    setIsSuccess(false);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch(`/api/free-trial/${trialId}/upload-cover`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload image");
      }

      const data = await response.json();
      setUploadedImageUrl(data.imageUrl);
      setIsSuccess(true);
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast({
        title: "Success!",
        description: "Your custom album cover has been uploaded successfully.",
      });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload failed",
        description:
          error.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsSuccess(false);
    setUploadedImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Show loading state while fetching trial
  if (isLoadingTrial) {
    return (
      <div className="min-h-screen bg-background">
        <SimpleHeader />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-16">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#A35139]" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Show error if trial not found
  if (!trialData && trialId) {
    return (
      <div className="min-h-screen bg-background">
        <SimpleHeader />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-16">
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <h1 className="text-2xl font-bold text-[#1B2632] mb-4">
              Trial Not Found
            </h1>
            <p className="text-muted-foreground">
              The trial ID you're looking for doesn't exist or has been removed.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SimpleHeader />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl py-16">
        {/* Page Heading */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1B2632] font-['Outfit'] mb-2">
            Upload Custom Album Cover
          </h1>
          {trialData?.trial && (
            <p className="text-muted-foreground">
              For {trialData.trial.storytellerName}'s album -{" "}
              {trialData.trial.selectedAlbum}
            </p>
          )}
        </div>

        {/* Success Message */}
        {isSuccess && uploadedImageUrl && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900 mb-1">
                  Upload Successful!
                </h3>
                <p className="text-sm text-green-700">
                  Your custom album cover has been saved and will be used for
                  the album.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-lg overflow-hidden border border-green-200">
              <img
                src={uploadedImageUrl}
                alt="Uploaded cover"
                className="w-full h-auto max-h-64 object-cover"
              />
            </div>
          </div>
        )}

        {/* Upload Form */}
        {!isSuccess && (
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="space-y-6">
              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-[#1B2632] mb-2">
                  Select Image
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#A35139] transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="image-upload"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center gap-3"
                  >
                    <div className="p-4 bg-[#A35139]/10 rounded-full">
                      <ImageIcon className="h-8 w-8 text-[#A35139]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1B2632]">
                        Click to select an image
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPEG, PNG, GIF, or WebP (max 10MB)
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Preview */}
              {previewUrl && selectedFile && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-[#1B2632]">
                      Preview
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      disabled={isUploading}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-auto max-h-96 object-contain bg-gray-50"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>File: {selectedFile.name}</p>
                    <p>
                      Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}

              {/* Upload Button */}
              {selectedFile && (
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full bg-[#A35139] hover:bg-[#A35139]/90 text-white"
                  size="lg"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Cover Image
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-[#1B2632] mb-2">Instructions</h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Select a high-quality image for the best results</li>
            <li>Recommended size: Square or landscape orientation</li>
            <li>Maximum file size: 10MB</li>
            <li>Supported formats: JPEG, PNG, GIF, WebP</li>
          </ul>
        </div>
      </div>
      <Footer />
    </div>
  );
}
