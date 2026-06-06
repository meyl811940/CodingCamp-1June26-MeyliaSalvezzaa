# Tech Stack

## Core Technologies

- **HTML5** — single `index.html` entry point
- **CSS3** — all styles in `css/style.css` (no inline styles, no `<style>` tags)
- **Vanilla JavaScript (ES6+)** — all logic in `js/app.js` (no frameworks, no libraries, no build tools)

## Browser APIs Used

- `localStorage` — data persistence for tasks and links
- `setInterval` / `clearInterval` — timer countdown and clock updates
- `JSON.stringify` / `JSON.parse` — serialization of task and link arrays

## Constraints

- No build step, no bundler, no transpiler — the files run directly in the browser
- No external dependencies or CDN imports
- Must work without polyfills in latest stable Chrome, Firefox, Edge, and Safari
- No inline `style` attributes or extra `<script>` tags beyond the single `js/app.js` loader

## Common Commands

Since there is no build system, open `index.html` directly in a browser or serve it with any static file server:

```bash
# Python (quick local server)
python -m http.server 8080

# Node.js (if npx is available)
npx serve .
```

No install, compile, or test commands are required.
