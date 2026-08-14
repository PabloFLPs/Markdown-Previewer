# Markdown Preview

A minimalist, local-first Markdown viewer with lightweight editing. Everything runs in the browser — files never leave your machine.

## Features

- Markdown preview with GFM support (tables, task lists, strikethrough, autolinks)
- Import `.md` / `.markdown` files via file picker or drag & drop
- Plain-text editor mode (`Ctrl/Cmd + E` to toggle)
- Export the current document (`Ctrl/Cmd + S`)
- Light / dark themes, persisted in `localStorage`
- Keyboard shortcut `Ctrl/Cmd + O` to open a file
- Word and character counts
- Responsive layout

## Stack

React + TypeScript + Vite + Tailwind CSS, with `react-markdown` and `remark-gfm` for rendering.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```