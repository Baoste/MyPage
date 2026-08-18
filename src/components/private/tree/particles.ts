import type { TreeControls } from "@/components/private/tree/config";
import {
  createSeededRandom,
  type RandomSource,
  type TreeModel,
} from "@/components/private/tree/generation";

export interface FallingLeaf {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  sizeVariation: number;
  colorIndex: number;
  phase: number;
  age: number;
  lifetime: number;
  sourceIndex: number | null;
  landed: boolean;
}

const GROUND_Y = -0.865;
const MAX_AIRBORNE_LEAVES = 160;
const MAX_GROUND_LEAVES = 220;

export class FallingLeafSystem {
  readonly hiddenLeaves = new Set<number>();
  readonly particles: FallingLeaf[] = [];

  hiddenRevision = 0;
  private random: RandomSource;
  private spawnAccumulator = 0;

  constructor(seed: string) {
    this.random = createSeededRandom(`${seed}:falling-leaves`);
  }

  reset(seed: string) {
    this.hiddenLeaves.clear();
    this.particles.length = 0;
    this.random = createSeededRandom(`${seed}:falling-leaves`);
    this.spawnAccumulator = 0;
    this.hiddenRevision += 1;
  }

  update(
    deltaSeconds: number,
    elapsedSeconds: number,
    activeLeafCount: number,
    tree: TreeModel,
    controls: TreeControls,
    density: number,
  ) {
    const safeDelta = Math.min(0.05, Math.max(0, deltaSeconds));
    const spawnRate = controls.fallRate * (0.55 + density * 3.5);
    this.spawnAccumulator += safeDelta * spawnRate;

    while (this.spawnAccumulator >= 1) {
      this.spawnAccumulator -= 1;
      this.spawn(activeLeafCount, tree, controls, elapsedSeconds);
    }

    const gravity = 0.032 * controls.gravity;
    const baseWind = controls.windStrength * 0.014;

    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.age += safeDelta;

      if (!particle.landed) {
        const flutter =
          Math.sin(elapsedSeconds * (1.1 + controls.windSpeed) + particle.phase) *
          0.013 *
          controls.drift;
        const gust =
          Math.sin(elapsedSeconds * 0.41 + particle.phase * 0.37) *
          controls.gustStrength *
          0.008;
        particle.velocityX += (baseWind + flutter + gust) * safeDelta;
        particle.velocityX *= Math.pow(0.94, safeDelta * 60);
        particle.velocityY -= gravity * safeDelta;
        particle.x += particle.velocityX * safeDelta;
        particle.y += particle.velocityY * safeDelta;

        if (particle.y <= GROUND_Y) {
          particle.y = GROUND_Y + this.random() * 0.012;
          particle.velocityX = 0;
          particle.velocityY = 0;
          particle.landed = true;
          particle.lifetime = particle.age + 12 + this.random() * 18;
          this.releaseSource(particle);
        }
      }

      if (
        particle.age >= particle.lifetime ||
        particle.x < -1.15 ||
        particle.x > 1.15
      ) {
        this.releaseSource(particle);
        this.particles.splice(index, 1);
      }
    }

    this.trimGroundLeaves();
  }

  private spawn(
    activeLeafCount: number,
    tree: TreeModel,
    controls: TreeControls,
    elapsedSeconds: number,
  ) {
    if (activeLeafCount <= 0 || this.airborneCount() >= MAX_AIRBORNE_LEAVES) return;

    let sourceIndex = -1;
    for (let attempt = 0; attempt < 14; attempt += 1) {
      const candidate = Math.floor(this.random() * activeLeafCount);
      if (!this.hiddenLeaves.has(candidate)) {
        sourceIndex = candidate;
        break;
      }
    }
    if (sourceIndex < 0) return;

    const source = tree.leaves[sourceIndex];
    const height = Math.max(0, Math.min(1, (source.y + 0.82) / 1.72));
    const sway =
      Math.sin(elapsedSeconds * controls.windSpeed + source.y * 2.1 + source.x * 3.7) *
      controls.windStrength *
      0.055 *
      height *
      height;

    this.hiddenLeaves.add(sourceIndex);
    this.hiddenRevision += 1;
    this.particles.push({
      x: source.x + sway,
      y: source.y,
      velocityX: (this.random() - 0.35) * 0.035 + controls.windStrength * 0.012,
      velocityY: -0.012 - this.random() * 0.018,
      sizeVariation: source.sizeVariation,
      colorIndex: source.colorIndex,
      phase: source.phase,
      age: 0,
      lifetime: 10 + this.random() * 10,
      sourceIndex,
      landed: false,
    });
  }

  private releaseSource(particle: FallingLeaf) {
    if (particle.sourceIndex === null) return;
    if (this.hiddenLeaves.delete(particle.sourceIndex)) this.hiddenRevision += 1;
    particle.sourceIndex = null;
  }

  private airborneCount() {
    let count = 0;
    for (const particle of this.particles) {
      if (!particle.landed) count += 1;
    }
    return count;
  }

  private trimGroundLeaves() {
    let groundCount = 0;
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      if (!this.particles[index].landed) continue;
      groundCount += 1;
      if (groundCount > MAX_GROUND_LEAVES) this.particles.splice(index, 1);
    }
  }
}
