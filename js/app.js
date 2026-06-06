// === INFRASTRUCTURE ===

/**
 * Shape guard: validates a Task object has the required fields and types.
 * @param {*} item
 * @returns {boolean}
 */
function isValidTask(item) {
  return (
    typeof item === 'object' && item !== null &&
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.completed === 'boolean'
  );
}

/**
 * Shape guard: validates a Link object has the required fields and types.
 * @param {*} item
 * @returns {boolean}
 */
function isValidLink(item) {
  return (
    typeof item === 'object' && item !== null &&
    typeof item.id === 'string' &&
    typeof item.label === 'string' &&
    typeof item.url === 'string'
  );
}

/**
 * Reads localStorage[key], JSON-parses it, and validates every item with the
 * provided validator. Returns [] on any error: SecurityError, JSON parse
 * failure, non-array result, or any item failing the guard (all-or-nothing).
 * @param {string} key
 * @param {function(*): boolean} validator
 * @returns {Array}
 */
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

/**
 * Serializes `array` to JSON and writes it to localStorage under `key`.
 * Silently ignores SecurityError and QuotaExceededError.
 * @param {string} key
 * @param {Array} array
 */
function saveData(key, array) {
  try {
    localStorage.setItem(key, JSON.stringify(array));
  } catch (e) {
    // SecurityError or QuotaExceededError — silently ignore
  }
}

// Global state — source of truth for all widgets
let tasks = [];
let links = [];

/**
 * Populates `tasks` and `links` from localStorage on startup.
 */
function initStorage() {
  tasks = safeParse('dashboard_tasks', isValidTask);
  links = safeParse('dashboard_links', isValidLink);
}

// === GREETING WIDGET ===

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

let lastRenderedMinute = -1;

/**
 * Returns a time-of-day greeting string based on the given hour (0–23).
 * [5, 12)  → "Good Morning"
 * [12, 18) → "Good Afternoon"
 * [18, 22) → "Good Evening"
 * [22, 24) ∪ [0, 5) → "Good Night"
 * @param {number} hour
 * @returns {string}
 */
function getGreeting(hour) {
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 18) return 'Good Afternoon';
  if (hour >= 18 && hour < 22) return 'Good Evening';
  return 'Good Night';
}

/**
 * Formats a Date's time as a zero-padded HH:MM string.
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) {
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Formats a Date as "Weekday, D Month YYYY" (day has no leading zero).
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const weekday = WEEKDAYS[date.getDay()];
  const day = date.getDate();           // no leading zero
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
}

/**
 * Renders the current time, date, and greeting into the DOM, and stores
 * the current minute so greetingTick() can detect minute boundaries.
 */
function initGreeting() {
  const now = new Date();
  document.getElementById('greeting-time').textContent = formatTime(now);
  document.getElementById('greeting-date').textContent = formatDate(now);
  document.getElementById('greeting-msg').textContent = getGreeting(now.getHours());
  lastRenderedMinute = now.getMinutes();
}

/**
 * Called on every clock tick. Updates the greeting DOM only when the
 * displayed minute has changed (avoids unnecessary repaints).
 */
function greetingTick() {
  const now = new Date();
  if (now.getMinutes() !== lastRenderedMinute) {
    document.getElementById('greeting-time').textContent = formatTime(now);
    document.getElementById('greeting-date').textContent = formatDate(now);
    document.getElementById('greeting-msg').textContent = getGreeting(now.getHours());
    lastRenderedMinute = now.getMinutes();
  }
}

// === FOCUS TIMER ===

let timerState = 'idle';
let timerRemaining = 1500;

/**
 * Formats a number of seconds as a zero-padded MM:SS string.
 * @param {number} seconds
 * @returns {string}
 */
