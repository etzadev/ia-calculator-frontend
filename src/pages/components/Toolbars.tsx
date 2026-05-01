import type { CSSProperties } from "react";
import {
  Activity,
  Calculator,
  Eraser,
  Move,
  PenLine,
  PlusCircle,
  Redo2,
  Scan,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BackendStatus, ToolMode } from "../home.types";
import styles from "./Toolbars.module.css";

type ToolbarProps = {
  toolMode: ToolMode;
  color: string;
  drawTextColor: string;
  backendStatus: BackendStatus;
  canUndo: boolean;
  canRedo: boolean;
  isCalculating: boolean;
  hasCalculatedResponse: boolean;
  onReset: () => void;
  onNewCalculation: () => void;
  onSetToolMode: (mode: ToolMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  onCalculate: () => void;
};

const statusMeta: Record<BackendStatus, { label: string; className: string }> = {
  checking: { label: "Backend verificando", className: styles.checking },
  online: { label: "Backend conectado", className: styles.online },
  offline: { label: "Backend apagado", className: styles.offline },
  processing: { label: "Backend procesando", className: styles.processing },
};

const getToolClass = (toolMode: ToolMode, mode: ToolMode) =>
  `${styles.toolButton} ${toolMode === mode ? styles.activeTool : ""}`;

const getCalculateLabel = (isCalculating: boolean, hasCalculatedResponse: boolean) => {
  if (isCalculating) return "Procesando";
  if (hasCalculatedResponse) return "Calculado";
  return "Calcular";
};

export function DesktopToolbar({
  toolMode,
  color,
  drawTextColor,
  backendStatus,
  canUndo,
  canRedo,
  isCalculating,
  hasCalculatedResponse,
  onReset,
  onNewCalculation,
  onSetToolMode,
  onUndo,
  onRedo,
  onCalculate,
}: ToolbarProps) {
  const drawStyle: CSSProperties = {
    backgroundColor: color,
    borderColor: color,
    color: drawTextColor,
    boxShadow: toolMode === "draw" ? `0 10px 24px ${color}33` : undefined,
  };
  const meta = statusMeta[backendStatus];

  return (
    <section className={styles.desktopToolbar}>
      <div className={styles.buttonGroup}>
        <Button onClick={onReset} className={styles.secondaryButton} variant="outline" title="Limpiar todo">
          <Eraser />
          Limpiar
        </Button>
        <Button onClick={onNewCalculation} className={styles.secondaryButton} variant="outline" title="Nuevo calculo">
          <PlusCircle />
          Nuevo
        </Button>
        <Button
          onClick={() => onSetToolMode("draw")}
          className={styles.drawButton}
          variant="outline"
          title="Dibujar"
          style={drawStyle}
        >
          <PenLine />
          Dibujar
        </Button>
        <Button onClick={() => onSetToolMode("erase")} className={getToolClass(toolMode, "erase")} variant="outline">
          <Eraser />
          Borrador
        </Button>
        <Button onClick={onUndo} disabled={!canUndo} className={styles.secondaryButton} variant="outline">
          <Undo2 />
          Deshacer
        </Button>
        <Button onClick={onRedo} disabled={!canRedo} className={styles.secondaryButton} variant="outline">
          <Redo2 />
          Rehacer
        </Button>
        <Button onClick={() => onSetToolMode("select")} className={getToolClass(toolMode, "select")} variant="outline">
          <Scan />
          Area
        </Button>
      </div>

      <div className={styles.backendStatus}>
        <Activity className="h-4 w-4" />
        <span className={`${styles.statusDot} ${meta.className}`} />
        {meta.label}
      </div>

      <Button
        onClick={onCalculate}
        disabled={isCalculating || hasCalculatedResponse}
        className={styles.calculateButton}
        title="Calcular"
      >
        <Calculator />
        {getCalculateLabel(isCalculating, hasCalculatedResponse)}
      </Button>
    </section>
  );
}

export function MobileToolbar({
  toolMode,
  color,
  drawTextColor,
  isCalculating,
  hasCalculatedResponse,
  onNewCalculation,
  onSetToolMode,
  onCalculate,
}: ToolbarProps) {
  const drawStyle: CSSProperties | undefined =
    toolMode === "draw"
      ? {
          backgroundColor: color,
          borderColor: color,
          color: drawTextColor,
        }
      : undefined;

  return (
    <section className={styles.mobileToolbar}>
      <Button
        onClick={() => onSetToolMode("draw")}
        className={`${toolMode === "draw" ? styles.drawButton : styles.toolButton} ${styles.mobileButton}`}
        style={drawStyle}
        variant="outline"
        title="Dibujar"
      >
        <PenLine />
      </Button>
      <Button
        onClick={() => onSetToolMode("erase")}
        className={`${getToolClass(toolMode, "erase")} ${styles.mobileButton}`}
        variant="outline"
        title="Borrador"
      >
        <Eraser />
      </Button>
      <Button
        onClick={() => onSetToolMode("move")}
        className={`${getToolClass(toolMode, "move")} ${styles.mobileButton}`}
        variant="outline"
        title="Mover"
      >
        <Move />
      </Button>
      <Button onClick={onNewCalculation} className={`${styles.secondaryButton} ${styles.mobileButton}`} variant="outline">
        <PlusCircle />
      </Button>
      <Button
        onClick={onCalculate}
        disabled={isCalculating || hasCalculatedResponse}
        className={`${styles.calculateButton} ${styles.mobileButton}`}
        title="Calcular"
      >
        <Calculator />
      </Button>
    </section>
  );
}
