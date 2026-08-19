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
  sizePixels: 1 | 2 | 3;
  colorIndex: number;
  phase: number;
}

export interface TreeModel {
  branches: BranchSegment[];
  leaves: TreeLeaf[];
  groundLeaves: TreeLeaf[];
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
  const groundLeaves: TreeLeaf[] = [];
  const groundY = -0.82;

  interface CanopyAnchor {
    point: TreePoint;
    radiusX: number;
    radiusY: number;
    leafCount: number;
    phase: number;
  }

  const canopyAnchors: CanopyAnchor[] = [];
  const clamp = (value: number, minimum: number, maximum: number) =>
    Math.min(maximum, Math.max(minimum, value));
  const mixPoint = (start: TreePoint, end: TreePoint, amount: number): TreePoint => ({
    x: start.x + (end.x - start.x) * amount,
    y: start.y + (end.y - start.y) * amount,
  });

  function addBranch(
    start: TreePoint,
    end: TreePoint,
    startWidth: number,
    endWidth: number,
    colorIndex: number,
  ) {
    branches.push({ start, end, startWidth, endWidth, colorIndex });
  }

  // Wide, uneven roots keep the base from reading as a perfect procedural fork.
  for (let rootIndex = 0; rootIndex < 9; rootIndex += 1) {
    const direction = rootIndex % 2 === 0 ? -1 : 1;
    const distance = between(random, 0.1, 0.31) * direction;
    addBranch(
      { x: between(random, -0.028, 0.028), y: groundY + between(random, 0.002, 0.025) },
      { x: distance, y: groundY - between(random, 0.025, 0.085) },
      between(random, 8, 15) * controls.trunkScale,
      between(random, 1.5, 4.5) * controls.trunkScale,
      rootIndex % 3,
    );
  }

  // Build the main trunk as a correlated random walk rather than a single split.
  const trunkSteps = controls.branchDepth + 4;
  const trunkTopY = 0.3 + (controls.branchDepth - 6) * 0.014;
  const trunkStepHeight = (trunkTopY - groundY) / trunkSteps;
  const trunkNodes: TreePoint[] = [{ x: 0, y: groundY }];
  let trunkDrift = between(random, -0.005, 0.005);

  for (let step = 1; step <= trunkSteps; step += 1) {
    const progress = step / trunkSteps;
    const start = trunkNodes[trunkNodes.length - 1];
    trunkDrift = clamp(trunkDrift + between(random, -0.006, 0.006), -0.014, 0.014);
    const end = {
      x: start.x + trunkDrift * (1 - progress * 0.28),
      y: start.y + trunkStepHeight * between(random, 0.92, 1.08),
    };
    const startWidth = (21 - progress * 15.2) * controls.trunkScale;
    const endWidth = Math.max(4.2, startWidth - between(random, 0.8, 2.1));
    addBranch(start, end, startWidth, endWidth, progress < 0.62 ? 1 : 0);

    // Short offset strips create blocky bark light and break the perfect silhouette.
    if (step > 1 && random() > 0.18) {
      const offset = between(random, -0.008, 0.008);
      const highlightStart = mixPoint(start, end, between(random, 0.12, 0.32));
      const highlightEnd = mixPoint(start, end, between(random, 0.58, 0.9));
      highlightStart.x += offset;
      highlightEnd.x += offset * 0.72;
      addBranch(
        highlightStart,
        highlightEnd,
        Math.max(1, startWidth * between(random, 0.13, 0.24)),
        Math.max(0.8, endWidth * between(random, 0.1, 0.2)),
        random() > 0.3 ? 2 : 3,
      );
    }

    trunkNodes.push(end);
  }

  function addTwig(start: TreePoint, initialAngle: number, length: number, width: number) {
    let current = start;
    let angle = initialAngle;
    const segments = random() > 0.45 ? 3 : 2;

    for (let segment = 0; segment < segments; segment += 1) {
      angle += between(random, -0.11, 0.11);
      const segmentLength = (length / segments) * between(random, 0.9, 1.12);
      const end = {
        x: clamp(
          current.x + Math.sin(angle) * segmentLength * controls.canopyWidth,
          -0.72,
          0.72,
        ),
        y: Math.min(0.82, current.y + Math.cos(angle) * segmentLength),
      };
      addBranch(
        current,
        end,
        Math.max(0.95, width * (1 - segment / segments)),
        Math.max(0.7, width * (0.48 - segment * 0.08)),
        segment > 0 ? 0 : 1,
      );
      current = end;
    }

    canopyAnchors.push({
      point: current,
      radiusX: between(random, 0.09, 0.135) * controls.canopyWidth,
      radiusY: between(random, 0.085, 0.125),
      leafCount: Math.round(between(random, 115, 175)),
      phase: random() * Math.PI * 2,
    });
  }

