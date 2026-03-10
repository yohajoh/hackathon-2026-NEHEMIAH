import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface SignedUploadResponse {
  signedUrl: string;
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  uniqueId: string;
}

export interface UploadResult {
  url: string;
  publicId?: string;
}

export function useSignedUpload() {
  const [progress, setProgress] = useState(0);

  const uploadToCloudinary = useCallback(
    async (file: File, folder: string): Promise<UploadResult> => {
      const signedData = await fetchApi<SignedUploadResponse>("/book-images/signed-upload?folder=" + folder);
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signedData.apiKey);
      formData.append("timestamp", String(signedData.timestamp));
      formData.append("folder", signedData.folder);
      formData.append("signature", signedData.signature);

      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<UploadResult>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
        
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText);
            resolve({ url: response.secure_url });
          } else {
            reject(new Error("Upload failed"));
          }
        });
        
        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        
        formData.append("file", file);
        xhr.open("POST", signedData.signedUrl);
        xhr.send(formData);
      });

      return uploadPromise;
    },
    []
  );

  const mutate = useMutation({
    mutationFn: async ({ file, folder }: { file: File; folder: string }) => {
      setProgress(0);
      return uploadToCloudinary(file, folder);
    },
  });

  return {
    upload: mutate.mutateAsync,
    progress,
    isUploading: mutate.isPending,
    error: mutate.error,
    reset: mutate.reset,
  };
}

export function useConfirmBookImage() {
  return useMutation({
    mutationFn: async ({
      bookType,
      bookId,
      imageUrl,
      isCover,
      sortOrder,
    }: {
      bookType: "physical" | "digital";
      bookId: string;
      imageUrl: string;
      isCover?: boolean;
      sortOrder?: number;
    }) => {
      return fetchApi(`/book-images/confirm-upload/${bookType}/${bookId}`, {
        method: "POST",
        body: JSON.stringify({ imageUrl, isCover, sortOrder }),
      });
    },
  });
}
