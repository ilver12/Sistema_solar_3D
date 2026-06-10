import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CUERPOS, RUTAS, rutasCuerpo } from "./data.js";

// Posiciones medidas sobre la imagen de las órbitas (sistema_solar_modelo.png):
// cada planeta cae exactamente sobre la línea de su órbita.
const LAYOUT = {
  sol: { position: [-0.27, 0.55, 0.08], scale: 0.78 },
  mercurio: { position: [0.44, 0.55, 0.08], scale: 0.18 },
  venus: { position: [-1.41, 0.54, 0.08], scale: 0.26 },
  tierra: { position: [1.32, 0.53, 0.08], scale: 0.28 },
  marte: { position: [-2.33, 0.51, 0.08], scale: 0.22 },
  jupiter: { position: [2.3, 0.46, 0.08], scale: 0.55 },
  saturno: { position: [-3.32, 0.41, 0.08], scale: 0.62 },
  urano: { position: [3.32, 0.34, 0.08], scale: 0.36 },
  neptuno: { position: [-4.37, 0.28, 0.08], scale: 0.34 },
};

const ORDER = [
  "sol",
  "mercurio",
  "venus",
  "tierra",
  "marte",
  "jupiter",
  "saturno",
  "urano",
  "neptuno",
];

const SPAWN = new THREE.Vector3(-2.6, 2.2, 0.2);
const DROP_THRESHOLD = 0.6;
const BODY_TEXTURE_PATH = RUTAS.modeloSistema;
const BODY_HEIGHT = 6.0;
const BODY_CENTER_Y = 0;
const BODY_Z = -0.5;

const state = {
  activeId: ORDER[0],
  placed: new Set(),
  placementOrder: [],
  hints: true,
  zoom: 9.8,
  showGrid: false,
  showShadows: false,
  showLabels: false,
  bodyOpacity: 1,
  autoAssembling: false,
};

const pieces = new Map();
const markers = new Map();
const $ = (selector) => document.querySelector(selector);
const els = {
  canvas: $("#assembly-canvas"),
  pieceGrid: $("#piece-grid"),
  pieceCounter: $("#piece-counter"),
  lessonTitle: $("#lesson-title"),
  lessonSummary: $("#lesson-summary"),
  lessonFunction: $("#lesson-function"),
  lessonLocation: $("#lesson-location"),
  lessonFact: $("#lesson-fact"),
  completionBanner: $("#completion-banner"),
  toast: $("#studio-toast"),
  toggleShadows: $("#toggle-shadows"),
  toggleGrid: $("#toggle-grid"),
  toggleLabels: $("#toggle-labels"),
};

const bodyMeshes = [];

const cuerposById = new Map(CUERPOS.map((cuerpo) => [cuerpo.id, cuerpo]));
const loader = new GLTFLoader();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const dragPoint = new THREE.Vector3();
const clock = new THREE.Clock();

const renderer = new THREE.WebGLRenderer({
  canvas: els.canvas,
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// El fondo estrellado lo pone el CSS del canvas; la escena queda transparente.
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
camera.position.set(1.8, 1.1, 9.6);

const ZOOM_MIN = 2.5;
const ZOOM_MAX = 18;

const controls = new OrbitControls(camera, els.canvas);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = ZOOM_MIN;
controls.maxDistance = ZOOM_MAX;
controls.target.set(0, 0.3, 0);

const ambient = new THREE.HemisphereLight(0xffffff, 0x1b2440, 1.6);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
keyLight.position.set(4, 6, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x9db8ff, 1.2);
fillLight.position.set(-4, 3, 4);
scene.add(fillLight);

const stageGroup = new THREE.Group();
scene.add(stageGroup);

const pieceLayer = new THREE.Group();
scene.add(pieceLayer);

const burstLayer = new THREE.Group();
scene.add(burstLayer);

const grid = new THREE.GridHelper(9.2, 24, 0x24314f, 0x18203a);
grid.position.y = 0;
grid.rotation.x = Math.PI / 2;
grid.position.z = -0.4;
grid.visible = state.showGrid;
stageGroup.add(grid);

createBodyScaffold();
createTargetMarkers();

const dragState = {
  piece: null,
  offset: new THREE.Vector3(),
  lastClient: { x: 0, y: 0 },
};

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    els.toast.classList.remove("is-show");
  }, 1800);
}

