# Implementation Plan: To Do List Life Dashboard

## Overview

This plan covers the full implementation of the To Do List Life Dashboard — a zero-dependency, client-side single-page application built with HTML5, CSS3, and Vanilla JavaScript (ES6+). Tasks progress from project scaffolding through the four widgets (Greeting, Focus Timer, To-Do List, Quick Links), data persistence infrastructure, responsive layout, and property-based correctness tests for all 14 properties defined in the design document.

## Tasks

- [x] 1. Scaffold project files
  - Create `index.html` with the base HTML5 document structure, `<link>` to `css/style.css`, and a single `<script defer src="js/app.js">` tag.
  - Create `css/style.css` as an empty file.
  - Create `js/app.js` as an empty file with section comment stubs (`// === INFRASTRUCTURE ===`, `// === GREETING WIDGET ===`, `// === FOCUS TIMER ===`, `// === TO-DO LIST ===`, `// === QUICK LINKS ===`, `// === INIT ===`).
  - The `index.html` must contain all four widget containers with the required IDs: `#greeting-time`, `#greeting-date`, `#greeting-msg`, `#timer-display`, `#timer-start`, `#timer-stop`, `#timer-reset`, `#timer-notification`, `#todo-input`, `#todo-add-btn`, `#todo-input-error`, `#todo-list`, `#link-label-input`, `#link-url-input`, `#link-add-btn`, `#link-label-error`, `#link-url-error`, `#link-limit-error`, `#links-grid`.
  - _Requirements: 7.3, 7.4_

