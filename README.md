# Scanner

A document scanner that runs in the browser. Add photos of pages, crop each one flat, clean it up, and download a single PDF. Your photos never leave your device.

Live site: https://mishansavy.github.io/scanner/

## What you get

- Add JPG, PNG and WEBP files by picking, dragging, or using the phone camera. Reorder, rotate and remove pages.
- A four-corner crop with perspective correction. A page shot at an angle comes out flat with straight edges. Dragging a corner shows a magnifier.
- Auto detect finds the page outline for you. It loads OpenCV only when you ask, so the first visit stays light.
- Filters: Original, Gray, and B&W document, which uses adaptive thresholding so shadows do not turn into black blotches.
- Page size A4, Letter or the image size, and three quality presets: Small file, Balanced and High quality.
- The PDF builds in a Web Worker with a progress bar, so the page stays responsive on large batches.
- System, light and dark themes.

The crop math (a homography solved from four point pairs, then a bilinear warp) and the filters are written by hand. `docs/architecture.md` has the details.

## Run it locally

You need Node 22.

```bash
npm install
npm run dev
```

Open http://localhost:5173/. There is no backend and no token.

```bash
npm run build    # type check and production build
npm run lint
```

## Privacy

Everything happens in your browser. Images are decoded, cropped and encoded on your device, and the PDF is made there too. There is no server and no upload. The only network requests are the page itself, the IBM Plex fonts from Google Fonts, and the OpenCV bundle if you click Auto detect.

## Browser support

Needs `OffscreenCanvas` and module workers: Chrome 80+, Firefox 114+, Safari 16.4+.

## Known limits

- Auto detect needs a clear edge between the page and the surface. On low contrast it says so and you set the corners by hand. It has only been tuned on synthetic images, so real-photo reports are welcome.
- Pages move with Earlier and Later. Drag-to-reorder is not built.
- An export in progress cannot be cancelled.
- There are no automated tests yet. [docs/manual-test-checklist.md](docs/manual-test-checklist.md) covers what to check by hand.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Photos where auto detect fails and bugs from real phones are especially useful. Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)
