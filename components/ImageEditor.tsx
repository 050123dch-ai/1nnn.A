import React, { useState, useRef, useEffect } from 'react';
import { Slider, Button } from './UIComponents';
import { RotateCw, RotateCcw, Check, X, Crop, Sliders } from 'lucide-react';

interface ImageEditorProps {
  imageSrc: string;
  onSave: (newBase64: string) => void;
  onCancel: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ imageSrc, onSave, onCancel }) => {
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [rotation, setRotation] = useState(0);
  
  const [isCropping, setIsCropping] = useState(false);
  // Crop rect in percentages (0-100)
  const [cropRect, setCropRect] = useState({ x: 10, y: 10, w: 80, h: 80 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startRect: typeof cropRect; type: 'move' | 'nw' | 'ne' | 'sw' | 'se' | null }>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Helper to handle mouse interactions for cropping
  const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'nw' | 'ne' | 'sw' | 'se') => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRect: { ...cropRect },
      type
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      const { startX, startY, startRect, type } = dragRef.current;
      const containerRect = containerRef.current.getBoundingClientRect();
      
      const deltaX = ((e.clientX - startX) / containerRect.width) * 100;
      const deltaY = ((e.clientY - startY) / containerRect.height) * 100;

      let newRect = { ...startRect };

      if (type === 'move') {
        newRect.x = Math.max(0, Math.min(100 - newRect.w, startRect.x + deltaX));
        newRect.y = Math.max(0, Math.min(100 - newRect.h, startRect.y + deltaY));
      } else if (type === 'se') {
        newRect.w = Math.max(10, Math.min(100 - startRect.x, startRect.w + deltaX));
        newRect.h = Math.max(10, Math.min(100 - startRect.y, startRect.h + deltaY));
      } // Add other corners if needed, keeping simple for now (Move + Resize Bottom-Right is usually enough for basic, but let's do move and scale)
      
      setCropRect(newRect);
    };

    const handleMouseUp = () => {
      dragRef.current = null;
    };

    if (isCropping) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isCropping]);

  const handleSave = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      if (!ctx) return;
      
      // 1. Calculate dimensions for rotation
      const rad = (rotation * Math.PI) / 180;
      const sin = Math.abs(Math.sin(rad));
      const cos = Math.abs(Math.cos(rad));
      const newWidth = img.width * cos + img.height * sin;
      const newHeight = img.width * sin + img.height * cos;

      canvas.width = newWidth;
      canvas.height = newHeight;

      // 2. Draw with filters and rotation
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      ctx.translate(newWidth / 2, newHeight / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      // 3. Crop if enabled
      if (isCropping) {
        // Create a temp canvas to hold the rotated/filtered image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = newWidth;
        tempCanvas.height = newHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(canvas, 0, 0);
          
          // Resize result canvas to crop size
          const cx = (cropRect.x / 100) * newWidth;
          const cy = (cropRect.y / 100) * newHeight;
          const cw = (cropRect.w / 100) * newWidth;
          const ch = (cropRect.h / 100) * newHeight;

          canvas.width = cw;
          canvas.height = ch;
          ctx.clearRect(0, 0, cw, ch); // clear old context
          // Draw the slice
          ctx.drawImage(tempCanvas, cx, cy, cw, ch, 0, 0, cw, ch);
        }
      }

      // 4. Export
      const resultBase64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
      onSave(resultBase64);
    };
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
      {/* Toolbar */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Sliders className="w-5 h-5" /> 编辑图片
        </h3>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>取消</Button>
          <Button onClick={handleSave}><Check className="w-4 h-4 mr-2" /> 保存更改</Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 relative bg-gray-500/10 p-4 flex items-center justify-center overflow-hidden">
          <div 
            ref={containerRef}
            className="relative shadow-lg inline-block transition-transform duration-200"
            style={{ 
              filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
              transform: `rotate(${rotation}deg)`,
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          >
            <img 
              src={imageSrc} 
              alt="Edit Target" 
              className="max-h-[500px] object-contain block pointer-events-none select-none"
              draggable={false}
            />
            
            {/* Crop Overlay - This needs to be inverse transformed to stay upright if we were dragging on rotated element, 
                but for simplicity, we disable crop when rotated, or reset rotation when cropping.
                Currently: Simplest is allow crop only on 0 rotation or handle coordinates carefully. 
                Let's simplify: Hide crop overlay if rotated, show warning.
            */}
            {isCropping && rotation === 0 && (
              <div 
                className="absolute border-2 border-white box-content shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                style={{
                  left: `${cropRect.x}%`,
                  top: `${cropRect.y}%`,
                  width: `${cropRect.w}%`,
                  height: `${cropRect.h}%`,
                  cursor: 'move'
                }}
                onMouseDown={(e) => handleMouseDown(e, 'move')}
              >
                {/* Resize Handle (Bottom Right) */}
                <div 
                  className="absolute bottom-0 right-0 w-6 h-6 bg-indigo-600 border-2 border-white cursor-se-resize translate-x-1/2 translate-y-1/2 rounded-full"
                  onMouseDown={(e) => handleMouseDown(e, 'se')}
                />
              </div>
            )}
            
            {isCropping && rotation !== 0 && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white p-4 text-center text-sm">
                 为了获得最佳体验，请先裁剪再旋转，<br/>或将旋转重置为0度。
               </div>
            )}
          </div>
        </div>

        {/* Controls Sidebar */}
        <div className="w-full lg:w-72 bg-white border-l p-6 space-y-6 overflow-y-auto">
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 uppercase tracking-wider">裁剪与旋转</h4>
            <div className="flex gap-2">
              <Button 
                variant={isCropping ? 'primary' : 'outline'} 
                className="flex-1"
                onClick={() => setIsCropping(!isCropping)}
              >
                <Crop className="w-4 h-4 mr-2" /> {isCropping ? '完成裁剪' : '裁剪'}
              </Button>
            </div>
             <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRotation((r) => (r - 90))}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setRotation((r) => (r + 90))}>
                <RotateCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-6 border-t pt-6">
             <h4 className="text-sm font-medium text-gray-900 uppercase tracking-wider">图像调整</h4>
             <Slider 
                label="亮度" 
                min={0} max={200} 
                value={brightness} 
                onChange={(e) => setBrightness(Number(e.target.value))} 
              />
              <Slider 
                label="对比度" 
                min={0} max={200} 
                value={contrast} 
                onChange={(e) => setContrast(Number(e.target.value))} 
              />
               <Slider 
                label="饱和度" 
                min={0} max={200} 
                value={saturation} 
                onChange={(e) => setSaturation(Number(e.target.value))} 
              />
               <Button variant="ghost" className="w-full text-xs" onClick={() => { setBrightness(100); setContrast(100); setSaturation(100); setRotation(0); setIsCropping(false); setCropRect({x:10,y:10,w:80,h:80}); }}>
                重置所有
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;