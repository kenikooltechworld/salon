import { useState } from "react";
import { apiClient, TIMEOUTS } from "@/lib/api";

interface MediaUploadResponse { url: string; message?: string }
interface UseImageUploadOptions {
  folder?: string;
  mediaType?: "image" | "document";
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
}

const FILE_SIZE_LIMITS = { image: 5 * 1024 * 1024, document: 10 * 1024 * 1024 };

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const { folder = "salon-media", mediaType = "image", onSuccess, onError } = options;
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
    return file;
  };

  const uploadImage = async (file: File, uploadType: "image" | "document" = mediaType): Promise<string> => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const maxSize = FILE_SIZE_LIMITS[uploadType];
      if (file.size > maxSize) {
        const msg = `File size exceeds ${maxSize / (1024 * 1024)}MB limit for ${uploadType}s`;
        setError(msg); onError?.(msg); throw new Error(msg);
      }
      if (uploadType === "image" && !file.type.startsWith("image/")) {
        const msg = "Please select an image file";
        setError(msg); onError?.(msg); throw new Error(msg);
      }

      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onprogress = (evt) => {
          if (evt.lengthComputable) setUploadProgress(Math.round((evt.loaded / evt.total) * 50));
        };
        reader.onload = () => { setUploadProgress(50); resolve(reader.result as string); };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const response = await apiClient.post<MediaUploadResponse>("/media/upload", {
        base64_data: base64Data, media_type: uploadType, folder,
      }, {
        timeout: TIMEOUTS.UPLOAD,
        onUploadProgress: (evt) => {
          if (evt.total) setUploadProgress(50 + Math.round((evt.loaded / evt.total) * 50));
        },
      });
      setUploadProgress(100);

      const url = (response.data as any)?.url || "";
      if (!url) throw new Error("Upload failed: no URL returned");
      setPreview(url);
      onSuccess?.(url);
      return url;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to upload file";
      setError(msg); onError?.(msg);
      throw err instanceof Error ? err : new Error(msg);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  };

  const clearPreview = () => { setPreview(null); setError(null); setUploadProgress(0); };
  return { uploadImage, handleFileChange, isUploading, uploadProgress, error, preview, setPreview, clearPreview };
}