function formatTimerDisplay(seconds) {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * Writes the current timerRemaining as MM:SS into #timer-display.
 */
function renderTimerDisplay() {
  document.getElementById('timer-display').textContent = formatTimerDisplay(timerRemaining);
}

/**
 * Starts the timer countdown. No-op if already running.
 */
function startTimer() {
  if (timerState === 'running') return;
  timerState = 'running';
  renderTimerDisplay();
}

/**
 * Pauses the timer. No-op if already idle.
 */
function stopTimer() {
  if (timerState === 'idle') return;
  timerState = 'paused';
  renderTimerDisplay();
}

/**
 * Resets the timer to initial state (idle, 25:00) and hides the notification.
 */
function resetTimer() {
  timerState = 'idle';
  timerRemaining = 1500;
  renderTimerDisplay();
  document.getElementById('timer-notification').classList.remove('visible');
}

/**
 * Shows the timer completion notification by adding the .visible class.
 */
function showTimerNotification() {
  document.getElementById('timer-notification').classList.add('visible');
}

/**
 * Called on every clock tick. Decrements timerRemaining when running and
 * triggers the completion notification when the countdown reaches zero.
 */
function timerTick() {
  if (timerState !== 'running') return;
  timerRemaining = Math.max(0, timerRemaining - 1);
  renderTimerDisplay();
  if (timerRemaining <= 0) {
    timerState = 'idle';
    showTimerNotification();
  }
}

/**
 * Initializes the Focus Timer: renders the initial display and binds
 * click handlers for the Start, Stop, Reset buttons and the notification.
 */
function initTimer() {
  renderTimerDisplay();

  document.getElementById('timer-start').addEventListener('click', startTimer);
  document.getElementById('timer-stop').addEventListener('click', stopTimer);
  document.getElementById('timer-reset').addEventListener('click', resetTimer);

  document.getElementById('timer-notification').addEventListener('click', function () {
    document.getElementById('timer-notification').classList.remove('visible');
  });
}

// === TO-DO LIST ===

/**
 * Builds and returns a <li> element representing a single task.
 * @param {Object} task - { id, title, completed }
 * @returns {HTMLLIElement}
 */
function renderTaskItem(task) {
  const li = document.createElement('li');
  li.className = 'todo-item';
  li.id = 'task-' + task.id;

  // Checkbox button to toggle completion
  const checkbox = document.createElement('button');
  checkbox.className = 'todo-checkbox btn btn-secondary';
  checkbox.textContent = task.completed ? '✓' : '○';
  checkbox.dataset.taskId = task.id;
  checkbox.setAttribute('aria-label', task.completed ? 'Mark incomplete' : 'Mark complete');

  // Title span
  const titleSpan = document.createElement('span');
  titleSpan.className = 'todo-title' + (task.completed ? ' completed' : '');
  titleSpan.textContent = task.title;

  // Edit button
  const editBtn = document.createElement('button');
  editBtn.className = 'todo-edit-btn btn btn-secondary';
  editBtn.textContent = 'Edit';
  editBtn.dataset.taskId = task.id;
  editBtn.setAttribute('aria-label', 'Edit task');

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'todo-delete-btn btn btn-secondary';
  deleteBtn.textContent = 'Delete';
  deleteBtn.dataset.taskId = task.id;
  deleteBtn.setAttribute('aria-label', 'Delete task');

  // Inline edit input (hidden by default)
  const editInput = document.createElement('input');
  editInput.className = 'todo-edit-input';
  editInput.type = 'text';
  editInput.maxLength = 100;
  editInput.value = task.title;
  editInput.dataset.taskId = task.id;
  editInput.setAttribute('aria-label', 'Edit task title');
  editInput.style.display = 'none';

  // Inline edit error span
  const editError = document.createElement('span');
  editError.className = 'todo-edit-error';
  editError.setAttribute('role', 'alert');

  li.appendChild(checkbox);
  li.appendChild(titleSpan);
  li.appendChild(editBtn);
  li.appendChild(deleteBtn);
  li.appendChild(editInput);
  li.appendChild(editError);

  return li;
}

/**
 * Clears #todo-list and rebuilds it from the current tasks array.
 */
function renderTaskList() {
  const list = document.getElementById('todo-list');
  list.innerHTML = '';
  tasks.forEach(function (task) {
    list.appendChild(renderTaskItem(task));
  });
}

/**
 * Validates rawInput and, if valid, creates a new task, persists it, and re-renders.
 * @param {string} rawInput
 */
function submitNewTask(rawInput) {
  const errorEl = document.getElementById('todo-input-error');
  const trimmed = rawInput.trim();

  if (trimmed === '') {
    errorEl.textContent = 'Title cannot be empty';
    return;
  }
  if (trimmed.length > 200) {
    errorEl.textContent = 'Title must not exceed 200 characters';
    return;
  }

  const task = {
    id: crypto.randomUUID(),
    title: trimmed,
    completed: false,
  };
  tasks.push(task);
  saveData('dashboard_tasks', tasks);
  renderTaskList();

  document.getElementById('todo-input').value = '';
  errorEl.textContent = '';
}

/**
 * Flips task.completed and re-renders that single <li> in place.
 * @param {string} taskId
 */
function toggleTask(taskId) {
  const task = tasks.find(function (t) { return t.id === taskId; });
  if (!task) return;
  task.completed = !task.completed;
  saveData('dashboard_tasks', tasks);

  const existing = document.getElementById('task-' + taskId);
  if (existing) {
    existing.replaceWith(renderTaskItem(task));
  }
}

/**
 * Switches the task item into edit mode: hides the title, shows the edit input.
 * @param {string} taskId
 */
function startEditTask(taskId) {
  const li = document.getElementById('task-' + taskId);
  if (!li) return;

  const titleSpan = li.querySelector('.todo-title');
  const editInput = li.querySelector('.todo-edit-input');

  titleSpan.style.display = 'none';
  editInput.style.display = '';
  editInput.focus();
  // Place cursor at end of text
  editInput.setSelectionRange(editInput.value.length, editInput.value.length);
}

/**
 * Validates rawInput and, if valid, saves the updated title and exits edit mode.
 * @param {string} taskId
 * @param {string} rawInput
 */
function commitEdit(taskId, rawInput) {
  const li = document.getElementById('task-' + taskId);
  if (!li) return;

  const trimmed = rawInput.trim();
  if (trimmed === '') {
    const editError = li.querySelector('.todo-edit-error');
    editError.textContent = 'Title cannot be empty';
    return;
  }

  const task = tasks.find(function (t) { return t.id === taskId; });
  if (!task) return;

  task.title = trimmed;
  saveData('dashboard_tasks', tasks);
  exitEditMode(taskId);

  // Re-render the single item in place
  const existing = document.getElementById('task-' + taskId);
  if (existing) {
    existing.replaceWith(renderTaskItem(task));
  }
}

/**
 * Exits edit mode for the given task: restores title span, hides input, clears error.
 * @param {string} taskId
 */
function exitEditMode(taskId) {
  const li = document.getElementById('task-' + taskId);
  if (!li) return;

  const task = tasks.find(function (t) { return t.id === taskId; });
  const titleSpan = li.querySelector('.todo-title');
  const editInput = li.querySelector('.todo-edit-input');
  const editError = li.querySelector('.todo-edit-error');

  // Restore edit input to original title (discards unsaved changes)
  if (task) editInput.value = task.title;
  editInput.style.display = 'none';
  editError.textContent = '';
  titleSpan.style.display = '';
}

/**
 * Removes the task from the array, persists, and removes its <li> from the DOM.
 * @param {string} taskId
 */
function deleteTask(taskId) {
  tasks = tasks.filter(function (t) { return t.id !== taskId; });
  saveData('dashboard_tasks', tasks);
  const el = document.getElementById('task-' + taskId);
  if (el) el.remove();
}

/**
 * Initializes the To-Do List widget: renders tasks and binds all event handlers.
 */
function initTodo() {
  renderTaskList();

  const addBtn = document.getElementById('todo-add-btn');
  const todoInput = document.getElementById('todo-input');
  const todoInputError = document.getElementById('todo-input-error');
  const todoList = document.getElementById('todo-list');

  addBtn.addEventListener('click', function () {
    submitNewTask(todoInput.value);
  });

  todoInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      submitNewTask(todoInput.value);
    }
  });

  // Clear error when user focuses the input
  todoInput.addEventListener('focus', function () {
    todoInputError.textContent = '';
  });

  // Event delegation on #todo-list for all item interactions
  todoList.addEventListener('click', function (e) {
    const checkboxBtn = e.target.closest('.todo-checkbox');
    if (checkboxBtn) {
      toggleTask(checkboxBtn.dataset.taskId);
      return;
    }

    const editBtn = e.target.closest('.todo-edit-btn');
    if (editBtn) {
      startEditTask(editBtn.dataset.taskId);
      return;
    }

    const deleteBtn = e.target.closest('.todo-delete-btn');
    if (deleteBtn) {
      deleteTask(deleteBtn.dataset.taskId);
      return;
    }
  });

  todoList.addEventListener('keydown', function (e) {
    const editInput = e.target.closest('.todo-edit-input');
    if (!editInput) return;

    if (e.key === 'Enter') {
      commitEdit(editInput.dataset.taskId, editInput.value);
    } else if (e.key === 'Escape') {
      exitEditMode(editInput.dataset.taskId);
    }
  });
}

