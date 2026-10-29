import { useState } from "react";
import { Star } from "lucide-react";
import { updatePlayerRating } from "../../api/players";
import toast from "react-hot-toast";

interface RatingEditorProps {
  playerId: string;
  initialRating?: number;
  onRatingChange?: (newRating: number) => void;
}

export default function RatingEditor({ playerId, initialRating = 0, onRatingChange }: RatingEditorProps) {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRatingClick = async (newRating: number) => {
    if (rating === newRating) return; // No change
    try {
      setIsUpdating(true);
      await updatePlayerRating(playerId, newRating);
      setRating(newRating);
      if (onRatingChange) {
        onRatingChange(newRating);
      }
      toast.success("Rating updated successfully");
    } catch (error: any) {
      // The apiClient might have handled the toast already, but let's leave it as is 
      // since the prompt says "only backend response first if backend not show then forntend validation"
      // Wait, apiClient global interceptor shows toast for errors. We don't need toast.error here unless we want it.
      // But let's just log it.
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = (hoverRating || rating) >= star;
        return (
          <button
            key={star}
            type="button"
            disabled={isUpdating}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => handleRatingClick(star)}
            className={`p-0.5 transition-colors ${isUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-110"}`}
          >
            <Star
              size={16}
              className={`${isFilled ? "fill-amber-400 text-amber-400" : "fill-transparent text-slate-300 dark:text-slate-600"} transition-all`}
            />
          </button>
        );
      })}
    </div>
  );
}