function createBodyScaffold() {
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(
    BODY_TEXTURE_PATH,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

      const aspect =
        texture.image && texture.image.width
          ? texture.image.width / texture.image.height
          : 1.5;
      const width = BODY_HEIGHT * aspect;

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: state.bodyOpacity,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      });

      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(width, BODY_HEIGHT),
        material
      );
      plane.position.set(0, BODY_CENTER_Y, BODY_Z);
      plane.userData.isBody = true;
      plane.renderOrder = -1;
      bodyMeshes.push(plane);
      stageGroup.add(plane);
    },
    undefined,
    (error) => {
      console.error(
        `No se pudo cargar la imagen de las órbitas en ${BODY_TEXTURE_PATH}`,
        error
      );
    }
  );
}

function normalizeModel(root, scaleFactor) {
  const clone = root.clone(true);
  const box = new THREE.Box3().setFromObject(clone);
  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z) || 1;
  const scalar = scaleFactor / maxDimension;
  clone.scale.setScalar(scalar);

  const centeredBox = new THREE.Box3().setFromObject(clone);
  const center = centeredBox.getCenter(new THREE.Vector3());
  clone.position.sub(center);

  clone.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
  });

  return clone;
}

function cloneAsGhost(object) {
  const ghost = object.clone(true);
  ghost.traverse((node) => {
    if (!node.isMesh) return;
    node.material = new THREE.MeshStandardMaterial({
      color: 0x8bb7ff,
      transparent: true,
      opacity: 0.2,
      roughness: 0.4,
      emissive: 0x1957b7,
      emissiveIntensity: 0.1,
    });
  });
  return ghost;
}

function createTargetMarkers() {
  ORDER.forEach((id) => {
    const marker = new THREE.Group();
    marker.position.fromArray(LAYOUT[id].position);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.014, 12, 48),
      new THREE.MeshBasicMaterial({
        color: 0x8fb7ff,
        transparent: true,
        opacity: 0.5,
      })
    );
    halo.rotation.x = Math.PI / 2;

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 18, 18),
      new THREE.MeshBasicMaterial({
        color: 0x5b8df0,
        transparent: true,
        opacity: 0.34,
      })
    );

    marker.add(halo, core);
    marker.userData.halo = halo;
    marker.userData.core = core;
    stageGroup.add(marker);
    markers.set(id, marker);
  });
}

function updateMarkerStates() {
  markers.forEach((marker, id) => {
    const isPlaced = state.placed.has(id);
    const isActive = id === state.activeId;
    marker.visible = state.hints && state.showLabels && !isPlaced;
    marker.scale.setScalar(isActive ? 1.3 : 1);
    marker.userData.halo.material.opacity = isActive ? 0.95 : 0.4;
    marker.userData.core.material.opacity = isActive ? 0.65 : 0.22;
  });
}

function ensurePieceLoaded(id) {
  const existing = pieces.get(id);
  if (existing) return Promise.resolve(existing);

  const cuerpo = cuerposById.get(id);
  const config = LAYOUT[id];

  return new Promise((resolve, reject) => {
    loader.load(
      rutasCuerpo(cuerpo).modelo,
      (gltf) => {
        const normalized = normalizeModel(gltf.scene, config.scale);

        const live = new THREE.Group();
        live.add(normalized.clone(true));
        live.position.copy(SPAWN);
        live.visible = false;
        live.userData.id = id;

        const ghost = new THREE.Group();
        ghost.add(cloneAsGhost(normalized));
        ghost.position.fromArray(config.position);
        ghost.visible = false;

        pieceLayer.add(ghost, live);
        const piece = {
          id,
          live,
          ghost,
          target: new THREE.Vector3(...config.position),
          placed: false,
        };
        pieces.set(id, piece);
        resolve(piece);
      },
      undefined,
      reject
    );
  });
}

