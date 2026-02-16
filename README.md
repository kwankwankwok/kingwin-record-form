# kingwin-record-form

A minimal React form that submits data to a Google Sheet via an Apps Script Web App. Mobile-first, responsive.

## Install and run

```bash
yarn install
yarn dev
```

Configure your Google Sheet with an Apps Script Web App, set the script property `ACCESS_CODE`, and deploy as a Web app. Create `.env` in the project root with your Web app URL:

```
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

Restart `yarn dev` and open the form. Use the access code you set in Apps Script to submit.

## Deployment (GitHub Pages)

1. Push the repo to GitHub. In the repo: **Settings** → **Pages** → set **Source** to **GitHub Actions**.
2. Add a repository secret: **Settings** → **Secrets and variables** → **Actions** → **New repository secret** → name **`VITE_GOOGLE_SCRIPT_URL`**, value = your Apps Script Web app URL.
3. After the workflow runs, the site is at `https://<your-username>.github.io/kingwin-record-form/`.
