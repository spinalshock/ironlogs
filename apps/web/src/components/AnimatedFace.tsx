import { useEffect, useRef } from 'react';

interface Props {
  file: string;
  fw: number;
  fh: number;
  size?: number;
  duration?: number;
  nudgeUp?: number;
  nudgeLeft?: number;
}

function calcQuads(fw: number, fh: number, size: number, displayH: number, nudgeUp: number, nudgeLeft: number): [number, number][] {
  const ny = nudgeUp > 0 ? Math.round(nudgeUp * (fh / displayH)) : 0;
  const nx = nudgeLeft > 0 ? Math.round(nudgeLeft * (fw / size)) : 0;
  return [[nx, ny], [fw, ny], [nx, fh], [fw, fh]];
}

export default function AnimatedFace({ file, fw, fh, size = 80, duration = 1.6, nudgeUp = 0, nudgeLeft = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayH = Math.round(size * (fh / fw));

  useEffect(() => {
    const img = new Image();
    img.src = `${import.meta.env.BASE_URL}images/${file}`;
    const quads = calcQuads(fw, fh, size, displayH, nudgeUp, nudgeLeft);
    let frame = 0;
    let intervalId: number;

    img.onload = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      const draw = () => {
        ctx.clearRect(0, 0, size, displayH);
        const [sx, sy] = quads[frame % 4];
        ctx.drawImage(img, sx, sy, fw, fh, 0, 0, size, displayH);
        frame++;
      };
      draw();
      intervalId = window.setInterval(draw, (duration * 1000) / 4);
    };

    return () => { if (intervalId) clearInterval(intervalId); };
  }, [file, fw, fh, size, displayH, duration, nudgeUp, nudgeLeft]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={displayH}
      style={{ width: size, height: displayH, borderRadius: 8, imageRendering: 'pixelated' }}
    />
  );
}