// === QUICK LINKS ===

/**
 * Validates a URL string: must start with http:// or https:// and have a
 * non-empty hostname. Returns false on any parse error.
 * @param {string} raw
 * @returns {boolean}
 */
function isValidUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  try {
    const u = new URL(trimmed);
    return u.hostname.length > 0;
  } catch (e) {
    return false;
  }
}

/**
 * Clears #links-grid and rebuilds it from the current links array.
 * Each link is rendered as a <button class="quick-link-btn"> with a nested
 * <span class="quick-link-delete"> delete control.
 */
function renderLinks() {
  const grid = document.getElementById('links-grid');
  grid.innerHTML = '';
  links.forEach(function (link) {
    const btn = document.createElement('button');
    btn.className = 'quick-link-btn';
    btn.dataset.id = link.id;
    btn.textContent = link.label;

    const del = document.createElement('span');
    del.className = 'quick-link-delete';
    del.dataset.id = link.id;
    del.textContent = '×';
    del.setAttribute('aria-label', 'Delete link');

    btn.appendChild(del);
    grid.appendChild(btn);
  });
}

/**
 * Validates inputs and, if valid, creates a new link, persists it, and re-renders.
 * @param {string} labelRaw
 * @param {string} urlRaw
 */
function submitNewLink(labelRaw, urlRaw) {
  const limitError = document.getElementById('link-limit-error');
  const labelError = document.getElementById('link-label-error');
  const urlError = document.getElementById('link-url-error');

  // Clear previous errors
  limitError.textContent = '';
  labelError.textContent = '';
  urlError.textContent = '';

  if (links.length >= 20) {
    limitError.textContent = 'Maximum 20 links allowed';
    return;
  }

  const labelTrimmed = labelRaw.trim();
  if (labelTrimmed === '') {
    labelError.textContent = 'Label cannot be empty';
    return;
  }

  if (!isValidUrl(urlRaw)) {
    urlError.textContent = 'URL must start with http:// or https:// and have a valid host';
    return;
  }

  const urlTrimmed = urlRaw.trim();
  const link = {
    id: crypto.randomUUID(),
    label: labelTrimmed,
    url: urlTrimmed,
  };

  links.push(link);
  saveData('dashboard_links', links);
  renderLinks();

  document.getElementById('link-label-input').value = '';
  document.getElementById('link-url-input').value = '';
  limitError.textContent = '';
  labelError.textContent = '';
  urlError.textContent = '';
}

