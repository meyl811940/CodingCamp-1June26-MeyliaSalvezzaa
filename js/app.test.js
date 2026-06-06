// Property-based tests for Todo Life Dashboard
// All tests use hand-rolled generators — no external PBT library required.
// Each property is run against N random samples.

(function () {
  'use strict';

  // ─── Mini test harness ────────────────────────────────────────────────────

  const results = [];  // { name, passed, error }

  function property(name, fn) {
    try {
      fn();
      results.push({ name, passed: true, error: null });
    } catch (err) {
      results.push({ name, passed: false, error: err.message || String(err) });
    }
  }

  function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'Assertion failed');
  }

  // Run fn(sample) for each value produced by generator; throws on first failure.
  function forAll(generator, fn, runs) {
    const n = runs || 200;
    for (let i = 0; i < n; i++) {
      const sample = generator(i, n);
      fn(sample);
    }
  }

  // ─── Generators ───────────────────────────────────────────────────────────

  // Integer in [lo, hi)  (pseudo-random, seeded by index for reproducibility)
  function intRange(lo, hi) {
    return function (i) {
      // Simple LCG-derived spread across the range
      const span = hi - lo;
      return lo + ((i * 2654435761) >>> 0) % span;
    };
  }

  // All integers in [lo, hi) exhaustively (for small ranges)
  function exhaust(lo, hi) {
    const vals = [];
    for (let v = lo; v < hi; v++) vals.push(v);
    let idx = 0;
    return function () { return vals[idx++ % vals.length]; };
  }

  // Date objects with hours [0,23], minutes [0,59], seconds [0,59]
  // day-of-month [1,28], month [0,11], year [2000,2030]
  function randomDate(i) {
    const seed = (i * 1664525 + 1013904223) >>> 0;
    const hour   = seed % 24;
    const minute = (seed >>> 5) % 60;
    const second = (seed >>> 10) % 60;
    const day    = 1 + (seed >>> 15) % 28;
    const month  = (seed >>> 20) % 12;
    const year   = 2000 + (seed >>> 24) % 31;
    return new Date(year, month, day, hour, minute, second, 0);
  }

  // String with at least one non-whitespace char, trimmed length 1–200
  function validTaskTitle(i) {
    const chars = 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    const seed   = (i * 6364136223846793005n) ? i : i; // just use i
    const len    = 1 + ((i * 1664525 + 1013904223) >>> 0) % 200; // 1–200
    let title = '';
    for (let j = 0; j < len; j++) {
      title += chars[(i * 31 + j * 17) % chars.length];
    }
    // Ensure no leading/trailing whitespace (trimmed === title) and non-empty
    title = title.trim() || 'x';
    return title.slice(0, 200) || 'x';
  }

  // Whitespace-only strings (including empty)
  function whitespaceOnly(i) {
    const options = ['', ' ', '   ', '\t', '\n', '  \t  ', '\r\n', '\t\n '];
    return options[i % options.length];
  }

  // Valid URLs: http or https with a non-empty hostname
  function validUrl(i) {
    const schemes = ['http://', 'https://'];
    const hosts   = ['example.com', 'test.org', 'foo.io', 'bar.net', 'a.co'];
    const paths   = ['', '/path', '/path/to/page', '?q=1', '/a?b=c#d'];
    const scheme  = schemes[i % 2];
    const host    = hosts[i % hosts.length];
    const path    = paths[i % paths.length];
    return scheme + host + path;
  }

  // Invalid URLs: no http/https prefix, or clearly malformed
  function invalidUrl(i) {
    const options = [
      '',
      'ftp://example.com',
      'just-a-string',
      '//example.com',
      'htt://example.com',
      'httpss://example.com',
      'HTTP://example.com',  // uppercase — isValidUrl uses startsWith (case-sensitive)
      'HTTPS://example.com',
      'ws://example.com',
      'file:///path',
      'data:text/html,hi',
      '  http://example.com',    // leading space (isValidUrl trims, so this IS valid — skip)
    ];
    // Filter to ones that are truly invalid after trim check
    const trulyInvalid = options.filter(function (s) {
      const t = s.trim();
      return !t.startsWith('http://') && !t.startsWith('https://');
    });
    return trulyInvalid[i % trulyInvalid.length];
  }

  // Array of valid Task objects (length 0–5)
  function taskArray(i) {
    const len = i % 6; // 0–5
    const arr = [];
    for (let j = 0; j < len; j++) {
      arr.push({
        id: 'id-' + i + '-' + j,
        title: 'Task ' + i + '_' + j,
        completed: (i + j) % 2 === 0,
      });
    }
    return arr;
  }

  // Array of valid Link objects (length 0–5)
  function linkArray(i) {
    const len = i % 6;
    const arr = [];
    for (let j = 0; j < len; j++) {
      arr.push({
        id: 'lid-' + i + '-' + j,
        label: 'Link ' + i + '_' + j,
        url: 'https://example' + j + '.com',
      });
    }
    return arr;
  }

  // Pick a random timerState from the three valid states
  function randomTimerState(i) {
    return ['idle', 'running', 'paused'][i % 3];
  }

  // ─── Dashboard shorthand ──────────────────────────────────────────────────

  const d = window._dashboard;

  // ─── DOM stubs required by functions that touch the DOM ───────────────────
  // submitNewTask, commitEdit, timerTick, stopTimer, resetTimer all reach into
  // the live DOM. We provide minimal stubs so those calls don't throw.

  function withDomStubs(fn) {
    // Create a hidden container that holds all the IDs the functions need
    const host = document.createElement('div');
    host.style.display = 'none';
    host.innerHTML = [
      '<p id="timer-display"></p>',
      '<div id="timer-notification" class="timer-notification"></div>',
      '<span id="todo-input-error"></span>',
      '<input id="todo-input" type="text" />',
      '<ul id="todo-list"></ul>',
      '<div id="links-grid"></div>',
      '<input id="link-label-input" type="text" />',
      '<input id="link-url-input" type="text" />',
      '<span id="link-label-error"></span>',
      '<span id="link-url-error"></span>',
      '<span id="link-limit-error"></span>',
      '<p id="greeting-time"></p>',
      '<p id="greeting-date"></p>',
      '<p id="greeting-msg"></p>',
    ].join('');
    document.body.appendChild(host);
    try {
      return fn(host);
    } finally {
      document.body.removeChild(host);
    }
  }

  // ─── Mock localStorage ────────────────────────────────────────────────────

  function withMockLocalStorage(data, fn) {
    const real = window.localStorage;
    const store = Object.assign({}, data || {});
    const mock = {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; },
    };
    Object.defineProperty(window, 'localStorage', { value: mock, configurable: true, writable: true });
    try {
      return fn(store);
    } finally {
      Object.defineProperty(window, 'localStorage', { value: real, configurable: true, writable: true });
    }
  }

  // ─── PROPERTY TESTS ───────────────────────────────────────────────────────

  // Feature: todo-life-dashboard, Property 1: Greeting classification is exhaustive and correct
  property('Property 1 — getGreeting returns one of four strings for every hour in [0,24)', function () {
    const valid = new Set(['Good Morning', 'Good Afternoon', 'Good Evening', 'Good Night']);
    const hourGen = exhaust(0, 24);
    forAll(hourGen, function (hour) {
      const result = d.getGreeting(hour);
      assert(valid.has(result),
        'getGreeting(' + hour + ') returned unexpected value: ' + JSON.stringify(result));
    }, 24);

    // Also verify the exact mapping for each boundary
    assert(d.getGreeting(0)  === 'Good Night',     'hour 0 → Good Night');
    assert(d.getGreeting(4)  === 'Good Night',     'hour 4 → Good Night');
    assert(d.getGreeting(5)  === 'Good Morning',   'hour 5 → Good Morning');
    assert(d.getGreeting(11) === 'Good Morning',   'hour 11 → Good Morning');
    assert(d.getGreeting(12) === 'Good Afternoon', 'hour 12 → Good Afternoon');
    assert(d.getGreeting(17) === 'Good Afternoon', 'hour 17 → Good Afternoon');
    assert(d.getGreeting(18) === 'Good Evening',   'hour 18 → Good Evening');
    assert(d.getGreeting(21) === 'Good Evening',   'hour 21 → Good Evening');
    assert(d.getGreeting(22) === 'Good Night',     'hour 22 → Good Night');
    assert(d.getGreeting(23) === 'Good Night',     'hour 23 → Good Night');
  });

  // Feature: todo-life-dashboard, Property 2: Time display formatting is always valid HH:MM
  property('Property 2 — formatTime always matches HH:MM and reflects getHours/getMinutes', function () {
    const pattern = /^\d{2}:\d{2}$/;
    forAll(randomDate, function (date) {
      const result = d.formatTime(date);
      assert(pattern.test(result),
        'formatTime did not match HH:MM for date ' + date + ', got: ' + result);

      const [hPart, mPart] = result.split(':');
      const expectedH = date.getHours().toString().padStart(2, '0');
      const expectedM = date.getMinutes().toString().padStart(2, '0');
      assert(hPart === expectedH,
        'Hour mismatch: expected ' + expectedH + ', got ' + hPart + ' for ' + date);
      assert(mPart === expectedM,
        'Minute mismatch: expected ' + expectedM + ', got ' + mPart + ' for ' + date);
    }, 200);
  });

  // Feature: todo-life-dashboard, Property 3: Date display formatting preserves correct components
  property('Property 3 — formatDate contains correct weekday, day, month, year', function () {
    const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const MONTHS   = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
    forAll(randomDate, function (date) {
      const result = d.formatDate(date);
      const weekday = WEEKDAYS[date.getDay()];
      const day     = date.getDate().toString();           // no leading zero
      const month   = MONTHS[date.getMonth()];
      const year    = date.getFullYear().toString();

      assert(result.includes(weekday),
        'Missing weekday "' + weekday + '" in: ' + result);
      // day without leading zero: match as word boundary
      assert(result.includes(day),
        'Missing day "' + day + '" in: ' + result);
      assert(result.includes(month),
        'Missing month "' + month + '" in: ' + result);
      assert(result.includes(year),
        'Missing year "' + year + '" in: ' + result);
    }, 200);
  });

  // Feature: todo-life-dashboard, Property 4: Timer display always produces valid MM:SS
  property('Property 4 — formatTimerDisplay matches MM:SS and satisfies mm*60+ss===s', function () {
    const pattern = /^\d{2}:\d{2}$/;
    const secGen  = intRange(0, 1501);
    forAll(secGen, function (s) {
      const result = d.formatTimerDisplay(s);
      assert(pattern.test(result),
        'formatTimerDisplay(' + s + ') did not match MM:SS, got: ' + result);

      const [mmStr, ssStr] = result.split(':');
      const mm = parseInt(mmStr, 10);
      const ss = parseInt(ssStr, 10);
      assert(mm * 60 + ss === s,
        'mm*60+ss !== s for s=' + s + ' (mm=' + mm + ', ss=' + ss + ')');
    }, 200);

    // Exhaustive check for boundary values
    [0, 1, 59, 60, 61, 1499, 1500].forEach(function (s) {
      const r = d.formatTimerDisplay(s);
      const [mmStr, ssStr] = r.split(':');
      const mm = parseInt(mmStr, 10);
      const ss = parseInt(ssStr, 10);
      assert(mm * 60 + ss === s, 'Boundary check failed for s=' + s);
    });
  });

  // Feature: todo-life-dashboard, Property 5: Timer tick decrements remaining by exactly 1
  property('Property 5 — timerTick decrements timerRemaining by 1 when running and >0', function () {
    withDomStubs(function () {
      const secGen = intRange(1, 1501); // timerRemaining > 0
      forAll(secGen, function (rem) {
        d.timerState    = 'running';
        d.timerRemaining = rem;

        d.timerTick();

        const expectedRemaining = rem - 1;
        assert(d.timerRemaining === expectedRemaining,
          'timerRemaining should be ' + expectedRemaining + ', got ' + d.timerRemaining + ' (was ' + rem + ')');

        if (expectedRemaining === 0) {
          assert(d.timerState === 'idle',
            'timerState should be "idle" when remaining reaches 0, got: ' + d.timerState);
        } else {
          assert(d.timerState === 'running',
            'timerState should remain "running" after tick, got: ' + d.timerState);
        }
      }, 200);
    });
  });

  // Feature: todo-life-dashboard, Property 6: Stop preserves remaining time for any running timer
  property('Property 6 — stopTimer transitions to "paused" and leaves timerRemaining unchanged', function () {
    withDomStubs(function () {
      const secGen = intRange(1, 1501); // timerRemaining in (0, 1500]
      forAll(secGen, function (rem) {
        d.timerState     = 'running';
        d.timerRemaining = rem;

        d.stopTimer();

        assert(d.timerState === 'paused',
          'timerState should be "paused" after stopTimer, got: ' + d.timerState);
        assert(d.timerRemaining === rem,
          'timerRemaining should be unchanged (' + rem + '), got: ' + d.timerRemaining);
      }, 200);
    });
  });

  // Feature: todo-life-dashboard, Property 7: Reset always restores timer to initial state
  property('Property 7 — resetTimer sets timerState="idle" and timerRemaining=1500 for any state', function () {
    withDomStubs(function () {
      const states = ['idle', 'running', 'paused'];
      const secGen = intRange(0, 1501);
      forAll(secGen, function (rem, i) {
        d.timerState     = states[i % 3];
        d.timerRemaining = rem;

        d.resetTimer();

        assert(d.timerState === 'idle',
          'timerState should be "idle" after reset, got: ' + d.timerState);
        assert(d.timerRemaining === 1500,
          'timerRemaining should be 1500 after reset, got: ' + d.timerRemaining);
      }, 200);
    });
  });

  // Feature: todo-life-dashboard, Property 8: Valid task titles are accepted and create exactly one task
  property('Property 8 — submitNewTask adds exactly one task with trimmed title and completed=false', function () {
    withDomStubs(function () {
      forAll(validTaskTitle, function (title) {
        // Reset tasks to empty for each sample
        d.tasks = [];

        d.submitNewTask(title);

        const currentTasks = d.tasks;
        assert(currentTasks.length === 1,
          'tasks.length should be 1 after submitNewTask, got: ' + currentTasks.length + ' (title: ' + JSON.stringify(title) + ')');

        const task = currentTasks[0];
        assert(task.title === title.trim(),
          'task.title should equal trimmed input. Expected: ' + JSON.stringify(title.trim()) + ', got: ' + JSON.stringify(task.title));
        assert(task.completed === false,
          'task.completed should be false, got: ' + task.completed);
      }, 100);
    });
  });

  // Feature: todo-life-dashboard, Property 9: Whitespace-only inputs are rejected for task creation and editing
  property('Property 9 — submitNewTask and commitEdit reject whitespace-only/empty strings', function () {
    withDomStubs(function () {
      // Part A: submitNewTask rejects whitespace
      forAll(whitespaceOnly, function (ws) {
        d.tasks = [];
        d.submitNewTask(ws);

        assert(d.tasks.length === 0,
          'submitNewTask with whitespace-only input should not add a task (input: ' + JSON.stringify(ws) + ')');

        const errorEl = document.getElementById('todo-input-error');
        assert(errorEl && errorEl.textContent.trim().length > 0,
          'submitNewTask should set a non-empty error message for whitespace input');
      }, 8);

      // Part B: commitEdit rejects whitespace (requires an existing task item in DOM)
      forAll(whitespaceOnly, function (ws) {
        const taskId = 'test-edit-id-' + Date.now();
        // Seed tasks with one task
        d.tasks = [{ id: taskId, title: 'Original Title', completed: false }];

        // Create the DOM item for the task
        const host = document.getElementById('todo-list');
        const li = d.renderTaskItem({ id: taskId, title: 'Original Title', completed: false });
        host.appendChild(li);

        d.commitEdit(taskId, ws);

        // Title must be unchanged
        const task = d.tasks.find(function (t) { return t.id === taskId; });
        assert(task && task.title === 'Original Title',
          'commitEdit with whitespace should leave title unchanged (input: ' + JSON.stringify(ws) + ')');

        // Validation error must be shown
        const editError = li.querySelector('.todo-edit-error');
        assert(editError && editError.textContent.trim().length > 0,
          'commitEdit should set non-empty error for whitespace input');

        // Cleanup
        if (li.parentNode) li.parentNode.removeChild(li);
        d.tasks = [];
      }, 8);
    });
  });

  // Feature: todo-life-dashboard, Property 10: deleteTask removes exactly the targeted task
  property('Property 10 — deleteTask removes only the targeted task, leaves others intact', function () {
    withDomStubs(function () {
      forAll(taskArray, function (arr) {
        if (arr.length === 0) return; // nothing to delete

        // Pick one task to delete (middle element for variety)
        const targetIdx  = Math.floor(arr.length / 2);
        const targetTask = arr[targetIdx];
        const othersSnapshot = arr
          .filter(function (t) { return t.id !== targetTask.id; })
          .map(function (t) { return JSON.stringify(t); });

        // Seed state
        d.tasks = arr.map(function (t) { return Object.assign({}, t); });

        // Build DOM items so deleteTask can find the <li>
        const list = document.getElementById('todo-list');
        list.innerHTML = '';
        d.tasks.forEach(function (t) {
          list.appendChild(d.renderTaskItem(t));
        });

        d.deleteTask(targetTask.id);

        const remaining = d.tasks;
        // Target must be gone
        assert(!remaining.some(function (t) { return t.id === targetTask.id; }),
          'Deleted task still present: ' + targetTask.id);

        // All others must remain with unchanged fields
        assert(remaining.length === arr.length - 1,
          'tasks.length after delete: expected ' + (arr.length - 1) + ', got ' + remaining.length);

        othersSnapshot.forEach(function (snap) {
          assert(remaining.some(function (t) { return JSON.stringify(t) === snap; }),
            'Task was altered or missing after delete: ' + snap);
        });
      }, 50);
    });
  });

  // Feature: todo-life-dashboard, Property 11: Completion toggle is its own inverse
  property('Property 11 — toggleTask twice restores original completed value', function () {
    withDomStubs(function () {
      [true, false].forEach(function (initial) {
        const taskId = 'toggle-test-id';
        d.tasks = [{ id: taskId, title: 'Test Task', completed: initial }];

        // Need a DOM item for toggleTask to replace
        const list = document.getElementById('todo-list');
        list.innerHTML = '';
        list.appendChild(d.renderTaskItem({ id: taskId, title: 'Test Task', completed: initial }));

        // First toggle
        d.toggleTask(taskId);
        const afterFirst = d.tasks.find(function (t) { return t.id === taskId; });
        assert(afterFirst && afterFirst.completed === !initial,
          'After first toggle: expected completed=' + !initial + ', got ' + (afterFirst && afterFirst.completed));

        // Second toggle — need fresh DOM item since toggleTask replaces it
        d.toggleTask(taskId);
        const afterSecond = d.tasks.find(function (t) { return t.id === taskId; });
        assert(afterSecond && afterSecond.completed === initial,
          'After second toggle: expected completed=' + initial + ', got ' + (afterSecond && afterSecond.completed));
      });
    });
  });

  // Feature: todo-life-dashboard, Property 12: URL validation correctly classifies URLs
  property('Property 12 — isValidUrl returns false for non-http(s) / empty host; true for well-formed http(s) URLs', function () {
    // Valid URLs must return true
    forAll(validUrl, function (url) {
      assert(d.isValidUrl(url) === true,
        'isValidUrl should return true for valid URL: ' + JSON.stringify(url));
    }, 50);

    // Invalid URLs must return false
    forAll(invalidUrl, function (url) {
      assert(d.isValidUrl(url) === false,
        'isValidUrl should return false for invalid URL: ' + JSON.stringify(url));
    }, 50);

    // Edge cases
    assert(d.isValidUrl('http://a.com')   === true,  'http://a.com should be valid');
    assert(d.isValidUrl('https://b.org')  === true,  'https://b.org should be valid');
    assert(d.isValidUrl('')               === false, 'empty string should be invalid');
    assert(d.isValidUrl('ftp://x.com')    === false, 'ftp:// should be invalid');
    assert(d.isValidUrl('//example.com')  === false, '// (no scheme) should be invalid');
    assert(d.isValidUrl('HTTP://a.com')   === false, 'uppercase HTTP:// should be invalid');
    assert(d.isValidUrl('javascript:void(0)') === false, 'javascript: should be invalid');
  });

  // Feature: todo-life-dashboard, Property 13: Serialization round-trip preserves all fields
  property('Property 13 — JSON.parse(JSON.stringify(arr)) preserves all fields for Task[] and Link[]', function () {
    // Tasks
    forAll(taskArray, function (arr) {
      const roundTripped = JSON.parse(JSON.stringify(arr));
      assert(roundTripped.length === arr.length,
        'Task[] round-trip length mismatch: expected ' + arr.length + ', got ' + roundTripped.length);
      arr.forEach(function (original, idx) {
        const rt = roundTripped[idx];
        assert(rt.id        === original.id,        'Task id mismatch at ' + idx);
        assert(rt.title     === original.title,     'Task title mismatch at ' + idx);
        assert(rt.completed === original.completed, 'Task completed mismatch at ' + idx);
      });
    }, 100);

    // Links
    forAll(linkArray, function (arr) {
      const roundTripped = JSON.parse(JSON.stringify(arr));
      assert(roundTripped.length === arr.length,
        'Link[] round-trip length mismatch: expected ' + arr.length + ', got ' + roundTripped.length);
      arr.forEach(function (original, idx) {
        const rt = roundTripped[idx];
        assert(rt.id    === original.id,    'Link id mismatch at ' + idx);
        assert(rt.label === original.label, 'Link label mismatch at ' + idx);
        assert(rt.url   === original.url,   'Link url mismatch at ' + idx);
      });
    }, 100);
  });

  // Feature: todo-life-dashboard, Property 14: Malformed localStorage data is treated as empty
  property('Property 14 — safeParse returns [] for invalid JSON, non-array, or items failing shape guard', function () {
    const KEY = 'test_safeParse_key';

    // Case 1: Invalid JSON
    ['{not json', '[[}', 'undefined', 'NaN', ''].forEach(function (bad) {
      withMockLocalStorage({ [KEY]: bad }, function () {
        let result, threw = false;
        try { result = d.safeParse(KEY, d.isValidTask); } catch (e) { threw = true; }
        assert(!threw, 'safeParse should not throw for invalid JSON: ' + JSON.stringify(bad));
        assert(Array.isArray(result) && result.length === 0,
          'safeParse should return [] for invalid JSON, got: ' + JSON.stringify(result));
      });
    });

    // Case 2: Valid JSON but not an array
    ['null', '"string"', '42', 'true', '{}', '{"a":1}'].forEach(function (notArr) {
      withMockLocalStorage({ [KEY]: notArr }, function () {
        const result = d.safeParse(KEY, d.isValidTask);
        assert(Array.isArray(result) && result.length === 0,
          'safeParse should return [] for non-array JSON (' + notArr + '), got: ' + JSON.stringify(result));
      });
    });

    // Case 3: Array where at least one item fails the shape guard
    const badItems = [
      '[{"id":1,"title":"t","completed":false}]',          // id is number not string
      '[{"id":"x","title":123,"completed":false}]',         // title is number
      '[{"id":"x","title":"t","completed":"yes"}]',         // completed is string
      '[{"id":"x","title":"t"}]',                           // missing completed
      '[{"title":"t","completed":false}]',                  // missing id
      '[{"id":"a","title":"ok","completed":false},{"id":2}]', // second item invalid
    ];
    badItems.forEach(function (badArr) {
      withMockLocalStorage({ [KEY]: badArr }, function () {
        const result = d.safeParse(KEY, d.isValidTask);
        assert(Array.isArray(result) && result.length === 0,
          'safeParse should return [] for array with invalid items (' + badArr + '), got: ' + JSON.stringify(result));
      });
    });

    // Case 4: Valid data passes through correctly
    const goodData = [{ id: 'a', title: 'My Task', completed: true }];
    withMockLocalStorage({ [KEY]: JSON.stringify(goodData) }, function () {
      const result = d.safeParse(KEY, d.isValidTask);
      assert(Array.isArray(result) && result.length === 1,
        'safeParse should return parsed array for valid data');
      assert(result[0].id === 'a' && result[0].title === 'My Task' && result[0].completed === true,
        'safeParse returned incorrect data for valid input');
    });

    // Case 5: key not present → returns []
    withMockLocalStorage({}, function () {
      const result = d.safeParse(KEY, d.isValidTask);
      assert(Array.isArray(result) && result.length === 0,
        'safeParse should return [] when key is absent');
    });
  });

  // ─── Render results to the page ───────────────────────────────────────────

  window.__testResults = results;

  document.addEventListener('DOMContentLoaded', function () {
    renderResults();
  });

  // If DOM is already loaded (script runs after DOMContentLoaded fired)
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    renderResults();
  }

  function renderResults() {
    const container = document.getElementById('test-output');
    if (!container) return;

    // Clear the loading placeholder
    container.innerHTML = '';

    const passed  = results.filter(function (r) { return r.passed; }).length;
    const failed  = results.filter(function (r) { return !r.passed; }).length;
    const total   = results.length;

    // Summary banner
    const banner = document.createElement('div');
    banner.className = 'summary ' + (failed === 0 ? 'all-pass' : 'has-fail');
    banner.innerHTML =
      '<strong>' + passed + ' / ' + total + ' passed</strong>' +
      (failed > 0 ? '  &nbsp; <span class="fail-count">' + failed + ' failed</span>' : '  &nbsp; ✓ All tests passed');
    container.appendChild(banner);

    // Individual results
    const list = document.createElement('ul');
    list.className = 'test-list';
    results.forEach(function (r) {
      const li = document.createElement('li');
      li.className = r.passed ? 'test-pass' : 'test-fail';
      li.innerHTML =
        '<span class="badge">' + (r.passed ? 'PASS' : 'FAIL') + '</span> ' +
        '<span class="test-name">' + escapeHtml(r.name) + '</span>' +
        (!r.passed && r.error
          ? '<pre class="error-detail">' + escapeHtml(r.error) + '</pre>'
          : '');
      list.appendChild(li);
    });
    container.appendChild(list);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

}());
