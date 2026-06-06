# Requirements Document

## Introduction

The To Do List Life Dashboard is a client-side web application built with HTML, CSS, and Vanilla JavaScript. It serves as a personal productivity hub presented as a single-page dashboard. The application provides a greeting widget with the current time and date, a 25-minute Pomodoro focus timer, a task management to-do list, and a quick links panel for favorite websites. All user data is persisted using the browser's Local Storage API with no backend server required. The app must work as a standalone web page or as a browser extension across all modern browsers.

---

## Glossary

- **Dashboard**: The single-page web application that hosts all widgets.
- **Greeting_Widget**: The UI component that displays the current time, date, and a time-based greeting message.
- **Focus_Timer**: The countdown timer component that implements a 25-minute Pomodoro session.
- **Todo_List**: The UI component that manages the user's tasks (add, edit, mark done, delete).
- **Task**: A single to-do item with a title, completion state, and a unique identifier.
- **Quick_Links**: The UI component that displays and manages user-defined shortcut buttons to external URLs.
- **Link**: A user-defined shortcut entry with a label and a URL.
- **Local_Storage**: The browser's `localStorage` API used for client-side data persistence.
- **Modern_Browser**: Chrome, Firefox, Edge, or Safari in their latest stable release.

---

## Requirements

### Requirement 1: Greeting Widget

**User Story:** As a user, I want to see the current time, date, and a personalized greeting when I open the dashboard, so that I am immediately oriented to the current moment.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM 24-hour format using the user's local timezone, updated on every new minute boundary.
2. THE Greeting_Widget SHALL display the current full date in the format "Weekday, D Month YYYY" (e.g., "Monday, 2 June 2025") using the user's local timezone; WHEN the clock crosses midnight, THE Greeting_Widget SHALL update the displayed date without requiring a page reload.
3. IF the local hour is between 5 (inclusive) and 12 (exclusive), THEN THE Greeting_Widget SHALL display the greeting "Good Morning".
4. IF the local hour is between 12 (inclusive) and 18 (exclusive), THEN THE Greeting_Widget SHALL display the greeting "Good Afternoon".
5. IF the local hour is between 18 (inclusive) and 22 (exclusive), THEN THE Greeting_Widget SHALL display the greeting "Good Evening".
6. IF the local hour is between 22 (inclusive) and 24 (exclusive) OR between 0 (inclusive) and 5 (exclusive), THEN THE Greeting_Widget SHALL display the greeting "Good Night".
7. WHEN the clock crosses a minute boundary, THE Greeting_Widget SHALL re-evaluate the current hour and update the greeting if the time-of-day range has changed.

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with start, stop, and reset controls, so that I can manage focused work sessions using the Pomodoro technique.

#### Acceptance Criteria

1. THE Focus_Timer SHALL initialize with a countdown value of 25 minutes and 00 seconds (25:00) and SHALL display the remaining time in MM:SS format in all states (initial, running, paused, and reset).
2. WHEN the user activates the start control and the Focus_Timer is not already running, THE Focus_Timer SHALL begin counting down in one-second intervals.
3. IF the user activates the start control while the Focus_Timer is already running, THEN THE Focus_Timer SHALL ignore the activation and continue counting down uninterrupted.
4. WHILE the Focus_Timer is running, THE Focus_Timer SHALL decrement the remaining time by one second and update the displayed MM:SS value on each interval tick.
5. WHEN the user activates the stop control, THE Focus_Timer SHALL pause the countdown and retain the remaining time so that a subsequent start resumes from that point.
6. WHEN the user activates the reset control, THE Focus_Timer SHALL stop any active countdown and restore the displayed time to 25:00.
7. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically and the display SHALL remain at 00:00.
8. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL display a visible in-page notification (e.g., an alert banner or modal) informing the user that the session has ended.

---

### Requirement 3: To-Do List — Task Creation

**User Story:** As a user, I want to add new tasks to my to-do list, so that I can track things I need to accomplish.

