import { ChartSpline, ChevronLeft, ChevronRight, Grid3X3, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ToolMode } from "../home.types";
import styles from "./WorkspacePanel.module.css";

type WorkspacePanelProps = {
  apiError: string | null;
  toolMode: ToolMode;
  selectedElementId: string | null;
  isCalculating: boolean;
  calculationNotice: string | null;
  graphOpen: boolean;
  graphX: string;
  graphY: string;
  onToggleGraph: () => void;
  onDrawAxes: () => void;
  onSetToolMode: (mode: ToolMode) => void;
  onGraphXChange: (value: string) => void;
  onGraphYChange: (value: string) => void;
  onAddGraphPoint: () => void;
};

const getToolClass = (active: boolean) =>
  `${styles.panelButton} ${active ? styles.activeTool : ""}`;

export function WorkspacePanel({
  apiError,
  toolMode,
  selectedElementId,
  isCalculating,
  calculationNotice,
  graphOpen,
  graphX,
  graphY,
  onToggleGraph,
  onDrawAxes,
  onSetToolMode,
  onGraphXChange,
  onGraphYChange,
  onAddGraphPoint,
}: WorkspacePanelProps) {
  return (
    <section className={styles.workspacePanel}>
      {apiError && <div className={`${styles.notice} ${styles.error}`}>{apiError}</div>}

      {toolMode === "move" && (
        <div className={`${styles.notice} ${styles.move}`}>
          {selectedElementId
            ? "Arrastra el elemento seleccionado para moverlo."
            : "Toca o haz click sobre un cuadrado, triangulo o grafica X/Y para moverlo."}
        </div>
      )}

      {toolMode === "erase" && (
        <div className={`${styles.notice} ${styles.erase}`}>
          Arrastra sobre una parte escrita para borrarla sin limpiar todo.
        </div>
      )}

      {toolMode === "select" && (
        <div className={`${styles.notice} ${styles.select}`}>
          Arrastra para seleccionar el area exacta que se enviara al backend.
        </div>
      )}

      {isCalculating && (
        <div className={styles.processing}>
          <span className={styles.spinner} />
          Procesando con el backend...
        </div>
      )}

      {calculationNotice && <div className={styles.success}>{calculationNotice}</div>}

      <div className={styles.panel}>
        <Button
          onClick={onToggleGraph}
          className={`${styles.panelButton} ${styles.graphToggle}`}
          variant="outline"
          title="Graficas X/Y"
        >
          <span className="inline-flex items-center gap-2">
            <ChartSpline />
            Graficas X/Y
          </span>
          {graphOpen ? <ChevronLeft /> : <ChevronRight />}
        </Button>

        {graphOpen && (
          <div className={styles.graphBody}>
            <div className={styles.graphButtons}>
              <Button onClick={onDrawAxes} className={styles.panelButton} variant="outline" title="Ejes X/Y">
                <Grid3X3 />
                Ejes X/Y
              </Button>
              <Button
                onClick={() => onSetToolMode("point")}
                className={getToolClass(toolMode === "point")}
                variant="outline"
                title="Marcar puntos"
              >
                <MousePointer2 />
                Marcar
              </Button>
            </div>

            <div className={styles.graphInputs}>
              <input
                value={graphX}
                onChange={(event) => onGraphXChange(event.target.value)}
                className={styles.input}
                placeholder="X"
                inputMode="decimal"
              />
              <input
                value={graphY}
                onChange={(event) => onGraphYChange(event.target.value)}
                className={styles.input}
                placeholder="Y"
                inputMode="decimal"
              />
              <Button onClick={onAddGraphPoint} className={styles.addButton} title="Agregar punto">
                Agregar
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
