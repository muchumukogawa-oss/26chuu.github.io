const port = Number(Deno.env.get('PORT') || '3000');
const rootDir = Deno.cwd();
const csvPath = `${rootDir}/demo.csv`;
const csvHeader = 'ニックネーム,タイムスタンプ,問題番号,選択した色,クリックY/N,解答時間,評価\n';

function ensureCsvFile() {
  try {
    Deno.statSync(csvPath);
  } catch {
    Deno.writeTextFileSync(csvPath, csvHeader, { encoding: 'utf-8' });
    return;
  }

  const existing = Deno.readTextFileSync(csvPath, { encoding: 'utf-8' });
  if (!existing.trim()) {
    Deno.writeTextFileSync(csvPath, csvHeader, { encoding: 'utf-8' });
  }
}

function escapeCsvValue(value) {
  const normalized = String(value ?? '');
  return `"${normalized.replace(/"/g, '""')}"`;
}

function buildCsvRow(entry) {
  const values = [
    entry['ニックネーム'],
    entry['タイムスタンプ'],
    entry['問題番号'],
    entry['選択した色'],
    entry['クリックY/N'],
    entry['解答時間'],
    entry['評価']
  ];
  return values.map((value) => escapeCsvValue(value)).join(',');
}

function appendLogEntry(entry) {
  ensureCsvFile();
  const row = buildCsvRow(entry);
  const existing = Deno.readTextFileSync(csvPath, { encoding: 'utf-8' });
  Deno.writeTextFileSync(csvPath, `${existing}${row}\n`, { encoding: 'utf-8' });
}

function getContentType(filePath) {
  const extension = filePath.split('.').pop()?.toLowerCase() || '';
  switch (extension) {
    case 'html':
      return 'text/html; charset=utf-8';
    case 'css':
      return 'text/css; charset=utf-8';
    case 'js':
      return 'application/javascript; charset=utf-8';
    case 'json':
      return 'application/json; charset=utf-8';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'mp4':
      return 'video/mp4';
    case 'csv':
      return 'text/csv; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

async function serveStaticFile(request) {
  const url = new URL(request.url);
  let requestedPath = decodeURIComponent(url.pathname);
  if (requestedPath === '/') {
    requestedPath = '/index.html';
  }

  const safePath = requestedPath.replace(/^\/+/, '');
  const filePath = `${rootDir}/${safePath}`;

  if (!filePath.startsWith(rootDir + '/')) {
    return new Response('Forbidden', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  try {
    const fileInfo = await Deno.stat(filePath);
    if (!fileInfo.isFile) {
      throw new Error('Not a file');
    }

    const content = await Deno.readFile(filePath);
    return new Response(content, {
      status: 200,
      headers: { 'Content-Type': getContentType(filePath) }
    });
  } catch {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

Deno.serve({ port }, async (request) => {
  if (request.method === 'GET' && new URL(request.url).pathname === '/health') {
    return Response.json({ ok: true });
  }

  if (request.method === 'POST' && new URL(request.url).pathname === '/api/logs') {
    try {
      const body = await request.text();
      const entry = JSON.parse(body || '{}');
      appendLogEntry(entry);
      return Response.json({ ok: true, savedTo: 'demo.csv' });
    } catch (error) {
      return Response.json({ ok: false, error: error.message }, { status: 400 });
    }
  }

  return serveStaticFile(request);
});

console.log(`Server running at http://localhost:${port}`);
