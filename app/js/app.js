import { CUERPOS, rutasCuerpo } from "./data.js";

const state = {
  selectedId: "sol",
  compareA: "sol",
  compareB: "tierra",
  orbitBackground: true,
  rotating: false,
  fullscreen: false,
  fieldOfView: 32,
};

const $ = (selector) => document.querySelector(selector);

const els = {
  app: $("#app"),
  organList: $("#organ-list"),
  viewerName: $("#viewer-name"),
  viewerSystem: $("#viewer-system"),
  viewerStage: $("#viewer-stage"),
  modelViewer: $("#model-viewer"),
  anatomySwitch: $("#anatomy-switch"),
  modeTabs: $("#mode-tabs"),
  galleryAnatomy: $("#gallery-anatomy"),
  galleryFacts: $("#gallery-facts"),
  detailAvatar: $("#detail-avatar"),
  detailName: $("#detail-name"),
  detailDescriptor: $("#detail-descriptor"),
  detailGrid: $("#detail-grid"),
  notesText: $("#notes-text"),
  notesFact: $("#notes-fact"),
  compareAThumb: $("#compare-a-thumb"),
  compareAName: $("#compare-a-name"),
  compareASystem: $("#compare-a-system"),
  compareASelect: $("#compare-a-select"),
  compareBThumb: $("#compare-b-thumb"),
  compareBName: $("#compare-b-name"),
  compareBSystem: $("#compare-b-system"),
  compareBSelect: $("#compare-b-select"),
  compareGrid: $("#compare-grid"),
  topbarNav: $("#topbar-nav"),
  modalImage: $("#modal-image"),
  modalImageTitle: $("#modal-image-title"),
  modalImageImg: $("#modal-image-img"),
  modalImageCaption: $("#modal-image-caption"),
  modalCompare: $("#modal-compare"),
  modalView: $("#modal-view"),
  modalViewTitle: $("#modal-view-title"),
  modalViewBody: $("#modal-view-body"),
  toast: $("#toast"),
};

const getCuerpo = (id) => CUERPOS.find((cuerpo) => cuerpo.id === id);

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => {
    els.toast.classList.remove("is-show");
  }, 1800);
}

function renderSidebar() {
  els.organList.innerHTML = CUERPOS.map((cuerpo) => {
    const rutas = rutasCuerpo(cuerpo);
    const active = cuerpo.id === state.selectedId ? "is-active" : "";
    return `
      <button class="organ-item ${active}" data-id="${cuerpo.id}">
        <img class="organ-item__thumb" src="${rutas.miniatura}" alt="${cuerpo.nombre}" />
        <span class="organ-item__text">
          <span class="organ-item__name">${cuerpo.nombre}</span>
          <span class="organ-item__system">${cuerpo.sistema}</span>
        </span>
      </button>
    `;
  }).join("");

  els.organList.querySelectorAll(".organ-item").forEach((button) => {
    button.addEventListener("click", () => seleccionarCuerpo(button.dataset.id));
  });
}

function actualizarVisor(cuerpo) {
  const rutas = rutasCuerpo(cuerpo);
  els.viewerName.textContent = cuerpo.nombre;
  els.viewerSystem.textContent = cuerpo.sistema;
  els.viewerStage.classList.add("is-loading");
  els.modelViewer.setAttribute("src", rutas.modelo);
  els.modelViewer.setAttribute("alt", `Modelo 3D de ${cuerpo.nombre}`);
  els.modelViewer.setAttribute("camera-orbit", "0deg 75deg 135%");
  els.modelViewer.setAttribute("field-of-view", `${state.fieldOfView}deg`);
}

function aplicarFondoOrbitas() {
  els.viewerStage.classList.toggle("with-anatomy", state.orbitBackground);
  els.anatomySwitch.classList.toggle("is-on", state.orbitBackground);
  els.anatomySwitch.setAttribute("aria-checked", String(state.orbitBackground));
}

