import React from "react";

interface UnreadBadgeProps {
  count: number;
}

export const UnreadBadge: React.FC<UnreadBadgeProps> = ({ count }) => {
  if (count <= 0) return null;

  return (
    <span className="shrink-0 inline-flex items-center justify-center bg-blue-600 text-white text-[10px] font-extrabold rounded-full h-5 min-w-5 px-1.5 shadow-sm leading-none">
      {count}
    </span>
  );
};
export default UnreadBadge;
