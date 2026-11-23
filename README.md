# Scanner

A browser app that turns a batch of photos into one PDF. Everything runs on the device. No server, no upload.

Input: JPG, PNG, WEBP. Output: one PDF, one page per image, in the order you set.

## Features

- Add by file picker, drag and drop, or phone camera.
- Reorder, rotate and remove pages.
- Four-corner crop with perspective correction, a magnifier, and edge and frame dragging.
- Auto edge detect with OpenCV.js, loaded only when requested.
- Filters: Original, Gray, and B&W document (adaptive threshold).
- Page size: A4, Letter, or the image size. Quality: Small file, Balanced, High quality.
- The PDF builds in a Web Worker with a progress bar.
- System, light and dark themes.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173/.

```bash
npm run build    # type check and production build
npm run lint
```

## Browser support

Needs `OffscreenCanvas` and module workers: Chrome 80+, Firefox 114+, Safari 16.4+.

## Stack

React 19, TypeScript, Vite, pdf-lib, and @techstark/opencv-js (lazy). The crop math (homography, warp) and the filters are written by hand.

## Docs

- [Architecture](docs/architecture.md)
- [Manual test checklist](docs/manual-test-checklist.md)

## Known limits

- Auto detect needs a clear edge between the page and the surface. Low contrast fails, and the editor says so.
- Thumbnails render through the full pipeline, so many large photos make them slow to refresh.
- Drag-to-reorder is not built. Pages move with Earlier and Later.
