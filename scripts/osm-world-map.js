/**
 * OSM World Map — prototipo v0.1
 * Mapa del mundo real (OpenStreetMap + Leaflet) dentro de Foundry VTT.
 *
 * Funciones:
 *  - Panel flotante con un mapa de OpenStreetMap navegable.
 *  - Pines colocados por el DJ, enlazados a entradas de diario (clic -> abre el diario).
 *  - Buscador de direcciones/lugares (geocodificador Nominatim).
 *  - Rutas con distancia y tiempo estimado (OSRM), con botón para avanzar el reloj de Calendaria.
 *
 * Las librerías (Leaflet y sus plugins) se cargan desde CDN en tiempo de ejecución.
 * Si tu Foundry no tiene salida a internet para scripts externos, ver el README para
 * alojarlas localmente.
 */

const MODULE_ID = "osm-world-map";

// Atajo de localización: t10n("CLAVE") o t10n("CLAVE", { var: valor }).
// Foundry elige el idioma (en / es) según el cliente; sin Babele de por medio.
const t10n = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const SOCKET = `module.${MODULE_ID}`;

// ---- Librerías incluidas en el propio módulo (sin depender de CDN) ----
const BASE = `modules/${MODULE_ID}/lib`;
const ASSETS = {
  leafletCss: `${BASE}/leaflet/leaflet.css`,
  leafletJs: `${BASE}/leaflet/leaflet.js`,
  geocoderCss: `${BASE}/geocoder/Control.Geocoder.css`,
  geocoderJs: `${BASE}/geocoder/Control.Geocoder.min.js`,
  routingCss: `${BASE}/routing/leaflet-routing-machine.css`,
  routingJs: `${BASE}/routing/leaflet-routing-machine.min.js`
};

// ---- Tipos de pin (icono + color) ----
const FANGS_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v2H3z"/><path d="M7 8h3l-1.5 7z"/><path d="M14 8h3l-1.5 7z"/></svg>`;
// Pulpo (criatura / anomalía): silueta de cabeza + tentáculos, muy reconocible
// para la temática lovecraftiana. SVG propio (no depende de Font Awesome Pro).
const TENTACLE_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="9" rx="7" ry="6"/><path d="M5 13 L5 18 a1.4 1.4 0 0 1 2.8 0 a1.4 1.4 0 0 1 2.8 0 a1.4 1.4 0 0 1 2.8 0 a1.4 1.4 0 0 1 2.8 0 a1.4 1.4 0 0 1 2.8 0 L19 18 L19 13 Z"/></svg>`;
const EYE_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8zm0-2.2a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6z"/></svg>`;

const PIN_TYPES = {
  generic: { label: "OSMWM.Pin.Generic", fa: "fa-location-dot", color: "#5a6b7a" },
  town: { label: "OSMWM.Pin.Town", fa: "fa-city", color: "#3a7d44" },
  tower: { label: "OSMWM.Pin.Tower", fa: "fa-chess-rook", color: "#6d4c2b" },
  safehouse: { label: "OSMWM.Pin.Safehouse", fa: "fa-shield-halved", color: "#2f6f8f" },
  npc: { label: "OSMWM.Pin.Npc", fa: "fa-user", color: "#7a5ea8" },
  clue: { label: "OSMWM.Pin.Clue", fa: "fa-magnifying-glass", color: "#c08a2d" },
  danger: { label: "OSMWM.Pin.Danger", fa: "fa-skull", color: "#8a2020" },
  church: { label: "OSMWM.Pin.Church", fa: "fa-place-of-worship", color: "#4b5d7a" },
  port: { label: "OSMWM.Pin.Port", fa: "fa-anchor", color: "#2b6d6d" },
  vampire: { label: "OSMWM.Pin.Vampire", svg: FANGS_SVG, color: "#5a1020" },
  occult: { label: "OSMWM.Pin.Occult", svg: EYE_SVG, color: "#3d5a3a" },
  anomaly: { label: "OSMWM.Pin.Anomaly", svg: TENTACLE_SVG, color: "#2f5d4a" },
  archive: { label: "OSMWM.Pin.Archive", fa: "fa-book", color: "#6a5230" }
};