  function addMajorBranch(
    start: TreePoint,
    initialAngle: number,
    totalLength: number,
    startWidth: number,
  ) {
    const segments = Math.max(3, Math.round(between(random, 3.5, 5.5)));
    let current = start;
    let angle = initialAngle;
    let middlePoint = start;

    for (let segment = 0; segment < segments; segment += 1) {
      const progress = segment / segments;
      angle += between(random, -0.085, 0.085) - angle * 0.018;
      const length = (totalLength / segments) * between(random, 0.88, 1.14);
      const end = {
        x: clamp(
          current.x + Math.sin(angle) * length * controls.canopyWidth,
          -0.76,
          0.76,
        ),
        y: Math.min(0.82, current.y + Math.cos(angle) * length),
      };
      const width = Math.max(1.2, startWidth * (1 - progress * 0.78));
      addBranch(current, end, width, Math.max(0.85, width * 0.66), progress > 0.58 ? 0 : 1);

      if (segment === Math.max(1, segments - 2)) middlePoint = current;
      if (segment >= 1 && segment < segments - 1 && random() < 0.62) {
        const direction = random() > 0.5 ? 1 : -1;
        addTwig(
          end,
          angle + direction * between(random, 0.28, 0.52),
          totalLength * between(random, 0.24, 0.37),
          width * 0.48,
        );
      }
      current = end;
    }

    canopyAnchors.push(
      {
        point: current,
        radiusX: between(random, 0.17, 0.235) * controls.canopyWidth,
        radiusY: between(random, 0.145, 0.205),
        leafCount: Math.round(between(random, 430, 610)),
        phase: random() * Math.PI * 2,
      },
      {
        point: middlePoint,
        radiusX: between(random, 0.12, 0.17) * controls.canopyWidth,
        radiusY: between(random, 0.11, 0.16),
        leafCount: Math.round(between(random, 205, 295)),
        phase: random() * Math.PI * 2,
      },
    );
  }

  const sideBranchCount = Math.round(5 + (controls.branchDepth - 4) * 0.72);
  const sideBranchPairs = Math.ceil(sideBranchCount / 2);
  const firstBranchNode = Math.floor(trunkSteps * 0.38);
  let generatedSideBranches = 0;
  for (let pairIndex = 0; pairIndex < sideBranchPairs; pairIndex += 1) {
    const nodeRange = Math.max(1, trunkSteps - firstBranchNode - 1);
    const heightProgress = pairIndex / Math.max(1, sideBranchPairs - 1);
    const nodeIndex = Math.min(
      trunkSteps - 1,
      firstBranchNode + Math.round(heightProgress * nodeRange),
    );
    const baseAngle = between(
      random,
      0.62 + (1 - heightProgress) * 0.16,
      0.86 + (1 - heightProgress) * 0.2,
    );
    const baseLength = between(random, 0.4, 0.53) * (1 - heightProgress * 0.08);
    const baseWidth =
      between(random, 7.4, 10.8) * controls.trunkScale * (1 - heightProgress * 0.24);

    for (const side of [-1, 1] as const) {
      if (generatedSideBranches >= sideBranchCount) break;
      addMajorBranch(
        trunkNodes[nodeIndex],
        side * (baseAngle + between(random, -0.025, 0.025)),
        baseLength * between(random, 0.96, 1.04),
        baseWidth * between(random, 0.95, 1.05),
      );
      generatedSideBranches += 1;
    }
  }

  // Paired crown leaders keep the silhouette balanced without becoming a perfect mirror.
  const crownStart = trunkNodes[trunkNodes.length - 2];
  for (const crownAngle of [0.25, 0.64]) {
    const crownLength = between(random, 0.34, 0.46);
    const crownWidth = between(random, 5.2, 7.4) * controls.trunkScale;
    for (const side of [-1, 1] as const) {
      addMajorBranch(
        crownStart,
        side * (crownAngle + between(random, -0.025, 0.025)),
        crownLength * between(random, 0.96, 1.04),
        crownWidth * between(random, 0.95, 1.05),
      );
    }
  }

  // Broad core masses close the crown around the trunk and keep the visible trunk short.
  const coreX = crownStart.x;
  canopyAnchors.push(
    {
      point: { x: coreX + between(random, -0.025, 0.025), y: 0.42 },
      radiusX: 0.3 * controls.canopyWidth,
      radiusY: 0.24,
      leafCount: 1_150,
      phase: random() * Math.PI * 2,
    },
    {
      point: { x: coreX - 0.27 * controls.canopyWidth, y: 0.2 },
      radiusX: 0.3 * controls.canopyWidth,
      radiusY: 0.24,
      leafCount: 1_100,
      phase: random() * Math.PI * 2,
    },
    {
      point: { x: coreX + 0.27 * controls.canopyWidth, y: 0.2 },
      radiusX: 0.3 * controls.canopyWidth,
      radiusY: 0.24,
      leafCount: 1_100,
      phase: random() * Math.PI * 2,
    },
    {
      point: { x: coreX + between(random, -0.035, 0.035), y: -0.08 },
      radiusX: 0.36 * controls.canopyWidth,
      radiusY: 0.25,
      leafCount: 1_200,
      phase: random() * Math.PI * 2,
    },
  );

