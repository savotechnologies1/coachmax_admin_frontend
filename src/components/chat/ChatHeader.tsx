import React from "react";
import { getMediaFallback, getMediaUrl } from "../../utils/media";

interface ChatHeaderProps {
  title: string;
  subtitle: string;
  roleText?: string;
  isOnline?: boolean;
  profileImage?: string;
  contextLabel?: string;
  onBack?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  subtitle,
  roleText,
  isOnline,
  profileImage,
  contextLabel,
  onBack,
}) => {
  const fallback = getMediaFallback(title);

  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            title="Back to conversations"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="relative">
          <img
            src={profileImage ? getMediaUrl(profileImage, fallback) : fallback}
            alt={`${title} avatar`}
            className="w-11 h-11 rounded-full object-cover border border-blue-100 dark:border-slate-700 shadow-inner"
            onError={(event) => { event.currentTarget.src = fallback; }}
          />
          {isOnline && (
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 absolute -bottom-0.5 -right-0.5 animate-pulse"></div>
          )}
        </div>
        <div className="flex flex-col">
          <h4 className="font-bold text-slate-800 dark:text-slate-100 leading-snug">{title}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-emerald-400 font-medium">Online now</span>
              </>
            ) : (
              subtitle
            )}
          </p>
          {contextLabel && (
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[320px]" title={contextLabel}>
              {contextLabel}
            </p>
          )}
        </div>
      </div>

      {roleText && (
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
          {roleText}
        </span>
      )}
    </div>
  );
};
