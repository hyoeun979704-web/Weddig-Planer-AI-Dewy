import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface VenueImageGalleryProps {
  images: string[];
  venueName: string;
}

const VenueImageGallery = ({ images, venueName }: VenueImageGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Use placeholder images if none provided
  const displayImages = images.length > 0 
    ? images 
    : ["/placeholder.svg", "/placeholder.svg", "/placeholder.svg"];

  const goToPrevious = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? displayImages.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prev) => 
      prev === displayImages.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden">
      {/* Main Image */}
      <img
        src={displayImages[currentIndex]}
        alt={`${venueName} 이미지 ${currentIndex + 1}`}
        className="w-full h-full object-cover"
      />

      {/* Navigation Arrows */}
      {displayImages.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-md transition-transform active:scale-95"
            aria-label="이전 이미지"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-md transition-transform active:scale-95"
            aria-label="다음 이미지"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Pagination Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        {displayImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex 
                ? "bg-primary w-4" 
                : "bg-background/60"
            }`}
            aria-label={`이미지 ${index + 1}로 이동`}
          />
        ))}
      </div>

      {/* Image Counter */}
      <div className="absolute bottom-4 right-4 px-2.5 py-1 bg-background/80 backdrop-blur-sm rounded-full text-xs font-medium">
        {currentIndex + 1} / {displayImages.length}
      </div>
    </div>
  );
};

export default VenueImageGallery;