function renderDetalles(cuerpo) {
  const rutas = rutasCuerpo(cuerpo);
  els.detailAvatar.src = rutas.imagen;
  els.detailAvatar.alt = cuerpo.nombre;
  els.detailName.textContent = cuerpo.nombre;
  els.detailDescriptor.textContent = cuerpo.descriptor;

  const filas = [
    { icon: "orbit", label: "Tipo", value: cuerpo.sistema },
    { icon: "activity", label: "Característica", value: cuerpo.funcion },
    { icon: "map-pin", label: "Ubicación", value: cuerpo.ubicacion },
    { icon: "moon", label: "Lunas y relación", value: cuerpo.relacion },
  ];

  els.detailGrid.innerHTML = filas
    .map(
      (fila) => `
        <div class="detail-row">
          <span class="detail-row__icon"><i data-lucide="${fila.icon}"></i></span>
          <div class="detail-row__text">
            <small>${fila.label}</small>
            <span>${fila.value}</span>
          </div>
        </div>
      `
    )
    .join("");

  els.notesText.textContent = cuerpo.resumen;
  els.notesFact.textContent = `Dato curioso: ${cuerpo.datoCurioso}`;
}

function renderGaleria(cuerpo) {
  const rutas = rutasCuerpo(cuerpo);
  els.galleryAnatomy.src = rutas.anatomia;
  els.galleryFacts.src = rutas.ficha;
}

function renderCompareSelects() {
  const options = CUERPOS.map(
    (cuerpo) => `<option value="${cuerpo.id}">${cuerpo.nombre}</option>`
  ).join("");
  els.compareASelect.innerHTML = options;
  els.compareBSelect.innerHTML = options;
  els.compareASelect.value = state.compareA;
  els.compareBSelect.value = state.compareB;
}

function renderCompareChips() {
  const cuerpoA = getCuerpo(state.compareA);
  const cuerpoB = getCuerpo(state.compareB);
  const rutasA = rutasCuerpo(cuerpoA);
  const rutasB = rutasCuerpo(cuerpoB);

  els.compareAThumb.src = rutasA.imagen;
  els.compareAName.textContent = cuerpoA.nombre;
  els.compareASystem.textContent = cuerpoA.sistema;

  els.compareBThumb.src = rutasB.imagen;
  els.compareBName.textContent = cuerpoB.nombre;
  els.compareBSystem.textContent = cuerpoB.sistema;
}

function abrirComparacion() {
  const cuerpoA = getCuerpo(state.compareA);
  const cuerpoB = getCuerpo(state.compareB);

  const renderColumna = (cuerpo) => {
    const rutas = rutasCuerpo(cuerpo);
    return `
      <article class="compare-col">
        <div class="compare-col__hero">
          <img src="${rutas.imagen}" alt="${cuerpo.nombre}" />
          <div>
            <strong>${cuerpo.nombre}</strong>
            <em>${cuerpo.descriptor}</em>
          </div>
        </div>
        <dl>
          <div><dt>Tipo</dt><dd>${cuerpo.sistema}</dd></div>
          <div><dt>Característica</dt><dd>${cuerpo.funcion}</dd></div>
          <div><dt>Ubicación</dt><dd>${cuerpo.ubicacion}</dd></div>
          <div><dt>Lunas y relación</dt><dd>${cuerpo.relacion}</dd></div>
          <div><dt>Tamaño</dt><dd>${cuerpo.tamano}</dd></div>
          <div><dt>Importancia</dt><dd>${cuerpo.importancia}</dd></div>
          <div><dt>Dato curioso</dt><dd>${cuerpo.datoCurioso}</dd></div>
        </dl>
      </article>
    `;
  };

  els.compareGrid.innerHTML =
    renderColumna(cuerpoA) + renderColumna(cuerpoB);
  els.modalCompare.classList.add("is-open");
}

function seleccionarCuerpo(id) {
  if (!getCuerpo(id)) return;
  state.selectedId = id;
  state.compareA = id;

  if (state.compareB === id) {
    const alterno = CUERPOS.find((cuerpo) => cuerpo.id !== id);
    if (alterno) state.compareB = alterno.id;
  }

  renderTodo();
}

function renderTodo() {
  const cuerpo = getCuerpo(state.selectedId);
  renderSidebar();
  actualizarVisor(cuerpo);
  aplicarFondoOrbitas();
  renderDetalles(cuerpo);
  renderGaleria(cuerpo);
  renderCompareSelects();
  renderCompareChips();
  refreshIcons();
}

