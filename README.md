# LexiFrançais — PWA (instalable, sin Play Store)

App de flashcards con SM-2 para el TCF Canada. Funciona 100% offline
después de la primera carga. IndexedDB en vez de SQLite, CSS/JS puro
(sin frameworks ni dependencias externas: todo funciona sin conexión
desde el primer momento, incluidas las fuentes).

**Ya se probó de extremo a extremo con un navegador real (Chromium vía
Playwright):** importar CSV ✔, voltear tarjeta ✔, algoritmo SM-2 ✔,
**funcionamiento completo sin conexión tras la primera carga ✔.**

---

## Opción A — GitHub Pages (recomendada, gratis, HTTPS automático)

1. Crea una cuenta en [github.com](https://github.com) si no tienes una.
2. Crea un repositorio nuevo (puede ser público o privado), por ejemplo
   `lexifrancais`.
3. Sube TODOS los archivos de esta carpeta (`index.html`, `manifest.json`,
   `sw.js`, `css/`, `js/`, `icons/`, `assets/`) a la raíz del repositorio.
   - Más fácil: arrastra la carpeta completa a la página web de GitHub
     ("uploading an existing file") o usa `git push` si ya usas git.
4. Ve a **Settings → Pages** del repositorio.
5. En "Source", elige la rama `main` y la carpeta `/ (root)`. Guarda.
6. Espera 1-2 minutos. GitHub te dará una URL como:
   `https://tu-usuario.github.io/lexifrancais/`
7. Abre esa URL desde el navegador Chrome de tu celular Android.
8. Chrome mostrará un banner "Instalar LexiFrançais" (o ve al menú ⋮ →
   "Agregar a pantalla de inicio" / "Instalar app").
9. Listo: queda como ícono en tu pantalla de inicio, abre en pantalla
   completa como una app nativa, y funciona sin conexión.

## Opción B — Servidor local en tu PC + mismo wifi que el celular

1. Instala Python si no lo tienes (la mayoría de PCs ya lo traen).
2. Abre una terminal en esta carpeta y corre:
   ```bash
   python3 -m http.server 8000
   ```
3. Busca la IP local de tu PC:
   - Windows: `ipconfig` (busca "Dirección IPv4")
   - Mac/Linux: `ifconfig` o `ip addr` (busca algo como 192.168.x.x)
4. Conecta tu celular a la **misma red wifi** que tu PC.
5. En el navegador Chrome del celular, abre:
   `http://TU_IP_LOCAL:8000/index.html` (ej: `http://192.168.1.42:8000/index.html`)
6. Ve al menú ⋮ → "Agregar a pantalla de inicio" / "Instalar app".

**Limitación de la Opción B:** solo funciona mientras tu PC esté prendida
y sirviendo la carpeta, y ambos dispositivos estén en la misma red. Si
apagas el servidor, la app YA INSTALADA en tu celular sigue abriendo y
funcionando offline (el Service Worker ya guardó todo en caché), pero no
podrás volver a instalarla desde cero sin el servidor corriendo.

**Por eso la Opción A (GitHub Pages) es más práctica a largo plazo:**
queda accesible siempre, sin depender de tu PC.

---

## Cómo probarlo hoy mismo (con cualquiera de las dos opciones)

1. Abre la app.
2. Toca **"📄 Importar vocabulario (CSV)"** y selecciona
   `assets/sample_vocabulario.csv` (incluido, 10 palabras A1-B1) o tu
   propio CSV con las mismas columnas.
3. Vuelve al inicio: verás "10 palabras en tu vocabulario" y "Pendientes
   hoy: 10".
4. Toca **"Estudiar"**. Toca la tarjeta para que gire y veas el
   significado. Usa 🔊 para escuchar la pronunciación (usa la voz de tu
   propio teléfono/navegador, sin conexión).
5. Marca 😊 / 😐 / 😞 — el algoritmo SM-2 decide cuándo te toca repasar
   esa palabra otra vez.

## Formato del CSV

```
mot,traduction,type,niveau,genre,plural,expression,example,present,passeCompose
```
Solo `mot` y `traduction` son obligatorias.

## Qué quedó fuera de esta versión (a propósito, por velocidad)

- Buscar palabra suelta, Favoritos, notificaciones programadas.
- Todo esto se puede agregar después sin rehacer lo ya construido.

## Nota técnica

Esta PWA se generó y se probó en un entorno sin Flutter. Toda la lógica
(SM-2, importación CSV, flip card) es la misma que ya habíamos diseñado,
solo que portada a JavaScript vanilla + IndexedDB en vez de Dart + SQLite.
