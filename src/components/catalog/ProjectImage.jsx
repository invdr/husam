import { useState, useRef, useEffect } from "react";
import { useSwipeable } from "react-swipeable";
import Icon from "@/components/common/Icon";

const LOADER_DELAY_MS = 80;

// Карточка-обёртка (div role="button") слушает keydown и по Enter открывает
// страницу проекта. Не даём Enter/Space на внутренних кнопках карусели
// всплыть до неё — иначе вместо листания фото происходит переход.
const stopKeyPropagation = (e) => e.stopPropagation();

export default function ProjectImage({ project, className = "" }) {
  const [imageError, setImageError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const loaderTimeoutRef = useRef(null);
  const images =
    project.images && project.images.length > 0 ? project.images : [];
  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    return () => {
      if (loaderTimeoutRef.current) clearTimeout(loaderTimeoutRef.current);
    };
  }, []);

  const switchToIndex = (nextIndex) => {
    if (nextIndex === currentImageIndex) return;
    if (loaderTimeoutRef.current) {
      clearTimeout(loaderTimeoutRef.current);
      loaderTimeoutRef.current = null;
    }
    setCurrentImageIndex(nextIndex);
    loaderTimeoutRef.current = setTimeout(() => {
      loaderTimeoutRef.current = null;
      setIsImageLoading(true);
    }, LOADER_DELAY_MS);
  };

  const handleImageLoad = () => {
    if (loaderTimeoutRef.current) {
      clearTimeout(loaderTimeoutRef.current);
      loaderTimeoutRef.current = null;
    }
    setIsImageLoading(false);
  };

  const nextImage = (e) => {
    e?.stopPropagation();
    switchToIndex((currentImageIndex + 1) % images.length);
  };

  const prevImage = (e) => {
    e?.stopPropagation();
    switchToIndex((currentImageIndex - 1 + images.length) % images.length);
  };

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () =>
      hasMultipleImages &&
      switchToIndex((currentImageIndex + 1) % images.length),
    onSwipedRight: () =>
      hasMultipleImages &&
      switchToIndex((currentImageIndex - 1 + images.length) % images.length),
    delta: 50,
    trackTouch: true,
  });

  if (images.length === 0 || imageError) {
    return (
      <div
        className={`${className} bg-gray-700 flex items-center justify-center text-gray-400`}
      >
        Нет изображения
      </div>
    );
  }

  return (
    <div
      {...(hasMultipleImages ? swipeHandlers : {})}
      className="relative h-full w-full group/image touch-pan-y"
    >
      <img
        src={images[currentImageIndex]}
        alt={`${project.title} - фото ${currentImageIndex + 1}`}
        className={className}
        decoding="async"
        loading="lazy"
        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
        onLoad={handleImageLoad}
        onError={() => {
          setImageError(true);
          handleImageLoad();
        }}
        crossOrigin="anonymous"
      />
      {isImageLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/50 z-[5]"
          aria-hidden
        >
          <Icon
            name="loader"
            className="h-10 w-10 text-white animate-spin"
            aria-hidden
          />
        </div>
      )}
      {hasMultipleImages && (
        <>
          <button
            onClick={prevImage}
            onKeyDown={stopKeyPropagation}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 hover:bg-black/70 p-1.5 md:p-2 text-white transition-all opacity-0 group-hover/image:opacity-100 z-10"
            aria-label="Предыдущее фото"
          >
            <Icon name="chevron-left" className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          <button
            onClick={nextImage}
            onKeyDown={stopKeyPropagation}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 hover:bg-black/70 p-1.5 md:p-2 text-white transition-all opacity-0 group-hover/image:opacity-100 z-10"
            aria-label="Следующее фото"
          >
            <Icon name="chevron-right" className="h-4 w-4 md:h-5 md:w-5" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((image, index) => (
              <button
                key={`dot-${image}`}
                onClick={(e) => {
                  e.stopPropagation();
                  switchToIndex(index);
                }}
                onKeyDown={stopKeyPropagation}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentImageIndex
                    ? "w-4 bg-brand"
                    : "w-1.5 bg-white/50 hover:bg-white/70"
                }`}
                aria-label={`Фото ${index + 1}`}
              />
            ))}
          </div>
          <div className="absolute top-2 right-2 rounded-full bg-black/50 px-2 py-1 text-xs text-white z-10">
            {currentImageIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}