function setFullscreen(value) {
  state.fullscreen = value;
  els.app.classList.toggle("is-fullscreen", value);

  requestAnimationFrame(() => {
    els.modelViewer.style.display = "none";
    void els.modelViewer.offsetHeight;
    els.modelViewer.style.display = "";
    window.dispatchEvent(new Event("resize"));
  });
}

function ajustarZoom(delta) {
  state.fieldOfView = Math.min(48, Math.max(18, state.fieldOfView + delta));
  els.modelViewer.setAttribute("field-of-view", `${state.fieldOfView}deg`);
}

function resetearVista() {
  state.fieldOfView = 32;
  els.modelViewer.setAttribute("camera-orbit", "0deg 75deg 135%");
  els.modelViewer.setAttribute("field-of-view", `${state.fieldOfView}deg`);
  if (els.modelViewer.resetTurntableRotation) {
    els.modelViewer.resetTurntableRotation();
  }
  toast("Vista restablecida");
}

function abrirVistaAuxiliar(view) {
  if (view === "galeria") {
    els.modalView.classList.remove("is-open");
    return;
  }

  const cuerpo = getCuerpo(state.selectedId);
  let title = "";
  let html = "";

  if (view === "biblioteca") {
    title = "Biblioteca del sistema solar";
    html = `
      <div class="library-grid">
        ${CUERPOS.map((item) => {
          const rutas = rutasCuerpo(item);
          return `
            <button class="library-item" data-jump="${item.id}">
              <img src="${rutas.imagen}" alt="" />
              <strong>${item.nombre}</strong>
              <span>${item.sistema}</span>
            </button>
          `;
        }).join("")}
      </div>
    `;
  } else if (view === "cuaderno") {
    title = `Cuaderno · ${cuerpo.nombre}`;
    html = `
      <div class="notebook">
        <p><strong>Tipo:</strong> ${cuerpo.sistema}</p>
        <p><strong>Característica:</strong> ${cuerpo.funcion}</p>
        <p><strong>Ubicación:</strong> ${cuerpo.ubicacion}</p>
        <p><strong>Importancia:</strong> ${cuerpo.importancia}</p>
        <p><strong>Dato curioso:</strong> ${cuerpo.datoCurioso}</p>
        <textarea placeholder="Escribe aquí tus observaciones…"></textarea>
      </div>
    `;
  } else if (view === "ajustes") {
    title = "Ajustes";
    html = `
      <div class="settings">
        <label>
          <span>Órbitas de fondo por defecto</span>
          <input type="checkbox" id="cfg-orbits" ${
            state.orbitBackground ? "checked" : ""
          } />
        </label>
        <label>
          <span>Auto-rotación al activar 360°</span>
          <input type="checkbox" id="cfg-rotate" ${
            state.rotating ? "checked" : ""
          } />
        </label>
      </div>
    `;
  }

  els.modalViewTitle.textContent = title;
  els.modalViewBody.innerHTML = html;
  els.modalView.classList.add("is-open");

  els.modalViewBody.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      seleccionarCuerpo(button.dataset.jump);
      els.modalView.classList.remove("is-open");
      els.topbarNav.querySelector('[data-view="galeria"]').click();
    });
  });

  const cfgOrbits = els.modalViewBody.querySelector("#cfg-orbits");
  if (cfgOrbits) {
    cfgOrbits.addEventListener("change", () => {
      state.orbitBackground = cfgOrbits.checked;
      aplicarFondoOrbitas();
    });
  }

  const cfgRotate = els.modalViewBody.querySelector("#cfg-rotate");
  if (cfgRotate) {
    cfgRotate.addEventListener("change", () => {
      state.rotating = cfgRotate.checked;
      els.modelViewer.toggleAttribute("auto-rotate", state.rotating);
    });
  }
}

