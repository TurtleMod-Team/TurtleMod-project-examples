// TurtleMod Functional Engine — NO CLASSES, ONLY FUNCTIONS + PLAIN OBJECTS

//
// Types
//
export type StopType = "all" | "this" | "others";

export interface TMProjectData {
  tmconfig?: any;
  [key: string]: any;
}

export interface TMSprite {
  x: number;
  y: number;
  direction: number;
  visible: boolean;
  size: number;
  sayBubble: string | null;
  thinkBubble: string | null;
  costumes: { name: string; svgPath: string }[];
  currentCostumeIndex: number;
  draggable: boolean;
  __runtime: TMRuntime | null;
  __stopped: boolean;
}

export interface TMRuntime {
  config: any;
  sprites: TMSprite[];
  stage: { width: number; height: number; background: string | null };
  eventBus: Record<string, ((...args: any[]) => void)[]>;
  variables: Record<string, any>;
  lists: Record<string, any[]>;
  running: boolean;
}

//
// GLOBAL STATE
//
let __runtime: TMRuntime | null = null;
let __currentSprite: TMSprite | null = null;

//
// Event Bus (functional)
//
function createEventBus() {
  return {};
}

function onEvent(bus: any, event: string, handler: (...args: any[]) => void) {
  if (!bus[event]) bus[event] = [];
  bus[event].push(handler);
}

function emitEvent(bus: any, event: string, ...args: any[]) {
  const list = bus[event];
  if (!list) return;
  for (const fn of list) fn(...args);
}

//
// Sprite Factory (plain object)
//
function createSprite(): TMSprite {
  return {
    x: 0,
    y: 0,
    direction: 90,
    visible: true,
    size: 100,
    sayBubble: null,
    thinkBubble: null,
    costumes: [],
    currentCostumeIndex: 0,
    draggable: false,
    __runtime: null,
    __stopped: false
  };
}

//
// Runtime Factory (plain object)
//
function createRuntime(config: any): TMRuntime {
  return {
    config,
    sprites: [],
    stage: { width: 480, height: 360, background: null },
    eventBus: createEventBus(),
    variables: {},
    lists: {},
    running: false
  };
}

//
// ENGINE FUNCTIONS
//

export function loadProject(projectData: TMProjectData) {
  __runtime = createRuntime(projectData.tmconfig || {});
  __runtime.running = true;

  // Start update loop
  const fps = projectData.tmconfig?.runtime?.frameRate ?? 60;
  const interval = 1000 / fps;

  setInterval(() => {
    if (!__runtime || !__runtime.running) return;
    for (const sprite of __runtime.sprites) {
      if (!sprite.__stopped) {
        // No update() function anymore — functional engine
      }
    }
  }, interval);

  // Trigger green flag
  emitEvent(__runtime.eventBus, "flagClicked");
}

//
// Sprite Registration
//
export function registerSprite(script: () => void): TMSprite {
  if (!__runtime) throw new Error("Engine not loaded");

  const sprite = createSprite();
  sprite.__runtime = __runtime;

  __runtime.sprites.push(sprite);

  // Run script with this sprite as current
  const prev = __currentSprite;
  __currentSprite = sprite;
  script();
  __currentSprite = prev;

  return sprite;
}

//
// EVENT API
//
export function whenFlagClicked(handler: () => void) {
  if (!__runtime || !__currentSprite) return;
  onEvent(__runtime.eventBus, "flagClicked", () => {
    const prev = __currentSprite;
    __currentSprite = __currentSprite;
    handler();
    __currentSprite = prev;
  });
}

export function whenBroadcastReceived(message: string, handler: () => void) {
  if (!__runtime || !__currentSprite) return;
  onEvent(__runtime.eventBus, "broadcast:" + message, () => {
    const prev = __currentSprite;
    __currentSprite = __currentSprite;
    handler();
    __currentSprite = prev;
  });
}

export function broadcast(message: string) {
  if (!__runtime) return;
  emitEvent(__runtime.eventBus, "broadcast:" + message);
}

//
// BLOCK FUNCTIONS (functional Scratch-like API)
//

function ensureSprite() {
  if (!__currentSprite) throw new Error("No active sprite");
  return __currentSprite;
}

export function say(msg: any, duration?: number) {
  const s = ensureSprite();
  s.sayBubble = String(msg);
  if (duration) setTimeout(() => (s.sayBubble = null), duration * 1000);
}

export function think(msg: any, duration?: number) {
  const s = ensureSprite();
  s.thinkBubble = String(msg);
  if (duration) setTimeout(() => (s.thinkBubble = null), duration * 1000);
}

export function move(steps: number) {
  const s = ensureSprite();
  const rad = (s.direction - 90) * (Math.PI / 180);
  s.x += Math.cos(rad) * steps;
  s.y += Math.sin(rad) * steps;
}

export function turnRight(deg: number) {
  const s = ensureSprite();
  s.direction = (s.direction + deg) % 360;
}

export function turnLeft(deg: number) {
  const s = ensureSprite();
  s.direction = (s.direction - deg) % 360;
}

export function goTo(x: number, y: number) {
  const s = ensureSprite();
  s.x = x;
  s.y = y;
}

export function show() {
  ensureSprite().visible = true;
}

export function hide() {
  ensureSprite().visible = false;
}

//
// STOP FUNCTION
//
export function stop(type: StopType) {
  if (!__runtime) return;

  if (type === "all") {
    __runtime.running = false;
    return;
  }

  const s = ensureSprite();

  if (type === "this") {
    s.__stopped = true;
    return;
  }

  if (type === "others") {
    for (const sp of __runtime.sprites) {
      if (sp !== s) sp.__stopped = true;
    }
  }
}

//
// VARIABLES
//
export function setVariable(name: string, value: any) {
  if (!__runtime) return;
  __runtime.variables[name] = value;
}

export function getVariable(name: string) {
  if (!__runtime) return undefined;
  return __runtime.variables[name];
}

//
// LISTS
//
export function listAdd(name: string, value: any) {
  if (!__runtime) return;
  if (!__runtime.lists[name]) __runtime.lists[name] = [];
  __runtime.lists[name].push(value);
}

export function listLength(name: string) {
  if (!__runtime) return 0;
  return (__runtime.lists[name] || []).length;
}
