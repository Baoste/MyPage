import type { TreeControls } from "@/components/private/tree/config";

export interface TreePoint {
  x: number;
  y: number;
}

export interface BranchSegment {
  start: TreePoint;
  end: TreePoint;
  startWidth: number;
  endWidth: number;
  colorIndex: number;
}

export interface TreeLeaf {
  x: number;
  y: number;
  sizeVariation: number;
  colorIndex: number;
  phase: number;
}

export interface TreeModel {
  branches: BranchSegment[];
  leaves: TreeLeaf[];
  seed: string;
}

export type RandomSource = () => number;

function hashSeed(seed: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function createSeededRandom(seed: string): RandomSource {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function between(random: RandomSource, minimum: number, maximum: number) {
  return minimum + (maximum - minimum) * random();
}

function shuffle<T>(items: T[], random: RandomSource) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
}

export function generateTree(controls: TreeControls): TreeModel {
  const random = createSeededRandom(controls.seed);
  const branches: BranchSegment[] = [];
  const leaves: TreeLeaf[] = [];
  const groundY = -0.82;

  for (let rootIndex = 0; rootIndex < 7; rootIndex += 1) {
    const direction = rootIndex % 2 === 0 ? -1 : 1;
    const distance = between(random, 0.12, 0.34) * direction;
    branches.push({
      start: { x: between(random, -0.018, 0.018), y: groundY + 0.015 },
      end: { x: distance, y: groundY - between(random, 0.025, 0.075) },
      startWidth: between(random, 7, 12) * controls.trunkScale,
      endWidth: between(random, 1.5, 4) * controls.trunkScale,
      colorIndex: rootIndex % 3,
    });
  }

  function addLeafCluster(point: TreePoint, parent: TreePoint) {
    const leafCount = Math.round(between(random, 17, 27));
    const directionX = point.x - parent.x;
    const directionY = point.y - parent.y;

    for (let index = 0; index < leafCount; index += 1) {
      const theta = random() * Math.PI * 2;
      const radius = Math.sqrt(random()) * between(random, 0.045, 0.092);
      const alongBranch = between(random, -0.02, 0.04);
      leaves.push({
        x:
          point.x +
          Math.cos(theta) * radius * controls.canopyWidth +
          directionX * alongBranch,
        y: point.y + Math.sin(theta) * radius * 0.64 + directionY * alongBranch,
        sizeVariation: between(random, 0.72, 1.3),
        colorIndex: Math.min(5, Math.floor(random() * 6)),
        phase: random() * Math.PI * 2,
      });
    }
  }

  function grow(
    start: TreePoint,
    length: number,
    angle: number,
    width: number,
    remainingDepth: number,
  ) {
    if (branches.length >= 1_700) return;

    const end = {
      x: Math.max(
        -0.9,
        Math.min(0.9, start.x + Math.sin(angle) * length * controls.canopyWidth),
      ),
      y: Math.min(0.9, start.y + Math.cos(angle) * length),
    };
    const normalizedDepth = controls.branchDepth - remainingDepth;

    branches.push({
      start,
      end,
      startWidth: Math.max(1.15, width),
      endWidth: Math.max(0.85, width * between(random, 0.61, 0.72)),
      colorIndex: Math.min(3, Math.floor(normalizedDepth / 2)),
    });

    if (remainingDepth <= 0 || end.y >= 0.89) {
      addLeafCluster(end, start);
      return;
    }

    const split = between(random, 0.245, 0.47);
    const asymmetry = between(random, -0.075, 0.075);
    const nextLength = length * between(random, 0.67, 0.755);
    const nextWidth = width * between(random, 0.62, 0.72);

    grow(
      end,
      nextLength * between(random, 0.94, 1.04),
      angle - split * between(random, 0.78, 1.08) + asymmetry,
      nextWidth,
      remainingDepth - 1,
    );
    grow(
      end,
      nextLength * between(random, 0.9, 1.02),
      angle + split * between(random, 0.76, 1.12) + asymmetry,
      nextWidth * between(random, 0.9, 1),
      remainingDepth - 1,
    );
  }

  grow(
    { x: 0, y: groundY },
    0.47,
    between(random, -0.035, 0.035),
    15 * controls.trunkScale,
    controls.branchDepth,
  );

  shuffle(leaves, random);
  if (leaves.length > 8_000) leaves.length = 8_000;

  return { branches, leaves, seed: controls.seed };
}

export function getActiveLeafCount(totalLeaves: number, density: number) {
  if (totalLeaves <= 0) return 0;
  const safeDensity = Math.max(0, Math.min(1, density));
  const minimumLeaves = Math.min(totalLeaves, Math.max(32, Math.round(totalLeaves * 0.045)));
  return Math.min(
    totalLeaves,
    Math.round(minimumLeaves + (totalLeaves - minimumLeaves) * safeDensity),
  );
}
