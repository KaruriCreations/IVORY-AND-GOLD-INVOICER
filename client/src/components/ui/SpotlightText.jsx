import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * SpotlightText
 * Renders crisp, luxury typography with interactive golden spotlight glow on hover.
 * Avoids any dual-layer typography misalignment.
 */
export default function SpotlightText({
  text,
  className = '',
  spotlightColor = 'rgba(212, 175, 55, 0.9)', // Radiant luxury gold
  baseClassName = 'text-primary',
  as: Component = 'span',
}) {
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  return (
    <Component
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative inline-flex items-center select-none cursor-pointer transition-all duration-300 ${baseClassName} ${className}`}
      style={{
        textShadow: isHovered
          ? '0 0 16px rgba(212, 175, 55, 0.5), 0 0 32px rgba(212, 175, 55, 0.25)'
          : 'none',
      }}
    >
      {/* Crisp Main Text */}
      <span className="relative z-10 transition-colors duration-300">
        {text}
      </span>

      {/* Radiant Golden Glow Accent on Hover */}
      <motion.span
        className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-300 bg-clip-text text-transparent font-inherit"
        style={{
          backgroundImage: `radial-gradient(100px circle at ${mousePos.x}% ${mousePos.y}%, #ffd700, #b89738 50%, transparent 85%)`,
          WebkitBackgroundClip: 'text',
          opacity: isHovered ? 1 : 0,
        }}
      >
        {text}
      </motion.span>
    </Component>
  );
}
