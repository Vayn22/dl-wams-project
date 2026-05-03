"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  Eraser,
  MoveUpRight,
  MousePointer2,
  Pencil,
  Redo2,
  Save,
  Square,
  Type,
  Undo2,
  Circle,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSegmentation } from "@/hooks/useSegmentation";
import { drawMaskOnCanvas } from "@/utils/renderMask";

function drawArrow(ctx, x1, y1, x2, y2, color, size, dashed) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 14 + size * 2;
  ctx.save();
  if (dashed) ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.stroke();
  if (dashed) {
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 7), y2 - headLen * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 7), y2 - headLen * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const lx = x1 + t * dx;
  const ly = y1 + t * dy;
  return Math.hypot(px - lx, py - ly);
}

function computeBBox(stroke) {
  if (!stroke) return { x: 0, y: 0, w: 0, h: 0 };
  if (stroke.tool === "pen") {
    const xs = stroke.points.map((p) => p.x);
    const ys = stroke.points.map((p) => p.y);
    return {
      x: Math.min(...xs) - stroke.size,
      y: Math.min(...ys) - stroke.size,
      w: Math.max(...xs) - Math.min(...xs) + stroke.size * 2,
      h: Math.max(...ys) - Math.min(...ys) + stroke.size * 2,
    };
  }
  if (stroke.tool === "ellipse") {
    return {
      x: stroke.cx - stroke.rx - stroke.size,
      y: stroke.cy - stroke.ry - stroke.size,
      w: stroke.rx * 2 + stroke.size * 2,
      h: stroke.ry * 2 + stroke.size * 2,
    };
  }
  if (stroke.tool === "rect") {
    return {
      x: stroke.x - stroke.size,
      y: stroke.y - stroke.size,
      w: stroke.w + stroke.size * 2,
      h: stroke.h + stroke.size * 2,
    };
  }
  if (stroke.tool === "arrow") {
    return {
      x: Math.min(stroke.x1, stroke.x2) - 16,
      y: Math.min(stroke.y1, stroke.y2) - 16,
      w: Math.abs(stroke.x2 - stroke.x1) + 32,
      h: Math.abs(stroke.y2 - stroke.y1) + 32,
    };
  }
  if (stroke.tool === "text") {
    return {
      x: stroke.x - 4,
      y: stroke.y - (stroke.size + 13) - 4,
      w: (stroke.textWidth || 0) + 8,
      h: stroke.size + 13 + 8,
    };
  }
  return { x: 0, y: 0, w: 0, h: 0 };
}

function isInsideBBox(pos, bbox) {
  if (!bbox) return false;
  return (
    pos.x >= bbox.x &&
    pos.x <= bbox.x + bbox.w &&
    pos.y >= bbox.y &&
    pos.y <= bbox.y + bbox.h
  );
}

