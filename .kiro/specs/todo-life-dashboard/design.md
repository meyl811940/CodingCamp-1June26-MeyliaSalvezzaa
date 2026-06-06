# Design Document: To Do List Life Dashboard

## Overview

The To Do List Life Dashboard is a zero-dependency, client-side single-page application delivered as three static files: `index.html`, `css/style.css`, and `js/app.js`. There is no build step, no bundler, and no external network requests at runtime. Everything runs directly in the browser using standard ES6+ APIs.

The application is organized into four self-contained widgets that share a thin infrastructure layer for localStorage persistence and clock management. Each widget owns its own DOM subtree, its own state variables, and its own event handlers — all co-located inside clearly delimited sections of `js/app.js`.

### Design Goals

- **Simplicity**: One HTML file, one CSS file, one JS file. No module system, no class hierarchies, just clear procedural sections with shared helper functions.
- **Reliability**: Every mutation to user data immediately attempts to persist; failures are silenced gracefully and the UI always reflects the in-memory truth.
- **Correctness**: Input validation is strict and consistent. The timer is driven by a single `setInterval` tick handler with explicit state management to avoid drift confusion.
- **Responsiveness**: CSS Grid handles the four-widget layout; a single media query at 1280 px switches to single-column.

---

## Architecture

### High-Level Structure

```
index.html
  └── <link> css/style.css
  └── <script defer> js/app.js
        │
        ├── Infrastructure Layer
        │     ├── Storage helpers (load/save/safeParse)
        │     └── Clock driver (setInterval every second)
        │
        ├── Greeting Widget module
        ├── Focus Timer module
        ├── To-Do List module
        └── Quick Links module
```

### Initialization Flow

```
DOMContentLoaded
  │
  ├── initStorage()          — pre-load tasks & links arrays into memory
  ├── initGreeting()         — render time/date/greeting; start clock tick
  ├── initTimer()            — render 25:00; bind Start/Stop/Reset buttons
  ├── initTodo()             — render persisted tasks; bind input & list events
  └── initQuickLinks()       — render persisted links; bind form & list events
```

All four `init*` functions are called once at `DOMContentLoaded`. After that, the application is event-driven: the clock tick fires every second, and all other state changes are triggered by user interaction events.

### Clock Driver

A single `setInterval` running at 1000 ms is the heartbeat of the application. On each tick it:

1. Calls the Greeting Widget tick to check whether the displayed minute has changed and, if so, updates time/date/greeting.
2. Calls the Focus Timer tick to decrement the remaining seconds (when running) and update the display.

Using one shared interval (rather than two separate ones) avoids compounding drift and simplifies teardown.

```
setInterval(onClockTick, 1000)
  │
  ├── greetingTick()   — compare current minute to last-rendered minute
  └── timerTick()      — decrement if state === 'running'
```

---

## Components and Interfaces

### 1. Infrastructure Layer

#### `storage.js` section (inside `app.js`)

```
safeParse(key)          → Array   — reads localStorage[key], JSON.parses, validates shape; returns [] on any error
saveData(key, array)    → void    — JSON.stringify(array) then localStorage.setItem; catches SecurityError silently
```

`safeParse` applies a shape guard: for `dashboard_tasks` each item must have `id` (string), `title` (string), `completed` (boolean); for `dashboard_links` each item must have `id` (string), `label` (string), `url` (string). Any item that fails the guard causes the whole key to be treated as empty (per Requirement 6.4).

#### Global State

```js
let tasks = [];   // Task[]  — source of truth for todo list
let links = [];   // Link[]  — source of truth for quick links
```

Both arrays are initialized from `safeParse` at load time and kept in sync with every mutation.

---

### 2. Greeting Widget

**DOM elements**

| Element ID        | Role                              |
|-------------------|-----------------------------------|
| `#greeting-time`  | Displays HH:MM                   |
| `#greeting-date`  | Displays "Weekday, D Month YYYY"  |
| `#greeting-msg`   | Displays greeting string          |

