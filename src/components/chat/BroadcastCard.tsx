import { formatDateTime } from "../../utils/dateTime";
import React from "react";
import { Announcement } from "../../store/slices/broadcastSlice";
import { getMediaFallback, getMediaUrl } from "../../utils/media";

interface BroadcastCardProps {
  announcement: Announcement;
}

export const BroadcastCard: React.FC<BroadcastCardProps> = ({ announcement }) => {
  const authorName = announcement.sender?.fullName || announcement.sender?.name || "Coach";
  const fallback = getMediaFallback(authorName);
  const dateStr = formatDateTime(announcement.createdAt);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 border-l-4 border-l-blue-600 rounded-none p-5 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <img
            src={announcement.sender?.profileImage ? getMediaUrl(announcement.sender.profileImage, fallback) : fallback}
            alt={`${authorName} avatar`}
            className="w-8 h-8 rounded-full object-cover border border-blue-100 dark:border-slate-700 shadow-inner"
            onError={(event) => { event.currentTarget.src = fallback; }}
          />
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">{authorName}</span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
              {announcement.className || "Class Broadcast"}
            </span>
          </div>
        </div>
        <span className="text-[10px] text-slate-500 font-medium">{dateStr}</span>
      </div>

      <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap pl-11">
        {announcement.text}
      </div>
    </div>
  );
};
