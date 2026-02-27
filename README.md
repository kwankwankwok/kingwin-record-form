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

In the script editor: **Project Settings** → **Script properties** → add `ACCESS_CODE`. Then use this `doPost` (column order must match `src/config/fields.js`). New rows are inserted in date + startTime ascending order. The phone column (14) gets its format from the neighbouring row so it matches the sheet.

```js
function normalizeDateForCompare(value) {
  if (!value) return '';
  if (value instanceof Date) {
    var y = value.getFullYear();
    var m = String(value.getMonth() + 1);
    var d = String(value.getDate());
    return y + '-' + (m.length === 1 ? '0' + m : m) + '-' + (d.length === 1 ? '0' + d : d);
  }
  var s = String(value).trim();
  var parts = s.split(/[/-]/);
  if (parts.length === 3) {
    var a = parseInt(parts[0], 10), b = parseInt(parts[1], 10), c = parseInt(parts[2], 10);
    if (a >= 1000) {
      return (a + '-' + (b < 10 ? '0' : '') + b + '-' + (c < 10 ? '0' : '') + c);
    }
    return (c + '-' + (b < 10 ? '0' : '') + b + '-' + (a < 10 ? '0' : '') + a);
  }
  return s;
}

function normalizeTimeForCompare(value) {
  if (!value) return '00:00';
  if (value instanceof Date) {
    var h = value.getHours();
    var m = value.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  var s = String(value).trim();
  var parts = s.split(':');
  var hour = parseInt(parts[0], 10) || 0;
  var min = parseInt(parts[1], 10) || 0;
  return (hour < 10 ? '0' : '') + hour + ':' + (min < 10 ? '0' : '') + min;
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    var validCode = PropertiesService.getScriptProperties().getProperty('ACCESS_CODE');
    if (!validCode || data.accessCode !== validCode) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid access code!' }))
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
    var numCols = row.length;
    var lastRow = sheet.getLastRow();
    var newDateStr = normalizeDateForCompare(data.date);
    var newStart = normalizeTimeForCompare(data.startTime);
    var newEnd = normalizeTimeForCompare(data.endTime);
    var newPpl = String(data.noOfPpl ?? '');
    if (lastRow >= 2) {
      var dataRows = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
      for (var i = 0; i < dataRows.length; i++) {
        var r = dataRows[i];
        var exDate = normalizeDateForCompare(r[0]);
        var exStart = normalizeTimeForCompare(r[1]);
        var exEnd = normalizeTimeForCompare(r[2]);
        var exPpl = String(r[3] ?? '');
        if (exDate === newDateStr && exStart === newStart && exEnd === newEnd && exPpl === newPpl) {
          return ContentService.createTextOutput(JSON.stringify({
            success: false,
            error: 'Duplicate record (same date, start time, end time, and number of people).'
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }
    var newDate = newDateStr;
    var newTime = newStart;
    var startRow = Math.max(2, lastRow - 9);
    var existing = sheet.getRange(startRow, 1, lastRow, 2).getValues();
    var insertBeforeRow = lastRow + 1;
    for (var i = 0; i < existing.length; i++) {
      var existingDate = normalizeDateForCompare(existing[i][0]);
      var existingTime = normalizeTimeForCompare(existing[i][1]);
      if (existingDate > newDate || (existingDate === newDate && existingTime > newTime)) {
        insertBeforeRow = startRow + i;
        break;
      }
    }
    sheet.insertRowBefore(insertBeforeRow);
    sheet.getRange(insertBeforeRow, 1, 1, numCols).setValues([row]);
    var formatSourceRow = (insertBeforeRow === 2) ? 3 : 2;
    sheet.getRange(formatSourceRow, 1, 1, numCols).copyTo(
      sheet.getRange(insertBeforeRow, 1, 1, numCols),
      SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
      false
    );
    var phoneCol = 14;
    var phoneFormatSource = insertBeforeRow > 2 ? insertBeforeRow - 1 : insertBeforeRow + 1;
    sheet.getRange(phoneFormatSource, phoneCol).copyTo(
      sheet.getRange(insertBeforeRow, phoneCol),
      SpreadsheetApp.CopyPasteType.PASTE_FORMAT,
      false
    );
    var percentageDiscountCol = 11;
    var validation = sheet.getRange(formatSourceRow, percentageDiscountCol).getDataValidation();
    if (validation != null) sheet.getRange(insertBeforeRow, percentageDiscountCol).setDataValidation(validation);
    var depositReturnedCol = 13;
    var validationDeposit = sheet.getRange(formatSourceRow, depositReturnedCol).getDataValidation();
    if (validationDeposit != null) sheet.getRange(insertBeforeRow, depositReturnedCol).setDataValidation(validationDeposit);
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

Deploy as **Web app** (Execute as **Me**, Who has access **Anyone**), then use the deployment URL in `.env` and in the GitHub secret.

**Viewing logs when the script runs from production:** In the Apps Script editor, open the project linked to your sheet. In the left sidebar click **Executions** (clock icon). Each time the form submits, a new execution appears. Click the latest one to see `Logger.log` output (e.g. `insertBeforeRow`, `existing`, `newDate`, `newTime`). Remove or comment out the `Logger.log` line when you are done debugging.

## Deployment (GitHub Pages)

1. Push the repo to GitHub. In the repo: **Settings** → **Pages** → set **Source** to **GitHub Actions**.
2. Add a repository secret: **Settings** → **Secrets and variables** → **Actions** → **New repository secret** → name **`VITE_GOOGLE_SCRIPT_URL`**, value = your Apps Script Web app URL.
3. After the workflow runs, the site is at `https://<your-username>.github.io/kingwin-record-form/`.
