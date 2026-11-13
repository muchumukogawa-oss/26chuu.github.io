function doPost(e) {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;

  try {
    lock.waitLock(10000);
    lockAcquired = true;
    const entry = JSON.parse(e.postData.contents);
    const participantNumber = String(entry.nickname ?? '').trim();
    if (!/^[A-Za-z0-9]+$/.test(participantNumber)) {
      throw new Error('IDは半角英数字で入力してください。');
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
      throw new Error('スプレッドシートに紐づいたApps Scriptから実行してください。');
    }

    const sheet = spreadsheet.getSheetByName('回答ログ') || spreadsheet.insertSheet('回答ログ');
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['ID', '問題番号', '選択した色', '候補色', 'キャンセル色', '解答時間', 'イベント履歴', '評価1', '評価2']);
    } else {
      const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 8)).getValues()[0];
      if (headers[7] === '評価') {
        sheet.getRange(1, 8).setValue('評価1');
      }
      if (headers[8] !== '評価2') {
        sheet.getRange(1, 9).setValue('評価2');
      }
    }

    sheet.appendRow([
      participantNumber,
      entry.problem_no ?? '',
      entry.selected_color ?? '',
      JSON.stringify(entry.candidate_colors ?? []),
      JSON.stringify(entry.cancelled_colors ?? []),
      entry.answer_time_sec ?? '',
      JSON.stringify(entry.event_history ?? []),
      entry.evaluation1 ?? entry.evaluation ?? '',
      entry.evaluation2 ?? ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error(error);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}
