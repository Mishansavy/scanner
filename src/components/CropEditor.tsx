import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Point } from '../types';
import { isClockwiseConvexQuad } from '../lib/geometry';

type CropEditorProps = {
  file: File;
  initialCorners: Point[] | null;
  onSave: (corners: Point[] | null) => void;
  onCancel: () => void;
};

const HANDLE_SIZE = 16;

export function CropEditor({ file, initialCorners, onSave, onCancel }: CropEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [corners, setCorners] = useState<Point[]>([]);
  const draggingIndex = useRef<number | null>(null);
  const displayScale = useRef(1);

  useEffect(() => {
    let isActive = true;
    let loadedBitmap: ImageBitmap | null = null;

    createImageBitmap(file, { imageOrientation: 'from-image' }).then((result) => {
      if (!isActive) return result.close();
      loadedBitmap = result;
      setBitmap(result);
      setCorners(
        initialCorners ?? [
          { x: 0, y: 0 },
          { x: result.width, y: 0 },
          { x: result.width, y: result.height },
          { x: 0, y: result.height },
        ],
      );
    });

    return () => {
      isActive = false;
      loadedBitmap?.close();
    };
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;

    const scale = Math.min(
      1,
      (window.innerWidth - 32) / bitmap.width,
      (window.innerHeight * 0.75) / bitmap.height,
    );
    displayScale.current = scale;
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext('2d')!;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const tokens = getComputedStyle(canvas);
    const accent = tokens.getPropertyValue('--color-accent').trim();
    const danger = tokens.getPropertyValue('--color-danger').trim();
    context.strokeStyle = isClockwiseConvexQuad(corners) ? accent : danger;
    context.lineWidth = 2;
    context.beginPath();
    corners.forEach((corner, index) => {
      if (index === 0) context.moveTo(corner.x * scale, corner.y * scale);
      else context.lineTo(corner.x * scale, corner.y * scale);
    });
    context.closePath();
    context.stroke();

    context.fillStyle = accent;
    corners.forEach((corner) => {
      context.beginPath();
      context.arc(corner.x * scale, corner.y * scale, HANDLE_SIZE / 2, 0, Math.PI * 2);
      context.fill();
    });
  }, [bitmap, corners]);

  const toImagePoint = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = canvas.width / bounds.width / displayScale.current;
    const x = (event.clientX - bounds.left) * pixelRatio;
    const y = (event.clientY - bounds.top) * pixelRatio;
    return {
      x: Math.min(bitmap!.width, Math.max(0, x)),
      y: Math.min(bitmap!.height, Math.max(0, y)),
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const pointer = toImagePoint(event);
    const hitRadius = (HANDLE_SIZE * 1.5) / displayScale.current;
    const hitIndex = corners.findIndex(
      (corner) => Math.hypot(corner.x - pointer.x, corner.y - pointer.y) < hitRadius,
    );
    if (hitIndex < 0) return;
    draggingIndex.current = hitIndex;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const activeIndex = draggingIndex.current;
    if (activeIndex === null) return;
    const pointer = toImagePoint(event);
    setCorners((previous) =>
      previous.map((corner, index) => (index === activeIndex ? pointer : corner)),
    );
  };

  const isValid = corners.length === 4 && isClockwiseConvexQuad(corners);

  const handlePointerUp = () => {
    draggingIndex.current = null;
  };

  return (
    <div className="modal">
      <canvas
        ref={canvasRef}
        style={{ touchAction: 'none', maxWidth: '100%' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      {bitmap && !isValid && <p className="err">Corners cross. Drag them back into order.</p>}
      <div className="row">
        <button className="btn-primary" disabled={!bitmap || !isValid} onClick={() => onSave(corners)}>
          Save crop
        </button>
        <button onClick={() => onSave(null)}>Reset</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}