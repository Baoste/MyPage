"use client";

import { useEffect, useRef, useState } from "react";
import {
  defaultTreeControls,
  sanitizeStoredControls,
  TREE_CONTROL_STORAGE_KEY,
  TREE_REFRESH_STORAGE_KEY,
  type TreeControls,
} from "@/components/private/tree/config";
import { PixelTreeScene } from "@/components/private/tree/scene";
import { TreeControlPanel } from "@/components/private/tree/TreeControlPanel";
import { TreeElapsedTimer } from "@/components/private/tree/TreeElapsedTimer";
import { TreeFallback } from "@/components/private/tree/TreeFallback";
import {
  createPhotoActivityStats,
  DAY_IN_MILLISECONDS,
} from "@/lib/tree/activity";
import type { PhotoActivityStats } from "@/types";

type RenderMode = "loading" | "webgl" | "fallback" | "lost";
const OPEN_CONTROL_PANEL_COMMAND = "open_tree_control_panel";
const REFRESH_TREE_COMMAND = "refresh_tree";
const ACTIVITY_CLOCK_INTERVAL_MILLISECONDS = 60_000;

interface ProceduralTreeProps {
  activity: PhotoActivityStats;
}

function describeActivity(activity: PhotoActivityStats) {
  if (activity.status === "unavailable") {
    return "照片统计暂不可用，树暂时不显示叶片。";
  }
  if (activity.status === "empty") {
    return "还没有照片上传记录，树冠暂时没有叶片。";
  }
  const days = activity.daysSinceLastUpload ?? 0;
  const recency = days < 1 ? "最后一次上传发生在今天" : `距最后一次上传约 ${Math.floor(days)} 天`;
  return `${recency}，当前树木叶片密度为 ${Math.round(activity.vitality * 100)}%。`;
}

function randomSeed() {
  const values = new Uint32Array(2);
  window.crypto.getRandomValues(values);
  return `tree-${values[0].toString(36)}-${values[1].toString(36)}`;
}

function readStoredTreeRefresh(now: number) {
  try {
    const value = Number(window.localStorage.getItem(TREE_REFRESH_STORAGE_KEY));
    if (Number.isFinite(value) && value > 0 && value <= now + ACTIVITY_CLOCK_INTERVAL_MILLISECONDS) {
      return value;
    }
  } catch {
    // The command still works for the current page when storage is unavailable.
  }
  return null;
}

