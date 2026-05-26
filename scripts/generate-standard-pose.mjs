import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = process.cwd();
const src = process.argv[2] || '/courses/strength1_10s.mp4';
const out = process.argv[3] || 'public/courses/strength1_10s_pose.json';
const sampleRate = Number(process.argv[4] || '5');
const maxWidth = Number(process.argv[5] || '640');
const port = Number(process.env.VITE_PORT || 5173);
const baseUrl = `http://localhost:${port}`;

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].filter(Boolean);

async function fetchOk(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 25000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await fetchOk(url)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function openDevtoolsTarget(debugPort, url) {
  const response = await fetch(`http://localhost:${debugPort}/json/new?${encodeURIComponent(url)}`, {
    method: 'PUT'
  });
  if (!response.ok) throw new Error(`Unable to open Chrome target: ${response.status}`);
  return response.json();
}

async function runCdp(webSocketDebuggerUrl, pageUrl) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();

  const send = (method, params = {}) => {
    const callId = ++id;
    ws.send(JSON.stringify({ id: callId, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(callId);
        reject(new Error(`CDP timeout: ${method}`));
      }, 60000);
      pending.set(callId, (message) => {
        clearTimeout(timer);
        resolve(message);
      });
    });
  };

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });

  await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: pageUrl });

  const started = Date.now();
  while (Date.now() - started < 300000) {
    const statusResult = await send('Runtime.evaluate', {
      expression: 'window.__POSE_STATUS__',
      returnByValue: true
    });
    const status = statusResult.result?.result?.value;
    if (status?.state === 'done') {
      const result = await send('Runtime.evaluate', {
        expression: 'window.__POSE_RESULT__',
        returnByValue: true
      });
      ws.close();
      return result.result?.result?.value;
    }
    if (status?.state === 'error') {
      const error = await send('Runtime.evaluate', {
        expression: 'window.__POSE_ERROR__',
        returnByValue: true
      });
      ws.close();
      throw new Error(error.result?.result?.value || 'Pose generation failed');
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  ws.close();
  throw new Error('Pose generation timed out');
}

let viteProcess = null;
let chromeProcess = null;
let profileDir = null;

try {
  if (!(await waitForServer(baseUrl, 1000))) {
    viteProcess = spawn('cmd.exe', ['/c', 'npm run dev -- --port', String(port)], {
      cwd: root,
      stdio: 'ignore',
      windowsHide: true
    });
    if (!(await waitForServer(baseUrl))) {
      throw new Error(`Vite server did not start on ${baseUrl}`);
    }
  }

  const chromePath = chromeCandidates.find(Boolean);
  if (!chromePath) throw new Error('Chrome or Edge executable was not found');

  const debugPort = 9231;
  profileDir = await mkdtemp(path.join(tmpdir(), 'pose-generator-'));
  chromeProcess = spawn(chromePath, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    'about:blank'
  ], {
    stdio: 'ignore',
    windowsHide: true
  });

  const pageReady = await waitForServer(`http://localhost:${debugPort}/json/version`, 15000);
  if (!pageReady) throw new Error('Chrome DevTools endpoint did not start');

  const url = `${baseUrl}/tools/pose-generator.html?src=${encodeURIComponent(src)}&sampleRate=${sampleRate}&maxWidth=${maxWidth}`;
  const target = await openDevtoolsTarget(debugPort, url);
  const poseJson = await runCdp(target.webSocketDebuggerUrl, url);
  if (!poseJson?.frames?.length) throw new Error('Pose JSON is empty');

  const outPath = path.resolve(root, out);
  await writeFile(outPath, `${JSON.stringify(poseJson, null, 2)}\n`, 'utf8');
  console.log(`Generated ${poseJson.frames.length} frames -> ${outPath}`);
} finally {
  chromeProcess?.kill();
  viteProcess?.kill();
  if (profileDir) {
    await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}
