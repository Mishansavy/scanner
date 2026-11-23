# Architecture

## Data flow

```
File input / drop / camera
  -> detectImageKind (magic bytes)  -> Page { file, rotation, filter, corners }
  -> App state (pages[])
       |-> PagePreview -> renderPage (480 px) -> thumbnail
       |-> CropEditor  -> corners (and detectDocumentCorners, lazy OpenCV)
       '-> Export -> runPdfWorker -> pdf.worker.ts -> buildPdf -> renderPage -> pdf-lib -> bytes
                                                   '-> progress messages -> ProgressBar
```

The `Page` type is in [src/types.ts](../src/types.ts). Crop corners are stored in the original image's pixel coordinates, in the order top-left, top-right, bottom-right, bottom-left.

## Render pipeline

[src/lib/render.ts](../src/lib/render.ts) turns one `Page` into JPEG bytes. The same function serves thumbnails and the PDF.

1. Decode with `createImageBitmap(file, { imageOrientation: 'from-image' })`. This applies the EXIF rotation, so portrait phone photos come out upright.
2. Scale so the longest edge fits the quality preset.
3. Warp by the crop corners, if set.
4. Apply the filter.
5. Rotate by the page rotation onto a white background.
6. Encode as JPEG at the preset's quality.

Everything uses `OffscreenCanvas`, because the PDF build runs in a worker with no DOM.

Crop happens before rotation. Corners are always set on the unrotated image.

## Crop math

[src/lib/geometry.ts](../src/lib/geometry.ts), written without a library.

- `computeHomography` solves the 8 by 8 system for the transform from four point pairs, using Gaussian elimination with partial pivoting.
- `warpPerspective` maps each output pixel back into the source and samples with bilinear interpolation. Output size comes from the longer of each pair of opposite sides.
- `isClockwiseConvexQuad` rejects crossed or mirrored corners. The crop editor blocks Save when it fails, because the warp output would be garbage.
- `orderCorners` sorts four loose points into top-left, top-right, bottom-right, bottom-left by coordinate sums and differences.

## Filters

[src/lib/filters.ts](../src/lib/filters.ts). Gray uses luminance weights. B&W uses Bradley adaptive thresholding: each pixel is compared with the mean of its neighbourhood, found in constant time from an integral image. A pixel below 85 percent of the local mean turns black.

## Crop editor

[src/components/CropEditor.tsx](../src/components/CropEditor.tsx). A canvas draws the image, the dimmed outside, the outline and the handles. Drags are delta-based, so a handle never jumps to the pointer. A drag on a corner moves one point, on an edge midpoint moves two, and inside the frame moves all four. Each move is clamped to the image bounds. A 3x magnifier draws while a handle is held. Colours are read from the CSS tokens at draw time, so both themes work.

## Auto detect

[src/lib/detectCorners.ts](../src/lib/detectCorners.ts). The OpenCV module loads through a dynamic import, which Vite emits as a separate 15.5 MB chunk (3.9 MB gzipped). Nothing downloads until the user clicks Auto detect.

Steps on a 500 px copy: grayscale, blur, Canny edges, dilate, find contours, approximate each to a polygon, keep convex four-sided shapes covering at least 20 percent of the image, and take the largest. Corners scale back to the original resolution. Every OpenCV object is freed in a `finally` block, since the WASM heap is not garbage collected.

The result only fills the crop handles. The user can still adjust them.

## PDF build and worker

- [src/lib/pdf.ts](../src/lib/pdf.ts): `buildPdf` renders each page, embeds the JPEG with pdf-lib and sizes the page. A4 and Letter fit the image inside a 24 pt margin and choose landscape when the image is wider than tall.
- [src/workers/pdf.worker.ts](../src/workers/pdf.worker.ts): runs `buildPdf` and posts `progress`, `done` or `error` messages. The final bytes are transferred, not copied.
- [src/lib/runPdfWorker.ts](../src/lib/runPdfWorker.ts): starts a worker per export, resolves with the bytes, and terminates the worker when it finishes or fails.
- Message types are in [src/lib/pdfWorkerMessages.ts](../src/lib/pdfWorkerMessages.ts).

## Settings

- Page size: `PAGE_SIZES` in `pdf.ts` (A4, Letter) plus the image-size mode.
- Quality: `QUALITY_PRESETS` in `render.ts`. Each preset sets the longest edge and the JPEG quality together.

| Preset | Longest edge | JPEG quality |
| --- | --- | --- |
| Small file | 1400 px | 0.6 |
| Balanced | 2000 px | 0.75 |
| High quality | 2800 px | 0.9 |

## Validation

[src/lib/sniff.ts](../src/lib/sniff.ts) reads the first 12 bytes of each file and accepts JPEG (`FF D8 FF`), PNG (`89 PNG`) and WEBP (`RIFF` at 0, `WEBP` at 8). The browser's `file.type` is never trusted, so a renamed file cannot break the PDF build.

## Design system

[src/App.css](../src/App.css). Every colour, size, space and radius is a CSS custom property on `:root`. Surfaces are separated with 1px borders, with no shadows. Dark mode is defined as a second token set, applied through `prefers-color-scheme` and a `data-theme` override that [src/lib/theme.ts](../src/lib/theme.ts) sets from the theme select and `localStorage`. Canvas code reads tokens through `getComputedStyle`, since `var()` does not resolve inside canvas drawing calls.

Type is IBM Plex Sans for text and IBM Plex Mono for numbers and labels. Controls use word labels, not icons.

## Decisions

- **Client only.** Photos of documents are private, and a server would add upload time and a trust problem.
- **JPEG for every page.** One code path, EXIF handled by the browser, and small files. Transparent PNGs are flattened onto white.
- **Own homography, no library.** The crop math is the learning goal of the project.
- **OpenCV only for detection.** Loaded on demand, because of its size.
- **Presets, not sliders.** Pixel size and JPEG quality are the two levers on file size, so one choice sets both.

## Not built

- Drag-to-reorder. Pages move with Earlier and Later.
- Cancelling an export in progress.
- Browser testing and automated tests. See the [manual checklist](manual-test-checklist.md).
