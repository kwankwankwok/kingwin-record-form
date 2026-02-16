# kingwin-record-form

A minimal React form that submits data to a Google Sheet via an Apps Script Web App. Mobile-first, responsive.

## Setup

### 1. Install and run

```bash
yarn install
yarn dev
```

### 2. Google Sheet + Apps Script

1. Open your Google Sheet → **Extensions** → **Apps Script**.
2. Replace the script with something like this (column order must match your sheet header row and `FORM_FIELDS` in `src/config/fields.js`):

```js
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const row = [
      data.name || '',
      data.email || '',
      data.message || '',
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

3. **Deploy** → **New deployment** → **Web app** → Execute as **Me**, **Who has access** must be **Anyone** (not "Anyone with a Google account"), or the form will get **401 Unauthorized**. → **Deploy**. Copy the Web app URL.
4. In the project root create `.env`:

```
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

5. Restart `yarn dev` and submit the form.

## Deploy (GitHub Pages)

1. Push this repo to GitHub and ensure the **Deploy to GitHub Pages** workflow runs on `main`.
2. In the repo: **Settings** → **Pages** → under "Build and deployment", set **Source** to **GitHub Actions**.
3. Add your Apps Script URL as a secret: **Settings** → **Secrets and variables** → **Actions** → **New repository secret** → name `VITE_GOOGLE_SCRIPT_URL`, value = your Web app URL (same as in `.env`).
4. After the workflow completes, the site is at `https://<your-username>.github.io/kingwin-record-form/`.

## Commands

- `yarn dev` – dev server
- `yarn build` – production build (output in `dist/`)
- `yarn lint` / `yarn lint:fix` – ESLint

## Customize fields

Edit `src/config/fields.js`: add/remove items and keep the same order as row 1 in your sheet. Update the Apps Script `row` array to match.