function setupEventos() {
  els.modeTabs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      els.modeTabs
        .querySelectorAll("button")
        .forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");

      if (button.dataset.mode === "ar") {
        if (els.modelViewer.canActivateAR) {
          els.modelViewer.activateAR();
        } else {
          toast("AR no disponible en este dispositivo");
        }
      }

      if (button.dataset.mode === "360") {
        state.rotating = true;
        els.modelViewer.setAttribute("auto-rotate", "");
        toast("Vista 360° activada");
      }

      if (button.dataset.mode === "3d") {
        state.rotating = false;
        els.modelViewer.removeAttribute("auto-rotate");
      }
    });
  });

  els.anatomySwitch.addEventListener("click", () => {
    state.orbitBackground = !state.orbitBackground;
    aplicarFondoOrbitas();
  });

  $("#btn-reset").addEventListener("click", resetearVista);
  $("#btn-zoom-in").addEventListener("click", () => ajustarZoom(-4));
  $("#btn-zoom-out").addEventListener("click", () => ajustarZoom(4));
  $("#btn-fullscreen").addEventListener("click", () => setFullscreen(true));
  $("#btn-exit-fullscreen").addEventListener("click", () => setFullscreen(false));

  els.modelViewer.addEventListener("load", () => {
    els.viewerStage.classList.remove("is-loading");
  });

  els.modelViewer.addEventListener("error", () => {
    els.viewerStage.classList.remove("is-loading");
    toast("No se pudo cargar el modelo 3D");
  });

  document.querySelectorAll(".gallery__item").forEach((button) => {
    button.addEventListener("click", () => {
      const cuerpo = getCuerpo(state.selectedId);
      const rutas = rutasCuerpo(cuerpo);
      const data = {
        anatomia: {
          src: rutas.anatomia,
          title: `Estructura interna · ${cuerpo.nombre}`,
          caption: cuerpo.importancia,
        },
        ficha: {
          src: rutas.ficha,
          title: `Ficha visual · ${cuerpo.nombre}`,
          caption: cuerpo.resumen,
        },
      }[button.dataset.gallery];

      els.modalImageTitle.textContent = data.title;
      els.modalImageImg.src = data.src;
      els.modalImageImg.alt = data.title;
      els.modalImageCaption.textContent = data.caption;
      els.modalImage.classList.add("is-open");
    });
  });

  els.compareASelect.addEventListener("change", (event) => {
    state.compareA = event.target.value;
    renderCompareChips();
  });

  els.compareBSelect.addEventListener("change", (event) => {
    state.compareB = event.target.value;
    renderCompareChips();
  });

  $("#btn-compare").addEventListener("click", abrirComparacion);

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest(".modal").classList.remove("is-open");
    });
  });

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.classList.remove("is-open");
    });
  });

  els.topbarNav.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      els.topbarNav
        .querySelectorAll("button")
        .forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      abrirVistaAuxiliar(button.dataset.view);
    });
  });

  document.querySelectorAll(".collapsible .card__toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".collapsible");
      const collapsed = card.classList.toggle("is-collapsed");
      button.setAttribute("aria-expanded", String(!collapsed));

      try {
        const saved = JSON.parse(
          localStorage.getItem("sss_collapse") || "{}"
        );
        saved[card.dataset.key] = collapsed;
        localStorage.setItem("sss_collapse", JSON.stringify(saved));
      } catch (error) {}
    });
  });

  try {
    const saved = JSON.parse(localStorage.getItem("sss_collapse") || "{}");
    document.querySelectorAll(".collapsible").forEach((card) => {
      if (!saved[card.dataset.key]) return;
      card.classList.add("is-collapsed");
      const button = card.querySelector(".card__toggle");
      if (button) button.setAttribute("aria-expanded", "false");
    });
  } catch (error) {}

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    document.querySelectorAll(".modal.is-open").forEach((modal) => {
      modal.classList.remove("is-open");
    });
    if (state.fullscreen) setFullscreen(false);
  });
}

function init() {
  renderTodo();
  setupEventos();
  refreshIcons();

  const initialView = window.location.hash.replace("#", "");
  if (["biblioteca", "cuaderno", "ajustes"].includes(initialView)) {
    const button = els.topbarNav.querySelector(`[data-view="${initialView}"]`);
    if (button) {
      els.topbarNav
        .querySelectorAll("button")
        .forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      abrirVistaAuxiliar(initialView);
    }
  }
}

document.addEventListener("DOMContentLoaded", init);
