'use client';

import { useRef, useEffect, useState } from 'react';

interface SpinWheelProps {
    segments: Array<{
        label: string;
        color: string;
        probability?: number;
    }>;
    onSpin?: () => void;
    onComplete?: (result: { segment: typeof segments[0]; index: number }) => void;
    size?: number;
    disabled?: boolean;
}

export function SpinWheel({
    segments,
    onSpin,
    onComplete,
    size = 300,
    disabled = false,
}: SpinWheelProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size / 2 - 10;
        const segmentAngle = (Math.PI * 2) / segments.length;

        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        // Draw segments
        segments.forEach((segment, i) => {
            const startAngle = i * segmentAngle + (rotation * Math.PI) / 180 - Math.PI / 2;
            const endAngle = startAngle + segmentAngle;

            // Draw segment
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = segment.color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw label
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + segmentAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px system-ui';
            ctx.fillText(segment.label, radius - 20, 5);
            ctx.restore();
        });

        // Draw center circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 3;
        ctx.stroke();

    }, [segments, size, rotation]);

    const spin = () => {
        if (isSpinning || disabled) return;

        setIsSpinning(true);
        onSpin?.();

        // Calculate weighted random result
        const totalWeight = segments.reduce((sum, s) => sum + (s.probability || 1), 0);
        let random = Math.random() * totalWeight;
        let winningIndex = 0;

        for (let i = 0; i < segments.length; i++) {
            random -= segments[i].probability || 1;
            if (random <= 0) {
                winningIndex = i;
                break;
            }
        }

        // Calculate target rotation
        const segmentAngle = 360 / segments.length;
        const targetRotation = 360 * 5 + (360 - winningIndex * segmentAngle - segmentAngle / 2);

        // Animate
        let currentRotation = rotation;
        const startTime = Date.now();
        const duration = 4000;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out cubic)
            const eased = 1 - Math.pow(1 - progress, 3);
            currentRotation = rotation + (targetRotation - rotation) * eased;

            setRotation(currentRotation % 360);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setIsSpinning(false);
                onComplete?.({ segment: segments[winningIndex], index: winningIndex });
            }
        };

        requestAnimationFrame(animate);
    };

    return (
        <div className="relative inline-block">
            <canvas
                ref={canvasRef}
                width={size}
                height={size}
                className="rounded-full"
            />
            {/* Pointer */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2"
                style={{
                    width: 0,
                    height: 0,
                    borderLeft: '12px solid transparent',
                    borderRight: '12px solid transparent',
                    borderTop: '20px solid #ec4899',
                }}
            />
            {/* Spin button */}
            <button
                onClick={spin}
                disabled={isSpinning || disabled}
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
          w-16 h-16 rounded-full font-bold text-white text-xs
          ${isSpinning || disabled
                        ? 'bg-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 cursor-pointer'
                    }
          transition-all shadow-lg`}
            >
                {isSpinning ? '...' : 'SPIN'}
            </button>
        </div>
    );
}
