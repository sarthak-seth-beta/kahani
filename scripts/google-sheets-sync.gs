/**
 * Google Apps Script — Kahani Sheet Sync (Header-Aware)
 *
 * This script reads column headers dynamically from row 1, so it handles:
 * - Reordered columns
 * - New columns added by the team
 * - Any column not mapped to a DB field is automatically preserved
 *
 * SETUP:
 * 1. Open the Google Sheet → Extensions → Apps Script
 * 2. Paste this entire file into Code.gs (replace any existing code)
 * 3. Go to Project Settings (gear icon) → Script Properties → Add:
 *    - API_URL  = https://your-app-url.com/api/admin/sheet-sync-data
 *    - API_KEY  = <your SHEET_SYNC_API_KEY value from .env>
 * 4. Run syncFromAPI() once manually and authorize when prompted
 * 5. Set up hourly trigger:
 *    - Click Triggers (clock icon) in left sidebar
 *    - + Add Trigger → syncFromAPI → Time-driven → Hour timer → Every hour
 * 6. (Optional) Deploy as web app:
 *    - Deploy → New deployment → Web app → Execute as "Me" → Access "Anyone"
 *    - Copy the web app URL for the admin button
 */

/**
 * Maps sheet header names → API JSON field names.
 * Any header NOT in this map is treated as a "preserve" column (never overwritten).
 * This means TBF columns, new custom columns, or any unknown column are all safe.
 */
var HEADER_TO_API_FIELD = {
  "Kahani Link": "kahaniLink",
  "Trial ID": "trialId",
  "Question Index": "questionIndex",
  "Buyer Name": "buyerName",
  "Buyer Number": "buyerNumber",
  "Storyteller Name": "storytellerName",
  "Storyteller Number": "storytellerNumber",
  // "Background (TBF)" — NOT mapped, so it's preserved
  // "Call Notes (TBF)" — NOT mapped, so it's preserved
  // "Rating (TBF)" — NOT mapped, so it's preserved
  Date: "date",
  Album: "albumTitle",
  "Custom Album?": "customAlbum",
  "SKU selected": "skuSelected",
  "Discount Code Used": "discountCodeUsed",
  "Amount Paid": "amountPaid",
  "Payment Transaction ID": "paymentTransactionId",
  "Conversation State": "conversationState",
  "Completed?": "completed",
  "Question Count": "questionCount",
  "Retry Count": "retryCount",
  "Language Selected": "languageSelected",
  "Photo Uploaded?": "photoUploaded",
  "Book Form?": "bookForm",
  "No of books?": "noOfBooks",
  // "Feedback? (TBF)" — NOT mapped, so it's preserved
};

// The header name used to identify the Trial ID column (for row matching)
var TRIAL_ID_HEADER = "Trial ID";

/**
 * Adds a custom menu to the sheet when it opens.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Kahani")
    .addItem("Sync from Database", "syncFromAPI")
    .addToUi();
}

/**
 * Main sync function — fetches data from the Express API and updates the sheet.
 *
 * Columns are matched by header name, not position. Any column whose header
 * is NOT in HEADER_TO_API_FIELD is automatically preserved (never overwritten).
 * This means you can freely add new columns, reorder existing ones, or rename
 * TBF columns — the sync will adapt.
 */
