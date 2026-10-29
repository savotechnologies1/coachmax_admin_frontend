import React, { useState } from "react";
import { Message } from "../../store/slices/chatSlice";
import { getMediaFallback, getMediaUrl } from "../../utils/media";
import { openMediaInNewTab, renewInlineMediaElement } from "../../utils/privateMedia";
import toast from "react-hot-toast";

interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  senderName: string;
  onRetry?: (message: Message) => void;
}

const getAttachmentUrl = (url: string) => {
  if (!url) return "";
  return getMediaUrl(url);
};
const openAttachment = (url: string) => { void openMediaInNewTab(url).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not open this file.")); };

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSelf,
  senderName,
  onRetry,
}) => {
  const [mediaErrors, setMediaErrors] = useState<Record<number, boolean>>({});
  const clearMediaError = (index: number) => setMediaErrors((current) => current[index] ? { ...current, [index]: false } : current);
  const handleInlineError = (index: number, url: string, target: HTMLImageElement | HTMLMediaElement) => {
    // Capture the element synchronously; React's event object is not retained.
    void renewInlineMediaElement(target, url).then((renewed) => {
      if (!renewed) setMediaErrors((current) => ({ ...current, [index]: true }));
    }).catch(() => setMediaErrors((current) => ({ ...current, [index]: true })));
  };
  const renderMediaError = (index: number, url: string) => mediaErrors[index] ? (
    <div role="status" className="text-xs mt-1">
      Preview unavailable. <button type="button" className="underline font-semibold" onClick={() => openAttachment(url)}>Open attachment</button>
    </div>
  ) : null;
  const timeStr = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const sender = typeof message.sender?.user === "string" ? undefined : message.sender?.user;
  const senderAvatar = sender?.profileImage
    ? getMediaUrl(sender.profileImage, getMediaFallback(senderName))
    : getMediaFallback(senderName);

  const renderTicks = () => {
    if (!isSelf) return null;
    if (message.isPending) return <span className="ml-1.5 text-xs text-white/50">⏳</span>;
    if (message.isFailed) return null;

    switch (message.tickStatus) {
      case "READ":
        return <span className="ml-1.5 text-xs font-bold text-amber-500">✓✓</span>;
      case "DELIVERED":
        return <span className="ml-1.5 text-xs font-bold text-slate-400">✓✓</span>;
      case "SENT":
      default:
        return <span className="ml-1.5 text-xs text-white/40">✓</span>;
    }
  };

  return (
    <div
      className={`flex flex-col max-w-[70%] group mb-2 animate-fade-in ${
        isSelf ? "self-end items-end" : "self-start items-start"
      }`}
    >
      {!isSelf && (
        <div className="flex items-center gap-1.5 mb-1 px-1">
          <img
            src={senderAvatar}
            alt={`${senderName} avatar`}
            className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            onError={(event) => { event.currentTarget.src = getMediaFallback(senderName); }}
          />
          <span className="text-[11px] font-semibold text-amber-500">{senderName}</span>
        </div>
      )}

      <div
        className={`px-4 py-2.5 rounded-[18px] shadow-sm text-sm relative break-words leading-relaxed ${
          isSelf
            ? "bg-[#031549] dark:bg-[#336eff] text-white"
            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-gray-200/80 dark:border-slate-700/60"
        } ${message.isFailed ? "border-red-500 border-2" : ""}`}
      >
        <div>{message.text}</div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-1.5 border-t border-slate-200 dark:border-white/10 pt-1.5">
            {message.attachments.map((attach, idx) => {
              const fileTypeUpper = attach.fileType?.toUpperCase();
              const fullUrl = getAttachmentUrl(attach.url);

              if (fileTypeUpper === "IMAGE" || attach.fileType?.startsWith("image/")) {
                return (
                  <div key={idx} className="mt-1 max-w-[240px]">
                    <img
                      src={fullUrl}
                      alt={attach.fileName || "Image attachment"}
                      className="max-h-[180px] w-auto border border-gray-300 dark:border-slate-700/50 object-cover cursor-pointer hover:opacity-90"
                      onClick={() => openAttachment(attach.url)}
                      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openAttachment(attach.url); } }}
                      role="button"
                      tabIndex={0}
                      onError={(event) => handleInlineError(idx, attach.url, event.currentTarget)}
                      onLoad={() => { clearMediaError(idx); document.dispatchEvent(new Event("chat-image-loaded")); }}
                    />
                    {renderMediaError(idx, attach.url)}
                  </div>
                );
              }
              if (fileTypeUpper === "VIDEO" || attach.fileType?.startsWith("video/")) {
                return (
                  <div key={idx} className="mt-1 max-w-[240px]">
                    <video
                      src={fullUrl}
                      controls
                      onError={(event) => handleInlineError(idx, attach.url, event.currentTarget)}
                      onLoadedData={() => clearMediaError(idx)}
                      className="max-h-[180px] w-full border border-gray-300 dark:border-slate-700/50"
                    />
                    {renderMediaError(idx, attach.url)}
                  </div>
                );
              }
              if (fileTypeUpper === "AUDIO" || attach.fileType?.startsWith("audio/")) {
                return (
                  <div key={idx} className="mt-1 max-w-[240px]">
                    <audio src={fullUrl} controls className="w-full text-xs" onError={(event) => handleInlineError(idx, attach.url, event.currentTarget)} onLoadedData={() => clearMediaError(idx)} />
                    {renderMediaError(idx, attach.url)}
                  </div>
                );
              }
              // Default to FILE
              return (
                <a
                  key={idx}
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => { event.preventDefault(); openAttachment(attach.url); }}
                  className={`flex items-center gap-1.5 text-xs font-medium underline mt-1 ${
                    isSelf
                      ? "text-blue-200 hover:text-white"
                      : "text-blue-600 hover:text-blue-700 dark:text-blue-300"
                  }`}
                >
                  <span>📄</span>
                  <span className="truncate max-w-[200px]">
                    {attach.fileName || "Document File"}
                  </span>
                </a>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-75">
          <span>{timeStr}</span>
          {renderTicks()}
        </div>
      </div>

      {message.isFailed && (
        <button
          onClick={() => onRetry?.(message)}
          className="text-xs text-red-400 hover:text-red-300 font-semibold mt-1 flex items-center gap-1"
        >
          ⚠️ Sending failed. Click to retry.
        </button>
      )}
    </div>
  );
};