// Familia estética según la ambientación elegida en el ajuste "theme".
function skinFamily(theme) {
  if (theme === "cthulhu") return "cthulhu";
  if (theme === "deltagreen") return "deltagreen";
  if (theme === "none") return "none";
  return "vampire"; // carto-dark
}

// Sustituciones de icono por familia (solo donde el género lo pide).
// Si un tipo no aparece aquí, se usa el icono base de PIN_TYPES.
const SKIN_ICONS = {
  cthulhu: {
    npc: { fa: "fa-user" },
    safehouse: { fa: "fa-door-closed" },
    archive: { fa: "fa-book" }
  },
  deltagreen: {
    npc: { fa: "fa-user-secret" },
    danger: { fa: "fa-biohazard" },
    anomaly: { fa: "fa-radiation" },
    occult: { fa: "fa-eye" },
    archive: { fa: "fa-folder" },
    church: { fa: "fa-building" }
  }
};

// Devuelve el HTML del glifo (icono FA o SVG) para un tipo y familia.
function glyphFor(family, typeKey) {
  const base = PIN_TYPES[typeKey] || PIN_TYPES.generic;
  const ov = SKIN_ICONS[family] && SKIN_ICONS[family][typeKey];
  const src = ov || base;
  return src.svg ? src.svg : `<i class="fa-solid ${src.fa}"></i>`;
}

function makeIcon(typeKey) {
  const t = PIN_TYPES[typeKey] || PIN_TYPES.generic;
  const theme = game.settings.get(MODULE_ID, "theme") || "none";
  const family = skinFamily(theme);
  const inner = glyphFor(family, typeKey);

  // Vampiro: gota roja sangre, borde negro, glifo hueso.
  if (family === "vampire") {
    return L.divIcon({
      html: `<div class="owm-pin-vamp owm-pin-${typeKey}"><span class="owm-pin-vamp-body"></span><span class="owm-pin-vamp-glyph">${inner}</span></div>`,
      className: "owm-pin-divicon",
      iconSize: [30, 40],
      iconAnchor: [15, 34],
      popupAnchor: [0, -30]
    });
  }

  // La Llamada de Cthulhu: sello de cera/pergamino, glifo crema.
  if (family === "cthulhu") {
    return L.divIcon({
      html: `<div class="owm-pin-coc owm-pin-${typeKey}"><span class="owm-pin-coc-body"></span><span class="owm-pin-coc-glyph">${inner}</span></div>`,
      className: "owm-pin-divicon",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  }

  // Delta Green: marcador rombo "clasificado", glifo verde fósforo.
  if (family === "deltagreen") {
    return L.divIcon({
      html: `<div class="owm-pin-dg owm-pin-${typeKey}"><span class="owm-pin-dg-body"></span><span class="owm-pin-dg-glyph">${inner}</span></div>`,
      className: "owm-pin-divicon",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -16]
    });
  }

  // Tema normal: círculo de color por tipo (comportamiento original).
  return L.divIcon({
    html: `<div class="owm-pin-icon" style="background:${t.color}">${inner}</div>`,
    className: "owm-pin-divicon",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16]
  });
}

// ---- Estado del módulo ----
let _libsLoaded = false;
let _libsPromise = null;
let _panel = null;
let _map = null;
let _resizeObserver = null;
let _resizeRaf = 0;
let _tileLayer = null;
let _labelsLayer = null;
let _markerLayer = null;
let _routingControl = null;
let _routeWaypoints = [];
let _lastRoute = null; // { distance (m), time (s) }
let _addPinMode = false;

// =====================================================================
//  Carga de librerías
// =====================================================================
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some((s) => s.getAttribute("src") === src || s.src.endsWith(src))) return resolve();
    const el = document.createElement("script");
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("No se pudo cargar " + src));
    document.head.appendChild(el);
  });
}

function loadCss(href) {
  if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.getAttribute("href") === href || l.href.endsWith(href))) return;
  const el = document.createElement("link");
  el.rel = "stylesheet";
  el.href = href;
  document.head.appendChild(el);
}

function loadLibs() {
  // Cachea la promesa para que llamadas simultáneas NO disparen cargas en paralelo
  // (era la causa de "L is not defined": el buscador arrancaba antes que Leaflet).
  if (!_libsPromise) {
    _libsPromise = _loadLibsOnce().catch((e) => {
      _libsPromise = null; // permite reintentar tras un fallo
      throw e;
    });
  }
  return _libsPromise;
}

