import React, { useState, useCallback, useRef, useEffect } from "react";
import Cropper, { Point, Area } from "react-easy-crop";
import getCroppedImg from "../utils/canvasUtils";
import { IoAdd, IoRemove, IoCloudUploadOutline } from "react-icons/io5";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProfilePictureDialogProps {
  children: React.ReactNode;
  trialId: string;
  initialImage?: string;
  onSave?: (croppedBlob: Blob) => Promise<void>;
}

const ProfilePictureDialog = ({
  children,
  initialImage,
  onSave,
  trialId,
}: ProfilePictureDialogProps) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const YAJUR_NANI_TRIAL_ID = "f6258c48-043e-4b23-883b-dfb4ace3b43c";
  // When dialog opens, reset state or load initial image
  useEffect(() => {
    if (isOpen) {
      if (initialImage) {
        // We can't easily "edit" a remote URL with react-easy-crop due to CORS usually,
        // unless the server sends proper headers. Kahani seems to have CORS issues or
        // we should check. For now, we'll try to load it. If it fails, user has to upload new.
        setImageSrc(initialImage);
      } else {
        setImageSrc(null);
      }
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setRotation(0);
    }
  }, [isOpen, initialImage]);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (imageSrc && croppedAreaPixels && onSave) {
      try {
        setIsSaving(true);
        const croppedBlob = await getCroppedImg(
          imageSrc,
          croppedAreaPixels,
          rotation,
        );
        if (croppedBlob) {
          await onSave(croppedBlob);
          setIsOpen(false);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSaving(false);
      }
    }
  }, [imageSrc, croppedAreaPixels, rotation, onSave]);

  function readFile(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result as string));
      reader.readAsDataURL(file);
    });
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
      setZoom(1);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white border border-gray-200 p-0 overflow-hidden font-['Outfit']">
        <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-white">
          <DialogTitle className="text-xl font-bold text-[#1B2632]">
            Update Profile Photo
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full bg-[#f8f9fa] min-h-[400px]">
          {!imageSrc ? (
            <div className="flex flex-col items-center justify-center flex-1 p-12 gap-6">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                <IoCloudUploadOutline className="text-gray-400 w-10 h-10" />
              </div>
              <p className="text-gray-500 text-center max-w-[250px]">
                Upload a new photo to reposition and crop.
              </p>
              <Button
                onClick={triggerUpload}
                className="bg-[#A35139] hover:bg-[#8B4229] text-white rounded-full px-8"
              >
                Upload Photo
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  className="hidden"
                />
              </Button>
            </div>
          ) : (
            <>
              <div className="relative w-full h-[350px] bg-[#e5e7eb]">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                />
              </div>

              {trialId !== YAJUR_NANI_TRIAL_ID && (
                <div className="px-6 py-5 flex flex-col gap-5 bg-white border-t border-gray-100">
                  {/* Rotate & Zoom */}
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="h-9 w-9 shrink-0 rounded-full text-gray-400 hover:text-[#A35139] hover:bg-gray-100"
                      aria-label="Rotate 90° clockwise"
                    >
                      <RotateCw className="h-5 w-5" />
                    </Button>
                    <IoRemove className="text-gray-400 shrink-0" />
                    <input
                      type="range"
                      value={zoom}
                      min={1}
                      max={3}
                      step={0.1}
                      aria-labelledby="Zoom"
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#A35139]"
                    />
                    <IoAdd className="text-gray-400" />
                  </div>

                  <div className="flex justify-between mt-2 gap-3">
                    <Button
                      variant="ghost"
                      onClick={triggerUpload}
                      className="text-gray-600 hover:text-[#A35139] hover:bg-gray-50"
                    >
                      Change Photo
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={onFileChange}
                        className="hidden"
                      />
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-[#A35139] hover:bg-[#8B4229] text-white rounded-full px-8 min-w-[120px]"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfilePictureDialog;
