import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DEFAULT_SOURCE_URL = 'https://raw.githubusercontent.com/gabrlie/neoshell/main/updates-manifest.json';

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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readText(relativePath) {
  const filePath = path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
  return fs.readFileSync(filePath, 'utf8').trim();
}

function getFirstHeading(markdown) {
  const heading = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith('#'));

  return heading ? heading.replace(/^#+\s*/, '').trim() : '';
}

function createEmptyManifest(sourceUrl) {
  return {
    version: 1,
    generatedAt: '',
    sourceUrl,
    entries: [],
  };
}

function loadManifest(manifestPath, sourceUrl) {
  if (!fs.existsSync(manifestPath)) {
    return createEmptyManifest(sourceUrl);
  }

  const parsed = readJson(manifestPath);
  return {
    version: 1,
    generatedAt: typeof parsed.generatedAt === 'string' ? parsed.generatedAt : '',
    sourceUrl: typeof parsed.sourceUrl === 'string' && parsed.sourceUrl ? parsed.sourceUrl : sourceUrl,
    entries: Array.isArray(parsed.entries) ? parsed.entries : [],
  };
}

function computeFileMetadata(relativeFilePath, url, kind) {
  if (!relativeFilePath || !url) {
    return null;
  }

  const filePath = path.isAbsolute(relativeFilePath) ? relativeFilePath : path.join(ROOT, relativeFilePath);
  assert(fs.existsSync(filePath), `产物文件不存在：${relativeFilePath}`);

  const buffer = fs.readFileSync(filePath);
  return {
    kind,
    name: path.basename(relativeFilePath),
    url,
    sizeBytes: buffer.byteLength,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
  };
}

function readNestedString(source, candidates) {
  for (const candidate of candidates) {
    const value = candidate.split('.').reduce((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return current[key];
      }
      return undefined;
    }, source);

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function extractPrimaryRecord(parsed) {
  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed[0];
  }

  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.updates) && parsed.updates.length > 0) {
    return parsed.updates[0];
  }

  return parsed;
}

const args = parseArgs(process.argv.slice(2));
const type = args.type;
const version = args.version;
const runtimeVersion = args['runtime-version'];
const notesFile = args['notes-file'];
const manifestPathArgument = args['manifest-path'] ?? 'updates-manifest.json';
const manifestPath = path.isAbsolute(manifestPathArgument)
  ? manifestPathArgument
  : path.join(ROOT, manifestPathArgument);
const sourceUrl = args['source-url'] ?? DEFAULT_SOURCE_URL;
const channel = args.channel?.trim() || undefined;
const notes = readText(notesFile);
const title = args.title?.trim() || getFirstHeading(notes) || `NeoShell ${version}`;
const publishedAt = args['published-at'] ?? new Date().toISOString();

assert(type === 'release' || type === 'ota', 'type 必须是 release 或 ota。');
assert(version, '缺少 version。');
assert(runtimeVersion, '缺少 runtime-version。');
assert(notesFile, '缺少 notes-file。');

const manifest = loadManifest(manifestPath, sourceUrl);

let entry;

if (type === 'release') {
  const tag = args.tag ?? `v${version}`;
  const releaseUrl = args['release-url'] ?? '';
  const assets = [
    computeFileMetadata(args['apk-file'], args['apk-url'], 'apk'),
    computeFileMetadata(args['aab-file'], args['aab-url'], 'aab'),
  ].filter(Boolean);

  entry = {
    id: `release-${tag}`,
    type: 'release',
    title,
    version,
    runtimeVersion,
    publishedAt,
    notes,
    channel,
    tag,
    releaseUrl,
    assets,
  };
} else {
  const metadataFile = args['metadata-file'];
  let metadata = {};
  if (metadataFile) {
    const resolvedMetadataFile = path.isAbsolute(metadataFile) ? metadataFile : path.join(ROOT, metadataFile);
    assert(fs.existsSync(resolvedMetadataFile), `EAS Update 元数据文件不存在：${metadataFile}`);
    metadata = readJson(resolvedMetadataFile);
  }

  const primaryRecord = extractPrimaryRecord(metadata);
  const updateGroupId =
    args['update-group-id'] ||
    readNestedString(primaryRecord, ['group', 'groupId', 'updateGroup']) ||
    `manual-${version}-${publishedAt}`;
  const dashboardUrl =
    args['dashboard-url'] ||
    readNestedString(primaryRecord, ['dashboardUrl', 'permalink']) ||
    undefined;
  const resolvedChannel = channel || readNestedString(primaryRecord, ['channel']) || 'production';

  entry = {
    id: `ota-${updateGroupId}`,
    type: 'ota',
    title,
    version,
    runtimeVersion,
    publishedAt,
    notes,
    channel: resolvedChannel,
    updateGroupId,
    dashboardUrl,
  };
}

const withoutCurrent = manifest.entries.filter((item) => item.id !== entry.id);
const nextManifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  sourceUrl: manifest.sourceUrl || sourceUrl,
  entries: [entry, ...withoutCurrent].sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt)),
};

fs.writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, 'utf8');