#### Acceptance Criteria

1. THE Todo_List SHALL provide a text input field and a submission control (button or Enter key) for adding new tasks.
2. WHEN the user submits a task title that is non-empty after trimming whitespace and does not exceed 200 characters, THE Todo_List SHALL add a new Task with a unique identifier, the trimmed title, and an incomplete state, then clear the input field.
3. IF the user submits an empty or whitespace-only task title, THEN THE Todo_List SHALL reject the submission and display an inline validation message indicating that the title cannot be empty.
4. IF the user submits a task title that exceeds 200 characters after trimming, THEN THE Todo_List SHALL reject the submission and display an inline validation message indicating the character limit.
5. WHEN a new Task is added, THE Todo_List SHALL attempt to persist the updated task list to Local_Storage; IF persistence fails, THEN THE Todo_List SHALL still display the new Task in the UI without throwing an unhandled error.
6. WHEN the Dashboard is loaded, THE Todo_List SHALL retrieve all tasks from Local_Storage and render them in the order they were saved.

---

### Requirement 4: To-Do List — Task Management

**User Story:** As a user, I want to edit, mark as done, and delete tasks, so that I can keep my to-do list accurate and up to date.

#### Acceptance Criteria

1. WHEN the user activates the edit control on a Task, THE Todo_List SHALL replace the Task's displayed title with an inline text input pre-populated with the current title, limited to 100 characters.
2. WHEN the user confirms an edit (by pressing Enter or activating a save control) with a title that is non-empty after trimming, THE Todo_List SHALL update the Task's title to the trimmed value, exit edit mode, and persist the updated task list to Local_Storage; IF Local_Storage persistence fails, THEN THE Todo_List SHALL still display the updated title in the UI.
3. IF the user confirms an edit with an empty or whitespace-only title, THEN THE Todo_List SHALL reject the change, retain the original Task title, and display an inline validation message.
4. WHEN the user cancels an edit (by pressing Escape or activating a cancel control), THE Todo_List SHALL discard any unsaved changes and restore the original Task title.
5. WHEN the user activates the complete control on a Task, THE Todo_List SHALL toggle the Task's completion state: IF the Task is incomplete, THEN it SHALL be marked complete with strikethrough text decoration applied to the title; IF the Task is complete, THEN it SHALL be marked incomplete and the strikethrough text decoration SHALL be removed.
6. WHEN the completion state of a Task changes, THE Todo_List SHALL persist the updated task list to Local_Storage; IF Local_Storage persistence fails, THEN THE Todo_List SHALL still reflect the updated state in the UI.
7. WHEN the user activates the delete control on a Task, THE Todo_List SHALL remove the Task from the list and persist the updated task list to Local_Storage; IF Local_Storage persistence fails, THEN THE Todo_List SHALL still remove the Task from the UI.

---

### Requirement 5: Quick Links — Link Management

**User Story:** As a user, I want to save and manage shortcut buttons to my favorite websites, so that I can open them quickly from the dashboard.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide a label input field (max 64 characters) and a URL input field (max 2048 characters) and a submission control for adding a new Link.
2. WHEN the user submits a new Link where the label is non-empty after trimming AND the URL begins with "http://" or "https://" followed by a non-empty host, AND the total number of saved links is fewer than 20, THE Quick_Links SHALL add the Link as a clickable button in the panel and persist all links to Local_Storage.
3. IF the user submits a new Link with an empty label or an empty URL, THEN THE Quick_Links SHALL reject the submission and display an inline validation message adjacent to the empty field.
4. IF the user submits a URL that is non-empty but does not start with "http://" or "https://" or has an empty host segment, THEN THE Quick_Links SHALL reject the submission and display an inline validation message indicating the URL format is invalid.
5. IF the total number of saved links is already 20 and the user attempts to add another Link, THEN THE Quick_Links SHALL reject the submission and display an inline validation message indicating the maximum limit has been reached.
6. WHEN the user activates a Link button, THE Quick_Links SHALL open the Link's URL in a new browser tab.
7. WHEN the user activates the delete control on a Link, THE Quick_Links SHALL remove the Link from the panel and persist the updated link list to Local_Storage.
8. WHEN the Dashboard is loaded, THE Quick_Links SHALL retrieve and display all previously saved links from Local_Storage.
9. IF Local_Storage is unavailable on load, THEN THE Quick_Links SHALL initialize with an empty link list and display without throwing an unhandled error.

