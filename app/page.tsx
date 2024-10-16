"use client";

import React, { useRef, useEffect, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  color: string;
}

interface AdjectiveStyle {
  text: string;
  color: string;
  fontSize: number;
}

const positiveAdjectives = ["Imagine"];

function getRandomAdjective(): AdjectiveStyle {
  return {
    text: positiveAdjectives[Math.floor(Math.random() * positiveAdjectives.length)],
    color: `hsl(${Math.random() * 360}, 70%, 80%)`,
    fontSize: Math.floor(Math.random() * 20 + 60)
  };
}

function getRandomColor(): string {
  return `hsl(${Math.random() * 360}, 100%, 50%)`;
}

function getRandomSize(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ballRef = useRef<Ball | null>(null);
  const linesRef = useRef<{ points: Point[], color: string }[]>([]);
  const currentLineRef = useRef<{ points: Point[], color: string } | null>(null);
  const isDrawingRef = useRef(false);
  const isBallMovingRef = useRef(false);
  const adjectiveRef = useRef<AdjectiveStyle>(getRandomAdjective());
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    ballRef.current = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      dx: (Math.random() - 0.5) * 5,
      dy: (Math.random() - 0.5) * 5,
      radius: getRandomSize(10, 30),
      color: getRandomColor(),
    };

    const animate = () => {
      if (!ctx || !ballRef.current) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const adjective = adjectiveRef.current;
      ctx.font = `bold ${adjective.fontSize}px Arial`;
      ctx.fillStyle = adjective.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(adjective.text, canvas.width / 2, canvas.height / 6);

      [...linesRef.current, ...(currentLineRef.current ? [currentLineRef.current] : [])].forEach(line => {
        if (line.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(line.points[0].x, line.points[0].y);
        for (let i = 1; i < line.points.length; i++) {
          ctx.lineTo(line.points[i].x, line.points[i].y);
        }
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      });

      // Update ball position
      if (isBallMovingRef.current) {
        let { x, y, dx, dy } = ballRef.current;
        const { radius, color } = ballRef.current;

        // Wall collision
        if (x + radius > canvas.width || x - radius < 0) dx = -dx;
        if (y + radius > canvas.height || y - radius < 0) dy = -dy;

        [...linesRef.current, ...(currentLineRef.current ? [currentLineRef.current] : [])].forEach(line => {
          for (let i = 1; i < line.points.length; i++) {
            const start = line.points[i - 1];
            const end = line.points[i];
            if (lineCircleCollision(start, end, { x, y }, radius)) {
              const angle = Math.atan2(end.y - start.y, end.x - start.x);
              const normal = { x: Math.sin(angle), y: -Math.cos(angle) };
              const dotProduct = dx * normal.x + dy * normal.y;
              dx -= 2 * dotProduct * normal.x;
              dy -= 2 * dotProduct * normal.y;
            }
          }
        });

        x += dx;
        y += dy;

        ballRef.current = { x, y, dx, dy, radius, color };
      }

      const { x, y, radius, color } = ballRef.current;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.closePath();

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = event.nativeEvent;
    isDrawingRef.current = true;
    currentLineRef.current = { 
      points: [{ x: offsetX, y: offsetY }],
      color: 'black'
    };
    forceUpdate({});
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentLineRef.current) return;
    const { offsetX, offsetY } = event.nativeEvent;
    currentLineRef.current.points.push({ x: offsetX, y: offsetY });
    forceUpdate({});
  };

  const handleMouseUp = () => {
    isDrawingRef.current = false;
    if (currentLineRef.current && currentLineRef.current.points.length > 1) {
      linesRef.current.push(currentLineRef.current);
    }
    currentLineRef.current = null;
    isBallMovingRef.current = true;
    forceUpdate({});
  };

  return (
    <div className="w-full h-screen relative bg-[#f5f4ef] overflow-hidden">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="absolute top-0 left-0 w-full h-screen cursor-crosshair"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}

function lineCircleCollision(lineStart: Point, lineEnd: Point, circleCenter: Point, circleRadius: number): boolean {
  const lineVector = { x: lineEnd.x - lineStart.x, y: lineEnd.y - lineStart.y };
  const circleVector = { x: circleCenter.x - lineStart.x, y: circleCenter.y - lineStart.y };
  
  const lineLength = Math.sqrt(lineVector.x ** 2 + lineVector.y ** 2);
  const unitLine = { x: lineVector.x / lineLength, y: lineVector.y / lineLength };
  
  const projection = circleVector.x * unitLine.x + circleVector.y * unitLine.y;
  
  const closestPoint = {
    x: lineStart.x + unitLine.x * Math.max(0, Math.min(lineLength, projection)),
    y: lineStart.y + unitLine.y * Math.max(0, Math.min(lineLength, projection))
  };
  
  const distance = Math.sqrt(
    (circleCenter.x - closestPoint.x) ** 2 + (circleCenter.y - closestPoint.y) ** 2
  );
  
  return distance <= circleRadius;
}