**Public interface (internal to `app.js`)**

```
initGreeting()   → void   — renders initial values; starts clock (or relies on shared clock)
greetingTick()   → void   — called every clock tick; updates DOM only when minute changes
```

**Greeting logic**

```
getGreeting(hour):
  [5,  12) → "Good Morning"
  [12, 18) → "Good Afternoon"
  [18, 22) → "Good Evening"
  [22, 24) ∪ [0, 5) → "Good Night"
```

**Date formatting** uses `Date` methods (`getFullYear`, `getMonth`, `getDate`, `getDay`) rather than `toLocaleDateString` with a locale string, ensuring consistent output across browsers without depending on ICU data availability. Month and weekday names are stored as constant arrays inside the greeting section.

---

### 3. Focus Timer

**DOM elements**

| Element ID          | Role                      |
|---------------------|---------------------------|
| `#timer-display`    | Shows MM:SS               |
| `#timer-start`      | Start button              |
| `#timer-stop`       | Stop/Pause button         |
| `#timer-reset`      | Reset button              |
| `#timer-notification` | Hidden banner; shown on completion |

**State machine**

The timer has three explicit states stored in a single variable:

```
timerState: 'idle' | 'running' | 'paused'
timerRemaining: number   — seconds remaining (starts at 1500)
```

State transitions:

```
idle    --[Start]--> running
running --[Stop] --> paused
running --[tick reaches 0]--> idle  (+ show notification)
paused  --[Start]--> running
paused  --[Reset]--> idle
running --[Reset]--> idle
idle    --[Reset]--> idle  (no-op)
idle    --[Stop] --> idle  (no-op)
```

The Start button is ignored when `timerState === 'running'` (Requirement 2.3). The Stop button is ignored when `timerState === 'idle'`.

**Tick handler**

```
timerTick():
  if timerState !== 'running': return
  timerRemaining -= 1
  renderTimerDisplay()
  if timerRemaining <= 0:
    timerState = 'idle'
    showTimerNotification()
```

**`renderTimerDisplay()`** formats seconds as `MM:SS`:

```
mm = Math.floor(timerRemaining / 60).toString().padStart(2, '0')
ss = (timerRemaining % 60).toString().padStart(2, '0')
```

**Notification** toggles a CSS class (e.g., `.visible`) on `#timer-notification`. The user dismisses it by clicking the notification or a close button inside it.

---

### 4. To-Do List

**DOM elements**

| Element ID / Class     | Role                                          |
|------------------------|-----------------------------------------------|
| `#todo-input`          | Text input for new task title                 |
| `#todo-add-btn`        | Submit button for new task                    |
| `#todo-input-error`    | Inline validation message for the add form    |
| `#todo-list`           | `<ul>` container for task items               |
| `.todo-item`           | `<li>` for each task                          |
| `.todo-checkbox`       | Complete/uncomplete toggle button             |
| `.todo-title`          | `<span>` displaying task title                |
| `.todo-edit-btn`       | Opens inline edit mode                        |
| `.todo-delete-btn`     | Removes task                                  |
| `.todo-edit-input`     | Inline `<input>` shown during edit mode       |
| `.todo-edit-error`     | Inline validation message during edit         |

**Task creation flow**

```
submitNewTask(rawInput):
  trimmed = rawInput.trim()
  if trimmed === '': show error "Title cannot be empty"; return
  if trimmed.length > 200: show error "Title must not exceed 200 characters"; return
  task = { id: crypto.randomUUID(), title: trimmed, completed: false }
  tasks.push(task)
  saveData('dashboard_tasks', tasks)
  renderTaskList()
  clearInput()
```

**Inline edit flow**

When the user activates Edit on a task, the `.todo-title` span is hidden and a `.todo-edit-input` is shown pre-populated. On Enter/save:

```
commitEdit(taskId, rawInput):
  trimmed = rawInput.trim()
  if trimmed === '': show inline error; return (keep original title)
  task.title = trimmed
  saveData('dashboard_tasks', tasks)
  exitEditMode(taskId)
  renderTaskItem(taskId)
```

On Escape/cancel: `exitEditMode(taskId)` — restores original span, discards changes.

**Toggle completion**

```
toggleTask(taskId):
  task.completed = !task.completed
  saveData('dashboard_tasks', tasks)
  renderTaskItem(taskId)    — re-applies / removes 'completed' CSS class
```

**Delete**

```
deleteTask(taskId):
  tasks = tasks.filter(t => t.id !== taskId)
  saveData('dashboard_tasks', tasks)
  document.getElementById('task-' + taskId).remove()
```

**Rendering strategy**: `renderTaskList()` rebuilds the entire `<ul>` innerHTML from the `tasks` array. `renderTaskItem(id)` updates only a single `<li>` — used for toggle and edit-save to avoid re-rendering the full list and losing input focus.

---

### 5. Quick Links

**DOM elements**

| Element ID / Class       | Role                                      |
|--------------------------|-------------------------------------------|
| `#link-label-input`      | Label text input (max 64 chars)           |
| `#link-url-input`        | URL text input (max 2048 chars)           |
| `#link-add-btn`          | Submit button                             |
| `#link-label-error`      | Validation message for label field        |
| `#link-url-error`        | Validation message for URL field          |
| `#link-limit-error`      | Validation message for 20-link limit      |
| `#links-grid`            | Container for link buttons                |
| `.quick-link-btn`        | Clickable button per link                 |
| `.quick-link-delete`     | Delete control overlaid on each button    |

**URL validation**

```
isValidUrl(raw):
  trimmed = raw.trim()
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')): return false
  try { u = new URL(trimmed) } catch { return false }
  return u.hostname.length > 0
```

Using the native `URL` constructor handles edge cases (empty host, malformed paths) reliably across all modern browsers.

**Link creation flow**

```
submitNewLink(labelRaw, urlRaw):
  labelTrimmed = labelRaw.trim()
  urlTrimmed = urlRaw.trim()
  if links.length >= 20: show limit error; return
  if labelTrimmed === '': show label error; return
  if !isValidUrl(urlTrimmed): show url error; return
  link = { id: crypto.randomUUID(), label: labelTrimmed, url: urlTrimmed }
  links.push(link)
  saveData('dashboard_links', links)
  renderLinks()
  clearLinkForm()
```

**Open link**

```
openLink(url):
  window.open(url, '_blank', 'noopener,noreferrer')
```

`noopener,noreferrer` is applied as a security best practice when opening untrusted URLs.

**Delete link**

```
deleteLink(linkId):
  links = links.filter(l => l.id !== linkId)
  saveData('dashboard_links', links)
  renderLinks()
```

**Rendering**: `renderLinks()` rebuilds the `#links-grid` from the current `links` array. Each link renders as a `<button class="quick-link-btn">` with a nested `<span class="quick-link-delete">` delete control.

---

## Data Models

### Task

```js
{
  id:        string,   // crypto.randomUUID() — globally unique
  title:     string,   // trimmed, 1–200 chars
  completed: boolean   // false on creation
}
```

### Link

```js
{
  id:    string,   // crypto.randomUUID()
  label: string,   // trimmed, 1–64 chars
  url:   string    // trimmed, starts with http:// or https://, valid host
}
```

### localStorage Schema

| Key                | Type   | Value                             |
|--------------------|--------|-----------------------------------|
| `dashboard_tasks`  | string | `JSON.stringify(Task[])`          |
| `dashboard_links`  | string | `JSON.stringify(Link[])`          |

### Shape Validation Guard

On load, each parsed array is filtered through a shape guard:

```js
// Tasks
function isValidTask(item) {
  return typeof item === 'object' && item !== null
    && typeof item.id === 'string'
    && typeof item.title === 'string'
    && typeof item.completed === 'boolean';
}

// Links
function isValidLink(item) {
  return typeof item === 'object' && item !== null
    && typeof item.id === 'string'
    && typeof item.label === 'string'
    && typeof item.url === 'string';
}
```

If the parsed value is not an array, or if *any* item fails the guard, the entire key is discarded and the widget initializes with `[]` (per Requirement 6.4 — all-or-nothing approach to avoid partially corrupt state).

### Round-Trip Guarantee

`JSON.stringify` + `JSON.parse` preserves all three scalar types (`string`, `boolean`, `string`) used in both models without any transformation. The round-trip identity holds for any valid Task or Link array.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Greeting classification is exhaustive and correct

*For any* integer hour in [0, 24), `getGreeting(hour)` SHALL return exactly one of "Good Morning", "Good Afternoon", "Good Evening", or "Good Night" according to the defined ranges — and no hour produces an unexpected or empty string.

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 2: Time display formatting is always valid HH:MM

*For any* `Date` object, the time-formatting function SHALL produce a string matching the pattern `^\d{2}:\d{2}$` where the two-digit hour equals `date.getHours()` (zero-padded) and the two-digit minute equals `date.getMinutes()` (zero-padded).

**Validates: Requirements 1.1**

---

### Property 3: Date display formatting preserves correct components

*For any* `Date` object, the date-formatting function SHALL produce a string that contains the correct weekday name, the correct day-of-month number (without leading zero), the correct month name, and the correct four-digit year — all extracted from the same `Date` value.

**Validates: Requirements 1.2**

---

### Property 4: Timer display always produces valid MM:SS

*For any* integer number of seconds `s` in [0, 1500], `formatTime(s)` SHALL return a string matching `^\d{2}:\d{2}$` where `mm * 60 + ss === s` (i.e., the numeric values accurately represent the input seconds).

**Validates: Requirements 2.1**

---

### Property 5: Timer tick decrements remaining time by exactly one second

*For any* timer state where `timerState === 'running'` and `timerRemaining > 0`, a single call to `timerTick()` SHALL decrease `timerRemaining` by exactly 1 and leave the state as `'running'` (or transition to `'idle'` if the result reaches 0).

**Validates: Requirements 2.4**

---

### Property 6: Stop preserves remaining time for any running timer

*For any* `timerRemaining` value in (0, 1500] and `timerState === 'running'`, calling `stopTimer()` SHALL transition `timerState` to `'paused'` and leave `timerRemaining` unchanged.

**Validates: Requirements 2.5**

---

### Property 7: Reset always restores timer to initial state

*For any* `timerState` (idle, running, or paused) and *any* `timerRemaining` value, calling `resetTimer()` SHALL set `timerState` to `'idle'` and `timerRemaining` to `1500`.

**Validates: Requirements 2.6**

---

### Property 8: Valid task titles are accepted and create a new task

*For any* string with at least one non-whitespace character whose trimmed length is ≤ 200, calling `submitNewTask()` SHALL increase the length of the `tasks` array by exactly 1, and the new task SHALL have the trimmed string as its `title` and `completed === false`.

**Validates: Requirements 3.2**

---

### Property 9: Whitespace-only inputs are rejected for task creation and editing

*For any* string composed entirely of whitespace characters (including the empty string), both `submitNewTask()` and `commitEdit()` SHALL reject the input, leave the `tasks` array unchanged (for add) or the specific task's `title` unchanged (for edit), and produce a non-empty validation message.

**Validates: Requirements 3.3, 4.3**

---

### Property 10: Task deletion removes exactly the targeted task

*For any* `tasks` array and *any* task `id` that exists in that array, calling `deleteTask(id)` SHALL produce a `tasks` array where no item has that `id`, and all other tasks remain present with their original field values.

**Validates: Requirements 4.7**