- [x] 2. Implement the Infrastructure layer
  - Implement `isValidTask(item)` shape guard: checks `id` (string), `title` (string), `completed` (boolean).
  - Implement `isValidLink(item)` shape guard: checks `id` (string), `label` (string), `url` (string).
  - Implement `safeParse(key, validator)`: reads `localStorage[key]`, JSON-parses it, validates the result is a non-empty array where every item passes the validator; returns `[]` on any error (SecurityError, JSON parse failure, non-array, or any item failing the guard).
  - Implement `saveData(key, array)`: `JSON.stringify(array)` then `localStorage.setItem`; catches and silently ignores `SecurityError` and `QuotaExceededError`.
  - Declare global `let tasks = []` and `let links = []`.
  - Implement `initStorage()`: populates `tasks` from `safeParse('dashboard_tasks', isValidTask)` and `links` from `safeParse('dashboard_links', isValidLink)`.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3. Implement the Greeting Widget
  - Implement constant arrays for weekday names (`['Sunday', 'Monday', ..., 'Saturday']`) and month names (`['January', 'February', ..., 'December']`).
  - Implement `getGreeting(hour)`: returns `"Good Morning"` for `[5, 12)`, `"Good Afternoon"` for `[12, 18)`, `"Good Evening"` for `[18, 22)`, `"Good Night"` for `[22, 24) ∪ [0, 5)`.
  - Implement `formatTime(date)`: returns a string `HH:MM` using `getHours()` and `getMinutes()`, both zero-padded to 2 digits.
  - Implement `formatDate(date)`: returns `"Weekday, D Month YYYY"` using the constant arrays and `getDay()`, `getDate()`, `getMonth()`, `getFullYear()` — no leading zero on day.
  - Implement `greetingTick()`: compare `new Date().getMinutes()` to a module-level `lastRenderedMinute`; if changed, update `#greeting-time`, `#greeting-date`, and `#greeting-msg` in the DOM.
  - Implement `initGreeting()`: renders initial values to `#greeting-time`, `#greeting-date`, and `#greeting-msg`; sets `lastRenderedMinute`.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 4. Implement the Focus Timer
  - Declare `let timerState = 'idle'` and `let timerRemaining = 1500`.
  - Implement `renderTimerDisplay()`: formats `timerRemaining` as `MM:SS` (`Math.floor(timerRemaining / 60)` and `timerRemaining % 60`, both zero-padded) and sets `#timer-display` text content.
  - Implement `showTimerNotification()` / `dismissTimerNotification()`: toggles a `.visible` CSS class on `#timer-notification`.
  - Implement `startTimer()`: if `timerState === 'running'` do nothing; otherwise set `timerState = 'running'`.
  - Implement `stopTimer()`: if `timerState !== 'running'` do nothing; otherwise set `timerState = 'paused'`.
  - Implement `resetTimer()`: set `timerState = 'idle'` and `timerRemaining = 1500`; call `renderTimerDisplay()`; hide notification.
  - Implement `timerTick()`: if `timerState !== 'running'` return; set `timerRemaining = Math.max(0, timerRemaining - 1)`; call `renderTimerDisplay()`; if `timerRemaining <= 0` set `timerState = 'idle'` and call `showTimerNotification()`.
  - Implement `initTimer()`: calls `renderTimerDisplay()`; binds click listeners on `#timer-start`, `#timer-stop`, `#timer-reset`; binds dismiss listener on `#timer-notification`.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 5. Implement the To-Do List
  - Implement `renderTaskItem(task)`: returns an `<li class="todo-item" id="task-{id}">` element containing a `.todo-checkbox` button, a `.todo-title` span (with `completed` class and strikethrough when `task.completed === true`), a `.todo-edit-btn` button, a `.todo-delete-btn` button, a hidden `.todo-edit-input` input (max 100 chars), and a `.todo-edit-error` span.
  - Implement `renderTaskList()`: clears `#todo-list` and rebuilds it by appending `renderTaskItem(task)` for every item in the `tasks` array.
  - Implement `submitNewTask(rawInput)`: trims input; rejects empty/whitespace (show `#todo-input-error`); rejects length > 200 (show `#todo-input-error`); creates `{ id: crypto.randomUUID(), title: trimmed, completed: false }`; pushes to `tasks`; calls `saveData('dashboard_tasks', tasks)`; calls `renderTaskList()`; clears the input field and error.
  - Implement `toggleTask(taskId)`: finds the task by id; flips `completed`; calls `saveData`; re-renders only that `<li>` in place (replaces the existing element with a fresh `renderTaskItem` call to avoid full list re-render).
  - Implement `commitEdit(taskId, rawInput)`: trims; rejects empty (show `.todo-edit-error` on that item); updates `task.title`; calls `saveData`; exits edit mode and re-renders the item.
  - Implement edit mode open/close: clicking `.todo-edit-btn` hides `.todo-title` and shows `.todo-edit-input` pre-filled; Escape key exits without saving.
  - Implement `deleteTask(taskId)`: filters `tasks`; calls `saveData`; removes `#task-{taskId}` from DOM.
  - Bind `#todo-add-btn` click and `#todo-input` Enter keydown to `submitNewTask`.
  - Bind `#todo-list` delegated events for `.todo-checkbox`, `.todo-edit-btn`, `.todo-delete-btn`, `.todo-edit-input` (Enter/Escape).
  - Implement `initTodo()`: calls `renderTaskList()`; binds all events above.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 6. Implement Quick Links
  - Implement `isValidUrl(raw)`: trims; checks `startsWith('http://')` or `startsWith('https://')`; tries `new URL(trimmed)`; returns `u.hostname.length > 0`; returns `false` on any thrown error.
  - Implement `renderLinks()`: clears `#links-grid`; for each link in `links` appends a `<button class="quick-link-btn">` with the label text and a nested `<span class="quick-link-delete">` delete control.
  - Implement `submitNewLink(labelRaw, urlRaw)`: checks `links.length >= 20` (show `#link-limit-error`); checks trimmed label empty (show `#link-label-error`); checks `isValidUrl` (show `#link-url-error`); creates `{ id: crypto.randomUUID(), label, url }`; pushes to `links`; calls `saveData('dashboard_links', links)`; calls `renderLinks()`; clears form.
  - Implement `openLink(url)`: calls `window.open(url, '_blank', 'noopener,noreferrer')`.
  - Implement `deleteLink(linkId)`: filters `links`; calls `saveData`; calls `renderLinks()`.
  - Bind `#link-add-btn` click to `submitNewLink`.
  - Bind `#links-grid` delegated click: `.quick-link-btn` → `openLink`; `.quick-link-delete` → `deleteLink`.
  - Implement `initQuickLinks()`: calls `renderLinks()`; binds all events above.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

- [x] 7. Implement the shared Clock Driver and DOMContentLoaded init
  - Implement the shared `onClockTick()` handler that calls `greetingTick()` then `timerTick()`.
  - Start `setInterval(onClockTick, 1000)` after all widgets are initialized.
  - Implement the `DOMContentLoaded` listener that calls `initStorage()`, `initGreeting()`, `initTimer()`, `initTodo()`, `initQuickLinks()`, then starts the shared interval.
  - _Requirements: 1.1, 1.7, 2.4_

- [x] 8. Implement layout and responsive styles in `css/style.css`
  - Apply a CSS Grid layout on the dashboard root: 2×2 grid at ≥ 1280 px viewport, each cell a minimum of 200×200 px, all four widgets visible without vertical scrolling at 1280×800.
  - Apply a single media query `@media (max-width: 1279px)` that switches the grid to a single-column stack; each widget has `min-width: 200px` and scrolls internally if its content overflows.
  - Apply visual hierarchy: widget headings font-size at least 4 px larger than body text; buttons and inputs visually distinct (border, background, or color) from static content; padding on widget content areas so no text touches a widget border.
  - Style the timer notification (`#timer-notification`) as hidden by default (e.g., `display: none`), shown with `.visible` class.
  - Style task completion: apply `text-decoration: line-through` to completed task titles.
  - No inline `style` attributes or `<style>` tags — all rules in `css/style.css` only.
  - _Requirements: 7.1, 7.2, 7.3, 7.6_