function renderPieceGrid() {
  els.pieceGrid.innerHTML = ORDER.map((id) => {
    const cuerpo = cuerposById.get(id);
    const rutas = rutasCuerpo(cuerpo);
    const active = id === state.activeId ? "is-active" : "";
    const placed = state.placed.has(id) ? "is-placed" : "";
    return `
      <button class="piece-card ${active} ${placed}" data-id="${id}" draggable="false">
        <img src="${rutas.imagen}" alt="${cuerpo.nombre}" draggable="false" />
        <strong>${cuerpo.nombre}</strong>
        <small>${state.placed.has(id) ? "Colocado" : "Pendiente"}</small>
      </button>
    `;
  }).join("");

  els.pieceGrid.querySelectorAll(".piece-card").forEach((button) => {
    attachCardInteraction(button, button.dataset.id);
  });
}

function attachCardInteraction(button, id) {
  let pointerStart = null;
  let dragTransferred = false;
  let pendingSelect = null;

  const onMove = (event) => {
    if (!pointerStart || dragTransferred) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    if (Math.hypot(dx, dy) < 6) return;
    dragTransferred = true;
    if (!pendingSelect) return;
    pendingSelect.then(() => {
      const piece = pieces.get(id);
      if (!piece || piece.placed) return;
      setPointer(event);
      raycaster.setFromCamera(pointer, camera);
      raycaster.ray.intersectPlane(dragPlane, dragPoint);
      piece.live.position.copy(dragPoint);
      piece.live.visible = true;
      dragState.piece = piece;
      dragState.lastClient = { x: event.clientX, y: event.clientY };
      dragState.offset.set(0, 0, 0);
      controls.enabled = false;
    });
  };

  const cleanup = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", cleanup);
    pointerStart = null;
  };

  button.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    if (state.autoAssembling) return;
    event.preventDefault();
    pointerStart = { x: event.clientX, y: event.clientY };
    dragTransferred = false;
    pendingSelect = selectPiece(id);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", cleanup);
  });
}

function updateEducationalPanels(id) {
  const cuerpo = cuerposById.get(id);
  els.lessonTitle.textContent = cuerpo.nombre;
  els.lessonSummary.textContent = cuerpo.resumen;
  els.lessonFunction.textContent = cuerpo.funcion;
  els.lessonLocation.textContent = cuerpo.ubicacion;
  els.lessonFact.textContent = cuerpo.datoCurioso;
}

function updateProgress() {
  const count = state.placed.size;
  const total = ORDER.length;
  if (els.pieceCounter) {
    els.pieceCounter.textContent = `${count} / ${total} colocadas`;
  }

  if (count === total) {
    els.completionBanner.classList.add("is-visible");
  } else {
    els.completionBanner.classList.remove("is-visible");
  }
}

let selectToken = 0;

async function selectPiece(id) {
  if (state.placed.has(id)) {
    updateEducationalPanels(id);
    renderPieceGrid();
    toast(`${cuerposById.get(id).nombre} ya está colocado`);
    return;
  }

  state.activeId = id;
  const currentToken = ++selectToken;
  updateEducationalPanels(id);
  renderPieceGrid();
  updateMarkerStates();

  let active;
  try {
    active = await ensurePieceLoaded(id);
  } catch (error) {
    toast(`No se pudo cargar ${cuerposById.get(id).nombre}`);
    console.error(error);
    return;
  }

  if (currentToken !== selectToken) return;
  pieces.forEach((piece) => {
    if (piece.placed) return;
    piece.live.visible = piece.id === id;
    piece.ghost.visible = state.hints && piece.id === id;
    piece.ghost.traverse((node) => {
      if (node.isMesh && node.material) {
        node.material.opacity = 0.34;
        node.material.emissiveIntensity = 0.34;
      }
    });
  });

  active.live.position.copy(SPAWN);
  active.ghost.visible = state.hints;
}

