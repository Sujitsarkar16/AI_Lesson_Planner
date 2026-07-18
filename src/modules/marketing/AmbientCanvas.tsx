import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface AmbientCanvasProps { className?: string; }
const AmbientCanvas: React.FC<AmbientCanvasProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const points = Array.from({ length: 6 }, (_, index) => ({ x: .12 + (index % 3) * .36, y: .2 + Math.floor(index / 3) * .52, size: 120 + index * 28, phase: index }));
    const resize = () => { const rect = canvas.getBoundingClientRect(); const ratio = Math.min(window.devicePixelRatio || 1, 2); canvas.width = rect.width * ratio; canvas.height = rect.height * ratio; context.setTransform(ratio, 0, 0, ratio, 0, 0); };
    const draw = (time = 0) => { const { width, height } = canvas.getBoundingClientRect(); context.clearRect(0, 0, width, height); points.forEach((point, index) => { const drift = reduceMotion ? 0 : Math.sin(time * .00045 + point.phase) * 28; const gradient = context.createRadialGradient(point.x * width + drift, point.y * height, 0, point.x * width + drift, point.y * height, point.size); gradient.addColorStop(0, index % 2 ? 'rgba(126, 106, 255, .16)' : 'rgba(168, 180, 255, .14)'); gradient.addColorStop(1, 'rgba(255,255,255,0)'); context.fillStyle = gradient; context.beginPath(); context.arc(point.x * width + drift, point.y * height, point.size, 0, Math.PI * 2); context.fill(); }); };
    resize(); draw(); window.addEventListener('resize', resize); if (!reduceMotion) gsap.ticker.add(draw);
    return () => { window.removeEventListener('resize', resize); gsap.ticker.remove(draw); };
  }, []);
  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none absolute inset-0 size-full ${className}`} />;
};
export default AmbientCanvas;