- [x] 9. Write property-based tests for all 14 correctness properties
  - Create `test.html` (a standalone test runner page) that loads a local copy of fast-check from `js/fast-check.min.js` and then loads `js/app.test.js`; all test output renders in the page.
  - Each test MUST carry the tag comment: `// Feature: todo-life-dashboard, Property N: <name>`
  - **Property 1** — `getGreeting(hour)` returns exactly one of the four strings for every integer in [0, 24); no other value is returned. _(Validates: Req 1.3–1.6)_
  - **Property 2** — `formatTime(date)` always matches `^\d{2}:\d{2}$`; the two-digit hour equals `date.getHours()` zero-padded; the minute equals `date.getMinutes()` zero-padded. _(Validates: Req 1.1)_
  - **Property 3** — `formatDate(date)` contains the correct weekday name, day-of-month (no leading zero), month name, and four-digit year for any `Date`. _(Validates: Req 1.2)_
  - **Property 4** — `formatTimerSeconds(s)` matches `^\d{2}:\d{2}$` and `mm * 60 + ss === s` for any integer `s` in [0, 1500]. _(Validates: Req 2.1)_
  - **Property 5** — A single `timerTick()` call when `timerState === 'running'` and `timerRemaining > 0` decrements `timerRemaining` by exactly 1 and leaves state `'running'` (or `'idle'` if result is 0). _(Validates: Req 2.4)_
  - **Property 6** — `stopTimer()` when `timerState === 'running'` transitions state to `'paused'` and leaves `timerRemaining` unchanged for any value in (0, 1500]. _(Validates: Req 2.5)_
  - **Property 7** — `resetTimer()` sets `timerState = 'idle'` and `timerRemaining = 1500` for any starting state and any starting `timerRemaining`. _(Validates: Req 2.6)_
  - **Property 8** — `submitNewTask(input)` increases `tasks.length` by exactly 1, sets `title` to the trimmed string, and `completed` to `false`, for any string with ≥ 1 non-whitespace character and trimmed length ≤ 200. _(Validates: Req 3.2)_
  - **Property 9** — Both `submitNewTask(input)` and `commitEdit(id, input)` reject any whitespace-only or empty string, leave `tasks` or the task's `title` unchanged, and produce a non-empty validation error string. _(Validates: Req 3.3, 4.3)_
  - **Property 10** — `deleteTask(id)` removes exactly the targeted task and leaves all others intact with their original field values, for any tasks array and any existing id. _(Validates: Req 4.7)_
  - **Property 11** — Calling `toggleTask(id)` twice restores `task.completed` to its original value; after the first call it equals the logical negation of the original. _(Validates: Req 4.5)_
  - **Property 12** — `isValidUrl(s)` returns `false` for any string not starting with `http://` or `https://`, or with empty hostname; returns `true` for any well-formed `http(s)://` URL with a non-empty hostname. _(Validates: Req 5.4)_
  - **Property 13** — `JSON.parse(JSON.stringify(arr))` produces an array of identical length and field values for any valid `Task[]` or `Link[]`. _(Validates: Req 6.6, 6.7)_
  - **Property 14** — `safeParse(key, validator)` returns `[]` for any stored value that is invalid JSON, a non-array, or an array containing at least one item failing the shape guard, without throwing. _(Validates: Req 6.4)_
  - _Requirements: all 14 correctness properties in design.md_

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3", "4", "5", "6", "8"] },
    { "wave": 4, "tasks": ["7"] },
    { "wave": 5, "tasks": ["9"] }
  ]
}
```

All widget tasks (3–6) depend on task 2 (Infrastructure) for `safeParse`, `saveData`, and the global state arrays. Task 8 (styles) can proceed in parallel with widget logic since the HTML structure is established in task 1. Task 7 wires the shared clock and `DOMContentLoaded` init and depends on all four widget modules. Task 9 requires logic functions from tasks 2–7 to be accessible for property-based testing.

## Notes

- **No build tooling**: all files are authored directly and run in the browser without compilation. `test.html` is a standalone page that includes a local copy of fast-check (`js/fast-check.min.js`) fetched once and committed to the repo.
- **Function visibility for tests**: pure logic functions (`getGreeting`, `formatTime`, `formatDate`, `isValidUrl`, `safeParse`, `timerTick`, etc.) should be exposed on a `window._dashboard` namespace (or similar) so `app.test.js` can access them without a module system.
- **localStorage in tests**: property tests that involve `safeParse` should stub `localStorage` by temporarily replacing `window.localStorage` with a mock object, then restoring it after each test.
- **Timer state tests**: timer state variables (`timerState`, `timerRemaining`) must also be accessible via the `window._dashboard` namespace for property tests 5–7.
- **crypto.randomUUID()**: available in all target browsers (Chrome 92+, Firefox 95+, Edge 92+, Safari 15.4+) without a polyfill.