function nextPendingId() {
  const pending = ORDER.filter((id) => !state.placed.has(id));
  if (!pending.length) return null;
  return pending[Math.floor(Math.random() * pending.length)];
}

async function selectNextPending() {
  const nextId = nextPendingId();
  if (!nextId) return;
  await selectPiece(nextId);
}

function placePiece(piece) {
  piece.placed = true;
  piece.live.position.copy(piece.target);
  piece.live.visible = true;
  piece.ghost.visible = false;
  state.placed.add(piece.id);
  state.placementOrder.push(piece.id);
  state.activeId = null;
  updateMarkerStates();
  updateEducationalPanels(piece.id);
  updateProgress();
  renderPieceGrid();
  toast(`${cuerposById.get(piece.id).nombre} colocado`);
  pulsePiece(piece.live);

  if (state.placed.size === ORDER.length) {
    celebrate();
  }
}

function updateBodyOpacity() {
  bodyMeshes.forEach((mesh) => {
    if (mesh.material) {
      mesh.material.opacity = state.bodyOpacity;
      mesh.material.transparent = true;
      mesh.material.needsUpdate = true;
    }
  });
}

function setShadows(enabled) {
  state.showShadows = enabled;
  renderer.shadowMap.enabled = enabled;
  keyLight.castShadow = enabled;
  scene.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      obj.material.needsUpdate = true;
    }
  });
}

function setGridVisible(visible) {
  state.showGrid = visible;
  grid.visible = visible;
}

function setLabelsVisible(visible) {
  state.showLabels = visible;
  updateMarkerStates();
}

function pulsePiece(group) {
  group.userData.pulse = 1;
}

function undoLastPlacement() {
  const lastId = state.placementOrder.pop();
  if (!lastId) {
    toast("No hay piezas para deshacer");
    return;
  }

  const piece = pieces.get(lastId);
  piece.placed = false;
  piece.live.position.copy(SPAWN);
  piece.live.visible = true;
  piece.ghost.visible = state.hints;
  state.placed.delete(lastId);
  state.activeId = lastId;
  updateProgress();
  updateMarkerStates();
  selectPiece(lastId);
}

function resetAssembly() {
  state.placed.clear();
  state.placementOrder = [];
  pieces.forEach((piece) => {
    piece.placed = false;
    piece.live.visible = false;
    piece.live.position.copy(SPAWN);
    piece.ghost.visible = false;
  });
  state.activeId = ORDER[0];
  updateProgress();
  updateMarkerStates();
  selectPiece(state.activeId);
  toast("Armado reiniciado");
}

function celebrate() {
  burstLayer.clear();
  const geometry = new THREE.BufferGeometry();
  const points = [];
  const colors = [];
  const palette = [0x5b8df0, 0xf5d76e, 0xf5a524, 0x9fe8ff];

  for (let i = 0; i < 120; i += 1) {
    points.push(
      (Math.random() - 0.5) * 5.4,
      0.4 + Math.random() * 2.4,
      (Math.random() - 0.5) * 1.2
    );
    const color = new THREE.Color(palette[i % palette.length]);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
  });
  const burst = new THREE.Points(geometry, material);
  burst.userData.createdAt = performance.now();
  burstLayer.add(burst);
}

function setHints(enabled) {
  state.hints = enabled;
  $("#btn-hints").classList.toggle("is-active", enabled);
  pieces.forEach((piece) => {
    piece.ghost.visible = enabled && !piece.placed && piece.id === state.activeId;
  });
  updateMarkerStates();
}