export default function AnnotationEditor({ imageUrl, patientList, onSave }) {
  const containerRef = useRef(null);
  const baseCanvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const ctxBase = useRef(null);
  const ctxPreview = useRef(null);
  const isDrawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const currentPoints = useRef([]);
  const strokeHistory = useRef([]);
  const redoStack = useRef([]);
  const strokeStateHistory = useRef([]);
  const strokes = useRef([]);
  const baseSnapshot = useRef(null);
  const originalSnapshotRef = useRef(null);
  const selectedStrokeRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const rafId = useRef(null);
  const originalImageRef = useRef(null);
  const textInputPos = useRef({ x: 0, y: 0 });
  const pointerPosRef = useRef({ x: 0, y: 0 });
  const dprRef = useRef(1);
  const pointerIdRef = useRef(null);

  const [activeTool, setActiveTool] = useState("pen");
  const [activeColor, setActiveColor] = useState("#ef4444");
  const [brushSize, setBrushSize] = useState(3);
  const [showTextModal, setShowTextModal] = useState(false);
  const [textModalValue, setTextModalValue] = useState("");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [hoverHit, setHoverHit] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [isDraggingUi, setIsDraggingUi] = useState(false);
  const [segmentationImageFile, setSegmentationImageFile] = useState(null);
  const [maskApplied, setMaskApplied] = useState(false);

  const { runSegmentation, maskBase64, isLoading, error, reset } =
    useSegmentation(segmentationImageFile);

  const colorOptions = [
    { value: "#ef4444", label: "Rouge critique" },
    { value: "#f59e0b", label: "Orange attention" },
    { value: "#10b981", label: "Vert normal" },
    { value: "#0ea5e9", label: "Bleu info" },
    { value: "#a855f7", label: "Violet IA" },
    { value: "#ffffff", label: "Blanc" },
  ];

  const toolOptions = [
    { key: "select", label: "Sélectionner", icon: MousePointer2, shortcut: "S" },
    { key: "pen", label: "Dessin libre", icon: Pencil, shortcut: "P" },
    { key: "ellipse", label: "Ellipse", icon: Circle, shortcut: "E" },
    { key: "rect", label: "Rectangle", icon: Square, shortcut: "R" },
    { key: "arrow", label: "Flèche", icon: MoveUpRight, shortcut: "A" },
    { key: "text", label: "Texte", icon: Type, shortcut: "T" },
    { key: "eraser", label: "Gomme", icon: Eraser, shortcut: "G" },
  ];

  const activeToolLabel = toolOptions.find((t) => t.key === activeTool)?.label || "Dessin libre";

  const getCursor = useCallback(() => {
    if (activeTool === "select") {
      if (isDraggingUi) return "grabbing";
      return hoverHit ? "grab" : "default";
    }
    if (activeTool === "eraser") {
      const size = brushSize * 6;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="rgba(255,255,255,0.15)" stroke="#0ea5e9" stroke-width="2" stroke-dasharray="4 3"/></svg>`;
      return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${size / 2} ${size / 2}, crosshair`;
    }
    if (activeTool === "text") return "text";
    return "crosshair";
  }, [activeTool, brushSize, hoverHit, isDraggingUi]);

  const setTool = useCallback((nextTool) => {
    if (nextTool !== "select") {
      selectedStrokeRef.current = null;
      isDraggingRef.current = false;
      setIsDraggingUi(false);
      setHasSelection(false);
      setHoverHit(false);
    }
    setActiveTool(nextTool);
  }, []);

  const drawSelectionHandle = useCallback((stroke) => {
    if (!ctxBase.current || !stroke?.bbox) return;
    const bbox = stroke.bbox;
    const padding = 6;
    const ctx = ctxBase.current;
    ctx.save();
    ctx.strokeStyle = "#0ea5e9";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(
      bbox.x - padding,
      bbox.y - padding,
      bbox.w + padding * 2,
      bbox.h + padding * 2
    );
    ctx.setLineDash([]);
    const corners = [
      [bbox.x - padding, bbox.y - padding],
      [bbox.x + bbox.w + padding - 6, bbox.y - padding],
      [bbox.x - padding, bbox.y + bbox.h + padding - 6],
      [bbox.x + bbox.w + padding - 6, bbox.y + bbox.h + padding - 6],
    ];
    corners.forEach(([cx, cy]) => {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#0ea5e9";
      ctx.lineWidth = 1.5;
      ctx.fillRect(cx, cy, 6, 6);
      ctx.strokeRect(cx, cy, 6, 6);
    });
    ctx.restore();
  }, []);

  const findStrokeAtPos = useCallback((pos) => {
    for (let i = strokes.current.length - 1; i >= 0; i -= 1) {
      const stroke = strokes.current[i];
      if (!stroke.erased && isInsideBBox(pos, stroke.bbox)) return stroke;
    }
    return null;
  }, []);

  const applyContextDefaults = useCallback((ctx) => {
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
  }, []);

  const createCanvasImageFile = useCallback(async () => {
    if (!baseCanvasRef.current) return null;
    return new Promise((resolve) => {
      baseCanvasRef.current.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        resolve(new File([blob], "image.png", { type: "image/png" }));
      }, "image/png");
    });
  }, []);

  const drawStroke = useCallback((ctx, stroke, options = {}) => {
    if (!stroke || stroke.erased) return;
    const dashed = options.preview === true;
    ctx.save();
    applyContextDefaults(ctx);
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    if (dashed) ctx.setLineDash([6, 4]);

    if (stroke.tool === "pen") {
      const pts = stroke.points || [];
      if (!pts.length) {
        ctx.restore();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i += 1) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const midX = (prev.x + curr.x) / 2;
        const midY = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (stroke.tool === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(stroke.cx, stroke.cy, stroke.rx, stroke.ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (stroke.tool === "rect") {
      ctx.strokeRect(stroke.x, stroke.y, stroke.w, stroke.h);
      ctx.restore();
      return;
    }

    if (stroke.tool === "arrow") {
      drawArrow(ctx, stroke.x1, stroke.y1, stroke.x2, stroke.y2, stroke.color, stroke.size, dashed);
      ctx.restore();
      return;
    }

    if (stroke.tool === "text") {
      ctx.font = `${13 + stroke.size}px Inter, sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      ctx.fillText(stroke.text, stroke.x, stroke.y);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }, [applyContextDefaults]);

  const redrawFromStrokes = useCallback(() => {
    if (!ctxBase.current || !baseSnapshot.current) return;
    ctxBase.current.putImageData(baseSnapshot.current, 0, 0);
    strokes.current.forEach((stroke) => drawStroke(ctxBase.current, stroke));
    if (activeTool !== "select") {
      selectedStrokeRef.current = null;
      isDraggingRef.current = false;
      setHasSelection(false);
    }
  }, [activeTool, drawStroke]);

  const scheduleRender = useCallback((drawFn) => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      if (drawFn) drawFn();
      else redrawFromStrokes();
    });
  }, [redrawFromStrokes]);

  const updateHistoryFlags = useCallback(() => {
    setCanUndo(strokeHistory.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const pushToHistory = useCallback(() => {
    if (!ctxBase.current || !baseCanvasRef.current) return;
    redrawFromStrokes();
    const snapshot = ctxBase.current.getImageData(0, 0, baseCanvasRef.current.width, baseCanvasRef.current.height);
    strokeHistory.current.push(snapshot);
    strokeStateHistory.current.push(structuredClone(strokes.current));
    redoStack.current = [];
    updateHistoryFlags();
  }, [redrawFromStrokes, updateHistoryFlags]);

  const undo = useCallback(() => {
    if (!ctxBase.current || strokeHistory.current.length === 0) return;
    const currentSnap = strokeHistory.current.pop();
    const currentStrokes = strokeStateHistory.current.pop();
    if (currentSnap) redoStack.current.push({ snapshot: currentSnap, strokes: currentStrokes || [] });
    if (strokeHistory.current.length === 0) {
      ctxBase.current.putImageData(baseSnapshot.current, 0, 0);
      strokes.current = [];
    } else {
      ctxBase.current.putImageData(strokeHistory.current[strokeHistory.current.length - 1], 0, 0);
      strokes.current = structuredClone(strokeStateHistory.current[strokeStateHistory.current.length - 1] || []);
    }
    updateHistoryFlags();
  }, [updateHistoryFlags]);

  const redo = useCallback(() => {
    if (!ctxBase.current || redoStack.current.length === 0) return;
    const item = redoStack.current.pop();
    if (!item) return;
    strokeHistory.current.push(item.snapshot);
    strokeStateHistory.current.push(item.strokes || []);
    strokes.current = structuredClone(item.strokes || []);
    ctxBase.current.putImageData(item.snapshot, 0, 0);
    updateHistoryFlags();
  }, [updateHistoryFlags]);

  const clearPreview = useCallback(() => {
    if (!ctxPreview.current || !previewCanvasRef.current) return;
    const cssW = previewCanvasRef.current.width / dprRef.current;
    const cssH = previewCanvasRef.current.height / dprRef.current;
    ctxPreview.current.clearRect(0, 0, cssW, cssH);
  }, []);

  const drawEraserPreview = useCallback((pos) => {
    if (!ctxPreview.current || activeTool !== "eraser") return;
    clearPreview();
    const radius = brushSize * 3;
    ctxPreview.current.save();
    ctxPreview.current.beginPath();
    ctxPreview.current.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctxPreview.current.fillStyle = "rgba(255,255,255,0.12)";
    ctxPreview.current.strokeStyle = "#0ea5e9";
    ctxPreview.current.lineWidth = 1.5;
    ctxPreview.current.fill();
    ctxPreview.current.stroke();
    ctxPreview.current.restore();
  }, [activeTool, brushSize, clearPreview]);

  const intersectsStroke = useCallback((stroke, pos, radius) => {
    if (!stroke || stroke.erased) return false;
    if (stroke.tool === "pen") {
      const pts = stroke.points || [];
      for (let i = 1; i < pts.length; i += 1) {
        if (distancePointToSegment(pos.x, pos.y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y) <= radius) {
          return true;
        }
      }
      return false;
    }
    if (stroke.tool === "ellipse") {
      const dx = Math.abs(pos.x - stroke.cx);
      const dy = Math.abs(pos.y - stroke.cy);
      return dx <= stroke.rx + radius && dy <= stroke.ry + radius;
    }
    if (stroke.tool === "rect") {
      const x1 = Math.min(stroke.x, stroke.x + stroke.w) - radius;
      const x2 = Math.max(stroke.x, stroke.x + stroke.w) + radius;
      const y1 = Math.min(stroke.y, stroke.y + stroke.h) - radius;
      const y2 = Math.max(stroke.y, stroke.y + stroke.h) + radius;
      return pos.x >= x1 && pos.x <= x2 && pos.y >= y1 && pos.y <= y2;
    }
    if (stroke.tool === "arrow") {
      return distancePointToSegment(pos.x, pos.y, stroke.x1, stroke.y1, stroke.x2, stroke.y2) <= radius;
    }
    if (stroke.tool === "text") {
      const textWidth = (stroke.text?.length || 10) * (stroke.size + 6);
      return pos.x >= stroke.x - radius && pos.x <= stroke.x + textWidth + radius && pos.y <= stroke.y + radius && pos.y >= stroke.y - (16 + stroke.size) - radius;
    }
    return false;
  }, []);

  const getPos = useCallback((e) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const baseCanvas = baseCanvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (!container || !baseCanvas || !previewCanvas || !imageUrl) return undefined;

    const baseCtx = baseCanvas.getContext("2d");
    const previewCtx = previewCanvas.getContext("2d");
    ctxBase.current = baseCtx;
    ctxPreview.current = previewCtx;
    applyContextDefaults(baseCtx);
    applyContextDefaults(previewCtx);

    let resizeObserver;
    let imageElement = null;

    const renderBase = () => {
      if (!baseCtx || !imageElement) return;
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      const cw = Math.max(container.clientWidth, 1);
      const ch = Math.max(container.clientHeight, 1);

      baseCanvas.width = Math.floor(cw * dpr);
      baseCanvas.height = Math.floor(ch * dpr);
      previewCanvas.width = Math.floor(cw * dpr);
      previewCanvas.height = Math.floor(ch * dpr);
      baseCanvas.style.width = `${cw}px`;
      baseCanvas.style.height = `${ch}px`;
      previewCanvas.style.width = `${cw}px`;
      previewCanvas.style.height = `${ch}px`;

      baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      applyContextDefaults(baseCtx);
      applyContextDefaults(previewCtx);
      baseCtx.clearRect(0, 0, cw, ch);
      previewCtx.clearRect(0, 0, cw, ch);

      const scale = Math.min(cw / imageElement.naturalWidth, ch / imageElement.naturalHeight);
      const w = imageElement.naturalWidth * scale;
      const h = imageElement.naturalHeight * scale;
      const x = (cw - w) / 2;
      const y = (ch - h) / 2;
      originalImageRef.current = imageElement;
      baseCtx.drawImage(imageElement, x, y, w, h);

      baseSnapshot.current = baseCtx.getImageData(0, 0, baseCanvas.width, baseCanvas.height);
      originalSnapshotRef.current = baseCtx.getImageData(
        0,
        0,
        baseCanvas.width,
        baseCanvas.height
      );
      strokes.current = [];
      strokeHistory.current = [];
      strokeStateHistory.current = [];
      redoStack.current = [];
      updateHistoryFlags();
      clearPreview();
      setMaskApplied(false);
    };

    imageElement = new Image();
    imageElement.crossOrigin = "anonymous";
    imageElement.src = imageUrl;
    imageElement.onload = () => renderBase();

    resizeObserver = new ResizeObserver(() => renderBase());
    resizeObserver.observe(container);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [imageUrl, applyContextDefaults, clearPreview, updateHistoryFlags]);

  useEffect(() => {
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas || !imageUrl) return undefined;
    previewCanvas.style.touchAction = "none";

    const onPointerDown = (e) => {
      if (!ctxBase.current || !ctxPreview.current) return;
      previewCanvas.setPointerCapture(e.pointerId);
      pointerIdRef.current = e.pointerId;
      const pos = getPos(e);
      pointerPosRef.current = pos;
      startPos.current = pos;

      if (activeTool === "text") {
        textInputPos.current = pos;
        setTextModalValue("");
        setShowTextModal(true);
        return;
      }

      if (activeTool === "eraser") {
        isDrawing.current = true;
        return;
      }

      if (activeTool === "select") {
        const hit = findStrokeAtPos(pos);
        if (!hit) {
          selectedStrokeRef.current = null;
          isDraggingRef.current = false;
          setIsDraggingUi(false);
          setHasSelection(false);
          redrawFromStrokes();
          return;
        }
        selectedStrokeRef.current = hit;
        setHasSelection(true);
        isDraggingRef.current = true;
        setIsDraggingUi(true);
        isDrawing.current = true;
        switch (hit.tool) {
          case "ellipse":
            dragOffsetRef.current = { x: pos.x - hit.cx, y: pos.y - hit.cy };
            break;
          case "rect":
            dragOffsetRef.current = { x: pos.x - hit.x, y: pos.y - hit.y };
            break;
          case "arrow":
            dragOffsetRef.current = { x: pos.x - hit.x1, y: pos.y - hit.y1 };
            break;
          case "text":
            dragOffsetRef.current = { x: pos.x - hit.x, y: pos.y - hit.y };
            break;
          case "pen":
            dragOffsetRef.current = {
              x: pos.x - hit.points[0].x,
              y: pos.y - hit.points[0].y,
            };
            break;
          default:
            dragOffsetRef.current = { x: 0, y: 0 };
        }
        redrawFromStrokes();
        drawSelectionHandle(hit);
        return;
      }

      isDrawing.current = true;
      if (activeTool === "pen") {
        currentPoints.current = [pos];
      }
    };

    const onPointerMove = (e) => {
      if (!ctxBase.current || !ctxPreview.current) return;
      const pos = getPos(e);
      pointerPosRef.current = pos;

      if (activeTool === "eraser") {
        scheduleRender(() => drawEraserPreview(pos));
      } else if (activeTool === "select" && !isDraggingRef.current) {
        const hit = findStrokeAtPos(pos);
        setHoverHit(!!hit);
        clearPreview();
      } else if (!isDrawing.current) {
        clearPreview();
      }

      if (activeTool === "select" && isDraggingRef.current && selectedStrokeRef.current) {
        const stroke = selectedStrokeRef.current;
        const dx = pos.x - dragOffsetRef.current.x;
        const dy = pos.y - dragOffsetRef.current.y;
        if (stroke.tool === "ellipse") {
          stroke.cx = dx;
          stroke.cy = dy;
        } else if (stroke.tool === "rect") {
          stroke.x = dx;
          stroke.y = dy;
        } else if (stroke.tool === "arrow") {
          const deltaX = dx - stroke.x1;
          const deltaY = dy - stroke.y1;
          stroke.x1 += deltaX;
          stroke.y1 += deltaY;
          stroke.x2 += deltaX;
          stroke.y2 += deltaY;
        } else if (stroke.tool === "text") {
          stroke.x = dx;
          stroke.y = dy;
        } else if (stroke.tool === "pen") {
          const baseX = stroke.points[0].x;
          const baseY = stroke.points[0].y;
          const offX = dx - baseX;
          const offY = dy - baseY;
          stroke.points = stroke.points.map((p) => ({ x: p.x + offX, y: p.y + offY }));
        }
        stroke.bbox = computeBBox(stroke);
        if (rafId.current) cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(() => {
          redrawFromStrokes();
          drawSelectionHandle(stroke);
        });
        return;
      }

      if (!isDrawing.current || pointerIdRef.current !== e.pointerId) return;

      if (activeTool === "pen") {
        currentPoints.current.push(pos);
        const pts = currentPoints.current;
        const len = pts.length;
        if (len < 2) return;
        const prev = pts[len - 2];
        const curr = pts[len - 1];
        const midX = (prev.x + curr.x) / 2;
        const midY = (prev.y + curr.y) / 2;

        scheduleRender(() => {
          const stroke = {
            tool: "pen",
            color: activeColor,
            size: brushSize,
            points: pts,
          };
          redrawFromStrokes();
          drawStroke(ctxBase.current, { ...stroke, points: [...pts.slice(0, len - 1), { x: midX, y: midY }] });
        });
        return;
      }

      if (activeTool === "eraser") {
        const radius = brushSize * 2;
        let changed = false;
        strokes.current.forEach((stroke) => {
          if (!stroke.erased && intersectsStroke(stroke, pos, radius)) {
            stroke.erased = true;
            changed = true;
          }
        });
        scheduleRender(() => {
          if (changed) redrawFromStrokes();
          drawEraserPreview(pos);
        });
        return;
      }

      if (activeTool === "ellipse" || activeTool === "rect" || activeTool === "arrow") {
        const start = startPos.current;
        scheduleRender(() => {
          clearPreview();
          const previewStroke =
            activeTool === "ellipse"
              ? {
                  tool: "ellipse",
                  color: activeColor,
                  size: brushSize,
                  cx: (start.x + pos.x) / 2,
                  cy: (start.y + pos.y) / 2,
                  rx: Math.abs(pos.x - start.x) / 2,
                  ry: Math.abs(pos.y - start.y) / 2,
                }
              : activeTool === "rect"
                ? {
                    tool: "rect",
                    color: activeColor,
                    size: brushSize,
                    x: Math.min(start.x, pos.x),
                    y: Math.min(start.y, pos.y),
                    w: Math.abs(pos.x - start.x),
                    h: Math.abs(pos.y - start.y),
                  }
                : {
                    tool: "arrow",
                    color: activeColor,
                    size: brushSize,
                    x1: start.x,
                    y1: start.y,
                    x2: pos.x,
                    y2: pos.y,
                  };
          drawStroke(ctxPreview.current, previewStroke, { preview: true });
        });
      }
    };

    const onPointerUp = (e) => {
      if (!ctxBase.current || pointerIdRef.current !== e.pointerId) return;
      const pos = getPos(e);
      pointerPosRef.current = pos;
      if (!isDrawing.current) {
        clearPreview();
        pointerIdRef.current = null;
        setIsDraggingUi(false);
        return;
      }
      isDrawing.current = false;
      clearPreview();

      if (activeTool === "pen") {
        const points = currentPoints.current;
        if (points.length > 1) {
          const stroke = {
            tool: "pen",
            color: activeColor,
            size: brushSize,
            points: [...points],
            erased: false,
          };
          stroke.bbox = computeBBox(stroke);
          strokes.current.push(stroke);
          redrawFromStrokes();
          pushToHistory();
        }
        currentPoints.current = [];
      } else if (activeTool === "eraser") {
        redrawFromStrokes();
        pushToHistory();
      } else if (activeTool === "ellipse") {
        const start = startPos.current;
        const stroke = {
          tool: "ellipse",
          color: activeColor,
          size: brushSize,
          cx: (start.x + pos.x) / 2,
          cy: (start.y + pos.y) / 2,
          rx: Math.abs(pos.x - start.x) / 2,
          ry: Math.abs(pos.y - start.y) / 2,
          erased: false,
        };
        stroke.bbox = computeBBox(stroke);
        strokes.current.push(stroke);
        redrawFromStrokes();
        pushToHistory();
      } else if (activeTool === "rect") {
        const start = startPos.current;
        const stroke = {
          tool: "rect",
          color: activeColor,
          size: brushSize,
          x: Math.min(start.x, pos.x),
          y: Math.min(start.y, pos.y),
          w: Math.abs(pos.x - start.x),
          h: Math.abs(pos.y - start.y),
          erased: false,
        };
        stroke.bbox = computeBBox(stroke);
        strokes.current.push(stroke);
        redrawFromStrokes();
        pushToHistory();
      } else if (activeTool === "arrow") {
        const start = startPos.current;
        const stroke = {
          tool: "arrow",
          color: activeColor,
          size: brushSize,
          x1: start.x,
          y1: start.y,
          x2: pos.x,
          y2: pos.y,
          erased: false,
        };
        stroke.bbox = computeBBox(stroke);
        strokes.current.push(stroke);
        redrawFromStrokes();
        pushToHistory();
      } else if (activeTool === "select") {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          setIsDraggingUi(false);
          pushToHistory();
          if (selectedStrokeRef.current) {
            redrawFromStrokes();
            drawSelectionHandle(selectedStrokeRef.current);
          }
        }
      }

      pointerIdRef.current = null;
    };

    previewCanvas.addEventListener("pointerdown", onPointerDown);
    previewCanvas.addEventListener("pointermove", onPointerMove);
    previewCanvas.addEventListener("pointerup", onPointerUp);
    previewCanvas.addEventListener("pointerleave", onPointerUp);

    return () => {
      previewCanvas.removeEventListener("pointerdown", onPointerDown);
      previewCanvas.removeEventListener("pointermove", onPointerMove);
      previewCanvas.removeEventListener("pointerup", onPointerUp);
      previewCanvas.removeEventListener("pointerleave", onPointerUp);
    };
  }, [
    activeColor,
    activeTool,
    brushSize,
    clearPreview,
    drawEraserPreview,
    drawSelectionHandle,
    drawStroke,
    findStrokeAtPos,
    getPos,
    imageUrl,
    intersectsStroke,
    pushToHistory,
    redrawFromStrokes,
    scheduleRender,
  ]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (key === "y" || (key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      if (key === "p") setTool("pen");
      else if (key === "s") setTool("select");
      else if (key === "e") setTool("ellipse");
      else if (key === "r") setTool("rect");
      else if (key === "a") setTool("arrow");
      else if (key === "t") setTool("text");
      else if (key === "g") setTool("eraser");
      else if (key === "escape") setShowTextModal(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, setTool, undo]);

  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  useEffect(() => {
    reset();
    setSegmentationImageFile(null);
    setMaskApplied(false);
  }, [imageUrl, reset]);

  useEffect(() => {
    if (!maskBase64 || !baseCanvasRef.current || !originalImageRef.current) return;
    let cancelled = false;

    async function applyMask() {
      try {
        await drawMaskOnCanvas(
          baseCanvasRef.current,
          originalImageRef.current,
          maskBase64,
          "rgba(255, 0, 0, 0.4)"
        );
        if (cancelled) return;
        baseSnapshot.current = ctxBase.current.getImageData(
          0,
          0,
          baseCanvasRef.current.width,
          baseCanvasRef.current.height
        );
        strokes.current.forEach((stroke) => drawStroke(ctxBase.current, stroke));
        setMaskApplied(true);
      } catch {
        // handled in segmentation hook state
      }
    }

    applyMask();
    return () => {
      cancelled = true;
    };
  }, [drawStroke, maskBase64]);

  const handleRunSegmentation = useCallback(async () => {
    const imageToSegment = await createCanvasImageFile();
    if (!imageToSegment) return;
    setSegmentationImageFile(imageToSegment);
    await runSegmentation(imageToSegment);
  }, [createCanvasImageFile, runSegmentation]);

  const handleResetMask = useCallback(() => {
    reset();
    setMaskApplied(false);
    if (ctxBase.current && originalSnapshotRef.current) {
      ctxBase.current.putImageData(originalSnapshotRef.current, 0, 0);
      baseSnapshot.current = ctxBase.current.getImageData(
        0,
        0,
        baseCanvasRef.current.width,
        baseCanvasRef.current.height
      );
    }
    redrawFromStrokes();
  }, [redrawFromStrokes, reset]);

  const handleConfirmText = () => {
    if (!textModalValue.trim() || !ctxBase.current) return;
    const textStroke = {
      tool: "text",
      x: textInputPos.current.x,
      y: textInputPos.current.y,
      text: textModalValue.trim(),
      color: activeColor,
      size: brushSize,
      textWidth: ctxBase.current.measureText(textModalValue.trim()).width,
      erased: false,
    };
    textStroke.bbox = computeBBox(textStroke);
    strokes.current.push(textStroke);
    redrawFromStrokes();
    pushToHistory();
    setShowTextModal(false);
    setTextModalValue("");
  };

  const handleSave = async () => {
    if (!selectedPatientId || !baseCanvasRef.current || !onSave) return;
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    const dataUrl = baseCanvasRef.current.toDataURL("image/png");
    let didSave = false;
    try {
      const result = await onSave(dataUrl, selectedPatientId);
      didSave = result !== false;
    } catch {
      didSave = false;
    }
    setIsSaving(false);
    if (didSave) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  };

  const handleClearAnnotations = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 2000);
      return;
    }
    if (ctxBase.current && originalSnapshotRef.current) {
      ctxBase.current.putImageData(originalSnapshotRef.current, 0, 0);
      baseSnapshot.current = ctxBase.current.getImageData(
        0,
        0,
        baseCanvasRef.current.width,
        baseCanvasRef.current.height
      );
    }
    strokes.current = [];
    strokeHistory.current = [];
    strokeStateHistory.current = [];
    redoStack.current = [];
    setConfirmClear(false);
    updateHistoryFlags();
    clearPreview();
    reset();
    setMaskApplied(false);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col items-stretch 2xl:flex-row">
        <div ref={containerRef} className="relative h-full min-h-[400px] flex-1 bg-[#0d1117] md:min-h-[500px]">
          <canvas ref={baseCanvasRef} className="absolute inset-0" />
          <canvas
            ref={previewCanvasRef}
            className="absolute inset-0"
            style={{ cursor: activeTool === "select" ? (isDraggingUi ? "grabbing" : hoverHit ? "grab" : "default") : getCursor() }}
            onContextMenu={(e) => e.preventDefault()}
          />

          <div className="absolute bottom-0 left-0 right-0 flex h-8 items-center justify-between bg-black/60 px-3 text-[11px] text-white/60">
            <span>{"NeuroScan Vision — Éditeur d'annotation"}</span>
            <span>Outil actif : {activeToolLabel}</span>
            <span>⌘Z Annuler · ⌘Y Rétablir · P E R A T G</span>
          </div>
        </div>

        <aside className="flex w-full flex-col gap-4 overflow-y-auto border-t border-slate-200 bg-[#f8fafc] p-4 2xl:w-[300px] 2xl:min-w-[300px] 2xl:border-l 2xl:border-t-0">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">OUTILS</p>
            <div className="space-y-3">
              {toolOptions.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.key;
                return (
                  <button
                    key={tool.key}
                    className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150 ${
                      isActive
                        ? "bg-[#1E3A5F] text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                    title={`Raccourci ${tool.shortcut}`}
                    onClick={() => setTool(tool.key)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tool.label}</span>
                    {!isActive ? (
                      <span className="ml-auto mr-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                        {tool.shortcut}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {activeTool === "select" && hasSelection ? (
              <div className="mt-2 rounded-lg border border-sky-100 bg-sky-50 p-2 text-xs text-sky-700">
                1 élément sélectionné · Faites glisser pour déplacer
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">COULEUR</p>
            <div className="flex flex-wrap gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  title={color.label}
                  onClick={() => setActiveColor(color.value)}
                  className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
                    activeColor === color.value ? "ring-2 ring-[#1E3A5F] ring-offset-2 scale-110" : ""
                  }`}
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">ÉPAISSEUR</p>
            <div className="flex items-center gap-3 py-3">
              <input
                type="range"
                min={1}
                max={12}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-full"
              />
              <div
                className="rounded-full transition-all duration-100"
                style={{
                  width: `${brushSize * 2 + 4}px`,
                  height: `${brushSize * 2 + 4}px`,
                  backgroundColor: activeColor,
                }}
              />
            </div>
          </div>

          {imageUrl ? (
            <div className="mt-4">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                IA
              </p>
              <div className="space-y-1.5">
                <button
                  onClick={handleRunSegmentation}
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Analyser avec l'IA
                </button>
                {isLoading ? (
                  <p className="text-xs text-slate-500">Analyse en cours...</p>
                ) : null}
                {error ? <p className="text-xs text-red-500">{error}</p> : null}
                {maskApplied ? (
                  <button
                    onClick={handleResetMask}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                  >
                    Réinitialiser le masque
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="my-1 border-t border-slate-200" />

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">HISTORIQUE</p>
            <div className="space-y-1.5">
              <button
                onClick={undo}
                disabled={!canUndo}
                className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Undo2 className="h-4 w-4" /> Annuler <span className="ml-auto text-[10px] text-slate-400">⌘Z</span>
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Redo2 className="h-4 w-4" /> Rétablir <span className="ml-auto text-[10px] text-slate-400">⌘Y</span>
              </button>
              <button
                onClick={handleClearAnnotations}
                className="flex w-full items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {confirmClear ? "Confirmer ?" : "Effacer mes annotations"}
              </button>
            </div>
          </div>

          <div className="mt-auto">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">SAUVEGARDER</p>
            <select
              className="mb-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
            >
              <option value="">Sélectionner un patient</option>
              {patientList.map((p) => (
                <option key={p.id} value={p.id}>
                  {`${(p.firstName || "").slice(0, 1)}${(p.lastName || "").slice(0, 1)} · ${p.firstName} ${p.lastName}`}
                </option>
              ))}
            </select>
            {saveSuccess ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 py-2 text-sm text-emerald-700">
                <CheckCircle className="h-4 w-4" />
                Sauvegardé dans le dossier patient
              </div>
            ) : (
              <button
                onClick={handleSave}
                disabled={!selectedPatientId || isSaving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1E3A5F] py-2.5 text-white transition-colors hover:bg-[#162d4a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? "Sauvegarde..." : "Sauvegarder l'image annotée"}
              </button>
            )}
          </div>
        </aside>
      </div>

      {showTextModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-96 rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-800">Ajouter une annotation</h3>
            <p className="mb-4 text-sm text-slate-400">Le texte sera placé à la position sélectionnée</p>
            <textarea
              autoFocus
              rows={3}
              placeholder="Ex: Zone suspecte — lobe frontal droit"
              className="w-full resize-none rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={textModalValue}
              onChange={(e) => setTextModalValue(e.target.value)}
            />
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <span className="h-4 w-4 rounded-full border border-slate-200" style={{ backgroundColor: activeColor }} />
              Couleur active
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTextModal(false)}>Annuler</Button>
              <Button className="bg-purple-600 text-white hover:bg-purple-700" onClick={handleConfirmText}>
                Placer le texte
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
