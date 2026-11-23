import { useEffect, useRef, useState } from "react";
import { LuX } from "react-icons/lu";

interface ImageLightboxProps {
  isOpen: boolean;
  imageUrl: string;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ isOpen, imageUrl, alt = "Image", onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const MIN_SCALE = 1;
  const MAX_SCALE = 5;

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, imageUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [isOpen, onClose]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isOpen) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((prev) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, +(prev + delta).toFixed(2))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isOpen]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const onMouseUp = () => setIsDragging(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      setDragStart({ x: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY), y: 0 });
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      if (dragStart.x > 0) {
        setScale((prev) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, +(prev + (distance - dragStart.x) * 0.01).toFixed(2))));
        setDragStart({ x: distance, y: 0 });
      }
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    }
  };
  const onTouchEnd = () => { setIsDragging(false); setDragStart({ x: 0, y: 0 }); };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.92)",
        width: "100vw", height: "100dvh",
        display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 12px 0", gap: 8, flexShrink: 0 }}>
        <div style={{ background: "rgba(255,255,255,0.18)", color: "#fff", padding: "4px 10px", borderRadius: 8, fontSize: 13, lineHeight: 1.4 }}>
          {Math.round(scale * 100)}%
        </div>
        <button
          type="button"
          aria-label="Close image"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{ background: "rgba(255,255,255,0.18)", color: "#fff", border: "none", borderRadius: 8, width: 40, height: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
        >
          <LuX size={22} />
        </button>
      </div>

      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          flex: 1, minHeight: 0, width: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", padding: "8px",
          cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          touchAction: "none",
        }}
      >
        <img
          src={imageUrl}
          alt={alt}
          draggable={false}
          style={{
            display: "block",
            maxWidth: "100%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            userSelect: "none",
            WebkitUserSelect: "none",
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.2s ease-out",
            willChange: "transform",
          }}
        />
      </div>

      <div style={{ padding: "0 12px 12px", flexShrink: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ background: "rgba(255,255,255,0.18)", color: "#fff", padding: "8px 12px", borderRadius: 8, fontSize: 12, lineHeight: 1.4, textAlign: "center", maxWidth: "100%" }}>
          Scroll to zoom • Pinch to zoom • Drag to pan
        </div>
      </div>
    </div>
  );
}
