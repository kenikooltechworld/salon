import { useState } from "react";
import { settingsApi } from "@/features/settings/api";

const LIMITS = { image: 5 * 1024 * 1024, document: 10 * 1024 * 1024 } as const;

export function useImageUpload(options: { folder?: string; mediaType?: "image" | "document"; onSuccess?: (url: string) => void; onError?: (err: string) => void } = {}) {
  const { folder = "salon-logos", mediaType = "image", onSuccess, onError } = options;
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const uploadImage = async (file: File) => {
    setIsUploading(true); setUploadProgress(10); setError(null);
    try {
      const max = LIMITS[mediaType];
      if (file.size > max) throw new Error(`File exceeds ${Math.round(max / 1024 / 1024)}MB limit`);
      const base64 = await toBase64(file); setPreview(base64); setUploadProgress(50);
      const res = await settingsApi.uploadMedia({ base64_data: base64, media_type: mediaType, folder });
      setUploadProgress(100); onSuccess?.(res.data.url); return res.data.url;
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Upload failed";
      setError(msg); onError?.(msg); throw e;
    } finally { setIsUploading(false); setTimeout(() => setUploadProgress(0), 400); }
  };

  return { uploadImage, isUploading, uploadProgress, preview, error, setPreview };
}