export function ProceduralTree({ activity }: ProceduralTreeProps) {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<PixelTreeScene | null>(null);
  const controlsRef = useRef<TreeControls>(defaultTreeControls);
  const vitalityRef = useRef(activity.vitality);
  const [controls, setControls] = useState<TreeControls>(defaultTreeControls);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [renderMode, setRenderMode] = useState<RenderMode>("loading");
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [refreshStartedAt, setRefreshStartedAt] = useState<number | null>(null);
  const [activityClock, setActivityClock] = useState(0);

  const refreshedDays = refreshStartedAt === null
    ? null
    : Math.max(0, (activityClock - refreshStartedAt) / DAY_IN_MILLISECONDS);
  const useLocalRefresh = refreshedDays !== null && (
    activity.daysSinceLastUpload === null
    || refreshedDays < activity.daysSinceLastUpload
  );
  const effectiveActivity = useLocalRefresh
    ? createPhotoActivityStats(refreshedDays)
    : activity;

  useEffect(() => {
    const now = Date.now();
    const savedRefresh = readStoredTreeRefresh(now);
    const frame = window.requestAnimationFrame(() => {
      setActivityClock(now);
      setRefreshStartedAt(savedRefresh);
    });
    const interval = window.setInterval(
      () => setActivityClock(Date.now()),
      ACTIVITY_CLOCK_INTERVAL_MILLISECONDS,
    );
    const commands = [OPEN_CONTROL_PANEL_COMMAND, REFRESH_TREE_COMMAND] as const;
    const previousDescriptors = new Map(
      commands.map((command) => [command, Object.getOwnPropertyDescriptor(window, command)]),
    );

    Object.defineProperty(window, OPEN_CONTROL_PANEL_COMMAND, {
      configurable: true,
      get() {
        setIsPanelOpen(true);
        return "Tree control panel opened temporarily.";
      },
    });

    Object.defineProperty(window, REFRESH_TREE_COMMAND, {
      configurable: true,
      get() {
        const refreshedAt = Date.now();
        try {
          window.localStorage.setItem(TREE_REFRESH_STORAGE_KEY, String(refreshedAt));
        } catch {
          // Keep the refresh active for the current page even without storage.
        }
        setActivityClock(refreshedAt);
        setRefreshStartedAt(refreshedAt);
        setControls((current) => ({ ...current, autoActivity: true }));
        return "Tree refreshed to 100%; the 40-day vitality clock restarted.";
      },
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
      for (const command of commands) {
        const previousDescriptor = previousDescriptors.get(command);
        if (previousDescriptor) {
          Object.defineProperty(window, command, previousDescriptor);
        } else {
          Reflect.deleteProperty(window, command);
        }
      }
    };
  }, []);

  useEffect(() => {
    vitalityRef.current = effectiveActivity.vitality;
    sceneRef.current?.setVitality(effectiveActivity.vitality);
  }, [effectiveActivity.vitality]);

  useEffect(() => {
    let nextControls = { ...defaultTreeControls };
    let hasSavedPreferences = false;

    try {
      const stored = window.localStorage.getItem(TREE_CONTROL_STORAGE_KEY);
      if (stored) {
        nextControls = sanitizeStoredControls(JSON.parse(stored) as unknown);
        hasSavedPreferences = true;
      }
    } catch {
      window.localStorage.removeItem(TREE_CONTROL_STORAGE_KEY);
    }

    if (!hasSavedPreferences && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nextControls.isPaused = true;
    }

    const frame = window.requestAnimationFrame(() => {
      controlsRef.current = nextControls;
      setControls(nextControls);
      setPreferencesReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    if (!preferencesReady) return;
    try {
      window.localStorage.setItem(TREE_CONTROL_STORAGE_KEY, JSON.stringify(controls));
    } catch {
      // The scene still works when storage is unavailable or full.
    }
  }, [controls, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const renderCanvas = canvas;
    const renderContainer = container;

    let activeScene: PixelTreeScene | null = null;

    function resizeScene() {
      if (!activeScene) return;
      const rectangle = renderContainer.getBoundingClientRect();
      activeScene.resize(rectangle.width, rectangle.height, window.devicePixelRatio || 1);
    }

    function initializeScene() {
      try {
        activeScene = new PixelTreeScene(renderCanvas, controlsRef.current, vitalityRef.current);
        sceneRef.current = activeScene;
        resizeScene();
        activeScene.setVisible(!document.hidden);
        activeScene.start();
        setRenderMode("webgl");
      } catch (error) {
        console.warn("WebGL2 pixel tree unavailable; using the static fallback.", error);
        activeScene = null;
        sceneRef.current = null;
        setRenderMode("fallback");
      }
    }

    function handleContextLost(event: Event) {
      event.preventDefault();
      activeScene?.stop();
      setRenderMode("lost");
    }

    function handleContextRestored() {
      activeScene?.dispose();
      activeScene = null;
      initializeScene();
    }

    function handleVisibilityChange() {
      activeScene?.setVisible(!document.hidden);
    }

    initializeScene();
    const resizeObserver = new ResizeObserver(resizeScene);
    resizeObserver.observe(renderContainer);
    renderCanvas.addEventListener("webglcontextlost", handleContextLost);
    renderCanvas.addEventListener("webglcontextrestored", handleContextRestored);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      resizeObserver.disconnect();
      renderCanvas.removeEventListener("webglcontextlost", handleContextLost);
      renderCanvas.removeEventListener("webglcontextrestored", handleContextRestored);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      activeScene?.dispose();
      sceneRef.current = null;
    };
  }, [preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) return;
    sceneRef.current?.setControls(controls);
  }, [controls, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) return;
    const timeout = window.setTimeout(() => {
      sceneRef.current?.regenerate(controlsRef.current);
    }, 170);
    return () => window.clearTimeout(timeout);
  }, [
    controls.seed,
    controls.branchDepth,
    controls.canopyWidth,
    controls.trunkScale,
    preferencesReady,
  ]);

  function changeControls(changes: Partial<TreeControls>) {
    setControls((current) => ({ ...current, ...changes }));
  }

  function resetControls() {
    const nextControls = { ...defaultTreeControls };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nextControls.isPaused = true;
    }
    setControls(nextControls);
  }

  return (
    <section
      ref={containerRef}
      aria-label="照片时间生命树"
      className="relative min-h-[36rem] w-full flex-1 overflow-hidden bg-[#121813]"
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${renderMode === "fallback" ? "opacity-0" : "opacity-100"}`}
        style={{ imageRendering: "pixelated" }}
      />
      {renderMode === "fallback" ? (
        <TreeFallback controls={controls} vitality={effectiveActivity.vitality} />
      ) : null}

      <TreeControlPanel
        controls={controls}
        activity={effectiveActivity}
        isOpen={isPanelOpen}
        onToggle={() => setIsPanelOpen(false)}
        onChange={changeControls}
        onReset={resetControls}
        onRandomize={() => changeControls({ seed: randomSeed() })}
      />

      <TreeElapsedTimer />

      <p className="sr-only" aria-live="polite">
        {describeActivity(effectiveActivity)}
        {renderMode === "fallback" ? " 当前浏览器使用静态像素树降级画面。" : ""}
        {renderMode === "lost" ? " 图形上下文正在恢复。" : ""}
      </p>
    </section>
  );
}