---

### Requirement 6: Data Persistence

**User Story:** As a user, I want my tasks and quick links to be saved automatically, so that my data is preserved between browser sessions without any manual export or import.

#### Acceptance Criteria

1. WHEN the task list is mutated (task added, edited, toggled, or deleted), THE Dashboard SHALL serialize the current task array — where each Task contains the fields `id` (string), `title` (string), and `completed` (boolean) — as a JSON string and write it to Local_Storage under the key `"dashboard_tasks"`.
2. WHEN the link list is mutated (link added or deleted), THE Dashboard SHALL serialize the current link array — where each Link contains the fields `id` (string), `label` (string), and `url` (string) — as a JSON string and write it to Local_Storage under the key `"dashboard_links"`.
3. WHEN the Dashboard is loaded, THE Dashboard SHALL read the JSON string from Local_Storage keys `"dashboard_tasks"` and `"dashboard_links"`, parse each into its corresponding array, and use those arrays to initialize the Todo_List and Quick_Links widgets.
4. IF the value stored under `"dashboard_tasks"` or `"dashboard_links"` is non-parseable JSON or is a parsed array containing items that are missing one or more of their required fields, THEN THE Dashboard SHALL treat that key's data as empty and initialize the corresponding widget with an empty array without throwing an unhandled error.
5. IF Local_Storage is unavailable (e.g., throws a SecurityError or is not defined), THEN THE Dashboard SHALL initialize both the Todo_List and Quick_Links with empty arrays and continue operating in-memory without throwing an unhandled error.
6. IF the task list is saved and subsequently reloaded (round-trip), THEN for any valid input array of Tasks, the loaded array SHALL contain items with identical `id`, `title`, and `completed` field values in the same order as the original.
7. IF the link list is saved and subsequently reloaded (round-trip), THEN for any valid input array of Links, the loaded array SHALL contain items with identical `id`, `label`, and `url` field values in the same order as the original.

---

### Requirement 7: Layout and Visual Design

**User Story:** As a user, I want the dashboard to have a clean, readable, and visually organized layout, so that I can use all widgets comfortably without visual clutter.

#### Acceptance Criteria

1. THE Dashboard SHALL render all four widgets — Greeting_Widget, Focus_Timer, Todo_List, and Quick_Links — visible within the viewport on a 1280×800 screen without requiring vertical scrolling; each widget SHALL have a minimum rendered width and height of 200px.
2. THE Dashboard SHALL apply a visual hierarchy in which widget titles use a font size at least 4px larger than body text, interactive controls (buttons, inputs) are visually distinct from static content, and content areas have sufficient padding so no text touches a widget border.
3. THE Dashboard SHALL use a single CSS file located at `css/style.css` for all styling; no inline `style` attributes or `<style>` elements SHALL be used for layout or theme rules.
4. THE Dashboard SHALL use a single JavaScript file located at `js/app.js` for all logic; no `<script>` tags other than the one loading `js/app.js` SHALL be present in the HTML.
5. THE Dashboard SHALL be fully functional in Modern_Browsers (Chrome, Firefox, Edge, Safari) without polyfills or build steps, meaning: the timer counts down correctly, tasks can be added and persisted, links can be added and opened, and the greeting updates on time change.
6. WHEN the viewport width is less than 1280px, THE Dashboard SHALL reflow the widgets into a single-column vertical stack and each widget SHALL remain fully usable (scrollable internally if needed) with a minimum rendered width of 200px.
