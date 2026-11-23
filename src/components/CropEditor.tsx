import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Point } from '../types';
import { isClockwiseConvexQuad, isInsideClockwiseQuad } from '../lib/geometry';

type CropEditorProps = {
  file: File;
  initialCorners: Point[] | null;
  onSave: (corners: Point[] | null) => void;
  onCancel: () => void;
};

type Drag = { affected: number[]; last: Point };

const CORNER_RADIUS = 11;
const EDGE_RADIUS = 7;
const HIT_RADIUS = 28;
const DEFAULT_INSET = 0.05;
const LOUPE_RADIUS = 64;
const LOUPE_MARGIN = 12;
const LOUPE_ZOOM = 3;

export function CropEditor({ file, initialCorners, onSave, onCancel }: CropEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [corners, setCorners] = useState<Point[]>([]);
  const [loupeFocus, setLoupeFocus] = useState<Point | null>(null);
  const drag = useRef<Drag | null>(null);
  const displayScale = useRef(1);

  useEffect(() => {
    let isActive = true;
    let loadedBitmap: ImageBitmap | null = null;

    createImageBitmap(file, { imageOrientation: 'from-image' }).then((result) => {
      if (!isActive) return result.close();
      loadedBitmap = result;
      setBitmap(result);

      const insetX = result.width * DEFAULT_INSET;
      const insetY = result.height * DEFAULT_INSET;
      setCorners(
        initialCorners ?? [
          { x: insetX, y: insetY },
          { x: result.width - insetX, y: insetY },
          { x: result.width - insetX, y: result.height - insetY },
          { x: insetX, y: result.height - insetY },
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
    const tokens = getComputedStyle(canvas);
    const accent = tokens.getPropertyValue('--color-accent').trim();
    const danger = tokens.getPropertyValue('--color-danger').trim();
    const surface = tokens.getPropertyValue('--color-surface').trim();
    const dim = tokens.getPropertyValue('--color-dim').trim();

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const scaled = corners.map((corner) => ({ x: corner.x * scale, y: corner.y * scale }));
    const tracePolygon = () => {
      scaled.forEach((corner, index) => {
        if (index === 0) context.moveTo(corner.x, corner.y);
        else context.lineTo(corner.x, corner.y);
      });
      context.closePath();
    };

    context.fillStyle = dim;
    context.beginPath();
    context.rect(0, 0, canvas.width, canvas.height);
    tracePolygon();
    context.fill('evenodd');

    context.strokeStyle = isClockwiseConvexQuad(corners) ? accent : danger;
    context.lineWidth = 2;
    context.beginPath();
    tracePolygon();
    context.stroke();

    const drawHandle = (center: Point, radius: number, fill: string, ring: string) => {
      context.beginPath();
      context.arc(center.x, center.y, radius, 0, Math.PI * 2);
      context.fillStyle = fill;
      context.fill();
      context.strokeStyle = ring;
      context.lineWidth = 2;
      context.stroke();
    };

    scaled.forEach((corner, index) => {
      const next = scaled[(index + 1) % 4];
      drawHandle({ x: (corner.x + next.x) / 2, y: (corner.y + next.y) / 2 }, EDGE_RADIUS, surface, accent);
    });
    scaled.forEach((corner) => drawHandle(corner, CORNER_RADIUS, accent, surface));

    if (!loupeFocus) return;
    const ink = tokens.getPropertyValue('--color-ink').trim();
    const diameter = LOUPE_RADIUS * 2;
    const focusX = loupeFocus.x * scale;
    const focusY = loupeFocus.y * scale;
    const isNearTopLeft =
      focusX < diameter + LOUPE_MARGIN * 2 && focusY < diameter + LOUPE_MARGIN * 2;
    const centerX = isNearTopLeft ? canvas.width - LOUPE_RADIUS - LOUPE_MARGIN : LOUPE_RADIUS + LOUPE_MARGIN;
    const centerY = LOUPE_RADIUS + LOUPE_MARGIN;

    context.save();
    context.beginPath();
    context.arc(centerX, centerY, LOUPE_RADIUS, 0, Math.PI * 2);
    context.clip();
    context.fillStyle = surface;
    context.fillRect(centerX - LOUPE_RADIUS, centerY - LOUPE_RADIUS, diameter, diameter);
    const sourceSize = diameter / (scale * LOUPE_ZOOM);
    context.drawImage(
      bitmap,
      loupeFocus.x - sourceSize / 2,
      loupeFocus.y - sourceSize / 2,
      sourceSize,
      sourceSize,
      centerX - LOUPE_RADIUS,
      centerY - LOUPE_RADIUS,
      diameter,
      diameter,
    );
    context.restore();

    context.lineWidth = 1;
    context.strokeStyle = accent;
    context.beginPath();
    context.moveTo(centerX - LOUPE_RADIUS, centerY);
    context.lineTo(centerX + LOUPE_RADIUS, centerY);
    context.moveTo(centerX, centerY - LOUPE_RADIUS);
    context.lineTo(centerX, centerY + LOUPE_RADIUS);
    context.stroke();

    context.lineWidth = 2;
    context.strokeStyle = ink;
    context.beginPath();
    context.arc(centerX, centerY, LOUPE_RADIUS, 0, Math.PI * 2);
    context.stroke();
  }, [bitmap, corners, loupeFocus]);

  const toImagePoint = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = canvas.width / bounds.width / displayScale.current;
    return {
      x: (event.clientX - bounds.left) * pixelRatio,
      y: (event.clientY - bounds.top) * pixelRatio,
    };
  };

  const findAffectedIndices = (pointer: Point): number[] | null => {
    const hitRadius = HIT_RADIUS / displayScale.current;
    const isNear = (target: Point) => Math.hypot(target.x - pointer.x, target.y - pointer.y) < hitRadius;

    const cornerIndex = corners.findIndex(isNear);
    if (cornerIndex >= 0) return [cornerIndex];

    const edgeIndex = corners.findIndex((corner, index) => {
      const next = corners[(index + 1) % 4];
      return isNear({ x: (corner.x + next.x) / 2, y: (corner.y + next.y) / 2 });
    });
    if (edgeIndex >= 0) return [edgeIndex, (edgeIndex + 1) % 4];

    return isInsideClockwiseQuad(pointer, corners) ? [0, 1, 2, 3] : null;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const pointer = toImagePoint(event);
    const affected = findAffectedIndices(pointer);
    if (!affected) return;
    drag.current = { affected, last: pointer };
    setLoupeFocus(affected.length === 1 ? corners[affected[0]] : pointer);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const active = drag.current;
    if (!active || !bitmap) return;

    const pointer = toImagePoint(event);
    const moved = active.affected.map((index) => corners[index]);
    const deltaX = Math.min(
      bitmap.width - Math.max(...moved.map((corner) => corner.x)),
      Math.max(-Math.min(...moved.map((corner) => corner.x)), pointer.x - active.last.x),
    );
    const deltaY = Math.min(
      bitmap.height - Math.max(...moved.map((corner) => corner.y)),
      Math.max(-Math.min(...moved.map((corner) => corner.y)), pointer.y - active.last.y),
    );

    active.last = { x: active.last.x + deltaX, y: active.last.y + deltaY };
    const nextCorners = corners.map((corner, index) =>
      active.affected.includes(index) ? { x: corner.x + deltaX, y: corner.y + deltaY } : corner,
    );
    setCorners(nextCorners);
    setLoupeFocus(active.affected.length === 1 ? nextCorners[active.affected[0]] : active.last);
  };

  const isValid = corners.length === 4 && isClockwiseConvexQuad(corners);

  const handlePointerUp = () => {
    drag.current = null;
    setLoupeFocus(null);
  };

  return (
    <div className="modal">
      <canvas
        ref={canvasRef}
        style={{ touchAction: 'none', maxWidth: '100%' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
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