/**
 * Opens a URL in a new browser tab with security best practices.
 * @param {string} url
 */
function openLink(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Removes a link by id, persists the updated list, and re-renders.
 * @param {string} linkId
 */
function deleteLink(linkId) {
  links = links.filter(function (l) { return l.id !== linkId; });
  saveData('dashboard_links', links);
  renderLinks();
}

/**
 * Initializes the Quick Links widget: renders persisted links and binds
 * all event handlers for the add form and the links grid.
 */
function initQuickLinks() {
  renderLinks();

  const labelInput = document.getElementById('link-label-input');
  const urlInput = document.getElementById('link-url-input');
  const addBtn = document.getElementById('link-add-btn');
  const labelError = document.getElementById('link-label-error');
  const urlError = document.getElementById('link-url-error');
  const grid = document.getElementById('links-grid');

  addBtn.addEventListener('click', function () {
    submitNewLink(labelInput.value, urlInput.value);
  });

  // Clear errors on focus
  labelInput.addEventListener('focus', function () {
    labelError.textContent = '';
  });

  urlInput.addEventListener('focus', function () {
    urlError.textContent = '';
  });

  // Event delegation on #links-grid
  grid.addEventListener('click', function (e) {
    // Check delete first (nested inside btn) to prevent link-open from firing
    const deleteSpan = e.target.closest('.quick-link-delete');
    if (deleteSpan) {
      deleteLink(deleteSpan.dataset.id);
      e.stopPropagation();
      return;
    }

    const linkBtn = e.target.closest('.quick-link-btn');
    if (linkBtn) {
      const linkId = linkBtn.dataset.id;
      const found = links.find(function (l) { return l.id === linkId; });
      if (found) openLink(found.url);
    }
  });
}

// === CLOCK DRIVER ===

/**
 * Single shared tick handler — heartbeat of the application.
 * Called every 1000 ms by the one shared setInterval.
 * Drives both the greeting widget and the focus timer to avoid compounding drift.
 */
function onClockTick() {
  greetingTick();
  timerTick();
}

// === INIT ===

// Expose pure functions on window._dashboard for property-based tests
window._dashboard = {
  getGreeting,
  formatTime,
  formatDate,
  get timerState() { return timerState; },
  set timerState(v) { timerState = v; },
  get timerRemaining() { return timerRemaining; },
  set timerRemaining(v) { timerRemaining = v; },
  startTimer,
  stopTimer,
  resetTimer,
  timerTick,
  formatTimerDisplay,
  // To-Do List
  get tasks() { return tasks; },
  set tasks(v) { tasks = v; },
  renderTaskItem,
  renderTaskList,
  submitNewTask,
  toggleTask,
  startEditTask,
  commitEdit,
  exitEditMode,
  deleteTask,
  initTodo,
  // Quick Links
  get links() { return links; },
  set links(v) { links = v; },
  isValidUrl,
  renderLinks,
  submitNewLink,
  openLink,
  deleteLink,
  initQuickLinks,
  // Infrastructure (for property tests)
  safeParse,
  isValidTask,
  isValidLink,
};

document.addEventListener('DOMContentLoaded', function () {
  // Guard: only run the full app init when the dashboard DOM is present.
  // test.html loads this script but does not include the widget markup.
  if (!document.getElementById('greeting-time')) return;

  initStorage();
  initGreeting();
  initTimer();
  initTodo();
  initQuickLinks();

  // Start the single shared interval — the heartbeat of the whole application
  setInterval(onClockTick, 1000);
});