function resizeRenderer() {
  const { clientWidth, clientHeight } = els.canvas;
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
}

function setPointer(event) {
  const rect = els.canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onPointerDown(event) {
  if (!state.activeId) return;
  const piece = pieces.get(state.activeId);
  if (!piece || piece.placed || !piece.live.visible) return;

  setPointer(event);
  raycaster.setFromCamera(pointer, camera);
  const activeMarker = markers.get(state.activeId);
  const markerHits = activeMarker
    ? raycaster.intersectObject(activeMarker, true)
    : [];
  if (markerHits.length) {
    placePiece(piece);
    return;
  }

  const hits = raycaster.intersectObject(piece.live, true);
  if (!hits.length) return;

  raycaster.ray.intersectPlane(dragPlane, dragPoint);
  dragState.piece = piece;
  dragState.lastClient = { x: event.clientX, y: event.clientY };
  dragState.offset.copy(piece.live.position).sub(dragPoint);
  controls.enabled = false;
}

function onPointerMove(event) {
  if (!dragState.piece) return;
  setPointer(event);
  dragState.lastClient = { x: event.clientX, y: event.clientY };
  raycaster.setFromCamera(pointer, camera);
  raycaster.ray.intersectPlane(dragPlane, dragPoint);
  dragState.piece.live.position.copy(dragPoint).add(dragState.offset);
  dragState.piece.live.position.x = THREE.MathUtils.clamp(
    dragState.piece.live.position.x,
    -4.45,
    4.45
  );
  dragState.piece.live.position.y = THREE.MathUtils.clamp(
    dragState.piece.live.position.y,
    -2.9,
    2.9
  );
}

function onPointerUp(event) {
  if (!dragState.piece) return;
  const piece = dragState.piece;
  const distance = piece.live.position.distanceTo(piece.target);
  const screenTarget = piece.target.clone().project(camera);
  const targetX = (screenTarget.x * 0.5 + 0.5) * els.canvas.clientWidth;
  const targetY = (-screenTarget.y * 0.5 + 0.5) * els.canvas.clientHeight;
  const rect = els.canvas.getBoundingClientRect();
  const clientX = event?.clientX ?? dragState.lastClient.x;
  const clientY = event?.clientY ?? dragState.lastClient.y;
  const screenDistance = Math.hypot(
    clientX - rect.left - targetX,
    clientY - rect.top - targetY
  );

  if (distance <= DROP_THRESHOLD || screenDistance <= 90) {
    placePiece(piece);
  } else {
    piece.live.position.copy(SPAWN);
    toast("Acércala más a su órbita");
  }
  dragState.piece = null;
  controls.enabled = true;
}

function onCanvasClick(event) {
  const piece = pieces.get(state.activeId);
  if (!piece || piece.placed) return;
  setPointer(event);
  raycaster.setFromCamera(pointer, camera);
  const activeMarker = markers.get(state.activeId);
  if (!activeMarker) return;
  const markerHits = raycaster.intersectObject(activeMarker, true);
  if (markerHits.length) placePiece(piece);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  controls.update();

  pieces.forEach((piece) => {
    if (piece.placed) {
      piece.live.rotation.y += delta * 0.25;
    }
    if (piece.live.userData.pulse) {
      piece.live.userData.pulse = Math.max(0, piece.live.userData.pulse - delta * 1.8);
      const scale = 1 + piece.live.userData.pulse * 0.08;
      piece.live.scale.setScalar(scale);
      if (!piece.live.userData.pulse) piece.live.scale.setScalar(1);
    }
  });

  burstLayer.children.forEach((burst) => {
    const age = performance.now() - burst.userData.createdAt;
    burst.position.y += delta * 0.35;
    burst.material.opacity = Math.max(0, 1 - age / 1800);
    if (age > 1800) burstLayer.remove(burst);
  });

  renderer.render(scene, camera);
}

function bindEvents() {
  els.canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  els.canvas.addEventListener("click", onCanvasClick);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("resize", resizeRenderer);

  $("#btn-place").addEventListener("click", () => {
    autoAssemble();
  });
  $("#btn-focus").addEventListener("click", () => {
    camera.position.set(1.8, 1.1, 9.6);
    controls.target.set(0, 0.3, 0);
    controls.update();
  });

  $("#btn-hints").addEventListener("click", () => setHints(!state.hints));
  $("#btn-zoom-in").addEventListener("click", () => {
    state.zoom = Math.max(ZOOM_MIN, state.zoom - 0.6);
    camera.position.setLength(state.zoom);
  });
  $("#btn-zoom-out").addEventListener("click", () => {
    state.zoom = Math.min(ZOOM_MAX, state.zoom + 0.6);
    camera.position.setLength(state.zoom);
  });
  $("#btn-undo").addEventListener("click", undoLastPlacement);
  $("#btn-reset").addEventListener("click", resetAssembly);
  $("#btn-shuffle").addEventListener("click", () => {
    const pending = ORDER.filter((id) => !state.placed.has(id));
    if (!pending.length) {
      toast("Todas las piezas están colocadas");
      return;
    }
    selectPiece(pending[Math.floor(Math.random() * pending.length)]);
  });

  if (els.toggleShadows) {
    els.toggleShadows.addEventListener("change", (event) => {
      setShadows(event.target.checked);
    });
  }
  if (els.toggleGrid) {
    els.toggleGrid.addEventListener("change", (event) => {
      setGridVisible(event.target.checked);
    });
  }
  if (els.toggleLabels) {
    els.toggleLabels.addEventListener("change", (event) => {
      setLabelsVisible(event.target.checked);
    });
  }
}

function preloadPieces() {
  ORDER.forEach((id) => {
    ensurePieceLoaded(id).catch((error) => {
      console.warn(`No se pudo precargar ${id}`, error);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function animatePieceToTarget(piece, duration = 650) {
  return new Promise((resolve) => {
    const start = piece.live.position.clone();
    const end = piece.target.clone();
    const startTime = performance.now();
    const step = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      piece.live.position.lerpVectors(start, end, eased);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

async function autoAssemble() {
  if (state.autoAssembling) return;
  if (state.placed.size === ORDER.length) {
    toast("El sistema solar ya está armado");
    return;
  }
  state.autoAssembling = true;
  const placeBtn = $("#btn-place");
  if (placeBtn) placeBtn.classList.add("is-running");
  toast("Armando el sistema solar…");

  try {
    const pending = ORDER.filter((id) => !state.placed.has(id));
    for (const id of pending) {
      if (!state.autoAssembling) break;
      await selectPiece(id);
      const piece = pieces.get(id);
      if (!piece || piece.placed) continue;
      await animatePieceToTarget(piece);
      placePiece(piece);
      await sleep(450);
    }
  } finally {
    state.autoAssembling = false;
    if (placeBtn) placeBtn.classList.remove("is-running");
  }
}

async function init() {
  renderPieceGrid();
  updateEducationalPanels(state.activeId);
  updateProgress();
  updateMarkerStates();
  refreshIcons();
  resizeRenderer();
  bindEvents();
  animate();

  setShadows(state.showShadows);
  setGridVisible(state.showGrid);
  setLabelsVisible(state.showLabels);
  updateBodyOpacity();

  try {
    globalThis.__assemblyDebug = {
      renderer,
      scene,
      camera,
      pieces,
      markers,
      placeById: async (id) => {
        await selectPiece(id);
        const piece = pieces.get(id);
        if (piece && !piece.placed) placePiece(piece);
      },
    };
    await selectPiece(state.activeId);
  } catch (error) {
    toast("No se pudieron cargar las piezas");
    console.error(error);
  }

  preloadPieces();
}

init();
