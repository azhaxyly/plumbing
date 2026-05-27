"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ProductFull } from "@timsan/db";

interface ProductGalleryProps {
  images: ProductFull["images"];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const primaryIdx = images.findIndex((img) => img.isPrimary);
    return primaryIdx >= 0 ? primaryIdx : 0;
  });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Scroll active thumbnail into view when selectedIndex changes (main gallery)
  useEffect(() => {
    thumbnailRefs.current[selectedIndex]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selectedIndex]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-gray-100 text-gray-300">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-24 w-24"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M3 3h18M3 21h18M3 3v18M21 3v18M9 9h6M9 12h6M9 15h6"
          />
        </svg>
      </div>
    );
  }

  const selectedImage = images[selectedIndex];

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Main image */}
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-50 cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          aria-label="Открыть просмотр фото"
        >
          {selectedImage && (
            <Image
              src={selectedImage.url}
              alt={selectedImage.alt || productName}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-contain p-6 transition-opacity duration-200"
              priority
            />
          )}
        </button>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            role="list"
            aria-label="Фотографии товара"
          >
            {images.map((img, idx) => (
              <button
                key={img.id}
                ref={(el) => {
                  thumbnailRefs.current[idx] = el;
                }}
                type="button"
                role="listitem"
                aria-label={`Фото ${idx + 1}`}
                aria-pressed={idx === selectedIndex}
                onClick={() => setSelectedIndex(idx)}
                className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 bg-gray-50 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  idx === selectedIndex
                    ? "border-amber-400"
                    : "border-transparent hover:border-gray-300 opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={img.url}
                  alt={img.alt || productName}
                  fill
                  sizes="64px"
                  className="object-contain p-1"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox portal */}
      {mounted &&
        lightboxOpen &&
        createPortal(
          <Lightbox
            images={images}
            productName={productName}
            initialIndex={selectedIndex}
            onClose={() => setLightboxOpen(false)}
            onIndexChange={setSelectedIndex}
          />,
          document.body
        )}
    </>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

interface LightboxProps {
  images: ProductFull["images"];
  productName: string;
  initialIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

function Lightbox({
  images,
  productName,
  initialIndex,
  onClose,
  onIndexChange,
}: LightboxProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [zooming, setZooming] = useState(false);

  const ZOOM_SCALE = 2.5;
  // pan multiplier > 1 so you don't need to move the cursor to the viewport edge
  const ZOOM_PAN_MULT = 2.0;
  // maximum translate (%) before the image edge becomes visible — clamp to this
  const ZOOM_MAX_PAN = ((ZOOM_SCALE - 1) / ZOOM_SCALE) * 50; // 30%

  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    startIndex: initialIndex,
    dragFree: false,
  });

  // Fade in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Sync embla → activeIndex
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const idx = emblaApi.selectedScrollSnap();
    setActiveIndex(idx);
    onIndexChange(idx);
    setZoomed(false);
  }, [emblaApi, onIndexChange]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Sync activeIndex → embla when changed externally (thumbnail click)
  useEffect(() => {
    if (!emblaApi) return;
    if (emblaApi.selectedScrollSnap() !== activeIndex) {
      emblaApi.scrollTo(activeIndex);
    }
  }, [activeIndex, emblaApi]);

  // Scroll active thumbnail into view
  useEffect(() => {
    thumbRefs.current[activeIndex]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeIndex]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowLeft") {
        setZoomed(false);
        emblaApi?.scrollPrev();
      }
      if (e.key === "ArrowRight") {
        setZoomed(false);
        emblaApi?.scrollNext();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emblaApi]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 200);
  }

  function handleThumbnailClick(idx: number) {
    setActiveIndex(idx);
    setZoomed(false);
    emblaApi?.scrollTo(idx);
  }

  const canPrev = activeIndex > 0;
  const canNext = activeIndex < images.length - 1;

  function handleLightboxMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!zoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  function handleZoomToggle(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (!zoomed) setMousePos({ x, y });
    setZooming(true);
    setZoomed((z) => !z);
    setTimeout(() => setZooming(false), 300);
  }

  return (
    <div
      className={`fixed inset-0 flex flex-col transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ zIndex: 9999, backgroundColor: "rgba(0,0,0,0.88)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр фотографий"
      onMouseMove={handleLightboxMouseMove}
    >
      {/* Backdrop click-to-close layer */}
      <div
        className="absolute inset-0"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Close button */}
      <button
        type="button"
        onClick={handleClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="Закрыть"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute left-4 top-4 z-10 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
          {activeIndex + 1} / {images.length}
        </div>
      )}

      {/* Main carousel */}
      <div className="relative flex flex-1 items-center overflow-hidden">
        {/* Prev arrow */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setZoomed(false);
              emblaApi?.scrollPrev();
            }}
            disabled={!canPrev}
            className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 disabled:opacity-0 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Предыдущее фото"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Next arrow */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setZoomed(false);
              emblaApi?.scrollNext();
            }}
            disabled={!canNext}
            className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 disabled:opacity-0 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Следующее фото"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Embla viewport */}
        <div ref={emblaRef} className="h-full w-full overflow-hidden">
          <div className="flex h-full">
            {images.map((img, idx) => (
              <div
                key={img.id}
                className="relative h-full min-w-0 flex-[0_0_100%] flex items-center justify-center overflow-hidden"
              >
                <button
                  type="button"
                  onClick={handleZoomToggle}
                  className={`relative h-full w-full flex items-center justify-center focus:outline-none ${
                    zoomed && idx === activeIndex
                      ? "cursor-zoom-out"
                      : "cursor-zoom-in"
                  }`}
                  aria-label={zoomed ? "Уменьшить" : "Увеличить"}
                >
                  <div
                    className="relative"
                    style={{
                      width: "min(80vw, 80vh)",
                      height: "min(80vw, 80vh)",
                      transform: (() => {
                        if (!zoomed || idx !== activeIndex) return "scale(1) translate(0%, 0%)";
                        const clamp = (v: number) => Math.min(ZOOM_MAX_PAN, Math.max(-ZOOM_MAX_PAN, v));
                        const tx = clamp(-(mousePos.x - 50) * ZOOM_PAN_MULT);
                        const ty = clamp(-(mousePos.y - 50) * ZOOM_PAN_MULT);
                        return `scale(${ZOOM_SCALE}) translate(${tx}%, ${ty}%)`;
                      })(),
                      transition: zooming ? "transform 300ms ease-out" : "none",
                    }}
                  >
                    <Image
                      src={img.url}
                      alt={img.alt || productName}
                      fill
                      sizes="80vw"
                      className="object-contain"
                      priority={idx === initialIndex}
                    />
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="relative z-10 flex items-center justify-center py-4">
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 max-w-full">
            {images.map((img, idx) => (
              <button
                key={img.id}
                ref={(el) => {
                  thumbRefs.current[idx] = el;
                }}
                type="button"
                onClick={() => handleThumbnailClick(idx)}
                className={`relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  idx === activeIndex
                    ? "ring-2 ring-white opacity-100 scale-110"
                    : "opacity-50 hover:opacity-80 hover:scale-105"
                }`}
                aria-label={`Фото ${idx + 1}`}
                aria-pressed={idx === activeIndex}
              >
                <Image
                  src={img.url}
                  alt={img.alt || productName}
                  fill
                  sizes="56px"
                  className="object-contain bg-white/10 p-0.5"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
