import { useEffect, useRef, useState } from "react";
import { Box, Flex, IconButton, Portal, Text } from "@chakra-ui/react";
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
      const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      setDragStart({ x: distance, y: 0 });
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
        const delta = (distance - dragStart.x) * 0.01;
        setScale((prev) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, +(prev + delta).toFixed(2))));
        setDragStart({ x: distance, y: 0 });
      }
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      setPosition({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    }
  };

  const onTouchEnd = () => {
    setIsDragging(false);
    setDragStart({ x: 0, y: 0 });
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <Box position="fixed" inset="0" bg="black/92" zIndex="modal" onClick={onClose}>
        <IconButton
          aria-label="Close image"
          position="absolute"
          top={{ base: "2", sm: "4" }}
          right={{ base: "2", sm: "4" }}
          zIndex="2"
          size={{ base: "sm", sm: "md" }}
          variant="solid"
          bg="whiteAlpha.200"
          color="white"
          _hover={{ bg: "whiteAlpha.300" }}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
        >
          <LuX />
        </IconButton>

        <Box
          position="absolute"
          top={{ base: "2", sm: "4" }}
          left={{ base: "2", sm: "4" }}
          zIndex="2"
          bg="whiteAlpha.200"
          color="white"
          px="3"
          py="1"
          rounded="md"
          fontSize={{ base: "xs", sm: "sm" }}
        >
          {Math.round(scale * 100)}%
        </Box>

        <Flex
          ref={containerRef}
          w="full"
          h="full"
          align="center"
          justify="center"
          overflow="hidden"
          px={{ base: "2", sm: "4" }}
          py={{ base: "14", sm: "16" }}
          cursor={scale > 1 ? (isDragging ? "grabbing" : "grab") : "default"}
          touchAction="none"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <img
            src={imageUrl}
            alt={alt}
            draggable={false}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              userSelect: "none",
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.2s ease-out",
              willChange: "transform",
            }}
          />
        </Flex>

        <Text
          position="absolute"
          bottom={{ base: "2", sm: "4" }}
          left="50%"
          transform="translateX(-50%)"
          bg="whiteAlpha.200"
          color="white"
          px={{ base: "3", sm: "4" }}
          py="2"
          rounded="md"
          fontSize={{ base: "xs", sm: "sm" }}
          textAlign="center"
          maxW="calc(100vw - 1rem)"
          whiteSpace={{ base: "normal", sm: "nowrap" }}
        >
          Scroll to zoom • Pinch to zoom • Drag to pan
        </Text>
      </Box>
    </Portal>
  );
}
