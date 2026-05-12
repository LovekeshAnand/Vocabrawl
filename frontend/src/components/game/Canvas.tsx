'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../../lib/socket';

interface CanvasProps {
  lobbyId: string;
  isDrawer: boolean;
  width?: number;
  height?: number;
}

interface Point { x: number; y: number }
interface StrokeData {
  type: 'start' | 'draw' | 'end' | 'clear';
  x?: number;
  y?: number;
  color?: string;
  size?: number;
}

export function Canvas({ lobbyId, isDrawer, width = 1000, height = 700 }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(5);
  const lastPos = useRef<Point | null>(null);

  const colors = [
    // Row 1: Grayscale & Basic
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF', '#FFB7B7', '#FF0000',
    // Row 2: Vivid
    '#FF7F00', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#8B00FF', '#FF00FF', '#795548',
    // Row 3: Soft / Deep
    '#D32F2F', '#C2185B', '#7B1FA2', '#303F9F', '#1976D2', '#0288D1', '#0097A7', '#00796B'
  ];
  const sizes = [2, 5, 10, 20, 40];

  const lastRemotePos = useRef<Point | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleDraw = ({ stroke }: { stroke: StrokeData }) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      if (stroke.type === 'clear') {
        ctx.clearRect(0, 0, width, height);
        return;
      }

      if (stroke.type === 'start' && stroke.x !== undefined && stroke.y !== undefined) {
        ctx.beginPath();
        ctx.moveTo(stroke.x, stroke.y);
        ctx.strokeStyle = stroke.color || '#000000';
        ctx.lineWidth = stroke.size || 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineTo(stroke.x, stroke.y);
        ctx.stroke();
        lastRemotePos.current = { x: stroke.x, y: stroke.y };
      } else if (stroke.type === 'draw' && stroke.x !== undefined && stroke.y !== undefined) {
        if (lastRemotePos.current) {
          const midX = (lastRemotePos.current.x + stroke.x) / 2;
          const midY = (lastRemotePos.current.y + stroke.y) / 2;
          ctx.quadraticCurveTo(lastRemotePos.current.x, lastRemotePos.current.y, midX, midY);
          ctx.stroke();
        }
        lastRemotePos.current = { x: stroke.x, y: stroke.y };
      } else if (stroke.type === 'end') {
        ctx.closePath();
        lastRemotePos.current = null;
      }
    };

    const handleClear = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, width, height);
    };

    socket.on('scribbl_draw', handleDraw);
    socket.on('scribbl_clear', handleClear);

    return () => {
      socket.off('scribbl_draw', handleDraw);
      socket.off('scribbl_clear', handleClear);
    };
  }, [width, height]);

  const emitDraw = (stroke: StrokeData) => {
    if (!isDrawer) return;
    const socket = getSocket();
    socket?.emit('scribbl_draw', { lobbyId, stroke });
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    // Scale coordinates to internal canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;
    const pos = getCoordinates(e);
    if (!pos) return;

    setIsDrawing(true);
    lastPos.current = pos;

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Draw a point immediately
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    emitDraw({ type: 'start', x: pos.x, y: pos.y, color, size });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer) return;
    const pos = getCoordinates(e);
    if (!pos || !lastPos.current) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      // Bezier smoothing: find midpoint between last and current
      const midX = (lastPos.current.x + pos.x) / 2;
      const midY = (lastPos.current.y + pos.y) / 2;
      
      ctx.quadraticCurveTo(lastPos.current.x, lastPos.current.y, midX, midY);
      ctx.stroke();
    }

    emitDraw({ type: 'draw', x: pos.x, y: pos.y, color, size });
    lastPos.current = pos;
  };

  const stopDrawing = () => {
    if (!isDrawing || !isDrawer) return;
    setIsDrawing(false);
    lastPos.current = null;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.closePath();
    emitDraw({ type: 'end' });
  };

  const clearCanvas = () => {
    if (!isDrawer) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, width, height);
    const socket = getSocket();
    socket?.emit('scribbl_clear', { lobbyId });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: 16 }}>
      
      <div className="scribbl-canvas-frame">
        <div style={{ 
          width: '100%', 
          height: '100%', 
          maxWidth: '100%', 
          maxHeight: '100%', 
          aspectRatio: `${width}/${height}`,
          position: 'relative'
        }}>
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={(e) => { e.preventDefault(); startDrawing(e); }}
            onTouchMove={(e) => { e.preventDefault(); draw(e); }}
            onTouchEnd={(e) => { e.preventDefault(); stopDrawing(); }}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              cursor: isDrawer ? 'crosshair' : 'default',
              touchAction: 'none'
            }}
          />
        </div>
        {!isDrawer && (
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.9)', padding: '6px 12px', borderRadius: 8, border: '1.5px solid var(--wb-border)', pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <span className="font-hand" style={{ color: 'var(--wb-ink-faint)', fontWeight: 600 }}>👁️ View Only</span>
          </div>
        )}
      </div>

      {isDrawer && (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div className="scribbl-tools" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            <div className="scribbl-color-grid">
              {colors.map(c => (
                <button 
                  key={c} 
                  onClick={() => setColor(c)}
                  style={{ 
                    width: 20, height: 20, borderRadius: '50%', backgroundColor: c,
                    border: color === c ? '2.5px solid var(--wb-ink)' : '1px solid rgba(0,0,0,0.1)',
                    cursor: 'pointer', transition: 'all 0.2s',
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                    boxShadow: color === c ? `0 0 6px ${c}` : 'none'
                  }}
                  title={c === '#FFFFFF' ? 'Eraser' : `Color: ${c}`}
                />
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', borderLeft: '2px dashed var(--wb-border)', paddingLeft: 12 }}>
              {sizes.map(s => (
                <button 
                  key={s} 
                  onClick={() => setSize(s)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: '#FFFFFF',
                    border: size === s ? '2.5px solid var(--wb-ink)' : '1px solid var(--wb-border)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ width: Math.max(2, s/3), height: Math.max(2, s/3), borderRadius: '50%', background: 'black' }} />
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 6, borderLeft: '2px dashed var(--wb-border)', paddingLeft: 12 }}>
              <button 
                className="wb-btn wb-btn-sm" 
                onClick={() => setColor('#FFFFFF')} 
                style={{ background: color === '#FFFFFF' ? 'var(--wb-paper-alt)' : 'var(--wb-paper)', padding: '4px 8px', fontSize: '0.8rem' }}
                title="Eraser"
              >
                🧽
              </button>
              <button 
                className="wb-btn wb-btn-sm wb-btn-indigo" 
                onClick={clearCanvas} 
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                title="Clear All"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
