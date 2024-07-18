import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';

interface FractalGeneratorProps {
  width: number;
  height: number;
}

const FractalGenerator: React.FC<FractalGeneratorProps> = ({ width, height }) => {
  const [maxIterations, setMaxIterations] = useState<number>(100);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [centerX, setCenterX] = useState<number>(-0.6);
  const [centerY, setCenterY] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [isPanning, setIsPanning] = useState(false);
  const [cursor, setCursor] = useState('default');
  const lastMousePositionRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    generateFractal(centerX, centerY, zoom, maxIterations);
  }, [centerX, centerY, zoom, maxIterations, width, height]);

  useEffect(() => {
    setCursor(isPanning ? 'grabbing' : 'grab');
  }, [isPanning]);

  const generateFractal = (
    currentCenterX: number,
    currentCenterY: number,
    currentZoom: number,
    currentMaxIterations: number
  ) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const scale = 4 / (width * currentZoom);
    const offsetX = currentCenterX - (width / 2) * scale;
    const offsetY = currentCenterY - (height / 2) * scale;

    for (let px = 0; px < width; px++) {
      for (let py = 0; py < height; py++) {
        const x = px * scale + offsetX;
        const y = py * scale + offsetY;
        
        let zx = 0;
        let zy = 0;
        let iteration = 0;

        while (zx * zx + zy * zy <= 4 && iteration < currentMaxIterations) {
          const xtemp = zx * zx - zy * zy + x;
          zy = 2 * zx * zy + y;
          zx = xtemp;
          iteration++;
        }

        const pixelIndex = (py * width + px) * 4;
        const color = iteration === currentMaxIterations ? [0, 0, 0] : hslToRgb(iteration / currentMaxIterations, 1, 0.5);
        data[pixelIndex] = color[0];
        data[pixelIndex + 1] = color[1];
        data[pixelIndex + 2] = color[2];
        data[pixelIndex + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    
    const img = new window.Image();
    img.onload = () => {
      setImage(img);
    };
    img.src = canvas.toDataURL();
  };

  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    let r: number, g: number, b: number;
  
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
  
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
  
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  };

  const handleZoom = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = zoom;
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;

    const mousePointTo = {
      x: pointerPosition.x / width,
      y: pointerPosition.y / height,
    };

    let newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    newScale = Math.max(0.00001, Math.min(1000000, newScale));

    const newCenterX = centerX + (mousePointTo.x - 0.5) * (4 / (width * oldScale)) * (oldScale - newScale);
    const newCenterY = centerY + (mousePointTo.y - 0.5) * (4 / (height * oldScale)) * (oldScale - newScale);

    console.log(`Zoom: ${newScale}, CenterX: ${newCenterX}, CenterY: ${newCenterY}`);

    setCenterX(newCenterX);
    setCenterY(newCenterY);
    setZoom(newScale);
  };

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    setIsPanning(true);
    const stage = e.target.getStage();
    if (stage) {
      const pos = stage.getPointerPosition();
      if (pos) {
        lastMousePositionRef.current = pos;
      }
    }
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isPanning || !lastMousePositionRef.current) return;
    
    const stage = e.target.getStage();
    if (!stage) return;

    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;

    const scale = 4 / (width * zoom);
    const dx = (pointerPosition.x - lastMousePositionRef.current.x) * scale;
    const dy = (pointerPosition.y - lastMousePositionRef.current.y) * scale;

    
    const sensitivity = 0.5; // Adjust this value as needed
    setCenterX(prevX => prevX - dx * sensitivity);
    setCenterY(prevY => prevY - dy * sensitivity);

    lastMousePositionRef.current = pointerPosition;
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    lastMousePositionRef.current = null;
  };

  return (
    <div>
      <div>
        <label>
          Max Iterations:
          <input
            type="number"
            value={maxIterations}
            onChange={(e) => setMaxIterations(Number(e.target.value))}
          />
        </label>
      </div>
      <Stage 
        width={width} 
        height={height} 
        onWheel={handleZoom}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor }}
      >
        <Layer>
          {image && (
            <KonvaImage
              key={`fractal-${centerX}-${centerY}-${zoom}-${maxIterations}`}
              image={image}
              width={width}
              height={height}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};

export default FractalGenerator;