// scripts/turtlemod-script.ts
// Core TurtleMod engine + blocks + base sprite class (TypeScript)

//
// Utility: simple event emitter
//
class TM_EventBus {
  private listeners: Record<string, Array<(...args: any[]) => void>> = {};

  on(event: string, handler: (...args: any[]) => void): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  emit(event: string, ...args: any[]): void {
    const list = this.listeners[event];
    if (!list) return;
    for (const handler of list) {
      try {
        handler(...args);
      } catch (e) {
        console.error("[TurtleMod] Event handler error:", e);
      }
    }
  }
}

//
// Types for config and project
//
export interface TMEngineConfig {
  logLevel?: "debug" | "info" | "warn" | "error";
  enableWarnings?: boolean;
  enableDebugTools?: boolean;
}

export interface TMRuntimeConfig {
  frameRate?: number;
  maxSprites?: number;
  safeMode?: boolean;
}

export interface TMTMConfig {
  strictMode?: boolean;
  allowDynamicSprites?: boolean;
  defaultSpriteSettings?: {
    rotationStyle?: "all-around" | "left-right" | "don’t-rotate";
    visible?: boolean;
    draggable?: boolean;
  };
  engine?: TMEngineConfig;
  runtime?: TMRuntimeConfig;
  otherstuff?: {
    entryjsonfile?: string;
    project?: string;
    include?: string[];
    exclude?: string[];
  };
}

export interface TMProjectData {
  tmconfig?: TMTMConfig;
  [key: string]: any;
}

export interface TMCostume {
  name: string;
  svgPath: string;
}

//
// Global runtime state (per engine instance)
//
class TM_Runtime {
  public config: TMTMConfig;
  public sprites: TM_Sprite[] = [];
  public stage: {
    width: number;
    height: number;
    background: string | null;
  };
  public eventBus: TM_EventBus;
  public variables: Record<string, any> = {};
  public lists: Record<string, any[]> = {};
  public running: boolean = false;

  constructor(config?: TMTMConfig) {
    this.config = config || {};
    this.stage = {
      width: 480,
      height: 360,
      background: null
    };
    this.eventBus = new TM_EventBus();
  }

  addSprite(sprite: TM_Sprite): void {
    this.sprites.push(sprite);
    sprite.__runtime = this;
  }

  broadcast(message: string): void {
    this.eventBus.emit("broadcast:" + message);
  }

  whenBroadcast(message: string, handler: () => void): void {
    this.eventBus.on("broadcast:" + message, handler);
  }

  whenFlagClicked(handler: () => void): void {
    this.eventBus.on("flagClicked", handler);
  }

  triggerFlagClicked(): void {
    this.eventBus.emit("flagClicked");
  }

  setVariable(name: string, value: any): void {
    this.variables[name] = value;
  }

  getVariable(name: string): any {
    return this.variables[name];
  }

  ensureList(name: string): any[] {
    if (!this.lists[name]) this.lists[name] = [];
    return this.lists[name];
  }

  log(level: "debug" | "info" | "warn" | "error", ...msg: any[]): void {
    const allowed: Array<"debug" | "info" | "warn" | "error"> = [
      "debug",
      "info",
      "warn",
      "error"
    ];
    if (!allowed.includes(level)) level = "info";

    const engineLevel =
      this.config.engine?.logLevel ||
      (this.config.engine as any)?.loglevel ||
      "warn";
    const engineIndex = allowed.indexOf(engineLevel);
    const msgIndex = allowed.indexOf(level);

    if (msgIndex >= engineIndex) {
      console[level]("[TurtleMod]", ...msg);
    }
  }
}

//
// Base Sprite class: ALL blocks live here
//
export class TM_Sprite {
  // Core state
  public x: number = 0;
  public y: number = 0;
  public direction: number = 90; // Scratch-style: 90 = right
  public visible: boolean = true;
  public size: number = 100;
  public costumes: TMCostume[] = [];
  public currentCostumeIndex: number = 0;
  public sayBubble: string | null = null;
  public thinkBubble: string | null = null;
  public draggable: boolean = false;

  // Internal
  public __runtime: TM_Runtime | null = null;
  protected __eventsRegistered: boolean = false;

  constructor() {}

  //
  // --- Motion blocks ---
  //

  move(steps: number): void {
    const radians = (this.direction - 90) * (Math.PI / 180);
    this.x += Math.cos(radians) * steps;
    this.y += Math.sin(radians) * steps;
  }

