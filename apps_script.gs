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
    const headers = [
      'ID',
      '問題番号',
      '選択した色',
      '候補色',
      'キャンセル色',
      '解答時間',
      '評価1',
      '評価2',
      '評価3',
      'イベント履歴'
    ];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }

    sheet.appendRow([
      participantNumber,
      entry.problem_no ?? '',
      entry.selected_color ?? '',
      JSON.stringify(entry.candidate_colors ?? []),
      JSON.stringify(entry.cancelled_colors ?? []),
      entry.answer_time_sec ?? '',
      entry.evaluation1 ?? '',
      entry.evaluation2 ?? '',
      entry.evaluation3 ?? '',
      JSON.stringify(entry.event_history ?? [])
    ]);

    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error(error);
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: error.message })).setMimeType(
      ContentService.MimeType.JSON
    );
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}
