import { useEffect, useRef, useState } from "react";
import { Box, Flex, IconButton, Portal, Text } from "@chakra-ui/react";
import { LuX } from "react-icons/lu";

interface ImageLightboxProps { isOpen: boolean; imageUrl: string; alt?: string; onClose: () => void; }
export function ImageLightbox({ isOpen, imageUrl, alt = "Image", onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const MIN_SCALE = 1; const MAX_SCALE = 5;

  useEffect(() => { if (isOpen) { setScale(1); setPosition({ x: 0, y: 0 }); } }, [isOpen, imageUrl]);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isOpen) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      setScale((s) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, +(s + delta).toFixed(2))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isOpen]);

  const onMouseDown = (e: React.MouseEvent) => { if (scale <= 1) return; setIsDragging(true); setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y }); };
  const onMouseMove = (e: React.MouseEvent) => { if (!isDragging || scale <= 1) return; setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const onMouseUp = () => setIsDragging(false);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const d = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      setDragStart({ x: d, y: 0 });
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [t1, t2] = [e.touches[0], e.touches[1]];
      const d = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      if (dragStart.x > 0) { setScale((s) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, +(s + (d - dragStart.x) * 0.01).toFixed(2)))); setDragStart({ x: d, y: 0 }); }
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    }
  };

  if (!isOpen) return null;
  return <Portal><Box position="fixed" inset="0" bg="blackAlpha.900" zIndex="modal" onClick={onClose}>
    <IconButton aria-label="Close image" position="absolute" top="4" right="4" zIndex="1" variant="solid" bg="whiteAlpha.200" color="white" _hover={{ bg: "whiteAlpha.300" }} onClick={onClose}><LuX /></IconButton>
    <Box position="absolute" top="4" left="4" bg="whiteAlpha.200" color="white" px="3" py="1" rounded="md" fontSize="sm">{Math.round(scale * 100)}%</Box>
    <Flex ref={containerRef} w="full" h="full" align="center" justify="center" overflow="hidden" cursor={scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in"}
      onClick={(e) => e.stopPropagation()} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={() => { setIsDragging(false); setDragStart({ x: 0, y: 0 }); }}>
      <img src={imageUrl} alt={alt} draggable={false} style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", userSelect: "none", transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transition: isDragging ? "none" : "transform 0.2s ease-out" }} />
    </Flex>
    <Text position="absolute" bottom="4" left="50%" transform="translateX(-50%)" bg="whiteAlpha.200" color="white" px="4" py="2" rounded="md" fontSize="sm" textAlign="center">Scroll to zoom • Pinch to zoom • Drag to pan</Text>
  </Box></Portal>;
}
