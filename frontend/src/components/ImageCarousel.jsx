import { useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ImageCarousel = ({
  images = [],
  alt = "Product",
  className = "",
  aspectRatio = "aspect-[4/3]",
  showDots = true,
  showArrows = true,
  autoPlay = false,
  autoPlayInterval = 3000,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const hasMultipleImages = images.length > 1;

  const goToNext = useCallback(
    (e) => {
      e?.stopPropagation();
      setCurrentIndex((prev) => (prev + 1) % images.length);
    },
    [images.length]
  );

  const goToPrev = useCallback(
    (e) => {
      e?.stopPropagation();
      setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    },
    [images.length]
  );

  const goToIndex = useCallback((index, e) => {
    e?.stopPropagation();
    setCurrentIndex(index);
  }, []);

  // Auto-play functionality
  useEffect(() => {
    if (autoPlay && hasMultipleImages && !isHovered) {
      const interval = setInterval(goToNext, autoPlayInterval);
      return () => clearInterval(interval);
    }
  }, [autoPlay, hasMultipleImages, isHovered, goToNext, autoPlayInterval]);

  if (!images || images.length === 0) {
    return (
      <div
        className={`${aspectRatio} bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center ${className}`}
      >
        <svg
          className="w-14 h-14 text-gray-300 dark:text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Images */}
      <div className={`${aspectRatio} relative`}>
        <div
          className="absolute inset-0 flex"
          style={{
            transition: "transform 0.3s ease-in-out",
            transform: `translateX(-${currentIndex * 100}%)`,
          }}
        >
          {images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`${alt} ${index + 1}`}
              className="w-full h-full object-cover flex-shrink-0"
              style={{ minWidth: "100%" }}
            />
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {hasMultipleImages && showArrows && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 dark:bg-gray-900/90 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white dark:hover:bg-gray-800 hover:scale-110 z-10"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 dark:bg-gray-900/90 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white dark:hover:bg-gray-800 hover:scale-110 z-10"
            aria-label="Next image"
          >
            <ChevronRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {hasMultipleImages && showDots && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => goToIndex(index, e)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? "bg-white w-4"
                  : "bg-white/60 hover:bg-white/80"
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Image Counter Badge */}
      {hasMultipleImages && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs font-medium rounded-full z-10">
          {currentIndex + 1}/{images.length}
        </div>
      )}
    </div>
  );
};

export default ImageCarousel;