---

### Property 11: Completion toggle is its own inverse (round-trip)

*For any* task with *any* `completed` value, calling `toggleTask(id)` twice in succession SHALL leave `task.completed` equal to its original value — and after the first toggle it SHALL be the logical negation of the original.

**Validates: Requirements 4.5**

---

### Property 12: URL validation correctly rejects non-http(s) and malformed URLs

*For any* string that does not start with `"http://"` or `"https://"`, or that has an empty hostname after parsing, `isValidUrl()` SHALL return `false`. Conversely, *for any* string that starts with `"http://"` or `"https://"` and has a non-empty hostname, `isValidUrl()` SHALL return `true`.

**Validates: Requirements 5.4**

---

### Property 13: Serialization round-trip preserves all fields for tasks and links

*For any* valid `Task[]` array (each item satisfying the shape guard) and *for any* valid `Link[]` array, `JSON.parse(JSON.stringify(arr))` SHALL produce an array of the same length where every item has identical field values (`id`, `title`, `completed` for tasks; `id`, `label`, `url` for links) in the same order as the original.

**Validates: Requirements 6.6, 6.7**

---

### Property 14: Malformed or schema-invalid localStorage data is treated as empty

*For any* string stored under a localStorage key that is either not valid JSON, or parses to a non-array value, or is an array where at least one item fails the shape guard, `safeParse()` SHALL return an empty array `[]` without throwing.

**Validates: Requirements 6.4**

---

## Error Handling

### localStorage Unavailability

All reads and writes to `localStorage` are wrapped in `try/catch`:

```js
function saveData(key, array) {
  try {
    localStorage.setItem(key, JSON.stringify(array));
  } catch (e) {
    // SecurityError or QuotaExceededError — silently ignore
  }
}

function safeParse(key, validator) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (!parsed.every(validator)) return [];
    return parsed;
  } catch (e) {
    return [];
  }
}
```

This covers `SecurityError` (private browsing restrictions), `QuotaExceededError` (storage full), and `JSON.parse` failures. The in-memory state always reflects the displayed UI, regardless of persistence success.

### Input Validation Errors

All validation errors are displayed inline, adjacent to the offending input, using dedicated error `<span>` elements. Errors are cleared on the next valid submission attempt or on input focus. No `alert()` or `confirm()` dialogs are used for validation — only the timer completion notification uses a visible banner.

| Error condition                      | Where displayed             |
|--------------------------------------|-----------------------------|
| Empty/whitespace task title (add)    | `#todo-input-error`         |
| Task title > 200 chars               | `#todo-input-error`         |
| Empty title during task edit         | `.todo-edit-error` on item  |
| Empty link label                     | `#link-label-error`         |
| Empty or invalid link URL            | `#link-url-error`           |
| Links at 20-item limit               | `#link-limit-error`         |

### Timer Edge Cases

- Calling `startTimer()` when `timerState === 'running'` is a no-op (the existing `setInterval` continues unaffected — the timer module uses the shared clock tick, not its own interval).
- Calling `stopTimer()` when `timerState === 'idle'` is a no-op.
- The tick handler guards against `timerRemaining` going below 0: `timerRemaining = Math.max(0, timerRemaining - 1)`.

### Link Security

All links are opened with `window.open(url, '_blank', 'noopener,noreferrer')` to prevent the opened page from accessing `window.opener` and to avoid sending the `Referer` header.

### Tag Format

Each property-based test MUST be tagged with a comment:

```js
// Feature: todo-life-dashboard, Property 1: Greeting classification is exhaustive and correct
```

### Browser Compatibility

Since no polyfills are used, browser compatibility is verified by:
1. Opening `index.html` directly in Chrome, Firefox, Edge, and Safari (latest stable).
2. Confirming the timer counts down, tasks persist, links open, and the greeting updates on minute change.
3. Resizing the viewport below 1280 px to verify single-column reflow.