async function _loadLibsOnce() {
  if (_libsLoaded) return;
  loadCss(ASSETS.leafletCss);
  loadCss(ASSETS.geocoderCss);
  loadCss(ASSETS.routingCss);
  // Orden ESTRICTO: primero Leaflet (define L), luego los plugins que dependen de él.
  await loadScript(ASSETS.leafletJs);
  if (typeof window.L === "undefined") {
    throw new Error("Leaflet (L) no quedó disponible tras cargarse.");
  }
  await loadScript(ASSETS.geocoderJs);
  await loadScript(ASSETS.routingJs);
  // Arreglo conocido para que se vean los iconos por defecto de los pines.
  try {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: `${BASE}/leaflet/images/marker-icon-2x.png`,
      iconUrl: `${BASE}/leaflet/images/marker-icon.png`,
      shadowUrl: `${BASE}/leaflet/images/marker-shadow.png`
    });
  } catch (e) {
    console.warn(`${MODULE_ID} | no se pudo ajustar el icono por defecto de Leaflet`, e);
  }
  _libsLoaded = true;
}

// =====================================================================
//  Inicialización del módulo
// =====================================================================
Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "markers", {
    scope: "world",
    config: false,
    type: Array,
    default: [],
    onChange: () => renderMarkers()
  });

  game.settings.register(MODULE_ID, "tileUrl", {
    scope: "world",
    config: true,
    name: "OSMWM.Settings.TileUrl.Name",
    hint: "OSMWM.Settings.TileUrl.Hint",
    type: String,
    default: "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
  });

  game.settings.register(MODULE_ID, "theme", {
    scope: "world",
    config: true,
    name: "OSMWM.Settings.Theme.Name",
    hint: "OSMWM.Settings.Theme.Hint",
    type: String,
    choices: {
      none: "OSMWM.Settings.Theme.None",
      "carto-dark": "OSMWM.Settings.Theme.CartoDark",
      cthulhu: "OSMWM.Settings.Theme.Cthulhu",
      deltagreen: "OSMWM.Settings.Theme.DeltaGreen"
    },
    default: "carto-dark",
    onChange: () => reloadTiles()
  });

  game.settings.register(MODULE_ID, "startView", {
    scope: "world",
    config: false,
    type: Object,
    default: { lat: 51.505, lng: -0.09, zoom: 5 } // Europa, centrado en Londres
  });

  game.keybindings.register(MODULE_ID, "toggle", {
    name: "OSMWM.Keybind.Toggle",
    editable: [{ key: "KeyM", modifiers: ["Control"] }],
    onDown: () => {
      toggleMap();
      return true;
    }
  });
});

Hooks.once("ready", () => {
  const mod = game.modules.get(MODULE_ID);
  const api = {
    open: openMap,
    close: closeMap,
    toggle: toggleMap,
    addPin: () => setAddPinMode(true),
    showToPlayers: showToPlayers
  };
  if (mod) mod.api = api;
  window.OSMWorldMap = api;

  // Escucha de socket: permite al DJ abrir/cerrar el mapa en la pantalla de todos.
  game.socket.on(SOCKET, onSocket);

  console.log(`${MODULE_ID} | listo. Abre el mapa con Ctrl+M, el botón de controles, o game.modules.get("${MODULE_ID}").api.open()`);
});

// Mensajes recibidos por socket (los reciben todos los clientes).
async function onSocket(data) {
  if (!data || !data.action) return;
  if (data.action === "open") {
    await openMap();
    if (data.view && _map) {
      _map.setView([data.view.lat, data.view.lng], data.view.zoom);
      setTimeout(() => _map.invalidateSize(), 60);
    }
  } else if (data.action === "close") {
    closeMap();
  }
}

// El DJ muestra el mapa (con su vista actual) en la pantalla de todos los jugadores.
function showToPlayers() {
  if (!game.user.isGM) return;
  let view = null;
  if (_map) {
    const c = _map.getCenter();
    view = { lat: c.lat, lng: c.lng, zoom: _map.getZoom() };
  }
  game.socket.emit(SOCKET, { action: "open", view });
  openMap(); // abrirlo también en la pantalla del propio DJ
  ui.notifications.info(t10n("OSMWM.Notify.ShownToPlayers"));
}

