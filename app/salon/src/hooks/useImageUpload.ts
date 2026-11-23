import { useState } from "react";
import { apiClient } from "@/lib/api";

interface UseImageUploadOptions { folder?: string; mediaType?: "image" | "document"; }

export function useImageUpload(opts: UseImageUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return null;
    if (!file.type.startsWith("image/")) { setError("Please select an image file"); return null; }
    if (file.size > 5 * 1024 * 1024) { setError("Image size must be less than 5MB"); return null; }
    setError(null);
    setPreview(URL.createObjectURL(file));
    return file;
  };

  const uploadImage = async (file: File) => {
    setIsUploading(true); setUploadProgress(10); setError(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.onprogress = (ev) => { if (ev.lengthComputable) setUploadProgress(Math.max(10, Math.round((ev.loaded / ev.total) * 70))); };
        reader.readAsDataURL(file);
      });
      setUploadProgress(75);
      const { data } = await apiClient.post<{ url: string }>("/media/upload", {
        base64_data: base64,
        media_type: opts.mediaType || "image",
        folder: opts.folder || "salon-media",
      });
      setUploadProgress(100);
      setPreview(data.url);
      return data.url;
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Image upload failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 400);
    }
  };

  const clearPreview = () => { setPreview(null); setError(null); setUploadProgress(0); };
  return { isUploading, uploadProgress, error, preview, setPreview, handleFileChange, uploadImage, clearPreview };
}
