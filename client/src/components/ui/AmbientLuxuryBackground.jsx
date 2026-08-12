import React, { useEffect, useRef } from 'react';

/**
 * AmbientLuxuryBackground
 * Inspired by Originkit crystal-glow, risinglines, wave-arcs & blinking-squares
 * Renders high-performance, subtle ambient gold & periwinkle light filaments
 */
export default function AmbientLuxuryBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle setup
    const particleCount = 28;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 0.8,
        speedY: Math.random() * 0.4 + 0.15,
        speedX: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.4 + 0.1,
        maxOpacity: Math.random() * 0.45 + 0.15,
        isGold: Math.random() > 0.4,
        pulseSpeed: Math.random() * 0.015 + 0.005,
        pulseVal: Math.random() * Math.PI,
      });
    }

    let mouseX = -1000;
    let mouseY = -1000;

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Render subtle rising spark particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move upward
        p.y -= p.speedY;
        p.x += p.speedX;
        p.pulseVal += p.pulseSpeed;

        // Reset when passing top
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }

        // Slight mouse avoidance
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const angle = Math.atan2(dy, dx);
          p.x += Math.cos(angle) * 0.8;
          p.y += Math.sin(angle) * 0.8;
        }

        const alpha = Math.sin(p.pulseVal) * 0.5 + 0.5;
        const currentOpacity = p.opacity * alpha;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

        if (p.isGold) {
          ctx.fillStyle = `rgba(212, 175, 55, ${currentOpacity})`;
          ctx.shadowColor = 'rgba(212, 175, 55, 0.4)';
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = `rgba(180, 200, 245, ${currentOpacity})`;
          ctx.shadowColor = 'rgba(180, 200, 245, 0.3)';
          ctx.shadowBlur = 6;
        }

        ctx.fill();
        ctx.shadowBlur = 0; // reset
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Ambient Radial Mesh Gradients */}
      <div className="absolute -top-40 -right-40 w-[650px] h-[650px] bg-gradient-to-bl from-primary-fixed/25 via-[#e8edf9]/30 to-transparent blur-[140px] rounded-full" />
      <div className="absolute top-1/3 -left-40 w-[550px] h-[550px] bg-gradient-to-tr from-[#dfd4b0]/25 via-[#f2ece0]/20 to-transparent blur-[130px] rounded-full" />
      <div className="absolute -bottom-40 right-1/4 w-[600px] h-[600px] bg-gradient-to-tl from-secondary-fixed/15 via-transparent to-transparent blur-[140px] rounded-full" />

      {/* Floating Canvas Particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
