import React from "react";

interface TypingIndicatorProps {
  userName?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ userName }) => {
  if (!userName) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-amber-500 font-medium italic animate-pulse">
      <span className="flex gap-0.5 items-center">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce duration-300"></span>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce duration-300 delay-75"></span>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce duration-300 delay-150"></span>
      </span>
      <span>{userName} is typing...</span>
    </div>
  );
};