function syncFromAPI() {
  var props = PropertiesService.getScriptProperties();
  var apiUrl = props.getProperty("API_URL");
  var apiKey = props.getProperty("API_KEY");

  if (!apiUrl || !apiKey) {
    throw new Error(
      "Missing API_URL or API_KEY in Script Properties. Go to Project Settings → Script Properties to set them.",
    );
  }

  // 1. Fetch data from the Express API
  var url = apiUrl + "?key=" + encodeURIComponent(apiKey);
  var response;
  try {
    response = UrlFetchApp.fetch(url, {
      method: "get",
      muteHttpExceptions: true,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    Logger.log("Failed to fetch API: " + e.message);
    throw new Error("Failed to fetch data from API: " + e.message);
  }

  var statusCode = response.getResponseCode();
  if (statusCode !== 200) {
    var errBody = response.getContentText();
    Logger.log("API returned status " + statusCode + ": " + errBody);
    throw new Error("API returned status " + statusCode + ": " + errBody);
  }

  var data = JSON.parse(response.getContentText());
  if (!data.success || !data.rows || data.rows.length === 0) {
    Logger.log("No rows returned from API. Count: " + (data.count || 0));
    return;
  }

  var apiRows = data.rows;
  Logger.log("Fetched " + apiRows.length + " rows from API");

  // 2. Open the sheet and read headers + existing data
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet =
    ss.getSheetByName("Sheet1") ||
    ss.getSheetByName("Copy of Template Order GS");
  if (!sheet) {
    throw new Error('Sheet "Sheet1" or "Copy of Template Order GS" not found');
  }

  var lastCol = sheet.getLastColumn();
  var lastRow = sheet.getLastRow();

  if (lastCol === 0 || lastRow === 0) {
    throw new Error("Sheet appears empty — no headers found in row 1");
  }

  // Read header row
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // Build column index maps from headers
  var colMap = buildColumnMap(headers); // { apiFieldName: colIndex (0-based) }
  var trialIdColIndex = colMap._trialIdCol; // special key for Trial ID column
  var mappedColIndices = colMap._mappedIndices; // Set of indices that are DB-mapped

  if (trialIdColIndex === -1) {
    throw new Error(
      'Could not find "' +
        TRIAL_ID_HEADER +
        '" column in headers. Found: ' +
        headers.join(", "),
    );
  }

  // Row 2 is a preserved "spacer" row (never overwritten by sync).
  // Data rows start at row 3.
  var DATA_START_ROW = 3;

  // Read existing data (skip header row 1 and preserved row 2)
  var existingData = [];
  if (lastRow >= DATA_START_ROW) {
    existingData = sheet
      .getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, lastCol)
      .getValues();
  }

  // 3. Build lookup map: trialId → { rowIndex (0-based in existingData), values }
  var trialIdLookup = {};
  for (var i = 0; i < existingData.length; i++) {
    var trialId = String(existingData[i][trialIdColIndex]).trim();
    if (trialId && trialId !== "") {
      trialIdLookup[trialId] = {
        index: i,
        values: existingData[i],
      };
    }
  }

  // 4. Process each API row — update existing or prepare new rows
  var updatedRows = []; // { sheetRow: 1-based, values: [] }
  var newRows = []; // [ [values] ]

  for (var j = 0; j < apiRows.length; j++) {
    var apiRow = apiRows[j];
    var tid = String(apiRow.trialId).trim();

    if (trialIdLookup.hasOwnProperty(tid)) {
      // Existing row — merge: update only mapped columns, preserve everything else
      var existing = trialIdLookup[tid];
      var merged = mergeRow(apiRow, existing.values, colMap, mappedColIndices);
      updatedRows.push({
        sheetRow: existing.index + DATA_START_ROW, // data starts at row 3 (row 2 is preserved)
        values: merged,
      });
    } else {
      // New row — build from scratch, unmapped columns left empty
      var newRow = buildNewRow(apiRow, colMap, lastCol);
      newRows.push(newRow);
    }
  }

  // 5. Write updates to existing rows
  for (var k = 0; k < updatedRows.length; k++) {
    var upd = updatedRows[k];
    sheet.getRange(upd.sheetRow, 1, 1, lastCol).setValues([upd.values]);
  }

  // 6. Append new rows at the bottom
  if (newRows.length > 0) {
    var appendStartRow = sheet.getLastRow() + 1;
    sheet
      .getRange(appendStartRow, 1, newRows.length, lastCol)
      .setValues(newRows);
  }

  Logger.log(
    "Sync complete: " +
      updatedRows.length +
      " updated, " +
      newRows.length +
      " added. Total columns: " +
      lastCol,
  );

  SpreadsheetApp.flush();
}

/**
 * Builds a column map from the header row.
 * Returns an object with:
 *   - Each API field name → column index (0-based)
 *   - _trialIdCol: index of the Trial ID column
 *   - _mappedIndices: object where keys are column indices that are DB-mapped
 */
function buildColumnMap(headers) {
  var map = {
    _trialIdCol: -1,
    _mappedIndices: {},
  };

  for (var i = 0; i < headers.length; i++) {
    var headerName = String(headers[i]).trim();

    if (headerName === TRIAL_ID_HEADER) {
      map._trialIdCol = i;
    }

    if (HEADER_TO_API_FIELD.hasOwnProperty(headerName)) {
      var apiField = HEADER_TO_API_FIELD[headerName];
      map[apiField] = i;
      map._mappedIndices[i] = true;
    }
  }

  return map;
}

/**
 * Merges an API row into an existing sheet row.
 * Only updates columns that are DB-mapped (in HEADER_TO_API_FIELD).
 * All other columns (TBF, custom, unknown) keep their existing values.
 */
function mergeRow(apiRow, existingValues, colMap, mappedColIndices) {
  var merged = existingValues.slice(); // start with existing values (preserves everything)

  // Overwrite only the DB-mapped columns with fresh API data
  for (var headerName in HEADER_TO_API_FIELD) {
    if (!HEADER_TO_API_FIELD.hasOwnProperty(headerName)) continue;
    var apiField = HEADER_TO_API_FIELD[headerName];
    var colIndex = colMap[apiField];
    if (colIndex !== undefined && colIndex >= 0) {
      var val = apiRow[apiField];
      merged[colIndex] = val !== undefined && val !== null ? val : "";
    }
  }

  return merged;
}

/**
 * Builds a new row array for a trial that doesn't exist in the sheet yet.
 * Fills DB-mapped columns from API data, leaves everything else empty.
 */
function buildNewRow(apiRow, colMap, totalCols) {
  var row = new Array(totalCols);
  for (var i = 0; i < totalCols; i++) {
    row[i] = ""; // default all to empty
  }

  // Fill in only the DB-mapped columns
  for (var headerName in HEADER_TO_API_FIELD) {
    if (!HEADER_TO_API_FIELD.hasOwnProperty(headerName)) continue;
    var apiField = HEADER_TO_API_FIELD[headerName];
    var colIndex = colMap[apiField];
    if (colIndex !== undefined && colIndex >= 0) {
      var val = apiRow[apiField];
      row[colIndex] = val !== undefined && val !== null ? val : "";
    }
  }

  return row;
}

/**
 * Web app entry point — allows triggering sync via HTTP GET.
 * Deploy as web app to use with the admin button.
 */
function doGet(e) {
  try {
    syncFromAPI();
    return ContentService.createTextOutput(
      JSON.stringify({
        success: true,
        message: "Sync completed successfully",
        timestamp: new Date().toISOString(),
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