// Botón en los controles de escena (mejor esfuerzo: distintas versiones de Foundry
// usan estructuras distintas, así que lo intentamos con cuidado y sin romper nada).
Hooks.on("getSceneControlButtons", (controls) => {
  try {
    const base = {
      name: "osm-world-map",
      title: t10n("OSMWM.Control.Title"),
      icon: "fa-solid fa-earth-europe",
      button: true,
      visible: true
    };
    if (Array.isArray(controls)) {
      // Foundry v12 y anteriores: array de controles, tools = array, usa onClick
      const tokens = controls.find((c) => c.name === "token" || c.name === "tokens");
      if (tokens?.tools) tokens.tools.push({ ...base, onClick: () => toggleMap() });
    } else if (controls && typeof controls === "object") {
      // Foundry v13+: controles y tools como objetos, usa SOLO onChange (no onClick)
      const tokens = controls.tokens ?? controls.token ?? Object.values(controls)[0];
      if (tokens) {
        tokens.tools ??= {};
        tokens.tools["osm-world-map"] = { ...base, order: 99, onChange: () => toggleMap() };
      }
    }
  } catch (e) {
    console.warn(`${MODULE_ID} | no se pudo añadir el botón a los controles de escena`, e);
  }
});

// =====================================================================
//  Panel y mapa
// =====================================================================
function buildPanel() {
  const panel = document.createElement("div");
  panel.id = "osm-world-map-panel";
  const gmTools = game.user.isGM
    ? `<button data-action="show" title="${t10n("OSMWM.Btn.Show")}"><i class="fa-solid fa-users"></i></button>
       <button data-action="add-pin" title="${t10n("OSMWM.Btn.AddPin")}"><i class="fa-solid fa-map-pin"></i></button>
       <button data-action="route" title="${t10n("OSMWM.Btn.Route")}"><i class="fa-solid fa-route"></i></button>`
    : "";
  panel.innerHTML = `
    <div class="owm-header">
      <span class="owm-title"><i class="fa-solid fa-earth-europe"></i> ${t10n("OSMWM.Panel.Title")}</span>
      <div class="owm-actions">
        ${gmTools}
        <button data-action="close" title="${t10n("OSMWM.Btn.Close")}"><i class="fa-solid fa-xmark"></i></button>
      </div>
    </div>
    <div class="owm-map" id="osm-world-map-canvas"></div>
    <div class="owm-route-info" hidden></div>
  `;
  document.body.appendChild(panel);

  makeDraggable(panel, panel.querySelector(".owm-header"));
  panel.querySelector('[data-action="close"]').addEventListener("click", closeMap);
  panel.querySelector('[data-action="show"]')?.addEventListener("click", showToPlayers);
  panel.querySelector('[data-action="add-pin"]')?.addEventListener("click", () => setAddPinMode(!_addPinMode));
  panel.querySelector('[data-action="route"]')?.addEventListener("click", toggleRouting);
  return panel;
}

async function openMap() {
  try {
    await loadLibs();
  } catch (e) {
    console.error(e);
    ui.notifications.error(t10n("OSMWM.Notify.LibsError"));
    return;
  }
  if (!_panel) _panel = buildPanel();
  _panel.style.display = "flex";
  if (!_map) initMap();
  else setTimeout(() => _map.invalidateSize(), 60);
}

function closeMap() {
  if (_panel) _panel.style.display = "none";
}

function toggleMap() {
  if (_panel && _panel.style.display !== "none") closeMap();
  else openMap();
}

// ---------------------------------------------------------------------
//  Estética / temas de teselas
// ---------------------------------------------------------------------
const OSM_DEFAULT = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

