"use client";

import { useEffect, useRef } from "react";
import {
  getTreeDensity,
  treePalettes,
  type RgbColor,
  type TreeControls,
} from "@/components/private/tree/config";
import {
  generateTree,
  getActiveLeafCount,
} from "@/components/private/tree/generation";

interface TreeFallbackProps {
  controls: TreeControls;
  vitality: number;
}

function colorToCss(color: RgbColor) {
  const values = color.map((channel) => Math.round(channel * 255));
  return `rgb(${values[0]} ${values[1]} ${values[2]})`;
}

export function TreeFallback({ controls, vitality }: TreeFallbackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    const drawingCanvas = canvas;
    const drawingContext = context;

    const tree = generateTree(controls);
    const palette = treePalettes[controls.palette];
    const density = getTreeDensity(controls, vitality);

    function draw() {
      const rectangle = drawingCanvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rectangle.width));
      const height = Math.max(1, Math.round(rectangle.height));
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      drawingCanvas.width = Math.round(width * dpr);
      drawingCanvas.height = Math.round(height * dpr);
      drawingContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawingContext.imageSmoothingEnabled = false;

      const gradient = drawingContext.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, colorToCss(palette.backgroundTop));
      gradient.addColorStop(1, colorToCss(palette.backgroundBottom));
      drawingContext.fillStyle = gradient;
      drawingContext.fillRect(0, 0, width, height);

      const portrait = height >= width;
      const aspectScale = Math.max(0.9, Math.min(1.55, height / width));
      const toScreenX = (value: number) =>
        (value * aspectScale * 0.5 + 0.5) * width;
      const toScreenY = (value: number) => {
        const projected =
          value * (portrait ? 0.78 : 1) - (portrait ? 0.08 : 0) + (portrait ? 0 : 0.06);
        return (1 - (projected * 0.5 + 0.5)) * height;
      };
      const widthScale = Math.max(0.65, Math.min(width, height) / 620);

      drawingContext.lineCap = "butt";
      for (const branch of tree.branches) {
        drawingContext.strokeStyle = colorToCss(palette.trunks[branch.colorIndex]);
        drawingContext.lineWidth = Math.max(1, branch.startWidth * widthScale);
        drawingContext.beginPath();
        drawingContext.moveTo(toScreenX(branch.start.x), toScreenY(branch.start.y));
        drawingContext.lineTo(toScreenX(branch.end.x), toScreenY(branch.end.y));
        drawingContext.stroke();
      }

      const groundLeaves = [...tree.groundLeaves].sort(
        (left, right) => right.sizePixels - left.sizePixels,
      );
      for (const leaf of groundLeaves) {
        const size = leaf.sizePixels;
        const x = Math.round(toScreenX(leaf.x));
        const y = Math.round(toScreenY(leaf.y));
        drawingContext.fillStyle = colorToCss(palette.leaves[leaf.colorIndex]);
        drawingContext.fillRect(x - Math.floor(size / 2), y - Math.floor(size / 2), size, size);
      }

      const leafCount = getActiveLeafCount(tree.leaves.length, density);
      const visibleLeaves = tree.leaves
        .slice(0, leafCount)
        .sort((left, right) => right.sizePixels - left.sizePixels);
      for (const leaf of visibleLeaves) {
        const size = leaf.sizePixels;
        const x = Math.round(toScreenX(leaf.x));
        const y = Math.round(toScreenY(leaf.y));
        drawingContext.fillStyle = colorToCss(palette.leaves[leaf.colorIndex]);
        drawingContext.fillRect(x - Math.floor(size / 2), y - Math.floor(size / 2), size, size);
      }
    }

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(drawingCanvas);
    draw();
    return () => resizeObserver.disconnect();
  }, [controls, vitality]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
