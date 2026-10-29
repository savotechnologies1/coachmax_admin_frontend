import React, { useEffect, useMemo, useState } from "react";
import { getCropOutputSize, getUploadFileMime, getUploadPolicyDescription, UploadPolicy, uploadPolicies, validateUploadFile } from "../../utils/fileValidation";

interface Props {
  file: File;
  policy: UploadPolicy;
  onCancel: () => void;
  onCrop: (file: File) => void | Promise<void>;
}

const ImageCropModal: React.FC<Props> = ({ file, policy, onCancel, onCrop }) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const output = getCropOutputSize(policy);
  const aspect = output.width / output.height;
  const mime = getUploadFileMime(file) || "image/jpeg";
  const frameStyle = useMemo(() => ({ aspectRatio: `${output.width} / ${output.height}` }), [output.height, output.width]);

  useEffect(() => {
    let active = true;
    const url = URL.createObjectURL(file);
    const loaded = new Image();
    loaded.onload = () => {
      if (!active) return;
      setImage(loaded);
      setPreviewUrl(url);
    };
    loaded.onerror = () => {
      if (active) setError("This image could not be opened. Please choose a JPEG, PNG, or WebP image.");
    };
    loaded.src = url;
    return () => { active = false; URL.revokeObjectURL(url); };
  }, [file]);

  const crop = async () => {
    if (!image) return;
    setError("");
    setBusy(true);
    try {
      const sourceWidth = image.naturalWidth;
      const sourceHeight = image.naturalHeight;
      const baseWidth = Math.min(sourceWidth, sourceHeight * aspect);
      const baseHeight = baseWidth / aspect;
      const cropWidth = baseWidth / zoom;
      const cropHeight = baseHeight / zoom;
      const maxX = Math.max(0, sourceWidth - cropWidth);
      const maxY = Math.max(0, sourceHeight - cropHeight);
      const sx = maxX / 2 + (maxX / 2) * pan.x;
      const sy = maxY / 2 + (maxY / 2) * pan.y;
      const canvas = document.createElement("canvas");
      canvas.width = output.width;
      canvas.height = output.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image crop is not available in this browser.");
      context.drawImage(image, sx, sy, cropWidth, cropHeight, 0, 0, output.width, output.height);
      let outputMime = mime;
      const toBlob = (type: string, quality?: number) => new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Could not create the cropped image.")), type, quality));
      let blob = await toBlob(outputMime, 0.9);
      if (blob.size > uploadPolicies[policy].maxBytes && outputMime === "image/png") {
        outputMime = "image/webp";
        blob = await toBlob(outputMime, 0.88);
      }
      if (blob.size > uploadPolicies[policy].maxBytes && outputMime !== "image/png") blob = await toBlob(outputMime, 0.78);
      const fileExtension = outputMime === "image/png" ? "png" : outputMime === "image/webp" ? "webp" : "jpg";
      const cropped = new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-cropped.${fileExtension}`, { type: outputMime, lastModified: Date.now() });
      const validationError = await validateUploadFile(cropped, policy);
      if (validationError) throw new Error(validationError);
      await onCrop(cropped);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not crop this image.");
    } finally {
      setBusy(false);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ x: event.clientX, y: event.clientY });
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPan((current) => ({
      x: Math.max(-1, Math.min(1, current.x - (event.clientX - drag.x) * 2 / Math.max(rect.width, 1))),
      y: Math.max(-1, Math.min(1, current.y - (event.clientY - drag.y) * 2 / Math.max(rect.height, 1))),
    }));
    setDrag({ x: event.clientX, y: event.clientY });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onCancel(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="crop-title">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-gray-800">
          <h2 id="crop-title" className="text-lg font-bold text-slate-900 dark:text-white">Crop image</h2>
          <p className="mt-1 text-sm text-slate-500">Drag the image to reposition it. Zoom in if needed.</p>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_180px]">
            <div
              className="relative mx-auto w-full max-w-xl touch-none cursor-move overflow-hidden rounded-lg bg-slate-900"
              style={frameStyle}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={() => setDrag(null)}
              onPointerCancel={() => setDrag(null)}
            >
              {image && previewUrl && <img src={previewUrl} alt="Image crop preview" draggable={false} className="absolute inset-0 h-full w-full select-none object-cover" style={{ objectPosition: `${50 + pan.x * 35}% ${50 + pan.y * 35}%`, transform: `scale(${zoom})` }} />}
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/50" />
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-3 dark:border-gray-700">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Preview</p>
                <p className="mt-2 font-semibold text-slate-900 dark:text-white">{policy === "logo" ? "League logo" : policy === "storeProduct" ? "Product image" : policy === "sponsorBanner" ? "Sponsor banner" : "Holiday / event image"}</p>
              <p className="mt-1 text-xs text-slate-500">Final file: {output.width} × {output.height} px</p>
              </div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Zoom <span className="text-slate-500">{zoom.toFixed(1)}×</span>
                <input className="mt-2 w-full accent-blue-600" type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
              </label>
              <p className="text-xs leading-5 text-slate-500">{getUploadPolicyDescription(policy)}</p>
            </div>
          </div>
          {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-gray-800">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Cancel</button>
          <button type="button" onClick={crop} disabled={!image || busy} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Preparing…" : "Use this crop"}</button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
