import React, { useRef, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

/**
 * MagneticHoverButton
 * Inspired by Originkit magnetic-hover-button & encrypt-button
 * Adds magnetic cursor attraction and luxury shimmer/glow effects
 */
export default function MagneticHoverButton({
  children,
  onClick,
  disabled = false,
  className = '',
  variant = 'primary', // 'primary' (Navy/Gold) | 'secondary' (Emerald/Teal) | 'outline' (Luxury Glass)
  glowColor = 'rgba(212, 175, 55, 0.4)', // Gold glow default
  ...props
}) {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // Springs for magnetic translation
  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const x = useSpring(0, springConfig);
  const y = useSpring(0, springConfig);

  const handleMouseMove = (e) => {
    if (disabled || !ref.current) return;
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    // Pull factor (max 14px displacement)
    const distanceX = (clientX - centerX) * 0.35;
    const distanceY = (clientY - centerY) * 0.35;

    x.set(Math.max(-14, Math.min(14, distanceX)));
    y.set(Math.max(-14, Math.min(14, distanceY)));
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  const handleMouseEnter = () => {
    if (!disabled) setIsHovered(true);
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-[#041627] via-[#0b2440] to-[#041627] text-white shadow-[0_4px_14px_rgba(4,22,39,0.3)] border border-[#c8d2f8]/20',
    secondary:
      'bg-gradient-to-r from-[#006c49] via-[#00895d] to-[#006c49] text-white shadow-[0_4px_14px_rgba(0,108,73,0.3)] border border-[#6ffbbe]/20',
    gold:
      'bg-gradient-to-r from-[#8a6d1c] via-[#b89738] to-[#8a6d1c] text-white shadow-[0_4px_16px_rgba(184,151,56,0.35)] border border-[#ffd700]/30',
    outline:
      'bg-surface-container-lowest/80 backdrop-blur-md text-on-surface border border-outline-variant/50 hover:border-primary/40 shadow-sm',
  };

  return (
    <motion.button
      ref={ref}
      style={{ x, y }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-xl font-label-md transition-all duration-300 select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
        variantStyles[variant] || variantStyles.primary
      } ${className}`}
      {...props}
    >
      {/* Ambient Radial Hover Glow */}
      <motion.div
        className="pointer-events-none absolute -inset-2 rounded-xl opacity-0 blur-lg transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
        }}
        animate={{ opacity: isHovered ? 0.8 : 0 }}
      />

      {/* Sweeping Shimmer Highlight */}
      <div
        className={`pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out ${
          isHovered ? 'translate-x-full' : ''
        }`}
      />

      {/* Content wrapper */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}
