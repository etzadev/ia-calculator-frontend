import { useEffect, useRef, useState } from "react";
import { SWATCHES } from "@/constants";
import { ColorSwatch, Group } from "@mantine/core";
import { Button } from "@/components/ui/button";
import Draggable from "react-draggable";
import axios from "axios";

interface Response {
  expr: string;
  result: string;
  assign: boolean;
}

interface generateResult {
  expression: string;
  answer: string;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("rgb(255, 255, 255)");
  const [reset, setReset] = useState(false);
  const [result, setResult] = useState<generateResult>();
  const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
  const [latexPosition, setLatexPosition] = useState({ x: 10, y: 200 });
  const [dictOfVars, setDictOfVars] = useState({});

  useEffect(() => {
    if (reset) {
      resetCanvas();
      setLatexExpression([]);
      setResult(undefined);
      setDictOfVars({});
      setReset(false);
    }
  }, [reset]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas) {
      const ctx = canvas.getContext("2d");

      if (ctx) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - canvas.offsetTop;

        ctx.lineCap = "round";
        ctx.lineWidth = 3;
      }
    }

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
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (result) {
      renderLatexToCanvas(result.expression, result.answer);
    }
  }, [result]);

  useEffect(() => {
    if (latexExpression.length > 0 && window.MathJax) {
      setTimeout(() => {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
      }, 0);
    }
  }, [latexExpression]);

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;

    if (canvas) {
      canvas.style.backgroundColor = "#030119";

      const ctx = canvas.getContext("2d");

      if (ctx) {
        const offsetX =
          "touches" in e ? e.touches[0].clientX : e.nativeEvent.offsetX;
        const offsetY =
          "touches" in e ? e.touches[0].clientY : e.nativeEvent.offsetY;

        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        setIsDrawing(true);
      }
    }
  };

  const stopDrawing = () => setIsDrawing(false);

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;

    if (canvas) {
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.strokeStyle = color;

        const offsetX =
          "touches" in e ? e.touches[0].clientX : e.nativeEvent.offsetX;
        const offsetY =
          "touches" in e ? e.touches[0].clientY : e.nativeEvent.offsetY;

        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
      }
    }
  };

  const resetCanvas = () => {
    const canvas = canvasRef.current;

    if (canvas) {
      const ctx = canvas.getContext("2d");

      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const sendData = async () => {
    const canvas = canvasRef.current;

    if (canvas) {
      const response = await axios({
        method: "POST",
        url: `${import.meta.env.VITE_API_URL}/calculate`,
        data: {
          image: canvas.toDataURL("image/png"),
          dict_of_vars: dictOfVars,
        },
      });

      const resp = await response.data;

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

          if (imageData.data[i + 3] > 0) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      setLatexPosition({ x: centerX, y: centerY });

      resp.data.forEach((data: Response) => {
        setTimeout(() => {
          setResult({
            expression: data.expr,
            answer: data.result,
          });
        }, 1000);
      });
    }
  };

  const renderLatexToCanvas = (expression: string, answer: string) => {
    const latex = `\\(\\LARGE{\\text{${expression}} = ${answer}}\\)`;
    setLatexExpression([...latexExpression, latex]);

    const canvas = canvasRef.current;

    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={() => setReset(true)}
          className="z-20 bg-black text-white"
          variant="default"
          color="black"
        >
          Reset
        </Button>

        <Group className="z-20">
          {SWATCHES.map((swatchColor: string) => (
            <ColorSwatch
              key={swatchColor}
              color={swatchColor}
              onClick={() => setColor(swatchColor)}
              className="cursor-pointer"
            />
          ))}
        </Group>

        <Button
          onClick={sendData}
          className="z-20 bg-black text-white"
          variant="default"
          color="black"
        >
          Calcular
        </Button>
      </div>

      <canvas
        ref={canvasRef}
        id="canvas"
        className="absolute top-0 left-0 w-full h-full"
        onMouseDown={startDrawing}
        onMouseOut={stopDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
        onTouchStart={startDrawing}
        onTouchEnd={stopDrawing}
        onTouchMove={draw}
      ></canvas>

      {latexExpression &&
        latexExpression.map((latex, index) => (
          <Draggable
            key={index}
            defaultPosition={latexPosition}
            onStop={(_, data) => setLatexPosition({ x: data.x, y: data.y })}
          >
            <div className="absolute text-white">
              <div className="latex-content">{latex}</div>
            </div>
          </Draggable>
        ))}
    </>
  );
}
