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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function resolvePath(targetPath) {
  return path.isAbsolute(targetPath) ? targetPath : path.join(ROOT, targetPath);
}

const args = parseArgs(process.argv.slice(2));
const inputPath = args.input;
const outputPath = args.output;

assert(inputPath, '缺少 --input。');
assert(outputPath, '缺少 --output。');

const resolvedInputPath = resolvePath(inputPath);
const resolvedOutputPath = resolvePath(outputPath);

assert(fs.existsSync(resolvedInputPath), `输入文件不存在：${inputPath}`);

const lines = fs.readFileSync(resolvedInputPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/);
const firstContentLineIndex = lines.findIndex((line) => line.trim().length > 0);

if (firstContentLineIndex >= 0 && /^#{1,6}\s+/.test(lines[firstContentLineIndex])) {
  lines.splice(firstContentLineIndex, 1);
  if (lines[firstContentLineIndex]?.trim() === '') {
    lines.splice(firstContentLineIndex, 1);
  }
}

const body = `${lines.join('\n').trim()}\n`;
fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
fs.writeFileSync(resolvedOutputPath, body, 'utf8');
