# Product: To Do List Life Dashboard

A personal productivity dashboard built as a standalone client-side web page. It runs entirely in the browser with no backend or build step required.

## Core Widgets

- **Greeting Widget** — displays current time (HH:MM, 24h), full date, and a time-based greeting (Good Morning/Afternoon/Evening/Night)
- **Focus Timer** — 25-minute Pomodoro countdown with start, stop, and reset controls; shows an in-page notification on completion
- **To-Do List** — create, edit, complete/uncomplete, and delete tasks; validated input (non-empty, max 200 chars)
- **Quick Links** — save and manage up to 20 shortcut buttons to external URLs; each link opens in a new tab

## Data Persistence

All user data (tasks and links) is stored in `localStorage` under keys `dashboard_tasks` and `dashboard_links`. The app operates gracefully in-memory if `localStorage` is unavailable.

## Target Users

Individual users who want a lightweight, always-available productivity hub in the browser — no accounts, no sync, no internet required.
