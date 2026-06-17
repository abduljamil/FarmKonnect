import { useTheme } from "../contexts/ThemeContext";
import { Star } from "lucide-react";

export default function UserRating({ rating, size = "md", showCount = true, onClick = null, clickable = false }) {
  const { isDark } = useTheme();
  
  const average = rating?.average || 0;
  const count = rating?.count || 0;

  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(average);
    const hasHalfStar = average % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        // Full star
        stars.push(
          <Star key={i} className={`${sizeClasses[size]} text-yellow-400 fill-yellow-400`} strokeWidth={2} />
        );
      } else if (i === fullStars && hasHalfStar) {
        // Half star
        stars.push(
          <div key={i} className="relative">
            <Star className={`${sizeClasses[size]} ${isDark ? "text-gray-600" : "text-gray-300"}`} strokeWidth={2} />
            <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
              <Star className={`${sizeClasses[size]} text-yellow-400 fill-yellow-400`} strokeWidth={2} />
            </div>
          </div>
        );
      } else {
        // Empty star
        stars.push(
          <Star key={i} className={`${sizeClasses[size]} ${isDark ? "text-gray-600" : "text-gray-300"}`} strokeWidth={2} />
        );
      }
    }
    return stars;
  };

  if (count === 0) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className={`${sizeClasses[size]} ${isDark ? "text-gray-600" : "text-gray-300"}`} strokeWidth={2} />
          ))}
        </div>
        <span className={`${textSizes[size]} ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          No ratings yet
        </span>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center gap-1 ${clickable ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick(e);
        }
      }}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <div className="flex items-center">
        {renderStars()}
      </div>
      <span className={`font-medium ${textSizes[size]} ${isDark ? "text-white" : "text-gray-900"}`}>
        {average.toFixed(1)}
      </span>
      {showCount && (
        <span className={`${textSizes[size]} ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          ({count})
        </span>
      )}
    </div>
  );
}