// Devuelve { url, attribution, filterClass } según el tema elegido.
function resolveTileConfig() {
  const theme = game.settings.get(MODULE_ID, "theme") || "none";
  const userUrl = game.settings.get(MODULE_ID, "tileUrl");
  const osmAttr = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  const cartoAttr = '&copy; <a href="https://carto.com/attributions">CARTO</a>, ' + osmAttr;

  switch (theme) {
    case "carto-dark":
      return {
        // Fondo sin etiquetas (recibe el tinte rojo) + capa de SOLO etiquetas
        // por encima, sin oscurecer, para que el texto quede claro y legible.
        url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
        labelsUrl: "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
        attribution: cartoAttr,
        filterClass: "owm-theme-carto"
      };
    case "cthulhu":
      return {
        // Mapa claro de CARTO + filtro sepia = pergamino envejecido.
        url: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
        labelsUrl: "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
        attribution: cartoAttr,
        filterClass: "owm-theme-coc"
      };
    case "deltagreen":
      return {
        // Base oscura + tinte verde frío = terminal clasificado.
        url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
        labelsUrl: "https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png",
        attribution: cartoAttr,
        filterClass: "owm-theme-dg"
      };
    case "none":
    default:
      return { url: userUrl || OSM_DEFAULT, attribution: osmAttr, filterClass: "" };
  }
}

// Aplica/actualiza la(s) capa(s) de teselas y la clase de filtro del panel.
function applyTileLayer() {
  if (!_map) return;
  const cfg = resolveTileConfig();

  if (_tileLayer) { _map.removeLayer(_tileLayer); _tileLayer = null; }
  if (_labelsLayer) { _map.removeLayer(_labelsLayer); _labelsLayer = null; }

  // Capa base (el fondo). Lleva la clase owm-base-layer para que el filtro
  // de color solo afecte AQUÍ y no a las etiquetas.
  _tileLayer = L.tileLayer(cfg.url, {
    maxZoom: 19,
    subdomains: "abc", // necesario para CARTO ({s})
    attribution: cfg.attribution,
    className: "owm-base-layer"
  }).addTo(_map);

  // Capa opcional de SOLO etiquetas, por encima y sin oscurecer.
  if (cfg.labelsUrl) {
    _labelsLayer = L.tileLayer(cfg.labelsUrl, {
      maxZoom: 19,
      subdomains: "abc",
      className: "owm-labels-layer",
      pane: "overlayPane" // siempre por encima del fondo
    }).addTo(_map);
  }

  if (_panel) {
    _panel.classList.remove("owm-theme-vampire", "owm-theme-carto", "owm-theme-coc", "owm-theme-dg");
    if (cfg.filterClass) _panel.classList.add(cfg.filterClass);
  }
}

// Recarga teselas en caliente (al cambiar el tema o la clave en ajustes).
function reloadTiles() {
  if (_map) {
    applyTileLayer();
    renderMarkers(); // los pines siguen al tema (gota vampírica / círculo normal)
  }
}

function initMap() {
  const view = game.settings.get(MODULE_ID, "startView") ?? { lat: 51.505, lng: -0.09, zoom: 5 };

  _map = L.map("osm-world-map-canvas").setView([view.lat, view.lng], view.zoom);
  applyTileLayer();

  _markerLayer = L.layerGroup().addTo(_map);

  try {
    if (L.Control && L.Control.Geocoder) {
      L.Control.geocoder({
        defaultMarkGeocode: true,
        collapsed: false, // barra de búsqueda siempre visible (para DJ y jugadores)
        placeholder: t10n("OSMWM.Search.Placeholder"),
        errorMessage: t10n("OSMWM.Search.NotFound")
      }).addTo(_map);
    } else {
      console.warn(`${MODULE_ID} | el plugin del buscador (Geocoder) no está disponible.`);
      ui.notifications.warn(t10n("OSMWM.Notify.SearchFailed"));
    }
  } catch (e) {
    console.error(`${MODULE_ID} | error al añadir el buscador`, e);
  }

  _map.on("click", onMapClick);
  renderMarkers();
  setTimeout(() => _map.invalidateSize(), 60);

  // Al redimensionar el panel (resize: both), Leaflet no se entera del nuevo
  // tamaño y deja el área extra en blanco. Lo observamos y recalculamos.
  if (window.ResizeObserver && _panel && !_resizeObserver) {
    _resizeObserver = new ResizeObserver(() => {
      if (!_map) return;
      if (_resizeRaf) cancelAnimationFrame(_resizeRaf);
      _resizeRaf = requestAnimationFrame(() => _map.invalidateSize());
    });
    _resizeObserver.observe(_panel);
  }
}

