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

- Match the dimensions to your label roll, for example 38 × 25 mm.
- Use 100% / actual-size printing, no margins, and disable page headers and footers.
- Print / PDF produces one label per page using the connected printer driver or the browser's Save as PDF option.
- PNG exports can be imported into Print Master. Direct Bluetooth pairing is not implemented by this website.
- Test-print and scan a label before printing a batch; printer rasterization and scaling can affect small barcodes.

Product input is processed in the browser. The supplied 37-product example is included in the source; review it before publishing a public repository. Sites access settings do not transfer to GitHub Pages.