  turnRight(deg: number): void {
    this.direction = (this.direction + deg) % 360;
  }

  turnLeft(deg: number): void {
    this.direction = (this.direction - deg) % 360;
  }

  goTo(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  goToSprite(otherSprite: TM_Sprite | null): void {
    if (!otherSprite) return;
    this.x = otherSprite.x;
    this.y = otherSprite.y;
  }

  glide(seconds: number, x: number, y: number): void {
    const startX = this.x;
    const startY = this.y;
    const dx = x - startX;
    const dy = y - startY;
    const startTime = performance.now();
    const duration = seconds * 1000;

    const step = () => {
      const now = performance.now();
      const t = Math.min(1, (now - startTime) / duration);
      this.x = startX + dx * t;
      this.y = startY + dy * t;
      if (t < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }

  pointInDirection(deg: number): void {
    this.direction = deg % 360;
  }

  pointTowards(x: number, y: number): void {
    const dx = x - this.x;
    const dy = y - this.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    this.direction = angle;
  }

  //
  // --- Looks blocks ---
  //

  say(message: any, duration: number | null = null): void {
    this.sayBubble = String(message);
    if (duration !== null) {
      setTimeout(() => {
        this.sayBubble = null;
      }, duration * 1000);
    }
  }

  think(message: any, duration: number | null = null): void {
    this.thinkBubble = String(message);
    if (duration !== null) {
      setTimeout(() => {
        this.thinkBubble = null;
      }, duration * 1000);
    }
  }

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  changeSizeBy(amount: number): void {
    this.size += amount;
  }

  setSizeTo(percent: number): void {
    this.size = percent;
  }

  addCostume(name: string, svgPath: string): void {
    this.costumes.push({ name, svgPath });
  }

  switchCostume(nameOrIndex: string | number): void {
    if (typeof nameOrIndex === "number") {
      if (this.costumes[nameOrIndex]) {
        this.currentCostumeIndex = nameOrIndex;
      }
      return;
    }
    const index = this.costumes.findIndex(c => c.name === nameOrIndex);
    if (index !== -1) {
      this.currentCostumeIndex = index;
    }
  }

  nextCostume(): void {
    if (this.costumes.length === 0) return;
    this.currentCostumeIndex =
      (this.currentCostumeIndex + 1) % this.costumes.length;
  }

  //
  // --- Control blocks ---
  //

  wait(seconds: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, seconds * 1000);
    });
  }

  async repeat(times: number, fn: () => Promise<void> | void): Promise<void> {
    for (let i = 0; i < times; i++) {
      await fn();
    }
  }

  async forever(fn: () => Promise<void> | void): Promise<void> {
    // Cooperative loop; user code must yield via await
    while (true) {
      await fn();
    }
  }

  //
  // --- Events (per-sprite) ---
  //

  whenFlagClicked(handler: () => void): void {
    if (!this.__runtime) return;
    this.__runtime.whenFlagClicked(() => handler.call(this));
  }

  whenBroadcastReceived(message: string, handler: () => void): void {
    if (!this.__runtime) return;
    this.__runtime.whenBroadcast(message, () => handler.call(this));
  }

  broadcast(message: string): void {
    if (!this.__runtime) return;
    this.__runtime.broadcast(message);
  }

  //
  // --- Sensing blocks ---
  //

  touchingSprite(otherSprite: TM_Sprite | null): boolean {
    if (!otherSprite) return false;
    const dx = this.x - otherSprite.x;
    const dy = this.y - otherSprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < 10; // simple radius
  }

