import { ChevronLeft, ChevronRight, Copy, Pin, PinOff, X } from "lucide-react";
import Draggable from "react-draggable";
import type { Point, ResponseCard } from "../home.types";
import styles from "./ResponseCardsLayer.module.css";

type ResponseCardsLayerProps = {
  cards: ResponseCard[];
  clampPosition: (position: Point) => Point;
  onMoveCard: (id: string, position: Point) => void;
  onToggleCollapsed: (id: string) => void;
  onTogglePinned: (id: string) => void;
  onCloseCard: (id: string) => void;
};

export function ResponseCardsLayer({
  cards,
  clampPosition,
  onMoveCard,
  onToggleCollapsed,
  onTogglePinned,
  onCloseCard,
}: ResponseCardsLayerProps) {
  return (
    <>
      {cards.map((card) => (
        <Draggable
          key={card.id}
          bounds="parent"
          disabled={card.pinned}
          defaultPosition={clampPosition(card.position)}
          onStop={(_, data) => onMoveCard(card.id, clampPosition({ x: data.x, y: data.y }))}
        >
          <div className={styles.cardShell}>
            <div className={`${styles.cardFrame} ${card.pinned ? styles.pinned : ""}`}>
              <div className={styles.cardToolbar}>
                <button
                  className={styles.cardButton}
                  onClick={() => onToggleCollapsed(card.id)}
                  title={card.collapsed ? "Expandir respuesta" : "Contraer respuesta"}
                  type="button"
                >
                  {card.collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
                <button
                  className={styles.cardButton}
                  onClick={() => onTogglePinned(card.id)}
                  title={card.pinned ? "Permitir mover" : "Fijar respuesta"}
                  type="button"
                >
                  {card.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                </button>
                <button
                  className={styles.cardButton}
                  onClick={() => navigator.clipboard?.writeText(card.text)}
                  title="Copiar respuesta"
                  type="button"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  className={styles.cardButton}
                  onClick={() => onCloseCard(card.id)}
                  title="Cerrar respuesta"
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {card.collapsed ? (
                <div className={styles.collapsedText}>{card.text}</div>
              ) : (
                <div className="latex-content px-3 py-2">{card.latex}</div>
              )}
            </div>
          </div>
        </Draggable>
      ))}
    </>
  );
}
