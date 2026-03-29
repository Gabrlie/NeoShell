import { formatUptime, MONITOR_COMMAND, SYSTEM_INFO_COMMAND } from '@/utils';
import type {
  CpuBreakdownData,
  DiskPartition,
  MonitorSnapshot,
  NetworkData,
  ServerConfig,
  SystemInfo,
} from '@/types';

function getSSHService() {
  return require('./ssh') as {
    executeSSHCommand: (server: ServerConfig, command: string) => Promise<string>;
    isSSHAvailable: () => boolean;
  };
}

interface SectionMap {
  [section: string]: string[];
}

interface MockSnapshotOptions {
  serverId: string;
  totalMemory: number;
  totalDisk: number;
  timestamp?: number;
}

interface CpuCounters {
  user: number;
  nice: number;
  system: number;
  idle: number;
  ioWait: number;
  irq: number;
  softIrq: number;
  steal: number;
}

interface ParsedNetworkTotals {
  interface: string;
  uploadTotal: number;
  downloadTotal: number;
}

interface ParsedDiskIO {
  readTotal: number;
  writeTotal: number;
}

export interface ParsedMonitorOutput {
  cpuTotal: CpuCounters;
  cpuCores: CpuCounters[];
  load: [number, number, number];
  memory: MonitorSnapshot['memory'];
  disk: DiskPartition[];
  diskIO: ParsedDiskIO;
  network: ParsedNetworkTotals[];
  temperature: MonitorSnapshot['temperature'];
  uptimeSeconds: number;
  timestamp: number;
}

const DEFAULT_INTERFACE = 'eth0';
const SECTOR_SIZE = 512;
const MONITOR_BASELINE_TIMEOUT_MS = 5 * 60 * 1000;

const ZERO_CPU_COUNTERS: CpuCounters = {
  user: 0,
  nice: 0,
  system: 0,
  idle: 0,
  ioWait: 0,
  irq: 0,
  softIrq: 0,
  steal: 0,
};

const previousReadings = new Map<string, ParsedMonitorOutput>();

export function resetMonitorBaseline(serverId: string): void {
  previousReadings.delete(serverId);
}

function parseSections(output: string): SectionMap {
  const sections: SectionMap = {};
  let currentSection = '';

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const match = line.match(/^===([^=]+)===$/);
    if (match) {
      currentSection = match[1];
      sections[currentSection] = [];
      continue;
    }

    if (currentSection) {
      sections[currentSection].push(line);
    }
  }

  return sections;
}

