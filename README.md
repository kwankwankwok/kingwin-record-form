# kingwin-record-form

A minimal React form that submits data to a Google Sheet via an Apps Script Web App. Mobile-first, responsive.

- **Local dev**: The form POSTs to `/api/sheet`; Vite proxies that to your Google Apps Script.
- **Production (GitHub Pages)**: The form POSTs to your Apps Script URL. Apps Script’s `ContentService` does not support `setHeaders()`, so CORS cannot be set in the script; for cross-origin requests you’ll need a same-origin proxy or the iframe form-POST approach.

## Setup

### 1. Install and run

```bash
yarn install
yarn dev
```

### 2. Google Sheet + Apps Script

1. Open your Google Sheet → **Extensions** → **Apps Script**.
2. Replace the script with the following. `ContentService.createTextOutput()` does not support `setHeaders()`, so responses are plain JSON without CORS headers.

```js
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const row = [
      data.date || '',
      data.startTime || '',
      data.endTime || '',
      data.noOfPpl ?? '',
      data.noOfHrs ?? '',
      data.amount ?? '',
      data.deposit ?? 0,
      data.overtime ?? 0,
      data.extendHr ?? 0,
      data.otherDiscount ?? 0,
      data.percentageDiscount ?? 0,
      data.total ?? '',
      data.depositReturned === true ? 'TRUE' : 'FALSE',
      data.phoneNumber || '',
      data.remark || '',
    ];
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. **Deploy** → **New deployment** → **Web app** → Execute as **Me**, **Who has access** = **Anyone** (not "Anyone with a Google account"), or you’ll get **401 Unauthorized**. → **Deploy**. Copy the Web app URL.
4. In the project root create `.env`:

```
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

5. Restart `yarn dev` and submit the form.

## Deploy (GitHub Pages)

1. Push this repo to GitHub and ensure the **Deploy to GitHub Pages** workflow runs on `main`.
2. In the repo: **Settings** → **Pages** → set **Source** to **GitHub Actions**.
3. Add a secret: **Settings** → **Secrets and variables** → **Actions** → **New repository secret** → name **`VITE_GOOGLE_SCRIPT_URL`**, value = your Apps Script Web app URL (same as in `.env`).
4. After the workflow completes, the site is at `https://<your-username>.github.io/kingwin-record-form/`. Direct `fetch()` from the page to the script will be blocked by CORS (no `setHeaders()` in Apps Script); use a same-origin proxy or the iframe form-POST approach if you need the form to work from GitHub Pages.

## Commands

- `yarn dev` – dev server
- `yarn build` – production build (output in `dist/`)
- `yarn lint` / `yarn lint:fix` – ESLint

## Customize fields

Edit `src/config/fields.js`: add/remove items and keep the same order as row 1 in your sheet. Update the Apps Script `row` array to match.