// =====================================================================
//  Pines enlazados a diarios
// =====================================================================
function getMarkers() {
  return game.settings.get(MODULE_ID, "markers") ?? [];
}

function renderMarkers() {
  if (!_map || !_markerLayer || !window.L) return;
  _markerLayer.clearLayers();
  const isGM = game.user.isGM;
  for (const m of getMarkers()) {
    if (!isGM && !m.visible) continue; // los jugadores no ven los pines ocultos
    const marker = L.marker([m.lat, m.lng], { icon: makeIcon(m.type) }).addTo(_markerLayer);
    if (isGM && !m.visible) {
      marker.setOpacity(0.55); // el DJ ve los ocultos atenuados
      marker.bindTooltip(t10n("OSMWM.Tooltip.HiddenFromPlayers"), { direction: "top" });
    }
    marker.bindPopup(() => buildPopup(m));
  }
}

function buildPopup(m) {
  const wrap = document.createElement("div");
  wrap.className = "owm-popup";

  const title = document.createElement("strong");
  title.textContent = m.label || t10n("OSMWM.Popup.DefaultLabel");
  wrap.appendChild(title);

  // Información visible para todos
  if (m.note) {
    const note = document.createElement("div");
    note.className = "owm-note";
    note.textContent = m.note;
    wrap.appendChild(note);
  }

  // Información secreta: solo la ve el DJ
  if (game.user.isGM && m.secret) {
    const secret = document.createElement("div");
    secret.className = "owm-secret";
    const tag = document.createElement("em");
    tag.textContent = t10n("OSMWM.Popup.SecretTag");
    const txt = document.createElement("span");
    txt.textContent = m.secret;
    secret.appendChild(tag);
    secret.appendChild(txt);
    wrap.appendChild(secret);
  }

  if (m.journalUuid) {
    const btn = document.createElement("button");
    btn.textContent = t10n("OSMWM.Popup.OpenJournal");
    btn.addEventListener("click", async () => {
      const doc = await fromUuid(m.journalUuid);
      if (doc?.sheet) doc.sheet.render(true);
      else ui.notifications.warn(t10n("OSMWM.Notify.JournalMissing"));
    });
    wrap.appendChild(btn);
  }

  if (game.user.isGM) {
    const tools = document.createElement("div");
    tools.className = "owm-pin-tools";

    const vis = document.createElement("button");
    vis.className = "owm-vis";
    vis.textContent = m.visible ? t10n("OSMWM.Popup.Hide") : t10n("OSMWM.Popup.Reveal");
    vis.addEventListener("click", () => toggleMarkerVisibility(m.id));
    tools.appendChild(vis);

    const edit = document.createElement("button");
    edit.textContent = t10n("OSMWM.Popup.Edit");
    edit.addEventListener("click", () => editMarker(m.id));
    tools.appendChild(edit);

    const del = document.createElement("button");
    del.className = "owm-del";
    del.textContent = t10n("OSMWM.Popup.Delete");
    del.addEventListener("click", () => removeMarker(m.id));
    tools.appendChild(del);

    wrap.appendChild(tools);
  }

  return wrap;
}

function onMapClick(ev) {
  if (_routingControl) {
    addRouteWaypoint(ev.latlng);
    return;
  }
  if (_addPinMode && game.user.isGM) {
    handleAddPin(ev.latlng);
  }
}

async function handleAddPin(latlng) {
  const data = await promptPinDialog();
  if (!data) return;
  const markers = foundry.utils.deepClone(getMarkers());
  markers.push({
    id: foundry.utils.randomID(),
    lat: latlng.lat,
    lng: latlng.lng,
    label: data.label,
    type: data.type,
    note: data.note,
    secret: data.secret,
    journalUuid: data.journalUuid,
    visible: data.visible
  });
  await game.settings.set(MODULE_ID, "markers", markers);
  setAddPinMode(false);
}