  distanceToSprite(otherSprite: TM_Sprite | null): number {
    if (!otherSprite) return Infinity;
    const dx = this.x - otherSprite.x;
    const dy = this.y - otherSprite.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  //
  // --- Operators (helpers) ---
  //

  opRandom(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  opJoin(a: any, b: any): string {
    return String(a) + String(b);
  }

  opLetterOf(n: number, text: any): string {
    const s = String(text);
    const i = n - 1;
    if (i < 0 || i >= s.length) return "";
    return s[i];
  }

  opLengthOf(text: any): number {
    return String(text).length;
  }

  opContains(text: any, sub: any): boolean {
    return String(text).includes(String(sub));
  }

  //
  // --- Variables & Lists (via runtime) ---
  //

  setVariable(name: string, value: any): void {
    if (!this.__runtime) return;
    this.__runtime.setVariable(name, value);
  }

  changeVariableBy(name: string, amount: number): void {
    if (!this.__runtime) return;
    const current = Number(this.__runtime.getVariable(name) ?? 0);
    this.__runtime.setVariable(name, current + amount);
  }

  getVariable(name: string): any {
    if (!this.__runtime) return undefined;
    return this.__runtime.getVariable(name);
  }

  getList(name: string): any[] {
    if (!this.__runtime) return [];
    return this.__runtime.ensureList(name);
  }

  listAdd(name: string, value: any): void {
    const list = this.getList(name);
    list.push(value);
  }

  listDelete(name: string, index: number | "all"): void {
    const list = this.getList(name);
    if (index === "all") {
      list.length = 0;
      return;
    }
    const i = index - 1;
    if (i >= 0 && i < list.length) {
      list.splice(i, 1);
    }
  }

  listInsertAt(name: string, index: number, value: any): void {
    const list = this.getList(name);
    const i = index - 1;
    if (i < 0 || i > list.length) return;
    list.splice(i, 0, value);
  }

  listReplaceItem(name: string, index: number, value: any): void {
    const list = this.getList(name);
    const i = index - 1;
    if (i < 0 || i >= list.length) return;
    list[i] = value;
  }

  listItem(name: string, index: number): any {
    const list = this.getList(name);
    const i = index - 1;
    if (i < 0 || i >= list.length) return "";
    return list[i];
  }

  listLength(name: string): number {
    const list = this.getList(name);
    return list.length;
  }

  listContains(name: string, value: any): boolean {
    const list = this.getList(name);
    return list.includes(value);
  }

  //
  // --- Lifecycle ---
  //

  // User overrides this in sprite classes
  update(): void {
    // Called every frame by the engine
  }
}

//
// TurtleMod engine core
//
export class TurtleMod {
  public project: TMProjectData;
  public tmconfig: TMTMConfig;
  public runtime: TM_Runtime;
  private started: boolean = false;

  constructor(projectData: TMProjectData) {
    this.project = projectData || {};
    this.tmconfig = projectData.tmconfig || {};
    this.runtime = new TM_Runtime(this.tmconfig);
  }

  registerSprite(name: string, SpriteClass: new () => TM_Sprite): TM_Sprite {
    const sprite = new SpriteClass();
    sprite.__runtime = this.runtime;
    this.runtime.addSprite(sprite);
    this.runtime.log("debug", `Sprite registered: ${name}`);
    return sprite;
  }

  start(): void {
    if (this.started) return;
    this.started = true;

    this.runtime.log("info", "TurtleMod engine started");

    // Trigger green flag events
    this.runtime.triggerFlagClicked();

    const fps = this.tmconfig.runtime?.frameRate ?? 60;
    const interval = 1000 / fps;

    this.runtime.running = true;

    setInterval(() => {
      if (!this.runtime.running) return;
      for (const sprite of this.runtime.sprites) {
        try {
          sprite.update();
        } catch (e) {
          this.runtime.log("error", "Sprite update error:", e);
        }
      }
    }, interval);
  }

  stop(): void {
    this.runtime.running = false;
    this.runtime.log("info", "TurtleMod engine stopped");
  }
}

//
// Global loader used by index.ts or the project system
//
export function loadProject(projectData: TMProjectData): TurtleMod {
  const engine = new TurtleMod(projectData);
  return engine;
}

//
// Convenience exports for user code
//
export function whenFlagClicked(sprite: TM_Sprite, handler: () => void): void {
  if (!sprite.__runtime) return;
  sprite.__runtime.whenFlagClicked(() => handler.call(sprite));
}

export function whenBroadcastReceived(
  sprite: TM_Sprite,
  message: string,
  handler: () => void
): void {
  if (!sprite.__runtime) return;
  sprite.__runtime.whenBroadcast(message, () => handler.call(sprite));
}

export function broadcast(
  spriteOrRuntime: TM_Sprite | TM_Runtime | null,
  message: string
): void {
  if (!spriteOrRuntime) return;
  if (spriteOrRuntime instanceof TM_Sprite) {
    if (!spriteOrRuntime.__runtime) return;
    spriteOrRuntime.__runtime.broadcast(message);
  } else {
    spriteOrRuntime.broadcast(message);
  }
}
