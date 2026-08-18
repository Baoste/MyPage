export type TreePaletteName = "spring" | "autumn" | "night";
export type TreePixelScale = "auto" | 2 | 3 | 4;

export interface TreeControls {
  autoActivity: boolean;
  manualDensity: number;
  seed: string;
  branchDepth: number;
  canopyWidth: number;
  trunkScale: number;
  leafSize: number;
  windStrength: number;
  windSpeed: number;
  gustStrength: number;
  fallRate: number;
  gravity: number;
  drift: number;
  palette: TreePaletteName;
  pixelScale: TreePixelScale;
  isPaused: boolean;
}

export type RgbColor = readonly [number, number, number];

export interface TreePalette {
  label: string;
  backgroundTop: RgbColor;
  backgroundBottom: RgbColor;
  trunks: readonly [RgbColor, RgbColor, RgbColor, RgbColor];
  leaves: readonly [
    RgbColor,
    RgbColor,
    RgbColor,
    RgbColor,
    RgbColor,
    RgbColor,
  ];
}

export const TREE_CONTROL_STORAGE_KEY = "private-tree-controls:v1";

export const defaultTreeControls: TreeControls = {
  autoActivity: true,
  manualDensity: 0.72,
  seed: "kept-between-us",
  branchDepth: 8,
  canopyWidth: 1,
  trunkScale: 1,
  leafSize: 2,
  windStrength: 0.38,
  windSpeed: 0.72,
  gustStrength: 0.24,
  fallRate: 0.28,
  gravity: 1,
  drift: 0.48,
  palette: "spring",
  pixelScale: "auto",
  isPaused: false,
};

export const treePalettes: Record<TreePaletteName, TreePalette> = {
  spring: {
    label: "春绿",
    backgroundTop: [0.075, 0.11, 0.105],
    backgroundBottom: [0.16, 0.17, 0.14],
    trunks: [
      [0.25, 0.205, 0.17],
      [0.34, 0.27, 0.205],
      [0.43, 0.335, 0.235],
      [0.52, 0.405, 0.28],
    ],
    leaves: [
      [0.19, 0.35, 0.22],
      [0.255, 0.45, 0.255],
      [0.34, 0.53, 0.285],
      [0.46, 0.59, 0.32],
      [0.57, 0.64, 0.36],
      [0.72, 0.69, 0.4],
    ],
  },
  autumn: {
    label: "秋金",
    backgroundTop: [0.12, 0.09, 0.095],
    backgroundBottom: [0.22, 0.14, 0.105],
    trunks: [
      [0.245, 0.17, 0.14],
      [0.34, 0.225, 0.16],
      [0.43, 0.28, 0.18],
      [0.55, 0.36, 0.205],
    ],
    leaves: [
      [0.45, 0.17, 0.11],
      [0.58, 0.235, 0.105],
      [0.7, 0.34, 0.105],
      [0.82, 0.47, 0.13],
      [0.88, 0.59, 0.18],
      [0.78, 0.68, 0.3],
    ],
  },
  night: {
    label: "夜蓝",
    backgroundTop: [0.045, 0.065, 0.105],
    backgroundBottom: [0.1, 0.115, 0.16],
    trunks: [
      [0.17, 0.16, 0.22],
      [0.24, 0.22, 0.3],
      [0.32, 0.29, 0.39],
      [0.41, 0.37, 0.48],
    ],
    leaves: [
      [0.15, 0.29, 0.4],
      [0.2, 0.38, 0.49],
      [0.27, 0.47, 0.56],
      [0.38, 0.56, 0.61],
      [0.5, 0.63, 0.64],
      [0.66, 0.7, 0.66],
    ],
  },
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteNumber(value: unknown, fallback: number, minimum: number, maximum: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(value, minimum, maximum)
    : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function sanitizeStoredControls(value: unknown): TreeControls {
  if (!isRecord(value)) return { ...defaultTreeControls };

  const palette =
    value.palette === "spring" || value.palette === "autumn" || value.palette === "night"
      ? value.palette
      : defaultTreeControls.palette;
  const pixelScale =
    value.pixelScale === "auto" ||
    value.pixelScale === 2 ||
    value.pixelScale === 3 ||
    value.pixelScale === 4
      ? value.pixelScale
      : defaultTreeControls.pixelScale;

  return {
    autoActivity:
      typeof value.autoActivity === "boolean"
        ? value.autoActivity
        : defaultTreeControls.autoActivity,
    manualDensity: finiteNumber(value.manualDensity, defaultTreeControls.manualDensity, 0, 1),
    seed:
      typeof value.seed === "string" && value.seed.trim()
        ? value.seed.trim().slice(0, 80)
        : defaultTreeControls.seed,
    branchDepth: Math.round(
      finiteNumber(value.branchDepth, defaultTreeControls.branchDepth, 4, 9),
    ),
    canopyWidth: finiteNumber(value.canopyWidth, defaultTreeControls.canopyWidth, 0.6, 1.4),
    trunkScale: finiteNumber(value.trunkScale, defaultTreeControls.trunkScale, 0.6, 1.6),
    leafSize: Math.round(finiteNumber(value.leafSize, defaultTreeControls.leafSize, 1, 4)),
    windStrength: finiteNumber(value.windStrength, defaultTreeControls.windStrength, 0, 1),
    windSpeed: finiteNumber(value.windSpeed, defaultTreeControls.windSpeed, 0.1, 2),
    gustStrength: finiteNumber(value.gustStrength, defaultTreeControls.gustStrength, 0, 1),
    fallRate: finiteNumber(value.fallRate, defaultTreeControls.fallRate, 0, 1),
    gravity: finiteNumber(value.gravity, defaultTreeControls.gravity, 0.2, 2),
    drift: finiteNumber(value.drift, defaultTreeControls.drift, 0, 1),
    palette,
    pixelScale,
    isPaused:
      typeof value.isPaused === "boolean" ? value.isPaused : defaultTreeControls.isPaused,
  };
}

export function resolvePixelScale(pixelScale: TreePixelScale, cssWidth: number) {
  if (pixelScale !== "auto") return pixelScale;
  return cssWidth < 720 ? 2 : 3;
}

export function getTreeDensity(controls: TreeControls, vitality: number) {
  return clamp(controls.autoActivity ? vitality : controls.manualDensity, 0, 1);
}
