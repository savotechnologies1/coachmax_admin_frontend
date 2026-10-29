export type UploadPolicy =
  | "profile"
  | "logo"
  | "eventBanner"
  | "sponsorBanner"
  | "news"
  | "gallery"
  | "storeProduct"
  | "qrCode"
  | "paymentProof"
  | "document"
  | "chatImage"
  | "chatVideo";

type FilePolicy = {
  label: string;
  maxBytes: number;
  extensions: string;
  mimeTypes: string[];
  recommended: string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  minAspect?: number;
  maxAspect?: number;
  image?: boolean;
  cropWidth?: number;
  cropHeight?: number;
};

const MB = 1024 * 1024;

export const uploadPolicies: Record<UploadPolicy, FilePolicy> = {
  profile: {
    label: "Profile image", maxBytes: 5 * MB, extensions: "JPEG, PNG, WebP, HEIC, or HEIF",
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"], recommended: "512 × 512 px square",
    minWidth: 256, minHeight: 256, maxWidth: 2048, maxHeight: 2048, minAspect: 0.8, maxAspect: 1.25, image: true, cropWidth: 512, cropHeight: 512,
  },
  logo: {
    label: "Logo", maxBytes: 2 * MB, extensions: "JPEG, PNG, WebP, HEIC, or HEIF",
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"], recommended: "512 × 512 px square",
    minWidth: 128, minHeight: 128, maxWidth: 2048, maxHeight: 2048, minAspect: 0.8, maxAspect: 1.25, image: true, cropWidth: 512, cropHeight: 512,
  },
  eventBanner: {
    label: "Event image", maxBytes: 8 * MB, extensions: "JPEG, PNG, WebP, HEIC, or HEIF",
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"], recommended: "1920 × 1080 px (16:9)",
    minWidth: 1200, minHeight: 675, maxWidth: 3840, maxHeight: 2160, minAspect: 1.6, maxAspect: 1.9, image: true, cropWidth: 1920, cropHeight: 1080,
  },
  sponsorBanner: {
    label: "Sponsor image", maxBytes: 5 * MB, extensions: "JPEG, PNG, WebP, HEIC, or HEIF",
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"], recommended: "1200 × 400 px",
    minWidth: 800, minHeight: 250, maxWidth: 3840, maxHeight: 1600, minAspect: 2.5, maxAspect: 4.5, image: true, cropWidth: 1200, cropHeight: 400,
  },
  news: {
    label: "News image", maxBytes: 5 * MB, extensions: "JPEG, PNG, WebP, HEIC, or HEIF",
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"], recommended: "1200 × 675 px (16:9)",
    minWidth: 800, minHeight: 450, maxWidth: 3840, maxHeight: 2160, minAspect: 1.5, maxAspect: 2.0, image: true, cropWidth: 1200, cropHeight: 675,
  },
  gallery: {
    label: "Gallery image", maxBytes: 5 * MB, extensions: "JPEG, PNG, WebP, HEIC, or HEIF",
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"], recommended: "1200 × 1200 px or larger",
    maxWidth: 4000, maxHeight: 4000, image: true,
  },
  storeProduct: {
    label: "Store image", maxBytes: 5 * MB, extensions: "JPEG, PNG, WebP, HEIC, or HEIF",
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"], recommended: "1200 × 1200 px square",
    minWidth: 600, minHeight: 600, maxWidth: 3000, maxHeight: 3000, minAspect: 0.85, maxAspect: 1.18, image: true, cropWidth: 1200, cropHeight: 1200,
  },
  qrCode: {
    label: "QR code image", maxBytes: 2 * MB, extensions: "JPEG, PNG, WebP, HEIC, or HEIF",
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"], recommended: "1024 × 1024 px square",
    minWidth: 256, minHeight: 256, maxWidth: 2048, maxHeight: 2048, minAspect: 0.9, maxAspect: 1.1, image: true, cropWidth: 1024, cropHeight: 1024,
  },
  paymentProof: {
    label: "Payment proof", maxBytes: 10 * MB, extensions: "JPEG, PNG, WebP, HEIC, HEIF, or PDF",
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"], recommended: "Clear scan or photo",
    image: true,
  },
  document: {
    label: "Document", maxBytes: 10 * MB, extensions: "JPEG, PNG, WebP, HEIC, HEIF, or PDF",
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"], recommended: "Clear scan or photo",
    image: true,
  },
  chatImage: {
    label: "Chat image", maxBytes: 10 * MB, extensions: "JPEG, PNG, WebP, HEIC, HEIF, or GIF",
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/gif"], recommended: "Up to 3000 × 3000 px",
    maxWidth: 4000, maxHeight: 4000, image: true,
  },
  chatVideo: {
    label: "Chat video", maxBytes: 50 * MB, extensions: "MP4, WebM, or MOV",
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime"], recommended: "H.264 MP4 preferred",
  },
};

const extensionMimeTypes: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", heic: "image/heic", heif: "image/heif",
  pdf: "application/pdf", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
};

export const getUploadFileMime = (file: File) => {
  if (file.type) return file.type.toLowerCase() === "image/jpg" ? "image/jpeg" : file.type.toLowerCase();
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return extensionMimeTypes[extension] || "";
};

const formatBytes = (bytes: number) => `${(bytes / MB).toFixed(bytes % MB === 0 ? 0 : 1)} MB`;

export const getUploadPolicyDescription = (policy: UploadPolicy) => {
  const config = uploadPolicies[policy];
  return `${config.extensions} · max file ${formatBytes(config.maxBytes)} · recommended ${config.recommended}`;
};

export async function validateUploadFile(file: File, policy: UploadPolicy, _options: { checkDimensions?: boolean } = {}): Promise<string | null> {
  const config = uploadPolicies[policy];
  const mime = getUploadFileMime(file);
  if (file.size > config.maxBytes) return `${config.label} is too large. Maximum size is ${formatBytes(config.maxBytes)}.`;
  if (!config.mimeTypes.includes(mime)) {
    return `${config.label} must be ${config.extensions}.`;
  }
  return null;
}

export const getUploadAccept = (policy: UploadPolicy) => uploadPolicies[policy].mimeTypes.reduce<Record<string, string[]>>((accept, mime) => {
  const extensions = Object.entries(extensionMimeTypes).filter(([, mappedMime]) => mappedMime === mime).map(([extension]) => `.${extension}`);
  accept[mime] = extensions;
  return accept;
}, {});

export async function normalizeUploadImage(file: File): Promise<File> {
  const mime = getUploadFileMime(file);
  if (mime !== "image/heic" && mime !== "image/heif") return file;
  try {
    const convert = (await import("heic2any")).default;
    const result = await convert({ blob: file, toType: "image/jpeg", quality: 0.92 });
    const blob = Array.isArray(result) ? result[0] : result;
    if (!blob) throw new Error("Conversion returned no image.");
    const name = file.name.replace(/\.(heic|heif)$/i, "") || "image";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    throw new Error("This HEIC/HEIF image could not be converted. Try exporting it as JPEG or PNG and upload it again.");
  }
}

export const getCropOutputSize = (policy: UploadPolicy) => {
  const config = uploadPolicies[policy];
  return { width: config.cropWidth ?? config.minWidth ?? 1200, height: config.cropHeight ?? config.minHeight ?? 1200 };
};

