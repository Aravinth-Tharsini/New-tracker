# Life Tracker — Setup Guide

This app has a **Data Link** page (bottom nav bar) with two storage modes:

- **Offline Mode** (default) — your data is saved only on this device, in the
  browser's storage. You can **Export** a backup file anytime, and **Import**
  it later to restore your data — on this device or a new one.
- **Online Mode** — your data auto-saves and syncs to a Google Sheet you link
  once. No Google login screen, no password — just a URL you paste in one
  time.

No sign-up or account is needed to use the app at all. Online Mode is
optional, for whenever you want your data to follow you across devices.

---

## Setting up Online Mode (one-time, ~2 minutes, free)

This creates a private link between the app and a Google Sheet **you**
own — Google never sees your app, and the app never asks for your Google
password. Here's how:

1. Go to **sheets.google.com** and create a new blank spreadsheet. Name it
   anything (e.g. "Life Tracker Data").
2. In the menu, go to **Extensions → Apps Script**. A new tab opens with a
   blank code editor.
3. Delete anything in the editor and paste in this code:

   ```js
   function doGet(e) {
     const sheet = getDataSheet();
     const value = sheet.getRange("A1").getValue();
     return ContentService.createTextOutput(JSON.stringify({
       data: value || "{}",
       sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl(),
     })).setMimeType(ContentService.MimeType.JSON);
   }

   function doPost(e) {
     const sheet = getDataSheet();
     sheet.getRange("A1").setValue(e.postData.contents);
     return ContentService.createTextOutput(JSON.stringify({ ok: true }))
       .setMimeType(ContentService.MimeType.JSON);
   }

   function getDataSheet() {
     const ss = SpreadsheetApp.getActiveSpreadsheet();
     let sheet = ss.getSheetByName("Data");
     if (!sheet) sheet = ss.insertSheet("Data");
     return sheet;
   }
   ```

4. Click the **Save** icon (disk icon), name the project anything.
5. Click **Deploy → New deployment**.
   - Click the gear icon next to "Select type" → choose **Web app**.
   - Description: anything.
   - **Execute as: Me**
   - **Who has access: Anyone**
   - Click **Deploy**.
6. The first time, Google will ask you to authorize the script — this is
   normal, since the script needs permission to edit *this one sheet you
   just made*. Click through **Authorize access → (pick your account) →
   Advanced → Go to [project name] (unsafe) → Allow**. ("Unsafe" here just
   means Google hasn't manually reviewed this personal script — it's your
   own code, so this is expected and safe.)
7. You'll get a **Web app URL** ending in `/exec`. **Copy it.**

Now in the app:

1. Open the app → tap **Data Link** in the bottom nav → tap **Online Mode**.
2. Paste the Web App URL into the box → tap **Connect**.
3. Done — your data now syncs to that sheet automatically. On any other
   device, open the app, go to Data Link → Online Mode, paste the *same*
   URL → Connect, and your data appears there too.

If a sync ever seems stuck (e.g. after being offline), tap **Sync now** on
the Data Link page.

---

## Putting the app online (optional, free, via Vercel)

If you want a real web address instead of just opening the file locally:

1. Go to **vercel.com** → sign up (free).
2. Dashboard → **Add New → Project** → drag-and-drop your project folder
   (the one with `index.html` in it).
3. Vercel gives you a link like `your-app.vercel.app` — that's your app's
   permanent address, usable on any device.

---

## How it works / good to know

- **Offline Mode**: data lives in this browser's local storage only.
  Nothing is sent anywhere. Use **Export** regularly if you want peace of
  mind — it downloads a plain JSON file you can keep anywhere (email to
  yourself, save to Drive manually, etc.) and **Import** it back anytime.
- **Online Mode**: every change auto-saves to your linked sheet within
  about a second. The whole app's data is stored as a single block of text
  in that sheet's "Data" tab — it's meant for syncing, not for editing by
  hand in Sheets.
- **No login, ever.** The Web App URL is the only thing that "authenticates"
  you — anyone with that exact URL could read/write that sheet, so don't
  share it publicly (treat it like a password).
- If Online Mode can't reach your sheet (e.g. you're offline), the app
  keeps working normally using its local copy, and retries the sync
  automatically a few times. Use **Sync now** on the Data Link page anytime
  to retry manually.
- Switching back to **Offline Mode** just stops syncing — it doesn't erase
  anything already saved in your Sheet or on this device.