async function editMarker(id) {
  const markers = getMarkers();
  const m = markers.find((x) => x.id === id);
  if (!m) return;
  const data = await promptPinDialog(m);
  if (!data) return;
  const updated = markers.map((x) =>
    x.id === id
      ? { ...x, label: data.label, type: data.type, note: data.note, secret: data.secret, journalUuid: data.journalUuid, visible: data.visible }
      : x
  );
  await game.settings.set(MODULE_ID, "markers", updated);
}

async function toggleMarkerVisibility(id) {
  const markers = getMarkers().map((m) => (m.id === id ? { ...m, visible: !m.visible } : m));
  await game.settings.set(MODULE_ID, "markers", markers);
}

async function removeMarker(id) {
  const markers = getMarkers().filter((m) => m.id !== id);
  await game.settings.set(MODULE_ID, "markers", markers);
}

function setAddPinMode(on) {
  _addPinMode = on;
  if (_panel) _panel.classList.toggle("owm-add-mode", on);
  if (on) ui.notifications.info(t10n("OSMWM.Notify.AddPinMode"));
}

function escapeHtml(s) {
  return foundry.utils?.escapeHTML ? foundry.utils.escapeHTML(s) : String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function promptPinDialog(initial = {}) {
  const journals = [...game.journal.contents].sort((a, b) => a.name.localeCompare(b.name));
  const options = [
    `<option value="">${t10n("OSMWM.Form.JournalNone")}</option>`,
    ...journals.map((j) => `<option value="${j.uuid}"${initial.journalUuid === j.uuid ? " selected" : ""}>${escapeHtml(j.name)}</option>`)
  ].join("");

  const typeOptions = Object.entries(PIN_TYPES)
    .map(([k, v]) => `<option value="${k}"${(initial.type || "generic") === k ? " selected" : ""}>${escapeHtml(t10n(v.label))}</option>`)
    .join("");

  const content = `
    <div class="owm-form">
      <label>${t10n("OSMWM.Form.Label")}</label>
      <input type="text" name="label" placeholder="${t10n("OSMWM.Form.LabelPlaceholder")}" value="${escapeHtml(initial.label ?? "")}" autofocus/>
      <label>${t10n("OSMWM.Form.Type")}</label>
      <select name="type">${typeOptions}</select>
      <label>${t10n("OSMWM.Form.Note")}</label>
      <textarea name="note" rows="2" placeholder="${t10n("OSMWM.Form.NotePlaceholder")}">${escapeHtml(initial.note ?? "")}</textarea>
      <label>${t10n("OSMWM.Form.Secret")}</label>
      <textarea name="secret" rows="2" placeholder="${t10n("OSMWM.Form.SecretPlaceholder")}">${escapeHtml(initial.secret ?? "")}</textarea>
      <label>${t10n("OSMWM.Form.Journal")}</label>
      <select name="journal">${options}</select>
      <label class="owm-check"><input type="checkbox" name="visible"${initial.visible ? " checked" : ""}/> ${t10n("OSMWM.Form.Visible")}</label>
    </div>`;

  const read = (root) => ({
    label: root.querySelector('[name="label"]')?.value || t10n("OSMWM.Popup.DefaultLabel"),
    type: root.querySelector('[name="type"]')?.value || "generic",
    note: root.querySelector('[name="note"]')?.value || "",
    secret: root.querySelector('[name="secret"]')?.value || "",
    journalUuid: root.querySelector('[name="journal"]')?.value || null,
    visible: !!root.querySelector('[name="visible"]')?.checked
  });

  const DV2 = foundry.applications?.api?.DialogV2;
  if (DV2) {
    let result = null;
    try {
      result = await DV2.wait(
        {
          window: { title: initial.id ? t10n("OSMWM.Dialog.Edit") : t10n("OSMWM.Dialog.New") },
          content,
          buttons: [
            {
              action: "ok",
              label: t10n("OSMWM.Dialog.Save"),
              default: true,
              callback: (event, button, dialog) => read(dialog?.element ?? button?.form ?? document)
            },
            { action: "cancel", label: t10n("OSMWM.Dialog.Cancel") }
          ]
        },
        { rejectClose: false }
      );
    } catch (e) {
      result = null;
    }
    return result && typeof result === "object" ? result : null;
  }

  // Respaldo para versiones antiguas (Dialog clásico)
  return await new Promise((resolve) => {
    new Dialog({
      title: initial.id ? t10n("OSMWM.Dialog.Edit") : t10n("OSMWM.Dialog.New"),
      content,
      buttons: {
        ok: { label: t10n("OSMWM.Dialog.Save"), callback: (html) => resolve(read(html[0] ?? html)) },
        cancel: { label: t10n("OSMWM.Dialog.Cancel"), callback: () => resolve(null) }
      },
      default: "ok",
      close: () => resolve(null)
    }).render(true);
  });
}

// =====================================================================
//  Rutas con tiempo estimado (OSRM) + enganche a Calendaria
// =====================================================================
function toggleRouting() {
  if (!_map) return;
  if (_routingControl) {
    _map.removeControl(_routingControl);
    _routingControl = null;
    _routeWaypoints = [];
    _lastRoute = null;
    setRouteInfo("");
    ui.notifications.info(t10n("OSMWM.Notify.RouteOff"));
    return;
  }
  if (!L.Routing) {
    ui.notifications.warn(t10n("OSMWM.Notify.RoutePluginFailed"));
    return;
  }
  _routeWaypoints = [];
  _routingControl = L.Routing.control({
    waypoints: [],
    router: L.Routing.osrmv1({ serviceUrl: "https://router.project-osrm.org/route/v1" }),
    routeWhileDragging: false,
    showAlternatives: false,
    addWaypoints: true,
    fitSelectedRoutes: true,
    geocoder: (L.Control.Geocoder) ? L.Control.Geocoder.nominatim() : undefined
  }).addTo(_map);

  _routingControl.on("routesfound", (e) => {
    const r = e.routes?.[0];
    if (!r?.summary) return;
    _lastRoute = { distance: r.summary.totalDistance, time: r.summary.totalTime };
    const km = (r.summary.totalDistance / 1000).toFixed(1);
    const mins = Math.round(r.summary.totalTime / 60);
    setRouteInfo(`<i class="fa-solid fa-route"></i> ${km} km · ~${formatDuration(mins)} ${calendariaButtonHtml()}`);
    wireCalendariaButton();
  });

  ui.notifications.info(t10n("OSMWM.Notify.RouteMode"));
}

function addRouteWaypoint(latlng) {
  if (_routeWaypoints.length >= 2) _routeWaypoints = [];
  _routeWaypoints.push(latlng);
  _routingControl.setWaypoints(_routeWaypoints);
}

function calendariaButtonHtml() {
  const ok = game.modules.get("calendaria")?.active && window.CALENDARIA?.api?.advanceTime;
  return ok ? `<button class="owm-cal-btn"><i class="fa-solid fa-clock"></i> ${t10n("OSMWM.Route.AdvanceClock")}</button>` : "";
}

function wireCalendariaButton() {
  const btn = _panel?.querySelector(".owm-cal-btn");
  if (!btn) return;
  btn.addEventListener(
    "click",
    async () => {
      if (!_lastRoute) return;
      const minutes = Math.max(1, Math.round(_lastRoute.time / 60));
      try {
        // Nota: verifica la firma de advanceTime en tu versión de Calendaria.
        await CALENDARIA.api.advanceTime({ minute: minutes });
        ui.notifications.info(t10n("OSMWM.Notify.ClockAdvanced", { dur: formatDuration(minutes) }));
      } catch (e) {
        console.error(e);
        ui.notifications.warn(t10n("OSMWM.Notify.ClockFailed"));
      }
    },
    { once: true }
  );
}

function setRouteInfo(html) {
  const el = _panel?.querySelector(".owm-route-info");
  if (!el) return;
  if (!html) {
    el.hidden = true;
    el.innerHTML = "";
  } else {
    el.hidden = false;
    el.innerHTML = html;
  }
}

// =====================================================================
//  Utilidades
// =====================================================================
function formatDuration(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function makeDraggable(panel, handle) {
  let offX = 0;
  let offY = 0;
  let dragging = false;
  handle.addEventListener("mousedown", (e) => {
    if (e.target.closest("button")) return;
    dragging = true;
    const r = panel.getBoundingClientRect();
    offX = e.clientX - r.left;
    offY = e.clientY - r.top;
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    panel.style.left = e.clientX - offX + "px";
    panel.style.top = e.clientY - offY + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
  });
}
