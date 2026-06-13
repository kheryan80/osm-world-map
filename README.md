# OSM World Map (prototipo v0.1)

[![Versión](https://img.shields.io/github/v/release/kheryan80/osm-world-map?label=versión&color=8a2020)](https://github.com/kheryan80/osm-world-map/releases)
[![Descargas](https://img.shields.io/github/downloads/kheryan80/osm-world-map/total?label=descargas&color=8a2020)](https://github.com/kheryan80/osm-world-map/releases)

Un módulo para **Foundry VTT** que muestra un **mapa del mundo real** (OpenStreetMap)
dentro del juego, con:

- **Pines enlazados a entradas de diario**: el DJ coloca pines en el mapa; al pulsarlos, se abre el diario de ese lugar.
- **Imagen opcional por pin**: al pasar el ratón por un pin con imagen, esta se muestra grande abajo a la izquierda de la pantalla de Foundry (estilo *Image Hover*), sin tapar el mapa. Admite imágenes y vídeos, y se elige con el explorador de archivos de Foundry o por URL.
- **Visibilidad del nombre por pin**: como con los tokens de Foundry, cada pin puede mostrar su nombre **siempre** (por defecto), **solo al pasar el ratón** o **nunca**.
- **Buscador de direcciones/lugares** (geocodificador Nominatim de OSM): escribe un sitio y el mapa vuela allí.
- **Rutas con distancia y tiempo estimado** (motor OSRM).
- **Enganche con Calendaria**: un botón avanza el reloj del juego según el tiempo de la ruta (si tienes Calendaria instalado).

> Pensado como pieza de "mapa del mundo / viaje". Para generar **escenas de combate** a partir de
> lugares reales usa el módulo aparte **OFM Map Canvas** (FantasyMaps), que crea escenas con muros desde OSM.

---

## Ambientaciones (skins) — v0.7

> Desde v1.2 el **color del mapa** y el **estilo de los iconos** se eligen por separado en la configuración del módulo. Puedes combinarlos libremente (p. ej. mapa normal con iconos de Delta Green, o mapa vampírico con iconos de Cthulhu). Por defecto, los iconos siguen al estilo del mapa.

En *Gestionar módulos → Configurar ajustes → OSM World Map* tienes **Tema visual del mapa**:

- **Normal (OpenStreetMap)** — el de siempre.
- **CARTO oscuro + tinte rojo (sin clave)** — base oscura de CARTO con tinte rojo sangre. El tinte se aplica solo al fondo; las **etiquetas** (calles y lugares) van en una capa aparte por encima y **aclaradas**, para que se lean bien.

- **La Llamada de Cthulhu — mapa sepia envejecido** — mapa claro de CARTO filtrado a tonos pergamino/tinta, con pines en forma de **sello de cera** y glifo crema. Lo sobrenatural (criatura/anomalía, culto, peligro) late con un brillo **verde mythos**.
- **Delta Green — oscuro clasificado verde** — base oscura con tinte **verde frío** y etiquetas en verde fósforo, con pines en forma de **rombo "clasificado"**. Peligro y anomalía parpadean como una **baliza/escáner**.

Con cualquier tema vampírico activo, **los pines también cambian**: pasan de los círculos de color por tipo a una **gota roja sangre con borde negro** y el símbolo del lugar en tono hueso (se conserva la distinción pueblo / torre / PNJ / peligro…). Con el tema «Normal» vuelven a los círculos de siempre. Algunos tipos tienen un detalle propio bajo tema vampírico: **casa franca** = borde plateado; **iglesia/templo** = halo **dorado** con parpadeo de vela; **guarida vampírica** = latido **lento y suave** (vampiro dormido); **peligro** = pulso **rápido y nervioso**, tipo baliza de alarma. Todas las animaciones se desactivan si el sistema pide menos movimiento. El filtro se aplica **solo a las teselas del mapa**: pines, popups, buscador y panel de rutas siguen legibles. Puedes afinar la intensidad del rojo en `styles/osm-world-map.css` (reglas `.owm-theme-vampire .leaflet-tile` y `.owm-theme-carto .leaflet-tile`).

> Nota: un mapa navegable (teselas) se *acerca* a la estética de póster, pero no la iguala. Para un render idéntico al ejemplo (textura, viñeta, solo calles) habría que rasterizar OSM con una herramienta de render aparte, y se pierde la navegación.

---

### Tipos de pin

Además de los de siempre (ciudad, torre, casa franca, PNJ, pista, peligro, iglesia, puerto, guarida vampírica), hay tres tipos genéricos útiles para cualquier ambientación: **culto/ocultismo** (ojo), **criatura/anomalía** (pulpo) y **archivo/biblioteca** (libro). Cada skin les da su propio icono y estilo; los pines que ya tengas creados siguen funcionando al cambiar de ambientación.

## Idiomas / Languages

La interfaz del módulo está localizada con el sistema nativo de Foundry (no necesita Babele). Foundry elige el idioma según el del cliente. Idiomas incluidos: **español, inglés, francés, alemán, italiano y portugués (Brasil)**; para cualquier otro idioma se muestra el inglés. Los textos están en `lang/<código>.json`; para añadir otro idioma basta con copiar `lang/en.json`, traducir los valores y declararlo en `module.json` → `languages`.

The module UI is localized with Foundry's native system (no Babele needed). Bundled languages: Spanish, English, French, German, Italian and Brazilian Portuguese; any other client language falls back to English. Translations of fr/de/it/pt-BR are a solid starting point and welcome native-speaker review (e.g. via Foundry Hub Weblate).

## Instalación

1. Copia la carpeta `osm-world-map` dentro de `Data/modules/` de tu Foundry
   (o comprímela en un `.zip` y úsala con "Instalar módulo" → Manifest, si la subes a algún sitio).
2. Reinicia Foundry, entra en tu mundo y activa **OSM World Map** en *Gestionar módulos*.
3. Como estás en Foundry v14, puede mostrarte un aviso de "no verificado para tu versión": es normal en un prototipo, actívalo igualmente.

## Uso

- Abre el mapa con **Ctrl+M**, con el **botón del globo terráqueo** en los controles de escena,
  o desde un macro:
  ```js
  game.modules.get("osm-world-map").api.open();
  ```
- **Buscar**: usa la lupa del mapa (arriba a la derecha del mapa) para ir a una dirección o lugar.
- **Añadir un pin** (solo DJ): pulsa el icono de chincheta, haz clic en el mapa, pon una etiqueta
  y opcionalmente enlaza una entrada de diario. Los pines se guardan en el mundo y los ven todos.
- **Eliminar un pin** (solo DJ): pulsa el pin y luego "Eliminar pin".
- **Ruta**: pulsa el icono de ruta, haz clic en el origen y en el destino. Aparece la distancia y el
  tiempo estimado; si tienes Calendaria, sale un botón para avanzar el reloj ese tiempo.

## Ajustes (config del módulo)

- **URL de teselas del mapa**: por defecto OpenStreetMap. Puedes cambiarlo a otro servidor de teselas.

---

## Notas técnicas y cosas a tener en cuenta

- **Librerías incluidas**: desde la v0.4 el módulo trae Leaflet y sus plugins dentro (carpeta `lib/`),
  así que el buscador y las rutas funcionan aunque no haya CDN. Lo que SÍ necesita internet es lo online:
  las **teselas del mapa** (servidor de OpenStreetMap), las **búsquedas** (Nominatim) y las **rutas** (OSRM).
- **OpenStreetMap / Nominatim / OSRM** son servicios comunitarios con **políticas de uso**: para una mesa
  privada van de sobra, pero no conviene abusar. Para uso intensivo o fiabilidad total, usa una clave de un
  proveedor (OpenRouteService, GraphHopper…) o autoaloja los servicios. Recuerda mantener la **atribución** a OSM.
- **Calendaria**: el botón llama a `CALENDARIA.api.advanceTime({ minute: N })`. Si tu versión de Calendaria
  usa otra firma, ajústala en la función `wireCalendariaButton()`.
- **Rutas**: los tiempos son de transporte moderno (coche). Perfecto para la capa contemporánea de la campaña;
  para épocas históricas usarás tiempos narrativos a mano.
- **Botón de controles de escena**: se añade "a mejor esfuerzo"; si en tu versión no aparece, usa Ctrl+M o el macro.


## Publicar en GitHub

¿Quieres compartirlo? El módulo ya trae todo lo necesario: `LICENSE` (MIT, para el código propio), `CREDITS.md` (librerías y políticas de uso de OSM/Nominatim/OSRM/CARTO) y `module.json` con el patrón de *release* de GitHub. Sigue **`PUBLICAR_EN_GITHUB.md`** paso a paso (crear repo, hacer un release con `module.json` + `module.zip`, e instalar desde Foundry con la URL del manifiesto). Recuerda mantener la atribución a OpenStreetMap y avisar del uso responsable de los servicios gratuitos.

## Descargo de responsabilidad / Disclaimer

**ES —** Este módulo se ofrece «tal cual», sin garantía de ningún tipo (ver la licencia MIT en `LICENSE`). Lo usas bajo tu propia responsabilidad; el autor no se hace responsable de pérdidas de datos, interrupciones del servicio ni de cualquier daño derivado de su uso. Muestra datos y mapas de **servicios de terceros** (OpenStreetMap, Nominatim, OSRM, CARTO) sujetos a sus propias condiciones y políticas de uso, cuya disponibilidad no está garantizada (ver `CREDITS.md`); mantén siempre la atribución a OpenStreetMap. Es una herramienta **no oficial** hecha por aficionados, no afiliada ni respaldada por Foundry Gaming LLC, OpenStreetMap/CARTO ni por los titulares de los juegos citados: *Call of Cthulhu* es marca de Chaosium Inc.; *Delta Green* es marca de The Delta Green Partnership. Las marcas y nombres pertenecen a sus respectivos propietarios y se usan solo con fines descriptivos.

**EN —** This module is provided "as is", without warranty of any kind (see the MIT license in `LICENSE`). You use it at your own risk; the author is not liable for data loss, service outages, or any damage arising from its use. It displays data and maps from **third-party services** (OpenStreetMap, Nominatim, OSRM, CARTO) subject to their own terms and usage policies, whose availability is not guaranteed (see `CREDITS.md`); always keep the OpenStreetMap attribution. This is an **unofficial**, fan-made tool, not affiliated with or endorsed by Foundry Gaming LLC, OpenStreetMap/CARTO, or the rights holders of the games referenced: *Call of Cthulhu* is a trademark of Chaosium Inc.; *Delta Green* is a trademark of The Delta Green Partnership. All trademarks and names belong to their respective owners and are used for descriptive purposes only.

## Estado

Esto es un **v0.1 para probar el concepto**. Funciona, pero es deliberadamente sencillo. Próximos pasos posibles:
guardar/centrar "vista de inicio", capas (mundo/ciudad), iconos personalizados por tipo de nodo, colocar pines
arrastrando desde un diario, librerías alojadas localmente, y pulir el enganche con Calendaria.
