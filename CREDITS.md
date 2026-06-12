# Créditos y licencias de terceros

El código propio de este módulo (`scripts/`, `styles/`, `module.json`) se
publica bajo licencia **MIT** (ver `LICENSE`). Además, el módulo **incluye**
librerías de terceros y **usa** servicios y datos cartográficos en línea, cada
uno con su propia licencia o política de uso. Mantén estos avisos al
redistribuir.

> Nota: esto es información, no asesoría legal. Antes de publicar, conviene que
> verifiques cada licencia y política en su fuente oficial.

## Librerías incluidas (carpeta `lib/`)

| Librería | Versión | Licencia | Web |
|---|---|---|---|
| Leaflet | 1.9.4 | BSD-2-Clause | https://leafletjs.com |
| Leaflet Routing Machine | — | ISC | https://www.liedman.net/leaflet-routing-machine/ |
| Leaflet Control Geocoder | — | BSD-2-Clause | https://github.com/perliedman/leaflet-control-geocoder |

Recomendado: conserva el aviso de copyright de cada librería (van en las
cabeceras de sus propios archivos dentro de `lib/`). Si quieres ser estricto,
añade una copia de cada `LICENSE` original junto a la librería correspondiente.

## Servicios y datos en línea (requieren conexión)

- **OpenStreetMap** — los datos del mapa son © colaboradores de OpenStreetMap,
  bajo la **Open Database License (ODbL)**. La atribución a OSM debe mantenerse
  visible (el módulo ya la muestra en el mapa). https://www.openstreetmap.org/copyright
- **Teselas de openstreetmap.org** — sujetas a la *Tile Usage Policy* de la
  OSMF (uso razonable; no apto para tráfico intensivo). https://operations.osmfoundation.org/policies/tiles/
- **Nominatim** (buscador) — política de uso de la OSMF (máx. 1 petición/seg,
  sin uso masivo). https://operations.osmfoundation.org/policies/nominatim/
- **OSRM** (rutas) — el servidor de demostración es solo para pruebas/desarrollo,
  no para producción. http://project-osrm.org/
- **CARTO basemaps** (temas Vampiro-CARTO, Cthulhu, Delta Green) — uso gratuito
  con atribución y límites de uso razonable. https://carto.com/attributions

### Uso responsable (importante para una versión pública)

Los endpoints por defecto (teselas de OSM, Nominatim, OSRM, CARTO) son
servicios comunitarios o gratuitos pensados para uso moderado. Para una mesa
privada van de sobra. Si este módulo lo usa mucha gente a la vez, conviene que
cada cual:

- ponga su propia clave de un proveedor (MapTiler, OpenRouteService,
  GraphHopper…), o
- autoaloje los servicios (servidor de teselas, Nominatim, OSRM).

En todos los casos hay que **mantener la atribución a OpenStreetMap**.

## Iconos

Los pines usan iconos de **Font Awesome Free** (incluido en Foundry VTT) y
algunos glifos SVG propios (colmillos, ojo, tentáculo) creados para este módulo,
cubiertos por la licencia MIT del módulo.
