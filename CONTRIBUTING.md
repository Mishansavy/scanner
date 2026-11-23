# Contributing to Scanner

Scanner turns a batch of photos into one PDF, entirely in the browser. Bug reports, fixes and new features are welcome. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Set up

You need Node 22.

```bash
npm install
npm run dev
```

Open http://localhost:5173/. There is no backend and no token to set up. [docs/architecture.md](docs/architecture.md) explains how the render pipeline, the crop math and the PDF worker fit together.

## Where to start

- **Real-photo testing:** run [docs/manual-test-checklist.md](docs/manual-test-checklist.md) on your browser and phone, and report anything that fails.
- **Auto detect:** the thresholds at the top of `src/lib/detectCorners.ts` were tuned on synthetic images only. Photos where it picks the wrong shape are the most useful reports.
- **Drag-to-reorder:** not built yet. Pages move with Earlier and Later buttons.
- **Cancel an export:** the worker cannot be stopped mid-build yet.
- **Tests:** there are no automated tests. The crop math in `src/lib/geometry.ts` is pure and easy to cover.

## Pull requests

1. Keep a PR to one change.
2. Run `npm run lint` and `npm run build` before you push. CI runs the same two.
3. Update `docs/` when behaviour changes.
4. Write commit messages in the imperative, under 15 words.

`main` is protected. Every change goes through a pull request that needs one approving review and passing checks.

By opening a PR you agree your contribution is released under the MIT license in `LICENSE`. There is no CLA.

## Code style

- Names say what the thing is. Write `for page in pages`, not `for p in pages`. `x` and `y` are fine for pixel coordinates.
- Comments are one line and explain why, not what.
- Colours, font sizes, spacing and radii are tokens in `src/App.css`. Do not hardcode them in components.
- Surfaces are separated with 1px borders. No shadows, and no decorative icons.
- One component per file. Page files only compose.

## Reporting a bug

Open an issue with the browser, the file type and the steps. For a crop or detection problem, say what the photo looked like and, if you can share it, attach it.
