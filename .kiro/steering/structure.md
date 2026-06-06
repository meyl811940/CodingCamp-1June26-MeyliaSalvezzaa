# Project Structure

```
CodingCamp-1June26-MeyliaSalvezza/
├── index.html          # Single HTML entry point; loads css/style.css and js/app.js
├── css/
│   └── style.css       # All styles — layout, theme, widget-specific rules
├── js/
│   └── app.js          # All JavaScript logic — widgets, timer, localStorage, event handlers
└── .kiro/
    ├── specs/
    │   └── todo-life-dashboard/   # Feature spec for the dashboard
    │       ├── requirements.md
    │       ├── design.md
    │       └── tasks.md
    └── steering/       # AI assistant guidance files
```

## Key Conventions

- **One HTML file, one CSS file, one JS file** — do not split into multiple scripts or stylesheets.
- All widget logic lives in `js/app.js`; organize with clear section comments (e.g., `// === GREETING WIDGET ===`).
- CSS classes use kebab-case (e.g., `focus-timer`, `todo-item`, `quick-link-btn`).
- LocalStorage keys are `"dashboard_tasks"` and `"dashboard_links"` — do not change these.
- Task objects: `{ id: string, title: string, completed: boolean }`
- Link objects: `{ id: string, label: string, url: string }`
- IDs are generated client-side (e.g., `crypto.randomUUID()` or `Date.now().toString()`).

## Layout

The dashboard uses a responsive grid/flex layout:
- **≥ 1280px**: all four widgets visible in the viewport without vertical scroll (min 200×200px each)
- **< 1280px**: single-column vertical stack; widgets scroll internally if needed
