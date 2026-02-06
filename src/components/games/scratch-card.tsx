'use client';

import { useRef, useState, useEffect } from 'react';

interface ScratchCardProps {
    width?: number;
    height?: number;
    revealContent: React.ReactNode;
    coverColor?: string;
    brushSize?: number;
    revealThreshold?: number;
    onReveal?: () => void;
    disabled?: boolean;
}

export function ScratchCard({
    width = 280,
    height = 160,
    revealContent,
    coverColor = '#2d3748',
    brushSize = 25,
    revealThreshold = 50,
    onReveal,
    disabled = false,
}: ScratchCardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScratching, setIsScratching] = useState(false);
    const [revealed, setRevealed] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw cover
        ctx.fillStyle = coverColor;
        ctx.fillRect(0, 0, width, height);

        // Add shimmer pattern
        for (let i = 0; i < 50; i++) {
            ctx.beginPath();
            ctx.arc(
                Math.random() * width,
                Math.random() * height,
                Math.random() * 2,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
            ctx.fill();
        }

        // Add text hint
        ctx.font = 'bold 16px system-ui';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'center';
        ctx.fillText('Scratch to reveal!', width / 2, height / 2);

    }, [coverColor, width, height]);

    const scratch = (x: number, y: number) => {
        const canvas = canvasRef.current;
        if (!canvas || revealed || disabled) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, brushSize, 0, Math.PI * 2);
        ctx.fill();

        // Check reveal percentage
        const imageData = ctx.getImageData(0, 0, width, height);
        let transparent = 0;
        for (let i = 3; i < imageData.data.length; i += 4) {
            if (imageData.data[i] === 0) transparent++;
        }

        const percentRevealed = (transparent / (width * height)) * 100;

        if (percentRevealed > revealThreshold && !revealed) {
            setRevealed(true);
            ctx.clearRect(0, 0, width, height);
            onReveal?.();
        }
    };

    const handleMouseDown = () => setIsScratching(true);
    const handleMouseUp = () => setIsScratching(false);
    const handleMouseLeave = () => setIsScratching(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isScratching) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        scratch(e.clientX - rect.left, e.clientY - rect.top);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        setIsScratching(true);
    };

    const handleTouchEnd = () => setIsScratching(false);

    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault();
        if (!isScratching) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const touch = e.touches[0];
        scratch(touch.clientX - rect.left, touch.clientY - rect.top);
    };

    return (
        <div
            className="relative rounded-xl overflow-hidden"
            style={{ width, height }}
        >
            {/* Reveal content (behind canvas) */}
            <div
                className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500"
            >
                {revealContent}
            </div>

            {/* Scratch canvas (on top) */}
            <canvas
                ref={canvasRef}
                width={width}
                height={height}
                className={`absolute inset-0 ${disabled ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
            />
        </div>
    );
}
