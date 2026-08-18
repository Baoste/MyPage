import {
  resolvePixelScale,
  treePalettes,
  type TreeControls,
} from "@/components/private/tree/config";
import {
  getActiveLeafCount,
  type TreeModel,
} from "@/components/private/tree/generation";
import type { FallingLeaf } from "@/components/private/tree/particles";
import {
  branchFragmentShader,
  branchVertexShader,
  leafFragmentShader,
  leafVertexShader,
  postFragmentShader,
  postVertexShader,
} from "@/components/private/tree/shaders";

interface WindUniforms {
  resolution: WebGLUniformLocation;
  time: WebGLUniformLocation;
  windStrength: WebGLUniformLocation;
  windSpeed: WebGLUniformLocation;
  gustStrength: WebGLUniformLocation;
}

interface BranchUniforms extends WindUniforms {
  colors: WebGLUniformLocation;
}

interface LeafUniforms extends WindUniforms {
  colors: WebGLUniformLocation;
  leafSize: WebGLUniformLocation;
  attached: WebGLUniformLocation;
}

interface PostUniforms {
  scene: WebGLUniformLocation;
  backgroundTop: WebGLUniformLocation;
  backgroundBottom: WebGLUniformLocation;
}

function requireValue<T>(value: T | null, label: string): T {
  if (value === null) throw new Error(`Unable to create WebGL resource: ${label}.`);
  return value;
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
  label: string,
) {
  const shader = requireValue(gl.createShader(type), `${label} shader`);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader error";
    gl.deleteShader(shader);
    throw new Error(`${label} shader failed: ${message}`);
  }

  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
  label: string,
) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource, `${label} vertex`);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource, `${label} fragment`);
  const program = requireValue(gl.createProgram(), `${label} program`);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Unknown program error";
    gl.deleteProgram(program);
    throw new Error(`${label} program failed: ${message}`);
  }

  return program;
}

function uniform(gl: WebGL2RenderingContext, program: WebGLProgram, name: string) {
  return requireValue(gl.getUniformLocation(program, name), `uniform ${name}`);
}

function flattenColors(colors: readonly (readonly [number, number, number])[]) {
  const values = new Float32Array(colors.length * 3);
  colors.forEach((color, index) => values.set(color, index * 3));
  return values;
}

