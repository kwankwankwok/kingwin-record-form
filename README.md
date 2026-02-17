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

### Apps Script (Web app)

In the script editor: **Project Settings** → **Script properties** → add `ACCESS_CODE`. Then use this `doPost` (column order must match `src/config/fields.js`). The phone column (14) gets its format from the previous row so it matches the sheet.

```js
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    var validCode = PropertiesService.getScriptProperties().getProperty('ACCESS_CODE');
    if (!validCode || data.accessCode !== validCode) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid access code' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var sheetName = (data.roomType === 'large' || data.roomType === 'big') ? '敬運收入' : '敬運30收入';
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet "' + sheetName + '" not found');
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
    var lastRow = sheet.getLastRow();
    var numCols = row.length;
    var templateRow = 2;
    sheet.getRange(templateRow, 1, templateRow, numCols).copyTo(
      sheet.getRange(lastRow, 1, lastRow, numCols),
      SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
      false
    );
    var phoneCol = 14;
    if (lastRow > 1) {
      sheet.getRange(lastRow - 1, phoneCol).copyTo(
        sheet.getRange(lastRow, phoneCol),
        SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
        false
      );
    }
    var percentageDiscountCol = 11;
    var validation = sheet.getRange(templateRow, percentageDiscountCol).getDataValidation();
    if (validation != null) sheet.getRange(lastRow, percentageDiscountCol).setDataValidation(validation);
    var depositReturnedCol = 13;
    var validationDeposit = sheet.getRange(templateRow, depositReturnedCol).getDataValidation();
    if (validationDeposit != null) sheet.getRange(lastRow, depositReturnedCol).setDataValidation(validationDeposit);
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

Deploy as **Web app** (Execute as **Me**, Who has access **Anyone**), then use the deployment URL in `.env` and in the GitHub secret.

## Deployment (GitHub Pages)

1. Push the repo to GitHub. In the repo: **Settings** → **Pages** → set **Source** to **GitHub Actions**.
2. Add a repository secret: **Settings** → **Secrets and variables** → **Actions** → **New repository secret** → name **`VITE_GOOGLE_SCRIPT_URL`**, value = your Apps Script Web app URL.
3. After the workflow runs, the site is at `https://<your-username>.github.io/kingwin-record-form/`.
