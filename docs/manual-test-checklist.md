# Manual test checklist

Nothing visual has been tested in a browser yet. Run this once in Chrome on desktop, then on a real phone. Use real photos: a mix of JPG, PNG and WEBP, at least one portrait phone photo, one page shot at an angle, and one 12 MP image.

Start the app with `npm run dev`, open http://localhost:5173/.

## Load and validate

- [ ] Page loads with no console errors. The empty state reads "No pages yet."
- [ ] Add 10 mixed images. All 10 cards appear, numbered 01 to 10.
- [ ] Drop files onto the page. A dashed outline shows while dragging, and the files are added.
- [ ] Rename a text file to `.png` and add it. The card is not added and the error reads "not a JPG/PNG/WEBP".
- [ ] Rename a `.webp` to `.jpg` and add it. It is accepted, because the check reads the file header, not the name.
- [ ] Phone only: Camera opens the rear camera and the shot is added.

## Page controls

- [ ] Earlier and Later change the order. Earlier is disabled on card 01, Later on the last card.
- [ ] Rotate turns the thumbnail 90 degrees each click and returns to the start after four.
- [ ] Remove deletes the card. DevTools, Memory: no growth in blob URLs after adding and removing 20 images.
- [ ] A portrait phone photo shows upright in the thumbnail and in the exported PDF.

## Filters

- [ ] Gray shows a grayscale thumbnail.
- [ ] B&W on a page with a shadow gives dark text on white, with no black blotches.
- [ ] Changing the filter updates the thumbnail within about a second.

## Crop editor

- [ ] Crop opens with a frame inset from the image edges and the outside dimmed.
- [ ] Dragging a corner moves only that corner, and the handle does not jump under the pointer.
- [ ] Dragging an edge handle (hollow circle) moves that whole side.
- [ ] Dragging inside the frame moves all four corners and stops at the image edge.
- [ ] While dragging, a 3x magnifier shows the exact spot. It moves to the top-right when the handle nears the top-left.
- [ ] Drag a corner across its neighbour. The outline turns red, the message shows, and Save is disabled.
- [ ] Save crop sets a "cropped" flag on the card, and the thumbnail shows the flattened page.
- [ ] Reset removes the crop. Cancel leaves it unchanged.
- [ ] Phone only: handles can be dragged with a finger and the page does not scroll while dragging.

## Auto detect

- [ ] First click pauses for the OpenCV download, then moves the corners onto the page. The button reads "Detecting" meanwhile.
- [ ] A page on a dark desk is found accurately.
- [ ] A page on a light desk: note whether it is found. Failure is expected when the contrast is low.
- [ ] A photo with no page shows "No page outline found. Set the corners by hand."
- [ ] A second click is fast, since OpenCV is already loaded.
- [ ] Network tab: OpenCV is not requested until Auto detect is clicked.

## Export

- [ ] A4 export opens in Chrome with every image fitted inside margins. Landscape images get a landscape page.
- [ ] Letter and Image size exports have the right page dimensions.
- [ ] Export 20 phone photos at Balanced. The file is under 10 MB and the text is readable.
- [ ] Export the same batch at Small file and High quality. File sizes differ clearly.
- [ ] Export 50 images of 12 MP. The page stays responsive, the progress bar advances, and no tab crash occurs.
- [ ] Open the PDF in a desktop reader as well as Chrome.
- [ ] The filename is `scan-<timestamp>.pdf`.

## Theme

- [ ] System follows the OS setting. Switch the OS between light and dark and the page follows.
- [ ] Light and Dark override the OS, and the choice survives a reload.
- [ ] The crop editor handles, dimming and magnifier look right in both themes.
- [ ] Text meets contrast in both themes. Check the muted labels and the disabled buttons.

## Record results

Note each failure with the browser, the file type and the steps. Failures from this list become the next work items.
