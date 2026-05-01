import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { DesktopToolbar, MobileToolbar } from "./components/Toolbars";
import { DrawingSettingsPanel, ShapesPanel } from "./components/SidePanels";
import { WorkspacePanel } from "./components/WorkspacePanel";
import { ResponseCardsLayer } from "./components/ResponseCardsLayer";
import type {
  BackendStatus,
  DrawElement,
  Point,
  Response,
  ResponseCard,
  SelectionBox,
  ToolMode,
} from "./home.types";

const CANVAS_BACKGROUND = "#030119";
const GRAPH_SCALE = 24;
const GRAPH_PADDING = 28;
const RESPONSE_BOX_MARGIN = 24;
const CALCULATE_COOLDOWN_MS = 3500;
const STORAGE_KEY = "ia-calculator-workspace-v1";

const getReadableTextColor = (backgroundColor: string) => {
  const hexColor = backgroundColor.replace("#", "");
  if (hexColor.length !== 6) return "#ffffff";

  const red = Number.parseInt(hexColor.slice(0, 2), 16);
  const green = Number.parseInt(hexColor.slice(2, 4), 16);
  const blue = Number.parseInt(hexColor.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.58 ? "#06121f" : "#ffffff";
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elementsRef = useRef<DrawElement[]>([]);
  const activeStrokeIdRef = useRef<string | null>(null);
  const dragRef = useRef<{ id: string; lastPoint: Point } | null>(null);
  const selectedElementIdRef = useRef<string | null>(null);
  const lastCalculateAtRef = useRef(0);
  const undoStackRef = useRef<DrawElement[][]>([]);
  const redoStackRef = useRef<DrawElement[][]>([]);
  const selectionRef = useRef<SelectionBox | null>(null);
  const selectedAreaRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const persistTimeoutRef = useRef<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [toolMode, setToolMode] = useState<ToolMode>("draw");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [color, setColor] = useState("#ffffff");
  const [isCalculating, setIsCalculating] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");
  const [apiError, setApiError] = useState<string | null>(null);
  const [calculationNotice, setCalculationNotice] = useState<string | null>(null);
  const [hasCalculatedResponse, setHasCalculatedResponse] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [reset, setReset] = useState(false);
  const [responseCards, setResponseCards] = useState<ResponseCard[]>([]);
  const [dictOfVars, setDictOfVars] = useState<Record<string, string>>({});
  const [graphX, setGraphX] = useState("0");
  const [graphY, setGraphY] = useState("0");
  const [points, setPoints] = useState<Point[]>([]);
  const [shapeSize, setShapeSize] = useState(128);
  const [brushSize, setBrushSize] = useState(3);
  const [eraserSize, setEraserSize] = useState(18);
  const [isColorPanelOpen, setIsColorPanelOpen] = useState(false);
  const [isShapesPanelOpen, setIsShapesPanelOpen] = useState(false);
  const [isGraphPanelOpen, setIsGraphPanelOpen] = useState(false);

  const selectElement = (id: string | null) => {
    selectedElementIdRef.current = id;
    setSelectedElementId(id);
  };

  const cloneElements = (elements: DrawElement[]) =>
    JSON.parse(JSON.stringify(elements)) as DrawElement[];

  const updateHistoryState = () => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  };

  const pushHistory = () => {
    undoStackRef.current = [...undoStackRef.current.slice(-39), cloneElements(elementsRef.current)];
    redoStackRef.current = [];
    updateHistoryState();
  };

  const restoreElements = (elements: DrawElement[]) => {
    elementsRef.current = cloneElements(elements);
    selectElement(null);
    redrawCanvas();
  };

  const undo = () => {
    const previous = undoStackRef.current.pop();
    if (!previous) return;

    redoStackRef.current.push(cloneElements(elementsRef.current));
    restoreElements(previous);
    updateHistoryState();
  };

  const redo = () => {
    const next = redoStackRef.current.pop();
    if (!next) return;

    undoStackRef.current.push(cloneElements(elementsRef.current));
    restoreElements(next);
    updateHistoryState();
  };

  const persistWorkspace = () => {
    if (typeof window === "undefined") return;

    if (persistTimeoutRef.current) {
      window.clearTimeout(persistTimeoutRef.current);
    }

    persistTimeoutRef.current = window.setTimeout(() => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          elements: elementsRef.current,
          responseCards,
          dictOfVars,
          points,
          color,
          brushSize,
          eraserSize,
          shapeSize,
        })
      );
    }, 250);
  };

  const paintBackground = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.save();
    ctx.fillStyle = CANVAS_BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  const createElementId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const clampLatexPosition = (position: Point) => ({
    x: RESPONSE_BOX_MARGIN / 2,
    y: Math.max(96, Math.min(position.y, window.innerHeight - 120)),
  });

  const clearSelectionArea = () => {
    selectionRef.current = null;
    selectedAreaRef.current = null;
  };

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    paintBackground(ctx, canvas);
    elementsRef.current.forEach((element) => drawElement(ctx, canvas, element));
    drawAreaSelection(ctx);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = color;
  };

  const getGraphBounds = (canvas: HTMLCanvasElement, offsetX = 0, offsetY = 0) => {
    const width = Math.min(360, canvas.width - 32);
    const height = Math.min(240, canvas.height - 220);

    return {
      x: (canvas.width >= 820 ? canvas.width - width - 24 : 16) + offsetX,
      y: (canvas.width >= 820 ? 128 : 176) + offsetY,
      width,
      height: Math.max(180, height),
    };
  };

  const getGraphOrigin = (canvas: HTMLCanvasElement, offsetX = 0, offsetY = 0) => {
    const bounds = getGraphBounds(canvas, offsetX, offsetY);

    return {
      bounds,
      originX: bounds.x + bounds.width / 2,
      originY: bounds.y + bounds.height / 2,
    };
  };

  const drawShapeElement = (
    ctx: CanvasRenderingContext2D,
    element: Extract<DrawElement, { type: "square" | "triangle" }>
  ) => {
    ctx.save();
    ctx.strokeStyle = element.color;
    ctx.lineWidth = 4;

    if (element.type === "square") {
      ctx.strokeRect(
        element.x - element.size / 2,
        element.y - element.size / 2,
        element.size,
        element.size
      );
    } else {
      const height = element.size * 0.88;
      ctx.beginPath();
      ctx.moveTo(element.x, element.y - height / 2);
      ctx.lineTo(element.x + element.size / 2, element.y + height / 2);
      ctx.lineTo(element.x - element.size / 2, element.y + height / 2);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawGraphFrame = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    offsetX = 0,
    offsetY = 0
  ) => {
    const { bounds, originX, originY } = getGraphOrigin(canvas, offsetX, offsetY);
    const left = bounds.x + GRAPH_PADDING;
    const right = bounds.x + bounds.width - GRAPH_PADDING;
    const top = bounds.y + GRAPH_PADDING;
    const bottom = bounds.y + bounds.height - GRAPH_PADDING;

    ctx.save();
    ctx.fillStyle = "rgba(3,1,25,0.96)";
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    ctx.beginPath();
    ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.clip();

    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 1;

    for (let x = originX; x <= right; x += GRAPH_SCALE) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }

    for (let x = originX - GRAPH_SCALE; x >= left; x -= GRAPH_SCALE) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }

    for (let y = originY; y <= bottom; y += GRAPH_SCALE) {
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }

    for (let y = originY - GRAPH_SCALE; y >= top; y -= GRAPH_SCALE) {
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(left, originY);
    ctx.lineTo(right, originY);
    ctx.moveTo(originX, top);
    ctx.lineTo(originX, bottom);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "14px Arial";
    ctx.fillText("x", right - 10, originY - 10);
    ctx.fillText("y", originX + 10, top + 14);
    ctx.restore();

    return { bounds, originX, originY };
  };

  const drawGraphElement = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    graphPoints: Point[],
    graphColor: string,
    offsetX = 0,
    offsetY = 0
  ) => {
    const { bounds, originX, originY } = drawGraphFrame(ctx, canvas, offsetX, offsetY);

    ctx.save();
    ctx.beginPath();
    ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.clip();

    ctx.strokeStyle = graphColor;
    ctx.fillStyle = graphColor;
    ctx.lineWidth = 3;

    graphPoints.forEach((point) => {
      const canvasX = originX + point.x * GRAPH_SCALE;
      const canvasY = originY - point.y * GRAPH_SCALE;

      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    if (graphPoints.length > 1) {
      ctx.beginPath();
      graphPoints.forEach((point, index) => {
        const canvasX = originX + point.x * GRAPH_SCALE;
        const canvasY = originY - point.y * GRAPH_SCALE;

        if (index === 0) ctx.moveTo(canvasX, canvasY);
        else ctx.lineTo(canvasX, canvasY);
      });
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawElement = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    element: DrawElement
  ) => {
    if (element.type === "stroke") {
      if (element.points.length < 2) return;

      ctx.save();
      ctx.strokeStyle = element.color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = element.width ?? 3;
      ctx.beginPath();
      element.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (element.type === "point") {
      ctx.save();
      ctx.fillStyle = element.color;
      ctx.beginPath();
      ctx.arc(element.x, element.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (element.type === "square" || element.type === "triangle") {
      drawShapeElement(ctx, element);
      return;
    }

    if (element.type === "graph") {
      drawGraphElement(ctx, canvas, element.points, element.color, element.offsetX, element.offsetY);
    }
  };

  const drawSelection = (
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number }
  ) => {
    ctx.save();
    ctx.strokeStyle = "rgba(52, 211, 153, 0.95)";
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 2;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.restore();
  };

  const getElementBounds = (element: DrawElement, canvas?: HTMLCanvasElement) => {
    if (element.type === "stroke") {
      const xs = element.points.map((point) => point.x);
      const ys = element.points.map((point) => point.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      return {
        x: minX - 10,
        y: minY - 10,
        width: maxX - minX + 20,
        height: maxY - minY + 20,
      };
    }

    if (element.type === "point") {
      return { x: element.x - 12, y: element.y - 12, width: 24, height: 24 };
    }

    if (element.type === "square") {
      return {
        x: element.x - element.size / 2,
        y: element.y - element.size / 2,
        width: element.size,
        height: element.size,
      };
    }

    if (element.type === "triangle") {
      const height = element.size * 0.88;
      return {
        x: element.x - element.size / 2,
        y: element.y - height / 2,
        width: element.size,
        height,
      };
    }

    if (element.type === "graph" && canvas) {
      return getGraphBounds(canvas, element.offsetX, element.offsetY);
    }

    return { x: 0, y: 0, width: 0, height: 0 };
  };

  const normalizeSelection = (selection: SelectionBox) => {
    const x = Math.min(selection.start.x, selection.end.x);
    const y = Math.min(selection.start.y, selection.end.y);
    const width = Math.abs(selection.end.x - selection.start.x);
    const height = Math.abs(selection.end.y - selection.start.y);

    return { x, y, width, height };
  };

  const drawAreaSelection = (ctx: CanvasRenderingContext2D) => {
    const selection = selectionRef.current;
    if (!selection) return;

    const bounds = normalizeSelection(selection);
    if (bounds.width < 4 || bounds.height < 4) return;

    ctx.save();
    ctx.fillStyle = "rgba(52, 211, 153, 0.08)";
    ctx.strokeStyle = "rgba(52, 211, 153, 0.95)";
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    ctx.restore();
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    paintBackground(ctx, canvas);

    elementsRef.current.forEach((element) => {
      drawElement(ctx, canvas, element);

      if (
        selectedElementIdRef.current === element.id &&
        (element.type === "square" || element.type === "triangle" || element.type === "graph")
      ) {
        drawSelection(ctx, getElementBounds(element, canvas));
      }
    });

    drawAreaSelection(ctx);
    persistWorkspace();
  };

  const findElementAtPoint = (point: Point) => {
    const canvas = canvasRef.current;

    for (let index = elementsRef.current.length - 1; index >= 0; index -= 1) {
      const element = elementsRef.current[index];
      if (element.type !== "square" && element.type !== "triangle" && element.type !== "graph") {
        continue;
      }

      const bounds = getElementBounds(element, canvas ?? undefined);
      const isInside =
        point.x >= bounds.x &&
        point.x <= bounds.x + bounds.width &&
        point.y >= bounds.y &&
        point.y <= bounds.y + bounds.height;

      if (isInside) return element;
    }

    return null;
  };

  const moveElement = (id: string, deltaX: number, deltaY: number) => {
    elementsRef.current = elementsRef.current.map((element) => {
      if (element.id !== id) return element;

      if (element.type === "square" || element.type === "triangle") {
        return {
          ...element,
          x: element.x + deltaX,
          y: element.y + deltaY,
        };
      }

      if (element.type === "graph") {
        return {
          ...element,
          offsetX: element.offsetX + deltaX,
          offsetY: element.offsetY + deltaY,
        };
      }

      return element;
    });

    redrawCanvas();
  };

  const getDistance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

  const eraseAtPoint = (point: Point) => {
    const nextElements: DrawElement[] = [];

    elementsRef.current.forEach((element) => {
      if (element.type === "stroke") {
        let segment: Point[] = [];

        element.points.forEach((strokePoint) => {
          if (getDistance(strokePoint, point) <= eraserSize) {
            if (segment.length > 1) {
              nextElements.push({
                ...element,
                id: createElementId(),
                points: segment,
              });
            }
            segment = [];
            return;
          }

          segment.push(strokePoint);
        });

        if (segment.length > 1) {
          nextElements.push({
            ...element,
            id: createElementId(),
            points: segment,
          });
        }

        return;
      }

      if (element.type === "point" && getDistance({ x: element.x, y: element.y }, point) <= eraserSize) {
        return;
      }

      nextElements.push(element);
    });

    elementsRef.current = nextElements;
    selectElement(null);
    redrawCanvas();
  };

  useEffect(() => {
    const savedWorkspace = localStorage.getItem(STORAGE_KEY);
    if (!savedWorkspace) return;

    try {
      const parsed = JSON.parse(savedWorkspace) as {
        elements?: DrawElement[];
        responseCards?: ResponseCard[];
        dictOfVars?: Record<string, string>;
        points?: Point[];
        color?: string;
        brushSize?: number;
        eraserSize?: number;
        shapeSize?: number;
      };

      elementsRef.current = parsed.elements ?? [];
      setResponseCards(parsed.responseCards ?? []);
      setDictOfVars(parsed.dictOfVars ?? {});
      setPoints(parsed.points ?? []);
      if (parsed.color) setColor(parsed.color);
      if (parsed.brushSize) setBrushSize(parsed.brushSize);
      if (parsed.eraserSize) setEraserSize(parsed.eraserSize);
      if (parsed.shapeSize) setShapeSize(parsed.shapeSize);
      setHasCalculatedResponse((parsed.responseCards ?? []).length > 0);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    persistWorkspace();
  }, [responseCards, dictOfVars, points, color, brushSize, eraserSize, shapeSize]);

  useEffect(() => {
    if (reset) {
      pushHistory();
      resetCanvas();
      elementsRef.current = [];
      activeStrokeIdRef.current = null;
      dragRef.current = null;
      selectElement(null);
      setResponseCards([]);
      setHasCalculatedResponse(false);
      setDictOfVars({});
      setPoints([]);
      clearSelectionArea();
      localStorage.removeItem(STORAGE_KEY);
      setReset(false);
    }
  }, [reset]);

  useEffect(() => {
    setupCanvas();
    window.addEventListener("resize", setupCanvas);

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML";
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.MathJax.Hub.Config({
        tex2jax: {
          inlineMath: [
            ["$", "$"],
            ["\\(", "\\)"],
          ],
        },
      });
    };

    return () => {
      window.removeEventListener("resize", setupCanvas);
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (responseCards.length > 0 && window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
      }, 0);
    }
  }, [responseCards]);

  useEffect(() => {
    let isMounted = true;

    const checkBackend = async () => {
      if (isCalculating) {
        setBackendStatus("processing");
        return;
      }

      try {
        await axios.get(`${import.meta.env.VITE_API_URL}/`, { timeout: 2500 });
        if (isMounted) setBackendStatus("online");
      } catch {
        if (isMounted) setBackendStatus("offline");
      }
    };

    checkBackend();
    const intervalId = window.setInterval(checkBackend, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [isCalculating]);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const point = getCanvasPoint(e);

    if (!canvas || !point) return;

    canvas.setPointerCapture(e.pointerId);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    if (toolMode === "move") {
      const element = findElementAtPoint(point);
      selectElement(element?.id ?? null);
      dragRef.current = element ? { id: element.id, lastPoint: point } : null;
      if (element) pushHistory();
      redrawCanvas();
      setIsDrawing(false);
      return;
    }

    if (toolMode === "erase") {
      pushHistory();
      eraseAtPoint(point);
      setIsDrawing(true);
      return;
    }

    if (toolMode === "select") {
      selectionRef.current = { start: point, end: point, active: true };
      selectedAreaRef.current = null;
      setIsDrawing(true);
      redrawCanvas();
      return;
    }

    if (hasCalculatedResponse) {
      setResponseCards([]);
      setHasCalculatedResponse(false);
      setCalculationNotice(null);
      setApiError(null);
    }

    clearSelectionArea();

    if (toolMode === "point") {
      pushHistory();
      const element: DrawElement = {
        id: createElementId(),
        type: "point",
        color,
        x: point.x,
        y: point.y,
      };
      elementsRef.current = [...elementsRef.current, element];
      selectElement(element.id);
      redrawCanvas();
      setIsDrawing(false);
      return;
    }

    if (toolMode === "square" || toolMode === "triangle") {
      pushHistory();
      drawQuickShape(toolMode, point.x, point.y);
      setToolMode("draw");
      return;
    }

    const element: DrawElement = {
      id: createElementId(),
      type: "stroke",
      color,
      width: brushSize,
      points: [point],
    };

    pushHistory();
    elementsRef.current = [...elementsRef.current, element];
    activeStrokeIdRef.current = element.id;
    selectElement(element.id);
    setIsDrawing(true);
  };

  const stopDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e?.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    if (toolMode === "select" && selectionRef.current) {
      const bounds = normalizeSelection(selectionRef.current);
      selectedAreaRef.current = bounds.width > 12 && bounds.height > 12 ? bounds : null;
      selectionRef.current = selectionRef.current
        ? { ...selectionRef.current, active: false }
        : null;
      redrawCanvas();
    }

    setIsDrawing(false);
    activeStrokeIdRef.current = null;
    dragRef.current = null;
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const point = getCanvasPoint(e);

    if (!canvas || !point) return;

    if (toolMode === "move" && dragRef.current) {
      const deltaX = point.x - dragRef.current.lastPoint.x;
      const deltaY = point.y - dragRef.current.lastPoint.y;

      dragRef.current = {
        ...dragRef.current,
        lastPoint: point,
      };

      moveElement(dragRef.current.id, deltaX, deltaY);
      return;
    }

    if (toolMode === "erase" && isDrawing) {
      eraseAtPoint(point);
      return;
    }

    if (toolMode === "select" && isDrawing && selectionRef.current) {
      selectionRef.current = { ...selectionRef.current, end: point };
      redrawCanvas();
      return;
    }

    if (!isDrawing || toolMode !== "draw" || !activeStrokeIdRef.current) return;

    elementsRef.current = elementsRef.current.map((element) => {
      if (element.id !== activeStrokeIdRef.current || element.type !== "stroke") {
        return element;
      }

      return {
        ...element,
        points: [...element.points, point],
      };
    });

    redrawCanvas();
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    paintBackground(ctx, canvas);
  };

  const drawQuickShape = (shape: "square" | "triangle", x: number, y: number) => {
    const element: DrawElement = {
      id: createElementId(),
      type: shape,
      color,
      x,
      y,
      size: shapeSize,
    };

    elementsRef.current = [...elementsRef.current, element];
    selectElement(element.id);
    redrawCanvas();
  };

  const drawAxes = () => {
    const existingGraph = elementsRef.current.find((element) => element.type === "graph");

    if (!existingGraph) {
      pushHistory();
      elementsRef.current = [
        ...elementsRef.current,
        {
          id: createElementId(),
          type: "graph",
          color,
          points,
          offsetX: 0,
          offsetY: 0,
        },
      ];
    }

    redrawCanvas();
  };

  const addGraphPoint = () => {
    const parsedX = Number(graphX);
    const parsedY = Number(graphY);

    if (Number.isNaN(parsedX) || Number.isNaN(parsedY)) return;

    const nextPoints = [...points, { x: parsedX, y: parsedY }];
    setPoints(nextPoints);
    drawGraph(nextPoints);
  };

  const drawGraph = (graphPoints: Point[]) => {
    const existingGraph = elementsRef.current.find((element) => element.type === "graph");

    pushHistory();

    if (existingGraph) {
      elementsRef.current = elementsRef.current.map((element) =>
        element.id === existingGraph.id && element.type === "graph"
          ? { ...element, color, points: graphPoints }
          : element
      );
    } else {
      elementsRef.current = [
        ...elementsRef.current,
        {
          id: createElementId(),
          type: "graph",
          color,
          points: graphPoints,
          offsetX: 0,
          offsetY: 0,
        },
      ];
    }

    redrawCanvas();
  };

  const getCalculationImage = (canvas: HTMLCanvasElement) => {
    const selectedArea = selectedAreaRef.current;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) return canvas.toDataURL("image/png");

    paintBackground(exportCtx, exportCanvas);
    elementsRef.current.forEach((element) => drawElement(exportCtx, exportCanvas, element));

    if (!selectedArea) {
      const imageData = exportCtx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
      let minX = exportCanvas.width;
      let minY = exportCanvas.height;
      let maxX = 0;
      let maxY = 0;

      for (let y = 0; y < exportCanvas.height; y++) {
        for (let x = 0; x < exportCanvas.width; x++) {
          const index = (y * exportCanvas.width + x) * 4;
          const isBackground =
            imageData.data[index] === 3 &&
            imageData.data[index + 1] === 1 &&
            imageData.data[index + 2] === 25;

          if (imageData.data[index + 3] > 0 && !isBackground) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      if (maxX <= minX || maxY <= minY) {
        return exportCanvas.toDataURL("image/png");
      }

      const padding = 28;
      const inkArea = {
        x: Math.max(0, minX - padding),
        y: Math.max(0, minY - padding),
        width: Math.min(exportCanvas.width - Math.max(0, minX - padding), maxX - minX + padding * 2),
        height: Math.min(exportCanvas.height - Math.max(0, minY - padding), maxY - minY + padding * 2),
      };

      return cropCanvasArea(exportCanvas, inkArea);
    }

    const safeX = Math.max(0, Math.floor(selectedArea.x));
    const safeY = Math.max(0, Math.floor(selectedArea.y));
    const safeWidth = Math.min(canvas.width - safeX, Math.floor(selectedArea.width));
    const safeHeight = Math.min(canvas.height - safeY, Math.floor(selectedArea.height));

    if (safeWidth < 12 || safeHeight < 12) {
      return exportCanvas.toDataURL("image/png");
    }

    return cropCanvasArea(exportCanvas, {
      x: safeX,
      y: safeY,
      width: safeWidth,
      height: safeHeight,
    });
  };

  const cropCanvasArea = (
    sourceCanvas: HTMLCanvasElement,
    area: { x: number; y: number; width: number; height: number }
  ) => {
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = Math.max(1, Math.floor(area.width));
    cropCanvas.height = Math.max(1, Math.floor(area.height));
    const cropCtx = cropCanvas.getContext("2d");
    if (!cropCtx) return sourceCanvas.toDataURL("image/png");

    cropCtx.fillStyle = CANVAS_BACKGROUND;
    cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
    cropCtx.drawImage(
      sourceCanvas,
      area.x,
      area.y,
      area.width,
      area.height,
      0,
      0,
      cropCanvas.width,
      cropCanvas.height
    );

    return cropCanvas.toDataURL("image/png");
  };

  const sendData = async () => {
    const canvas = canvasRef.current;

    if (canvas) {
      const now = Date.now();

      if (hasCalculatedResponse) {
        setApiError("Limpia el canvas o empieza un nuevo dibujo antes de volver a calcular.");
        return;
      }

      if (now - lastCalculateAtRef.current < CALCULATE_COOLDOWN_MS) {
        setApiError("Espera unos segundos antes de volver a calcular.");
        return;
      }

      lastCalculateAtRef.current = now;
      setIsCalculating(true);
      setBackendStatus("processing");
      setApiError(null);
      setCalculationNotice(null);

      try {
        const response = await axios({
          method: "POST",
          url: `${import.meta.env.VITE_API_URL}/calculate`,
          data: {
            image: getCalculationImage(canvas),
            dict_of_vars: dictOfVars,
          },
          timeout: 30000,
        });

        const resp = await response.data;
        setBackendStatus("online");

        if (resp.status !== "success" || !Array.isArray(resp.data)) {
          setApiError(resp.message ?? "No se pudo procesar la imagen. Revisa el backend o intenta de nuevo.");
          return;
        }

        resp.data.forEach((data: Response) => {
          if (data.assign === true) {
            setDictOfVars({
              ...dictOfVars,
              [data.expr]: data.result,
            });
          }
        });

        const ctx = canvas.getContext("2d");
        const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = 0;
        let maxY = 0;

        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            const isBackground =
              imageData.data[i] === 3 &&
              imageData.data[i + 1] === 1 &&
              imageData.data[i + 2] === 25;

            if (imageData.data[i + 3] > 0 && !isBackground) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        const hasInk = maxX > 0 && maxY > 0;
        const centerX = hasInk ? (minX + maxX) / 2 : canvas.width / 2;
        const centerY = hasInk ? (minY + maxY) / 2 : canvas.height / 2;

        setTimeout(() => {
          setResponseCards((currentCards) => [
            ...currentCards,
            ...resp.data.map((data: Response, index: number) => ({
              id: createElementId(),
              latex: `\\(\\LARGE{\\text{${data.expr}} = ${data.result}}\\)`,
              text: `${data.expr} = ${data.result}`,
              position: clampLatexPosition({
                x: centerX,
                y: centerY + index * 18,
              }),
              pinned: false,
              collapsed: false,
            })),
          ]);
        }, 1000);

        setHasCalculatedResponse(true);
        setCalculationNotice("Calculo procesado por el backend.");
        setTimeout(() => setCalculationNotice(null), 2600);
      } catch (error) {
        const isNetworkError = axios.isAxiosError(error) && !error.response;
        setBackendStatus(isNetworkError ? "offline" : "online");
        const backendMessage =
          axios.isAxiosError(error) && typeof error.response?.data?.detail === "string"
            ? error.response.data.detail
            : null;
        setApiError(
          isNetworkError
            ? "No se pudo conectar con el backend en 127.0.0.1:8000. Inicia el servidor y vuelve a calcular."
            : backendMessage ?? "Ocurrio un error al calcular. Revisa la respuesta del backend."
        );
      } finally {
        setIsCalculating(false);
      }
    }
  };

  const startNewCalculation = () => {
    setResponseCards([]);
    setHasCalculatedResponse(false);
    setApiError(null);
    setCalculationNotice(null);
    clearSelectionArea();
    redrawCanvas();
  };

  const drawTextColor = getReadableTextColor(color);

  const moveResponseCard = (id: string, position: Point) => {
    setResponseCards((currentCards) =>
      currentCards.map((card) => (card.id === id ? { ...card, position } : card))
    );
  };

  const toggleResponseCardCollapsed = (id: string) => {
    setResponseCards((currentCards) =>
      currentCards.map((card) => (card.id === id ? { ...card, collapsed: !card.collapsed } : card))
    );
  };

  const toggleResponseCardPinned = (id: string) => {
    setResponseCards((currentCards) =>
      currentCards.map((card) => (card.id === id ? { ...card, pinned: !card.pinned } : card))
    );
  };

  const closeResponseCard = (id: string) => {
    setResponseCards((currentCards) => currentCards.filter((card) => card.id !== id));
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#030119] text-white">
      <DesktopToolbar
        toolMode={toolMode}
        color={color}
        drawTextColor={drawTextColor}
        backendStatus={backendStatus}
        canUndo={canUndo}
        canRedo={canRedo}
        isCalculating={isCalculating}
        hasCalculatedResponse={hasCalculatedResponse}
        onReset={() => setReset(true)}
        onNewCalculation={startNewCalculation}
        onSetToolMode={setToolMode}
        onUndo={undo}
        onRedo={redo}
        onCalculate={sendData}
      />

      <MobileToolbar
        toolMode={toolMode}
        color={color}
        drawTextColor={drawTextColor}
        backendStatus={backendStatus}
        canUndo={canUndo}
        canRedo={canRedo}
        isCalculating={isCalculating}
        hasCalculatedResponse={hasCalculatedResponse}
        onReset={() => setReset(true)}
        onNewCalculation={startNewCalculation}
        onSetToolMode={setToolMode}
        onUndo={undo}
        onRedo={redo}
        onCalculate={sendData}
      />

      <DrawingSettingsPanel
        open={isColorPanelOpen}
        color={color}
        brushSize={brushSize}
        eraserSize={eraserSize}
        onToggle={() => setIsColorPanelOpen((open) => !open)}
        onColorChange={setColor}
        onBrushSizeChange={setBrushSize}
        onEraserSizeChange={setEraserSize}
      />

      <ShapesPanel
        open={isShapesPanelOpen}
        toolMode={toolMode}
        shapeSize={shapeSize}
        onToggle={() => setIsShapesPanelOpen((open) => !open)}
        onSetToolMode={setToolMode}
        onShapeSizeChange={setShapeSize}
      />

      <WorkspacePanel
        apiError={apiError}
        toolMode={toolMode}
        selectedElementId={selectedElementId}
        isCalculating={isCalculating}
        calculationNotice={calculationNotice}
        graphOpen={isGraphPanelOpen}
        graphX={graphX}
        graphY={graphY}
        onToggleGraph={() => setIsGraphPanelOpen((open) => !open)}
        onDrawAxes={drawAxes}
        onSetToolMode={setToolMode}
        onGraphXChange={setGraphX}
        onGraphYChange={setGraphY}
        onAddGraphPoint={addGraphPoint}
      />

      <canvas
        ref={canvasRef}
        id="canvas"
        className="absolute left-0 top-0 h-full w-full touch-none bg-[#030119]"
        onPointerDown={startDrawing}
        onPointerCancel={stopDrawing}
        onPointerLeave={stopDrawing}
        onPointerUp={stopDrawing}
        onPointerMove={draw}
      ></canvas>

      <ResponseCardsLayer
        cards={responseCards}
        clampPosition={clampLatexPosition}
        onMoveCard={moveResponseCard}
        onToggleCollapsed={toggleResponseCardCollapsed}
        onTogglePinned={toggleResponseCardPinned}
        onCloseCard={closeResponseCard}
      />
    </main>
  );
}