export class PixelTreeRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly branchProgram: WebGLProgram;
  private readonly leafProgram: WebGLProgram;
  private readonly postProgram: WebGLProgram;
  private readonly branchVao: WebGLVertexArrayObject;
  private readonly leafVao: WebGLVertexArrayObject;
  private readonly particleVao: WebGLVertexArrayObject;
  private readonly postVao: WebGLVertexArrayObject;
  private readonly branchVertexBuffer: WebGLBuffer;
  private readonly branchInstanceBuffer: WebGLBuffer;
  private readonly leafVertexBuffer: WebGLBuffer;
  private readonly leafInstanceBuffer: WebGLBuffer;
  private readonly particleInstanceBuffer: WebGLBuffer;
  private readonly postVertexBuffer: WebGLBuffer;
  private readonly branchUniforms: BranchUniforms;
  private readonly leafUniforms: LeafUniforms;
  private readonly postUniforms: PostUniforms;

  private tree: TreeModel = { branches: [], leaves: [], seed: "" };
  private controls: TreeControls;
  private branchCount = 0;
  private visibleLeafCount = 0;
  private particleCount = 0;
  private cachedActiveLeaves = -1;
  private cachedHiddenRevision = -1;
  private sceneFramebuffer: WebGLFramebuffer | null = null;
  private sceneTexture: WebGLTexture | null = null;
  private renderWidth = 1;
  private renderHeight = 1;
  private cssWidth = 1;
  private cssHeight = 1;
  private devicePixelRatio = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    controls: TreeControls,
  ) {
    this.controls = controls;
    this.gl = requireValue(
      canvas.getContext("webgl2", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        powerPreference: "high-performance",
      }),
      "WebGL2 context",
    );

    const gl = this.gl;
    this.branchProgram = createProgram(gl, branchVertexShader, branchFragmentShader, "branch");
    this.leafProgram = createProgram(gl, leafVertexShader, leafFragmentShader, "leaf");
    this.postProgram = createProgram(gl, postVertexShader, postFragmentShader, "post");

    this.branchVao = requireValue(gl.createVertexArray(), "branch VAO");
    this.leafVao = requireValue(gl.createVertexArray(), "leaf VAO");
    this.particleVao = requireValue(gl.createVertexArray(), "particle VAO");
    this.postVao = requireValue(gl.createVertexArray(), "post VAO");
    this.branchVertexBuffer = requireValue(gl.createBuffer(), "branch vertex buffer");
    this.branchInstanceBuffer = requireValue(gl.createBuffer(), "branch instance buffer");
    this.leafVertexBuffer = requireValue(gl.createBuffer(), "leaf vertex buffer");
    this.leafInstanceBuffer = requireValue(gl.createBuffer(), "leaf instance buffer");
    this.particleInstanceBuffer = requireValue(gl.createBuffer(), "particle instance buffer");
    this.postVertexBuffer = requireValue(gl.createBuffer(), "post vertex buffer");

    this.branchUniforms = {
      resolution: uniform(gl, this.branchProgram, "u_resolution"),
      time: uniform(gl, this.branchProgram, "u_time"),
      windStrength: uniform(gl, this.branchProgram, "u_windStrength"),
      windSpeed: uniform(gl, this.branchProgram, "u_windSpeed"),
      gustStrength: uniform(gl, this.branchProgram, "u_gustStrength"),
      colors: uniform(gl, this.branchProgram, "u_colors[0]"),
    };
    this.leafUniforms = {
      resolution: uniform(gl, this.leafProgram, "u_resolution"),
      time: uniform(gl, this.leafProgram, "u_time"),
      windStrength: uniform(gl, this.leafProgram, "u_windStrength"),
      windSpeed: uniform(gl, this.leafProgram, "u_windSpeed"),
      gustStrength: uniform(gl, this.leafProgram, "u_gustStrength"),
      colors: uniform(gl, this.leafProgram, "u_colors[0]"),
      leafSize: uniform(gl, this.leafProgram, "u_leafSize"),
      attached: uniform(gl, this.leafProgram, "u_attached"),
    };
    this.postUniforms = {
      scene: uniform(gl, this.postProgram, "u_scene"),
      backgroundTop: uniform(gl, this.postProgram, "u_backgroundTop"),
      backgroundBottom: uniform(gl, this.postProgram, "u_backgroundBottom"),
    };

    this.configureGeometry();
  }

  setTree(tree: TreeModel) {
    this.tree = tree;
    this.cachedActiveLeaves = -1;
    this.cachedHiddenRevision = -1;

    const branchData = new Float32Array(tree.branches.length * 7);
    tree.branches.forEach((branch, index) => {
      branchData.set(
        [
          branch.start.x,
          branch.start.y,
          branch.end.x,
          branch.end.y,
          branch.startWidth,
          branch.endWidth,
          branch.colorIndex,
        ],
        index * 7,
      );
    });

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.branchInstanceBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, branchData, this.gl.STATIC_DRAW);
    this.branchCount = tree.branches.length;
  }

  setControls(controls: TreeControls) {
    this.controls = controls;
  }

  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number) {
    const safeWidth = Math.max(1, Math.round(cssWidth));
    const safeHeight = Math.max(1, Math.round(cssHeight));
    const safeDpr = Math.max(1, Math.min(2, devicePixelRatio));
    const pixelScale = resolvePixelScale(this.controls.pixelScale, safeWidth);
    const canvasWidth = Math.max(1, Math.round(safeWidth * safeDpr));
    const canvasHeight = Math.max(1, Math.round(safeHeight * safeDpr));
    const renderWidth = Math.max(1, Math.floor(safeWidth / pixelScale));
    const renderHeight = Math.max(1, Math.floor(safeHeight / pixelScale));

    if (this.canvas.width !== canvasWidth) this.canvas.width = canvasWidth;
    if (this.canvas.height !== canvasHeight) this.canvas.height = canvasHeight;

    this.cssWidth = safeWidth;
    this.cssHeight = safeHeight;
    this.devicePixelRatio = safeDpr;

    if (renderWidth === this.renderWidth && renderHeight === this.renderHeight) return;
    this.renderWidth = renderWidth;
    this.renderHeight = renderHeight;
    this.createSceneTarget();
  }

  refreshPixelScale() {
    this.resize(this.cssWidth, this.cssHeight, this.devicePixelRatio);
  }

  getActiveLeafCount(density: number) {
    return getActiveLeafCount(this.tree.leaves.length, density);
  }

  render(
    elapsedSeconds: number,
    density: number,
    particles: readonly FallingLeaf[],
    hiddenLeaves: ReadonlySet<number>,
    hiddenRevision: number,
  ) {
    if (!this.sceneFramebuffer || !this.sceneTexture || this.gl.isContextLost()) return;

    const activeLeafCount = this.getActiveLeafCount(density);
    this.updateVisibleLeaves(activeLeafCount, hiddenLeaves, hiddenRevision);
    this.updateParticles(particles);

    const gl = this.gl;
    const palette = treePalettes[this.controls.palette];
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFramebuffer);
    gl.viewport(0, 0, this.renderWidth, this.renderHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this.branchProgram);
    this.applyWindUniforms(this.branchUniforms, elapsedSeconds);
    gl.uniform3fv(this.branchUniforms.colors, flattenColors(palette.trunks));
    gl.bindVertexArray(this.branchVao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.branchCount);

    gl.useProgram(this.leafProgram);
    this.applyWindUniforms(this.leafUniforms, elapsedSeconds);
    gl.uniform3fv(this.leafUniforms.colors, flattenColors(palette.leaves));
    gl.uniform1f(this.leafUniforms.leafSize, this.controls.leafSize);
    gl.uniform1i(this.leafUniforms.attached, 1);
    gl.bindVertexArray(this.leafVao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.visibleLeafCount);

    gl.uniform1i(this.leafUniforms.attached, 0);
    gl.bindVertexArray(this.particleVao);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.particleCount);

    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.postProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTexture);
    gl.uniform1i(this.postUniforms.scene, 0);
    gl.uniform3fv(this.postUniforms.backgroundTop, palette.backgroundTop);
    gl.uniform3fv(this.postUniforms.backgroundBottom, palette.backgroundBottom);
    gl.bindVertexArray(this.postVao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  dispose() {
    const gl = this.gl;
    if (gl.isContextLost()) return;
    if (this.sceneFramebuffer) gl.deleteFramebuffer(this.sceneFramebuffer);
    if (this.sceneTexture) gl.deleteTexture(this.sceneTexture);
    gl.deleteBuffer(this.branchVertexBuffer);
    gl.deleteBuffer(this.branchInstanceBuffer);
    gl.deleteBuffer(this.leafVertexBuffer);
    gl.deleteBuffer(this.leafInstanceBuffer);
    gl.deleteBuffer(this.particleInstanceBuffer);
    gl.deleteBuffer(this.postVertexBuffer);
    gl.deleteVertexArray(this.branchVao);
    gl.deleteVertexArray(this.leafVao);
    gl.deleteVertexArray(this.particleVao);
    gl.deleteVertexArray(this.postVao);
    gl.deleteProgram(this.branchProgram);
    gl.deleteProgram(this.leafProgram);
    gl.deleteProgram(this.postProgram);
  }

  private configureGeometry() {
    const gl = this.gl;
    const branchVertices = new Float32Array([
      0, -1, 1, -1, 1, 1,
      0, -1, 1, 1, 0, 1,
    ]);
    const leafVertices = new Float32Array([
      -0.5, -0.5, 0.5, -0.5, 0.5, 0.5,
      -0.5, -0.5, 0.5, 0.5, -0.5, 0.5,
    ]);
    const postVertices = new Float32Array([
      -1, -1, 1, -1, 1, 1,
      -1, -1, 1, 1, -1, 1,
    ]);

    gl.bindVertexArray(this.branchVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.branchVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, branchVertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.branchInstanceBuffer);
    this.configureInstanceAttribute(1, 2, 7, 0);
    this.configureInstanceAttribute(2, 2, 7, 2);
    this.configureInstanceAttribute(3, 2, 7, 4);
    this.configureInstanceAttribute(4, 1, 7, 6);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.leafVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, leafVertices, gl.STATIC_DRAW);
    this.configureLeafVao(this.leafVao, this.leafInstanceBuffer);
    this.configureLeafVao(this.particleVao, this.particleInstanceBuffer);

    gl.bindVertexArray(this.postVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.postVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, postVertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  private configureLeafVao(vao: WebGLVertexArrayObject, instanceBuffer: WebGLBuffer) {
    const gl = this.gl;
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.leafVertexBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    this.configureInstanceAttribute(1, 2, 5, 0);
    this.configureInstanceAttribute(2, 3, 5, 2);
  }

  private configureInstanceAttribute(
    location: number,
    size: number,
    strideFloats: number,
    offsetFloats: number,
  ) {
    const gl = this.gl;
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(
      location,
      size,
      gl.FLOAT,
      false,
      strideFloats * Float32Array.BYTES_PER_ELEMENT,
      offsetFloats * Float32Array.BYTES_PER_ELEMENT,
    );
    gl.vertexAttribDivisor(location, 1);
  }

  private createSceneTarget() {
    const gl = this.gl;
    if (this.sceneFramebuffer) gl.deleteFramebuffer(this.sceneFramebuffer);
    if (this.sceneTexture) gl.deleteTexture(this.sceneTexture);

    const texture = requireValue(gl.createTexture(), "scene texture");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.renderWidth,
      this.renderHeight,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );

    const framebuffer = requireValue(gl.createFramebuffer(), "scene framebuffer");
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(texture);
      throw new Error("The pixel-tree framebuffer is incomplete.");
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.sceneTexture = texture;
    this.sceneFramebuffer = framebuffer;
  }

  private updateVisibleLeaves(
    activeLeafCount: number,
    hiddenLeaves: ReadonlySet<number>,
    hiddenRevision: number,
  ) {
    if (
      activeLeafCount === this.cachedActiveLeaves &&
      hiddenRevision === this.cachedHiddenRevision
    ) {
      return;
    }

    const values: number[] = [];
    for (let index = 0; index < activeLeafCount; index += 1) {
      if (hiddenLeaves.has(index)) continue;
      const leaf = this.tree.leaves[index];
      values.push(leaf.x, leaf.y, leaf.sizeVariation, leaf.colorIndex, leaf.phase);
    }

    const data = new Float32Array(values);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.leafInstanceBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.DYNAMIC_DRAW);
    this.visibleLeafCount = data.length / 5;
    this.cachedActiveLeaves = activeLeafCount;
    this.cachedHiddenRevision = hiddenRevision;
  }

  private updateParticles(particles: readonly FallingLeaf[]) {
    const data = new Float32Array(particles.length * 5);
    particles.forEach((particle, index) => {
      data.set(
        [
          particle.x,
          particle.y,
          particle.sizeVariation,
          particle.colorIndex,
          particle.phase,
        ],
        index * 5,
      );
    });
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particleInstanceBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.DYNAMIC_DRAW);
    this.particleCount = particles.length;
  }

  private applyWindUniforms(uniforms: WindUniforms, elapsedSeconds: number) {
    const gl = this.gl;
    gl.uniform2f(uniforms.resolution, this.renderWidth, this.renderHeight);
    gl.uniform1f(uniforms.time, elapsedSeconds);
    gl.uniform1f(uniforms.windStrength, this.controls.windStrength);
    gl.uniform1f(uniforms.windSpeed, this.controls.windSpeed);
    gl.uniform1f(uniforms.gustStrength, this.controls.gustStrength);
  }
}