function parseNumber(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseMeminfo(lines: string[]): Record<string, number> {
  const values: Record<string, number> = {};

  for (const line of lines) {
    const match = line.match(/^([A-Za-z_]+):\s+(\d+)/);
    if (!match) continue;
    values[match[1]] = Number.parseInt(match[2], 10) * 1024;
  }

  return values;
}

function parseCpuCounters(line: string): CpuCounters | null {
  const tokens = line.trim().split(/\s+/);
  if (tokens.length < 5 || !tokens[0].startsWith('cpu')) {
    return null;
  }

  return {
    user: Number.parseInt(tokens[1] ?? '0', 10) || 0,
    nice: Number.parseInt(tokens[2] ?? '0', 10) || 0,
    system: Number.parseInt(tokens[3] ?? '0', 10) || 0,
    idle: Number.parseInt(tokens[4] ?? '0', 10) || 0,
    ioWait: Number.parseInt(tokens[5] ?? '0', 10) || 0,
    irq: Number.parseInt(tokens[6] ?? '0', 10) || 0,
    softIrq: Number.parseInt(tokens[7] ?? '0', 10) || 0,
    steal: Number.parseInt(tokens[8] ?? '0', 10) || 0,
  };
}

function subtractCpuCounters(current: CpuCounters, previous: CpuCounters): CpuCounters {
  return {
    user: Math.max(current.user - previous.user, 0),
    nice: Math.max(current.nice - previous.nice, 0),
    system: Math.max(current.system - previous.system, 0),
    idle: Math.max(current.idle - previous.idle, 0),
    ioWait: Math.max(current.ioWait - previous.ioWait, 0),
    irq: Math.max(current.irq - previous.irq, 0),
    softIrq: Math.max(current.softIrq - previous.softIrq, 0),
    steal: Math.max(current.steal - previous.steal, 0),
  };
}

function getCpuTotal(counter: CpuCounters): number {
  return (
    counter.user +
    counter.nice +
    counter.system +
    counter.idle +
    counter.ioWait +
    counter.irq +
    counter.softIrq +
    counter.steal
  );
}

function getCpuNonIdle(counter: CpuCounters): number {
  return counter.user + counter.nice + counter.system + counter.irq + counter.softIrq + counter.steal;
}

function toPercent(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return (value / total) * 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createCpuBreakdown(counter: CpuCounters): CpuBreakdownData {
  const total = getCpuTotal(counter);
  return {
    user: clamp(toPercent(counter.user, total), 0, 100),
    nice: clamp(toPercent(counter.nice, total), 0, 100),
    system: clamp(toPercent(counter.system, total), 0, 100),
    idle: clamp(toPercent(counter.idle, total), 0, 100),
    ioWait: clamp(toPercent(counter.ioWait, total), 0, 100),
    irq: clamp(toPercent(counter.irq, total), 0, 100),
    softIrq: clamp(toPercent(counter.softIrq, total), 0, 100),
    steal: clamp(toPercent(counter.steal, total), 0, 100),
  };
}

function calculateCpuUsage(current: CpuCounters, previous?: CpuCounters): number {
  const sample = previous ? subtractCpuCounters(current, previous) : current;
  const total = getCpuTotal(sample);
  const nonIdle = getCpuNonIdle(sample);

  return clamp(toPercent(nonIdle, total), 0, 100);
}

function calculateCpuBreakdown(current: CpuCounters, previous?: CpuCounters): CpuBreakdownData {
  const sample = previous ? subtractCpuCounters(current, previous) : current;
  return createCpuBreakdown(sample);
}

function calculateCoreUsage(current: CpuCounters[], previous?: CpuCounters[]): number[] {
  return current.map((core, index) => calculateCpuUsage(core, previous?.[index]));
}

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function wave(seed: number, timestamp: number, frequency: number, amplitude: number, offset: number): number {
  return offset + Math.sin(timestamp / frequency + seed) * amplitude;
}

function createApproximateBreakdown(cpuUsage: number): CpuBreakdownData {
  const busy = clamp(cpuUsage, 0, 100);
  const idle = clamp(100 - busy, 0, 100);
  const user = busy * 0.52;
  const nice = busy * 0.03;
  const system = busy * 0.23;
  const ioWait = busy * 0.12;
  const irq = busy * 0.03;
  const softIrq = busy * 0.05;
  const steal = busy * 0.02;

  return {
    user,
    nice,
    system,
    idle,
    ioWait,
    irq,
    softIrq,
    steal,
  };
}

function parseDiskLines(lines: string[]): DiskPartition[] {
  const ignoredFilesystems = new Set([
    'overlay',
    'tmpfs',
    'devtmpfs',
    'squashfs',
    'efivarfs',
    'proc',
    'sysfs',
    'cgroup2',
    'mqueue',
    'tracefs',
    'fusectl',
  ]);

  return lines
    .filter((line) => !line.startsWith('Filesystem'))
    .map((line) => line.trim().split(/\s+/))
    .filter((tokens) => tokens.length >= 7)
    .map((tokens) => ({
      device: tokens[0] ?? undefined,
      filesystem: tokens[1] ?? 'unknown',
      total: parseNumber(tokens[2]),
      used: parseNumber(tokens[3]),
      usage: parseNumber((tokens[5] ?? '0').replace('%', '')),
      mountPoint: tokens.slice(6).join(' ') || '/',
    }))
    .filter((disk) => disk.total > 0 && !ignoredFilesystems.has(disk.filesystem.toLowerCase()));
}

function parseDiskIOTotals(lines: string[]): ParsedDiskIO {
  let readSectors = 0;
  let writeSectors = 0;
  const physicalDevicePattern = /^(sd[a-z]+|vd[a-z]+|xvd[a-z]+|hd[a-z]+|nvme\d+n\d+|mmcblk\d+)$/;

  for (const line of lines) {
    const tokens = line.trim().split(/\s+/);
    if (tokens.length < 10) continue;
    const name = tokens[2];
    if (!physicalDevicePattern.test(name)) continue;
    readSectors += Number.parseInt(tokens[5], 10) || 0;
    writeSectors += Number.parseInt(tokens[9], 10) || 0;
  }

  return {
    readTotal: readSectors * SECTOR_SIZE,
    writeTotal: writeSectors * SECTOR_SIZE,
  };
}

function parseNetworkTotals(lines: string[]): ParsedNetworkTotals[] {
  return lines
    .filter((line) => line.includes(':'))
    .map((line) => {
      const [ifacePart, rawStats] = line.split(':');
      const iface = ifacePart.trim();
      const values = rawStats.trim().split(/\s+/);

      return {
        interface: iface,
        uploadTotal: parseNumber(values[8]),
        downloadTotal: parseNumber(values[0]),
      };
    })
    .filter((item) => item.interface !== 'lo');
}

function calculateRate(currentTotal: number, previousTotal: number, deltaSeconds: number): number {
  if (deltaSeconds <= 0 || currentTotal < previousTotal) {
    return 0;
  }

  return (currentTotal - previousTotal) / deltaSeconds;
}

function buildNetworkSnapshot(
  current: ParsedNetworkTotals[],
  previous: ParsedNetworkTotals[] | undefined,
  deltaSeconds: number,
): NetworkData[] {
  const previousMap = new Map(previous?.map((item) => [item.interface, item]) ?? []);

  return current.map((item) => {
    const previousItem = previousMap.get(item.interface);

    return {
      interface: item.interface,
      uploadSpeed: previousItem ? calculateRate(item.uploadTotal, previousItem.uploadTotal, deltaSeconds) : 0,
      downloadSpeed: previousItem ? calculateRate(item.downloadTotal, previousItem.downloadTotal, deltaSeconds) : 0,
      uploadTotal: item.uploadTotal,
      downloadTotal: item.downloadTotal,
    };
  });
}

function isComparableReading(previous: ParsedMonitorOutput | undefined, current: ParsedMonitorOutput): boolean {
  if (!previous) {
    return false;
  }

  const deltaMs = current.timestamp - previous.timestamp;
  return deltaMs > 0 && deltaMs <= MONITOR_BASELINE_TIMEOUT_MS;
}

export function parseSystemInfoOutput(output: string): SystemInfo {
  const sections = parseSections(output);
  const totalMemoryKb = parseNumber(sections.TOTALMEM?.[0]);
  const uptimeSeconds = parseNumber(sections.UPTIME?.[0]);

  return {
    hostname: sections.HOSTNAME?.[0] ?? 'unknown-host',
    os: sections.OS?.[0] ?? 'Unknown Linux',
    kernel: sections.KERNEL?.[0] ?? 'unknown',
    arch: sections.ARCH?.[0] ?? 'unknown',
    cpuModel: sections.CPUMODEL?.[0] ?? 'Unknown CPU',
    cpuCores: Math.max(1, Math.trunc(parseNumber(sections.CPUCORES?.[0]))),
    totalMemory: totalMemoryKb * 1024,
    uptime: formatUptime(uptimeSeconds),
  };
}

export function parseMonitorOutput(output: string, timestamp = Date.now()): ParsedMonitorOutput {
  const sections = parseSections(output);
  const cpuLines = sections.CPU ?? [];
  const cpuTotal = parseCpuCounters(cpuLines[0] ?? '') ?? ZERO_CPU_COUNTERS;
  const cpuCores = cpuLines
    .slice(1)
    .map((line) => parseCpuCounters(line))
    .filter((line): line is CpuCounters => Boolean(line));

  const meminfo = parseMeminfo(sections.MEM ?? []);
  const totalMemory = meminfo.MemTotal ?? 0;
  const availableMemory = meminfo.MemAvailable ?? meminfo.MemFree ?? 0;
  const cachedMemory = meminfo.Cached ?? 0;
  const usedMemory = Math.max(totalMemory - availableMemory, 0);

  const loadValues = (sections.LOAD?.[0] ?? '0 0 0')
    .split(/\s+/)
    .slice(0, 3)
    .map((token) => parseNumber(token));

  const disks = parseDiskLines(sections.DISK ?? []);
  const diskIO = parseDiskIOTotals(sections.DISKIO ?? []);
  const network = parseNetworkTotals(sections.NET ?? []);
  const temperatureRaw = sections.TEMP?.find((line) => /\d/.test(line)) ?? '0';
  const temperatureValue = parseNumber(temperatureRaw);
  const uptimeSeconds = parseNumber((sections.UPTIME?.[0] ?? '0').split(/\s+/)[0]);

  return {
    cpuTotal,
    cpuCores,
    load: [
      loadValues[0] ?? 0,
      loadValues[1] ?? 0,
      loadValues[2] ?? 0,
    ],
    memory: {
      total: totalMemory,
      used: usedMemory,
      available: availableMemory,
      cached: cachedMemory,
      swapUsed: 0,
      swapTotal: 0,
    },
    disk: disks,
    diskIO,
    network,
    temperature: {
      value: temperatureValue > 1000 ? temperatureValue / 1000 : temperatureValue || null,
    },
    uptimeSeconds,
    timestamp,
  };
}

export function createMonitorSnapshot(
  current: ParsedMonitorOutput,
  previous?: ParsedMonitorOutput,
): MonitorSnapshot {
  const comparable = isComparableReading(previous, current);
  const previousReading = comparable ? previous : undefined;
  const deltaSeconds = previousReading
    ? (current.timestamp - previousReading.timestamp) / 1000
    : 0;

  return {
    cpu: {
      usage: calculateCpuUsage(current.cpuTotal, previousReading?.cpuTotal),
      coreUsage: calculateCoreUsage(current.cpuCores, previousReading?.cpuCores),
      load: current.load,
      breakdown: calculateCpuBreakdown(current.cpuTotal, previousReading?.cpuTotal),
    },
    memory: current.memory,
    disk: current.disk,
    diskIO: {
      readSpeed: previousReading
        ? calculateRate(current.diskIO.readTotal, previousReading.diskIO.readTotal, deltaSeconds)
        : 0,
      writeSpeed: previousReading
        ? calculateRate(current.diskIO.writeTotal, previousReading.diskIO.writeTotal, deltaSeconds)
        : 0,
      readTotal: current.diskIO.readTotal,
      writeTotal: current.diskIO.writeTotal,
    },
    network: buildNetworkSnapshot(current.network, previousReading?.network, deltaSeconds),
    temperature: current.temperature,
    uptimeSeconds: current.uptimeSeconds,
    timestamp: current.timestamp,
  };
}

export function createMockMonitorSnapshot({
  serverId,
  totalMemory,
  totalDisk,
  timestamp = Date.now(),
}: MockSnapshotOptions): MonitorSnapshot {
  const seed = hashString(serverId) % 1000;
  const cpuUsage = clamp(wave(seed, timestamp, 45_000, 18, 48), 8, 96);
  const memoryUsage = clamp(wave(seed + 17, timestamp, 80_000, 0.12, 0.56), 0.18, 0.9);
  const diskUsage = clamp(wave(seed + 31, timestamp, 240_000, 8, 52), 12, 92);
  const uploadSpeed = Math.max(0, wave(seed + 43, timestamp, 16_000, 850_000, 1_200_000));
  const downloadSpeed = Math.max(0, wave(seed + 59, timestamp, 14_000, 1_800_000, 3_000_000));
  const readSpeed = Math.max(0, wave(seed + 71, timestamp, 20_000, 700_000, 1_000_000));
  const writeSpeed = Math.max(0, wave(seed + 83, timestamp, 18_000, 500_000, 650_000));
  const totalSeconds = Math.floor(timestamp / 1000);
  const uptimeSeconds = 3 * 86400 + 6 * 3600 + (seed % 7200);

  return {
    cpu: {
      usage: cpuUsage,
      coreUsage: [0, 1, 2, 3].map((index) =>
        clamp(cpuUsage + Math.sin(totalSeconds / 10 + index + seed) * 9, 0, 100)
      ),
      load: [
        Number((cpuUsage / 100 * 1.6).toFixed(2)),
        Number((cpuUsage / 100 * 1.2).toFixed(2)),
        Number((cpuUsage / 100 * 0.9).toFixed(2)),
      ],
      breakdown: createApproximateBreakdown(cpuUsage),
    },
    memory: {
      total: totalMemory,
      used: totalMemory * memoryUsage,
      available: totalMemory * (1 - memoryUsage),
      cached: totalMemory * 0.14,
      swapUsed: totalMemory * 0.03,
      swapTotal: totalMemory * 0.25,
    },
    disk: [
      {
        mountPoint: '/',
        filesystem: 'ext4',
        total: totalDisk,
        used: totalDisk * (diskUsage / 100),
        usage: diskUsage,
      },
    ],
    diskIO: {
      readSpeed,
      writeSpeed,
      readTotal: seed * 1_000_000 + totalSeconds * Math.max(readSpeed, 1),
      writeTotal: seed * 800_000 + totalSeconds * Math.max(writeSpeed, 1),
    },
    network: [
      {
        interface: DEFAULT_INTERFACE,
        uploadSpeed,
        downloadSpeed,
        uploadTotal: seed * 5_000_000 + totalSeconds * Math.max(uploadSpeed, 1),
        downloadTotal: seed * 8_000_000 + totalSeconds * Math.max(downloadSpeed, 1),
      },
    ],
    temperature: {
      value: Number(clamp(wave(seed + 97, timestamp, 60_000, 7, 48), 32, 74).toFixed(1)),
    },
    uptimeSeconds,
    timestamp,
  };
}

export function createMockSystemInfo(server: Pick<ServerConfig, 'name' | 'host'>): SystemInfo {
  const uptimeSeconds = 3 * 86400 + 6 * 3600 + (hashString(`${server.name}:${server.host}`) % 7200);

  return {
    hostname: server.name,
    os: 'Ubuntu 24.04 LTS',
    kernel: '6.8.0-generic',
    arch: 'x86_64',
    cpuModel: 'AMD EPYC Virtual CPU',
    cpuCores: 4,
    totalMemory: 16 * 1024 * 1024 * 1024,
    uptime: formatUptime(uptimeSeconds),
  };
}

export async function getSystemInfo(server: ServerConfig): Promise<SystemInfo> {
  if (server.dataSource === 'ssh') {
    const sshService = getSSHService();
    if (sshService.isSSHAvailable()) {
      const output = await sshService.executeSSHCommand(server, SYSTEM_INFO_COMMAND);
      return parseSystemInfoOutput(output);
    }
  }

  return createMockSystemInfo(server);
}

export async function getMonitorSnapshot(server: ServerConfig): Promise<MonitorSnapshot> {
  if (server.dataSource === 'ssh') {
    const sshService = getSSHService();
    if (sshService.isSSHAvailable()) {
      const output = await sshService.executeSSHCommand(server, MONITOR_COMMAND);
      const current = parseMonitorOutput(output, Date.now());
      const previous = previousReadings.get(server.id);
      const snapshot = createMonitorSnapshot(current, previous);
      previousReadings.set(server.id, current);
      return snapshot;
    }
  }

  return createMockMonitorSnapshot({
    serverId: server.id,
    totalMemory: 16 * 1024 * 1024 * 1024,
    totalDisk: 256 * 1024 * 1024 * 1024,
  });
}
