"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Cropper, { Area } from "react-easy-crop";
import { X, ZoomIn, ZoomOut, Upload, Loader2, Trash2 } from "lucide-react";

interface ProfilePictureEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (imageData: string) => Promise<void>;
  onRemove?: () => Promise<void>;
  currentPicture?: string;
}

// Validate if picture is a valid displayable image
// Only base64 data URLs are valid (user-uploaded pictures)
function isValidPictureUrl(url: string | undefined): boolean {
  if (!url || typeof url !== 'string' || url.length === 0) {
    return false;
  }
  // Only accept base64 data URLs (user-uploaded pictures)
  // Reject http URLs (social provider pictures) and invalid values
  return url.startsWith('data:image/');
}

// Pre-load image to verify it can be displayed
function preloadImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

async function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  outputSize: number = 256
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Set canvas size to desired output size
  canvas.width = outputSize;
  canvas.height = outputSize;

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  // Return as base64 JPEG with good quality
  return canvas.toDataURL("image/jpeg", 0.9);
}

export default function ProfilePictureEditor({
  isOpen,
  onClose,
  onSave,
  onRemove,
  currentPicture,
}: ProfilePictureEditorProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCurrentPictureValid, setIsCurrentPictureValid] = useState(false);
  const [isValidatingPicture, setIsValidatingPicture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate current picture when modal opens or picture changes
  useEffect(() => {
    if (!isOpen) {
      setIsCurrentPictureValid(false);
      return;
    }

    // First check if URL format is valid (only base64 data URLs)
    if (!isValidPictureUrl(currentPicture)) {
      setIsCurrentPictureValid(false);
      return;
    }

    // Then verify the image can actually be loaded
    setIsValidatingPicture(true);
    preloadImage(currentPicture!).then((isValid) => {
      setIsCurrentPictureValid(isValid);
      setIsValidatingPicture(false);
    });
  }, [isOpen, currentPicture]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsSaving(true);
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      await onSave(croppedImage);
      handleClose();
    } catch (error) {
      console.error("Error saving image:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;

    setIsRemoving(true);
    try {
      await onRemove();
      handleClose();
    } catch (error) {
      console.error("Error removing image:", error);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleClose = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setIsCurrentPictureValid(false);
    onClose();
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 1));
  };

  if (!isOpen) return null;

  return (
    <div className="picture-editor-overlay" onClick={handleClose}>
      <div className="picture-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="picture-editor-header">
          <h3>Edit profile picture</h3>
          <button className="picture-editor-close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className="picture-editor-content">
          {!imageSrc ? (
            <div
              className={`picture-editor-dropzone ${isDragging ? "dragging" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                style={{ display: "none" }}
              />
              <div className="dropzone-content">
                <div className="dropzone-icon">
                  <Upload size={32} />
                </div>
                <p className="dropzone-title">
                  {isDragging ? "Drop image here" : "Upload a photo"}
                </p>
                <p className="dropzone-hint">
                  Drag and drop or click to select
                </p>
                <p className="dropzone-formats">JPG, PNG, GIF up to 5MB</p>
              </div>

              {isCurrentPictureValid && currentPicture && (
                <div className="dropzone-current">
                  <p className="dropzone-current-label">Current picture</p>
                  <div className="dropzone-current-preview">
                    <img
                      src={currentPicture}
                      alt="Current"
                      onError={() => setIsCurrentPictureValid(false)}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="picture-editor-cropper">
              <div className="cropper-container">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="cropper-controls">
                <button
                  className="zoom-btn"
                  onClick={handleZoomOut}
                  disabled={zoom <= 1}
                >
                  <ZoomOut size={18} />
                </button>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="zoom-slider"
                />
                <button
                  className="zoom-btn"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                >
                  <ZoomIn size={18} />
                </button>
              </div>

              <button
                className="change-image-btn"
                onClick={() => {
                  setImageSrc(null);
                  fileInputRef.current?.click();
                }}
              >
                Choose different image
              </button>
            </div>
          )}
        </div>

        <div className="picture-editor-footer">
          {isCurrentPictureValid && onRemove && !imageSrc && (
            <button
              className="picture-editor-btn danger"
              onClick={handleRemove}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  Remove
                </>
              )}
            </button>
          )}
          <div className="picture-editor-footer-right">
            <button className="picture-editor-btn secondary" onClick={handleClose}>
              Cancel
            </button>
            <button
              className="picture-editor-btn primary"
              onClick={handleSave}
              disabled={!imageSrc || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
