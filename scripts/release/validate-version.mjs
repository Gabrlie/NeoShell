import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) {
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function readJson(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8').trim();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function writeOutputs(outputFile, values) {
  if (!outputFile) {
    return;
  }

  const lines = Object.entries(values).map(([key, value]) => `${key}=${String(value ?? '')}`);
  fs.appendFileSync(outputFile, `${lines.join('\n')}\n`);
}

function getFirstHeading(markdown) {
  const heading = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith('#'));

  return heading ? heading.replace(/^#+\s*/, '').trim() : '';
}

function ensureFileExists(relativePath, label) {
  assert(relativePath, `缺少 ${label} 参数。`);
  const filePath = path.join(ROOT, relativePath);
  assert(fs.existsSync(filePath), `${label} 不存在：${relativePath}`);
}

const args = parseArgs(process.argv.slice(2));
const mode = args.mode ?? 'release';
const outputFile = args.output;

const packageJson = readJson('package.json');
const appJson = readJson('app.json');
const packageVersion = packageJson.version;
const appVersion = appJson?.expo?.version;
const runtimePolicy = appJson?.expo?.runtimeVersion?.policy;

assert(packageVersion, 'package.json 缺少 version。');
assert(appVersion, 'app.json 缺少 expo.version。');
assert(packageVersion === appVersion, 'package.json.version 与 app.json.expo.version 不一致。');
assert(runtimePolicy === 'appVersion', 'app.json 必须使用 runtimeVersion.policy = appVersion。');

if (mode === 'release') {
  const tag = args.tag;
  assert(/^v\d+\.\d+\.\d+$/.test(tag ?? ''), '正式发布标签必须是 vX.Y.Z。');

  const version = tag.slice(1);
  assert(version === packageVersion, `标签版本 ${version} 与项目版本 ${packageVersion} 不一致。`);

  const notesFile = args['notes-file'] ?? `release-notes/${tag}.md`;
  ensureFileExists(notesFile, '正式版本说明文件');

  const notesTitle = getFirstHeading(readText(notesFile));
  writeOutputs(outputFile, {
    tag,
    version,
    runtime_version: version,
    notes_file: notesFile,
    title: notesTitle || `NeoShell ${version}`,
  });
} else if (mode === 'ota') {
  const baseVersion = args['base-version'];
  const notesFile = args['notes-file'];

  assert(baseVersion, '缺少 --base-version。');
  assert(baseVersion === packageVersion, `热更新基线版本 ${baseVersion} 与当前项目版本 ${packageVersion} 不一致。`);
  ensureFileExists(notesFile, '热更新说明文件');

  const notesTitle = getFirstHeading(readText(notesFile));
  const title = args.title?.trim() || notesTitle || `NeoShell ${baseVersion} 热更新`;

  writeOutputs(outputFile, {
    version: baseVersion,
    runtime_version: baseVersion,
    notes_file: notesFile,
    title,
  });
} else {
  throw new Error(`不支持的模式：${mode}`);
}
