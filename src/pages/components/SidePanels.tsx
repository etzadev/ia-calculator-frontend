import { ChevronRight, CircleDot, Move, Palette, Shapes, Square, Triangle } from "lucide-react";
import { ColorSwatch, Group } from "@mantine/core";
import { Button } from "@/components/ui/button";
import { SWATCHES } from "@/constants";
import type { ToolMode } from "../home.types";
import styles from "./SidePanels.module.css";

type DrawingSettingsPanelProps = {
  open: boolean;
  color: string;
  brushSize: number;
  eraserSize: number;
  onToggle: () => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onEraserSizeChange: (size: number) => void;
};

type ShapesPanelProps = {
  open: boolean;
  toolMode: ToolMode;
  shapeSize: number;
  onToggle: () => void;
  onSetToolMode: (mode: ToolMode) => void;
  onShapeSizeChange: (size: number) => void;
};

const getToolClass = (toolMode: ToolMode, mode: ToolMode) =>
  `${styles.panelButton} ${toolMode === mode ? styles.activeTool : ""}`;

export function DrawingSettingsPanel({
  open,
  color,
  brushSize,
  eraserSize,
  onToggle,
  onColorChange,
  onBrushSizeChange,
  onEraserSizeChange,
}: DrawingSettingsPanelProps) {
  return (
    <section className={`${styles.panelLauncher} ${styles.colorPanel}`}>
      <Button onClick={onToggle} className={styles.iconButton} variant="outline" size="icon" title="Colores">
        {open ? <ChevronRight /> : <Palette />}
      </Button>

      {open && (
        <div className={`${styles.panel} ${styles.colorPanelBody}`}>
          <div className={styles.panelTitle}>
            <Palette className="h-4 w-4" />
            Color
          </div>
          <Group className={styles.swatchGrid}>
            {SWATCHES.map((swatchColor: string) => (
              <ColorSwatch
                key={swatchColor}
                color={swatchColor}
                onClick={() => onColorChange(swatchColor)}
                className={`${styles.swatch} ${color === swatchColor ? styles.activeSwatch : ""}`}
              />
            ))}
          </Group>

          <div className={styles.controlStack}>
            <div className={styles.controlCard}>
              <div className={styles.controlHeader}>
                <span>Pincel</span>
                <span>{brushSize}px</span>
              </div>
              <div className={styles.previewRow}>
                <span
                  className={styles.previewDot}
                  style={{
                    width: Math.max(brushSize, 4),
                    height: Math.max(brushSize, 4),
                    backgroundColor: color,
                  }}
                />
                <span
                  className={styles.previewLine}
                  style={{
                    height: Math.max(brushSize, 2),
                    backgroundColor: color,
                  }}
                />
              </div>
              <input
                value={brushSize}
                onChange={(event) => onBrushSizeChange(Number(event.target.value))}
                className={styles.range}
                type="range"
                min="2"
                max="18"
                step="1"
                aria-label="Tamano de pincel"
              />
            </div>

            <div className={styles.controlCard}>
              <div className={styles.controlHeader}>
                <span>Borrador</span>
                <span>{eraserSize}px</span>
              </div>
              <div className={styles.previewRow}>
                <span
                  className={styles.eraserPreview}
                  style={{
                    width: Math.max(eraserSize, 8),
                    height: Math.max(eraserSize, 8),
                  }}
                />
              </div>
              <input
                value={eraserSize}
                onChange={(event) => onEraserSizeChange(Number(event.target.value))}
                className={`${styles.range} ${styles.amberRange}`}
                type="range"
                min="8"
                max="44"
                step="2"
                aria-label="Tamano de borrador"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function ShapesPanel({
  open,
  toolMode,
  shapeSize,
  onToggle,
  onSetToolMode,
  onShapeSizeChange,
}: ShapesPanelProps) {
  return (
    <section className={`${styles.panelLauncher} ${styles.shapesPanel}`}>
      <Button onClick={onToggle} className={styles.iconButton} variant="outline" size="icon" title="Formas">
        {open ? <ChevronRight /> : <Shapes />}
      </Button>

      {open && (
        <div className={`${styles.panel} ${styles.shapesPanelBody}`}>
          <div className={styles.panelTitle}>
            <Shapes className="h-4 w-4" />
            Formas
          </div>

          <div className={styles.shapeGrid}>
            <Button onClick={() => onSetToolMode("move")} className={getToolClass(toolMode, "move")} variant="outline">
              <Move />
              Mover
            </Button>
            <Button onClick={() => onSetToolMode("square")} className={getToolClass(toolMode, "square")} variant="outline">
              <Square />
              Cuadrado
            </Button>
            <Button
              onClick={() => onSetToolMode("triangle")}
              className={getToolClass(toolMode, "triangle")}
              variant="outline"
            >
              <Triangle />
              Triangulo
            </Button>
            <Button onClick={() => onSetToolMode("point")} className={getToolClass(toolMode, "point")} variant="outline">
              <CircleDot />
              Punto
            </Button>
          </div>

          <div className={styles.controlStack}>
            <div className={styles.controlHeader}>
              <span>Tamano</span>
              <span>{shapeSize}px</span>
            </div>
            <input
              value={shapeSize}
              onChange={(event) => onShapeSizeChange(Number(event.target.value))}
              className={styles.range}
              type="range"
              min="48"
              max="260"
              step="4"
              aria-label="Tamano de forma"
            />
          </div>
        </div>
      )}
    </section>
  );
}
