import React from "react";

interface OnlineIndicatorProps {
  isOnline: boolean;
}

export const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({ isOnline }) => {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full ${
          isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-500"
        }`}
      />
      <span className={`text-xs ${isOnline ? "text-emerald-400" : "text-slate-400"}`}>
        {isOnline ? "Online" : "Offline"}
      </span>
    </div>
  );
};
export default OnlineIndicator;
