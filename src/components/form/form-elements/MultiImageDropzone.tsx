import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { X, UploadCloud } from "lucide-react";
import { getUploadAccept, getUploadPolicyDescription, normalizeUploadImage, UploadPolicy, validateUploadFile } from "../../../utils/fileValidation";
import { getMediaUrl } from "../../../utils/media";
import ImageCropModal from "../../common/ImageCropModal";

interface MultiImageDropzoneProps {
  onUpload?: (files: File[]) => void;
  maxFiles?: number;
  initialImages?: string[];
  onRemoveInitial?: (imagePath: string) => void;
  policy?: UploadPolicy;
}

const MultiImageDropzone: React.FC<MultiImageDropzoneProps> = ({ 
  onUpload, 
  maxFiles = 5,
  initialImages = [],
  onRemoveInitial,
  policy = "storeProduct"
}) => {
  const [files, setFiles] = useState<(File & { preview: string })[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cropQueue, setCropQueue] = useState<File[]>([]);

  useEffect(() => {
    // Revoke data uris to avoid memory leaks
    return () => files.forEach(file => URL.revokeObjectURL(file.preview));
  }, [files]);

  const onDrop = async (acceptedFiles: File[]) => {
    setError(null);
    const validFiles: File[] = [];
    for (const file of acceptedFiles) {
      let normalized: File;
      try { normalized = await normalizeUploadImage(file); }
      catch (reason) { setError(reason instanceof Error ? reason.message : "Could not convert this image."); continue; }
      const validationError = await validateUploadFile(normalized, policy, { checkDimensions: false });
      if (validationError) {
        setError(validationError);
        continue;
      }
      validFiles.push(normalized);
    }
    if (validFiles.length === 0) return;
    setCropQueue(validFiles.slice(0, Math.max(0, maxFiles - initialImages.length - files.length)));
  };

  const removeFile = (fileToRemove: File & { preview: string }, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFiles = files.filter(file => file !== fileToRemove);
    setFiles(newFiles);
    if (onUpload) {
      onUpload(newFiles);
    }
  };

  const totalCount = files.length + initialImages.length;
  const remainingSlots = maxFiles - totalCount;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: (rejections) => {
      const reason = rejections[0]?.errors[0];
      setError(reason?.code === "file-too-large" ? `Image is too large. ${getUploadPolicyDescription(policy)}` : `Unsupported file type. ${getUploadPolicyDescription(policy)}`);
    },
    accept: getUploadAccept(policy),
    maxFiles: remainingSlots > 0 ? remainingSlots : 0,
    multiple: true
  });

  const hasReachedMax = totalCount >= maxFiles;

  const getImageUrl = (imagePath: string) => {
    return getMediaUrl(imagePath);
  };

  return (
    <div className="space-y-4">
      {/* Dropzone Area */}
      {!hasReachedMax && (
        <div className="transition border border-gray-300 border-dashed cursor-pointer dark:hover:border-brand-500 dark:border-gray-700 rounded-none hover:border-brand-500">
          <div
            {...getRootProps()}
            className={`dropzone flex flex-col items-center justify-center rounded-none p-6 lg:p-8
          ${
            isDragActive
              ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
              : "bg-gray-50 dark:bg-gray-900"
          }
        `}
          >
            <input {...getInputProps()} disabled={hasReachedMax} />
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              <UploadCloud size={28} />
            </div>
            <h4 className="mb-2 font-semibold text-gray-800 text-base dark:text-white/90">
              {isDragActive ? "Drop Images Here" : "Drag & Drop Images"}
            </h4>
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 max-w-xs">
              Upload up to {maxFiles} images. (JPEG, PNG, WebP, HEIC, HEIF)
            </p>
            <p className="mt-1 text-center text-xs text-gray-500 dark:text-gray-400">{getUploadPolicyDescription(policy)}</p>
            <p className="mt-2 text-xs font-semibold text-brand-500">
              {remainingSlots} slots remaining
            </p>
          </div>
        </div>
      )}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      {cropQueue[0] && <ImageCropModal file={cropQueue[0]} policy={policy} onCancel={() => setCropQueue([])} onCrop={(cropped) => {
        const localFile = Object.assign(cropped, { preview: URL.createObjectURL(cropped) });
        setFiles((previous) => {
          const combined = [...previous, localFile].slice(0, maxFiles - initialImages.length);
          onUpload?.(combined);
          return combined;
        });
        setCropQueue((queue) => queue.slice(1));
      }} />}

      {/* Previews Grid */}
      {totalCount > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Render initial images */}
          {initialImages.map((url, idx) => (
            <div key={`initial-${idx}`} className="relative group rounded-none overflow-hidden border border-gray-200 dark:border-gray-700 aspect-square bg-gray-50 dark:bg-gray-800">
              <img 
                src={getImageUrl(url)} 
                alt={`initial preview ${idx}`} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onRemoveInitial) {
                      onRemoveInitial(url);
                    }
                  }}
                  className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                  title="Remove image"
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}

          {/* Render new local files */}
          {files.map((file, idx) => (
            <div key={file.name + idx} className="relative group rounded-none overflow-hidden border border-gray-200 dark:border-gray-700 aspect-square bg-gray-50 dark:bg-gray-800">
              <img 
                src={file.preview} 
                alt={`preview ${idx}`} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button 
                  onClick={(e) => removeFile(file, e)}
                  className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                  title="Remove image"
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiImageDropzone;
