# Pippo Label Studio

A static barcode label tool for the Phomemo M110. Paste inventory rows, select products and quantities, set label dimensions, and print or download labels. The compact layout prioritizes the barcode while keeping its quiet zones clear.

## Host on GitHub Pages

1. Push this project to a GitHub repository with `main` or `master` as its default branch. Include `dist`, `verify.cjs`, and `.github/workflows/pages.yml`.
2. In the repository, open **Settings → Pages → Build and deployment → Source**, and select **GitHub Actions**.
3. Open **Actions → Deploy label studio to GitHub Pages → Run workflow**. Subsequent pushes to the default branch deploy automatically.
4. Open the URL shown by the successful deployment. Both `https://username.github.io/repository/` and a custom domain work without source changes.

The workflow uploads only `dist`, with `index.html` at the website root. No build, API keys, database, Node server, or Sites account is needed to run the hosted website. Node is used only for verification during deployment. All runtime assets, including JsBarcode, are bundled and referenced using relative URLs. `.openai/hosting.json` is only for the separate Sites host and is not deployed to GitHub Pages.

Official setup reference: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Local preview

Run `node server.cjs` and open `http://127.0.0.1:4173`. Run `node verify.cjs` to check parsing and label sizing.

## Printing

- Label width, height, location code, Bluetooth darkness, and speed are saved automatically in local storage and restored on this browser for the same site address.
- Match the dimensions to your label roll, for example 38 × 25 mm.
- Use 100% / actual-size printing, no margins, and disable page headers and footers.
- Print / PDF produces one label per page using the connected printer driver or the browser's Save as PDF option.
- PNG exports can be imported into Print Master.
- Test-print and scan a label before printing a batch; printer rasterization and scaling can affect small barcodes.

Product input is processed in the browser. The supplied 37-product example is included in the source; review it before publishing a public repository. Sites access settings do not transfer to GitHub Pages.

## Direct Bluetooth printing (Chrome)

Open the HTTPS website (or localhost preview) in Chrome on Windows, macOS or Android. Turn on the M110 and disconnect it from Print Master / Labelife. Choose **Connect M110**, select the printer, then **Test print preview** to send one copy of the visible label. Check alignment and scan the barcode before using **Print batch over Bluetooth**.

Discovery shows all nearby Bluetooth LE devices because some M110 variants advertise serial-like names starting `Q199` instead of M110. Select only your printer. If it is missing, use standalone Google Chrome, fully close other printer apps, and power-cycle the printer. Labelife detecting the printer does not establish BLE availability: it may use USB or Bluetooth Classic. Selecting a device checks for the expected M110 service before enabling print.

The batch snapshots selected products and quantities, then sends labels sequentially over BLE. Darkness and speed are set on each label. This first implementation uses gap labels, not continuous tape. The M110 print head is 384 dots / 48 mm wide; wider labels are re-laid out within 48 mm for Bluetooth printing without scaling the barcode bitmap. PDF and PNG exports retain their original dimensions.

Keep the tab open and foregrounded. A screen wake lock is requested during printing where available. **Stop after current label** finishes sending that label before stopping. Progress counts labels sent, not confirmed physical output. On a transmission failure, the queue stops and disconnects without retrying: check for a partially printed or duplicate label and restart the printer before reconnecting. There is no automatic resume. An idle disconnect requires connecting again.

Protocol references: [phomemo-tools](https://github.com/vivier/phomemo-tools) and [Phomymo](https://github.com/transcriptionstream/phomymo). The implementation uses BLE service `0xff00`, write characteristic `0xff02`, discrete speed/density/gap-media commands, a raster header, 128-byte raster chunks, and an end-of-label footer. No vendor app or driver is installed.

Run `node verify.cjs` and `node verify-bluetooth.cjs` for label validation and mocked protocol/queue/UI tests. Physical M110 compatibility, feed alignment, darkness, and long-batch reliability still require testing with the actual printer. Browser Bluetooth is unavailable in ordinary Safari/iOS and Firefox.
