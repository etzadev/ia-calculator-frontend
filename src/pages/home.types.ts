export interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

export type ToolMode = "draw" | "erase" | "move" | "point" | "select" | "square" | "triangle";

export type BackendStatus = "checking" | "online" | "offline" | "processing";

export type Point = {
  x: number;
  y: number;
};

export type DrawElement =
  | {
      id: string;
      type: "stroke";
      color: string;
      width: number;
      points: Point[];
    }
  | {
      id: string;
      type: "point";
      color: string;
      x: number;
      y: number;
    }
  | {
      id: string;
      type: "square" | "triangle";
      color: string;
      x: number;
      y: number;
      size: number;
    }
  | {
      id: string;
      type: "graph";
      color: string;
      points: Point[];
      offsetX: number;
      offsetY: number;
    };

export type ResponseCard = {
  id: string;
  latex: string;
  text: string;
  position: Point;
  pinned: boolean;
  collapsed: boolean;
};

export type SelectionBox = {
  start: Point;
  end: Point;
  active: boolean;
};
