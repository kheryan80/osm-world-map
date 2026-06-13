# Cómo publicar este módulo en GitHub

Guía rápida para que cualquiera pueda instalarlo desde Foundry pegando una URL.
Sustituye `kheryan80` por tu usuario real de GitHub en todos los sitios.

## 0. Antes de empezar

Edita estos campos con tus datos:

- `module.json` → `authors[0].name`, y las URLs `readme`, `url`, `manifest`,
  `download` (cambia `kheryan80`).
- `LICENSE` → pon tu nombre en la línea de copyright.
- `CREDITS.md` → revisa que las atribuciones te encajan.

> Si me dices tu usuario de GitHub, te dejo el `module.json` ya rellenado.

## 1. Crear el repositorio

1. En GitHub: **New repository** → nombre exactamente **`osm-world-map`**
   (debe coincidir con el `id` del módulo) → público.
2. Sube el contenido de la carpeta `osm-world-map/` a la raíz del repo
   (que en la raíz estén `module.json`, `scripts/`, `styles/`, `lib/`, etc.).
   Puedes arrastrarlos en **Add file → Upload files**, o usar git por consola.

## 2. Publicar una versión (release)

Foundry instala y actualiza a partir de *releases* de GitHub:

1. En el repo: **Releases → Draft a new release**.
2. **Tag**: `v1.3.1` (que coincida con `version` en `module.json`).
3. Sube **dos archivos** a ese release:
   - `module.json` (el del repo, tal cual).
   - `module.zip` → un zip que contenga la **carpeta** `osm-world-map/` con todo
     dentro (igual que el que te paso). Renómbralo a `module.zip`.
4. **Publish release**.

Con el patrón `releases/latest/download/...` del `module.json`, Foundry siempre
cogerá la última versión que publiques, y los usuarios recibirán avisos de
actualización automáticamente.

## 3. Instalar desde Foundry (lo que hará la gente)

1. Foundry → **Complementos → Instalar módulo**.
2. En **URL del manifiesto** pegar:
   `https://github.com/kheryan80/osm-world-map/releases/latest/download/module.json`
3. **Instalar**. Listo.

## 4. Para próximas versiones

1. Sube `version` en `module.json` (p. ej. `0.7.1`).
2. Crea un nuevo release con el tag correspondiente y vuelve a subir
   `module.json` + `module.zip`.

## 5. Antes de difundirlo, repasa

- **Atribución**: el mapa muestra el crédito a OpenStreetMap (no lo quites).
- **Uso responsable**: lee la sección correspondiente en `CREDITS.md`. Conviene
  avisar en el README de que, para uso intensivo, cada cual ponga su propia
  clave o autoaloje los servicios.
- **Compatibilidad**: en `module.json`, `compatibility.verified` está en `"14.364"` (probado en v14).
  Cuando lo pruebes a fondo en v14, súbelo a `"14"`.