  function addLeafCluster(anchor: CanopyAnchor) {
    for (let index = 0; index < anchor.leafCount; index += 1) {
      const theta = random() * Math.PI * 2;
      const radius = Math.sqrt(random());
      const lobe =
        0.82 +
        Math.sin(theta * 3 + anchor.phase) * 0.11 +
        Math.sin(theta * 5 - anchor.phase * 0.73) * 0.07;
      const localX = Math.cos(theta) * radius * lobe;
      const localY = Math.sin(theta) * radius * lobe;
      const shade = localY + between(random, -0.22, 0.22);
      const layerDistance = radius * lobe + between(random, -0.055, 0.055);
      const sizePixels: TreeLeaf["sizePixels"] =
        shade > 0.5 && random() > 0.55
          ? 1
          : layerDistance < 0.62
            ? 3
            : layerDistance < 0.89
              ? 2
              : 1;
      const colorIndex =
        shade > 0.42
          ? random() > 0.36 ? 5 : 4
          : shade > 0.02
            ? random() > 0.48 ? 4 : 3
            : shade > -0.38
              ? random() > 0.5 ? 2 : 3
              : random() > 0.38 ? 1 : 0;

      leaves.push({
        x: clamp(anchor.point.x + localX * anchor.radiusX, -0.9, 0.9),
        y: clamp(anchor.point.y + localY * anchor.radiusY, -0.48, 0.9),
        sizePixels,
        colorIndex,
        phase: random() * Math.PI * 2,
      });
    }
  }

  for (const anchor of canopyAnchors) addLeafCluster(anchor);

  shuffle(leaves, random);
  if (leaves.length > 8_000) leaves.length = 8_000;

  const groundRandom = createSeededRandom(`${controls.seed}:ground-leaves`);
  const groundPileBaseY = groundY - 0.012;
  const groundPileHalfWidth = 0.56;
  const groundPileLayerHeight = 0.0068;
  const baseLeafCount = 104;

  // A nearly continuous bottom row makes every upper leaf read as supported by the ground.
  for (let index = 0; index < baseLeafCount; index += 1) {
    const progress = (index + between(groundRandom, 0.18, 0.82)) / baseLeafCount;
    const x = (progress * 2 - 1) * groundPileHalfWidth;
    const edgeDistance = Math.abs(x) / groundPileHalfWidth;
    const sizeRoll = groundRandom();
    const sizePixels: TreeLeaf["sizePixels"] = edgeDistance > 0.82
      ? sizeRoll > 0.58 ? 2 : 1
      : sizeRoll > 0.54 ? 3 : 2;

    groundLeaves.push({
      x,
      y: groundPileBaseY + between(groundRandom, -0.0009, 0.0009),
      sizePixels,
      colorIndex: Math.floor(groundRandom() * 4),
      phase: groundRandom() * Math.PI * 2,
    });
  }

  const groundHeaps = [
    { center: -0.23, halfWidth: 0.18, height: 2 },
    { center: -0.015, halfWidth: 0.24, height: 4 },
    { center: 0.24, halfWidth: 0.17, height: 3 },
  ] as const;

  // Compact overlapping heaps add height only where a base layer already exists.
  for (let index = baseLeafCount; index < 165; index += 1) {
    const heapRoll = groundRandom();
    const heap = heapRoll < 0.27
      ? groundHeaps[0]
      : heapRoll < 0.7
        ? groundHeaps[1]
        : groundHeaps[2];
    const localX = (groundRandom() + groundRandom() - 1) * heap.halfWidth;
    const normalizedDistance = Math.min(1, Math.abs(localX) / heap.halfWidth);
    const maximumLayer = Math.max(
      1,
      Math.floor((1 - normalizedDistance ** 1.35) * heap.height),
    );
    const layer = 1 + Math.floor(groundRandom() ** 1.45 * maximumLayer);
    const sizeRoll = groundRandom();
    const sizePixels: TreeLeaf["sizePixels"] = layer >= 3
      ? sizeRoll > 0.76 ? 2 : 1
      : sizeRoll > 0.68 ? 3 : 2;

    groundLeaves.push({
      x: heap.center + localX,
      y: groundPileBaseY
        + layer * groundPileLayerHeight
        + between(groundRandom, -0.0007, 0.0007),
      sizePixels,
      colorIndex: Math.min(5, Math.floor(groundRandom() * 4) + Math.min(2, layer)),
      phase: groundRandom() * Math.PI * 2,
    });
  }

  return { branches, leaves, groundLeaves, seed: controls.seed };
}

export function getActiveLeafCount(totalLeaves: number, density: number) {
  if (totalLeaves <= 0) return 0;
  const safeDensity = Math.max(0, Math.min(1, density));
  return Math.round(totalLeaves * safeDensity);
}
