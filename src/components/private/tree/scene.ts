import {
  getTreeDensity,
  type TreeControls,
} from "@/components/private/tree/config";
import { generateTree, type TreeModel } from "@/components/private/tree/generation";
import { FallingLeafSystem } from "@/components/private/tree/particles";
import { PixelTreeRenderer } from "@/components/private/tree/renderer";

export class PixelTreeScene {
  private readonly renderer: PixelTreeRenderer;
  private readonly particles: FallingLeafSystem;
  private tree: TreeModel;
  private controls: TreeControls;
  private currentDensity: number;
  private animationFrame: number | null = null;
  private previousTimestamp = 0;
  private elapsedSeconds = 0;
  private isVisible = true;
  private isDisposed = false;

  constructor(
    canvas: HTMLCanvasElement,
    controls: TreeControls,
    private readonly vitality: number,
  ) {
    this.controls = controls;
    this.currentDensity = getTreeDensity(controls, vitality);
    this.tree = generateTree(controls);
    this.particles = new FallingLeafSystem(controls.seed);
    this.renderer = new PixelTreeRenderer(canvas, controls);
    this.renderer.setTree(this.tree);
  }

  resize(width: number, height: number, devicePixelRatio: number) {
    this.renderer.resize(width, height, devicePixelRatio);
    if (this.controls.isPaused) this.renderOnce();
  }

  setControls(controls: TreeControls) {
    const wasPaused = this.controls.isPaused;
    const pixelScaleChanged = this.controls.pixelScale !== controls.pixelScale;
    this.controls = controls;
    this.renderer.setControls(controls);

    if (pixelScaleChanged) this.renderer.refreshPixelScale();

    if (controls.isPaused) {
      this.stop();
      this.currentDensity = getTreeDensity(controls, this.vitality);
      this.renderOnce();
    } else if (wasPaused) {
      this.start();
    }
  }

  regenerate(controls: TreeControls) {
    this.controls = controls;
    this.renderer.setControls(controls);
    this.tree = generateTree(controls);
    this.particles.reset(controls.seed);
    this.renderer.setTree(this.tree);
    this.currentDensity = getTreeDensity(controls, this.vitality);
    if (controls.isPaused) this.renderOnce();
  }

  setVisible(isVisible: boolean) {
    this.isVisible = isVisible;
    if (isVisible) this.start();
    else this.stop();
  }

  start() {
    if (
      this.animationFrame !== null ||
      this.controls.isPaused ||
      !this.isVisible ||
      this.isDisposed
    ) {
      return;
    }
    this.previousTimestamp = 0;
    this.animationFrame = window.requestAnimationFrame(this.tick);
  }

  stop() {
    if (this.animationFrame !== null) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.previousTimestamp = 0;
  }

  dispose() {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.stop();
    this.particles.reset(this.controls.seed);
    this.renderer.dispose();
  }

  private readonly tick = (timestamp: number) => {
    this.animationFrame = null;
    if (this.isDisposed || this.controls.isPaused || !this.isVisible) return;

    const deltaSeconds =
      this.previousTimestamp === 0 ? 0 : Math.min(0.05, (timestamp - this.previousTimestamp) / 1_000);
    this.previousTimestamp = timestamp;
    this.elapsedSeconds += deltaSeconds;

    const targetDensity = getTreeDensity(this.controls, this.vitality);
    const smoothing = 1 - Math.exp(-deltaSeconds / 0.72);
    this.currentDensity += (targetDensity - this.currentDensity) * smoothing;
    const activeLeafCount = this.renderer.getActiveLeafCount(this.currentDensity);

    this.particles.update(
      deltaSeconds,
      this.elapsedSeconds,
      activeLeafCount,
      this.tree,
      this.controls,
      this.currentDensity,
    );
    this.renderOnce();
    this.animationFrame = window.requestAnimationFrame(this.tick);
  };

  private renderOnce() {
    this.renderer.render(
      this.elapsedSeconds,
      this.currentDensity,
      this.particles.particles,
      this.particles.hiddenLeaves,
      this.particles.hiddenRevision,
    );
  }
}
