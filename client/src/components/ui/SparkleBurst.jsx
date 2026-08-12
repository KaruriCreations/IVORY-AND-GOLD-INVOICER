import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SparkleBurst
 * Inspired by Originkit sparkles, emojiburst & juiceeffect
 * Spawns organic floating sparkles/stars on user click for micro-feedback
 */
export function useSparkleBurst() {
  const [sparkles, setSparkles] = useState([]);

  const trigger = (e) => {
    let clientX = window.innerWidth / 2;
    let clientY = window.innerHeight / 2;

    if (e && e.clientX !== undefined) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const newBatch = Array.from({ length: 8 }).map((_, idx) => ({
      id: `${Date.now()}-${idx}-${Math.random()}`,
      x: clientX,
      y: clientY,
      angle: (idx / 8) * (Math.PI * 2) + (Math.random() - 0.5) * 0.5,
      distance: Math.random() * 45 + 30,
      size: Math.random() * 6 + 4,
      color: idx % 2 === 0 ? '#D4AF37' : '#8FA8DF', // Gold & Periwinkle
    }));

    setSparkles((prev) => [...prev, ...newBatch]);

    setTimeout(() => {
      setSparkles((prev) => prev.filter((s) => !newBatch.some((nb) => nb.id === s.id)));
    }, 700);
  };

  const SparkleOverlay = () => (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {sparkles.map((s) => {
          const targetX = s.x + Math.cos(s.angle) * s.distance;
          const targetY = s.y + Math.sin(s.angle) * s.distance;

          return (
            <motion.div
              key={s.id}
              initial={{
                x: s.x,
                y: s.y,
                scale: 0,
                opacity: 1,
              }}
              animate={{
                x: targetX,
                y: targetY,
                scale: [0, 1.3, 0.4],
                opacity: [1, 0.9, 0],
              }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                left: 0,
                top: 0,
                width: s.size,
                height: s.size,
                borderRadius: '50%',
                backgroundColor: s.color,
                boxShadow: `0 0 10px ${s.color}`,
              }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );

  return { trigger, SparkleOverlay };
}

export default useSparkleBurst;
