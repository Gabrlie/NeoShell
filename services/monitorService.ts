import { formatUptime, MONITOR_COMMAND, SYSTEM_INFO_COMMAND } from '@/utils';
import type { MonitorSnapshot, ServerConfig, SystemInfo } from '@/types';

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

const DEFAULT_INTERFACE = 'eth0';
const SECTOR_SIZE = 512;

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

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function wave(seed: number, timestamp: number, frequency: number, amplitude: number, offset: number): number {
  return offset + Math.sin(timestamp / frequency + seed) * amplitude;
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

export function parseMonitorOutput(output: string): MonitorSnapshot {
  const sections = parseSections(output);
  const cpuTokens = sections.CPU?.[0]?.split(/\s+/) ?? [];
  const cpuStats = cpuTokens.slice(1).map((token) => Number.parseInt(token, 10));
  const totalCpu = cpuStats.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
  const idleCpu = cpuStats[3] ?? 0;
  const cpuUsage = totalCpu > 0 ? ((totalCpu - idleCpu) / totalCpu) * 100 : 0;

  const meminfo = parseMeminfo(sections.MEM ?? []);
  const totalMemory = meminfo.MemTotal ?? 0;
  const availableMemory = meminfo.MemAvailable ?? meminfo.MemFree ?? 0;
  const cachedMemory = meminfo.Cached ?? 0;
  const usedMemory = Math.max(totalMemory - availableMemory, 0);

  const loadValues = (sections.LOAD?.[0] ?? '0 0 0')
    .split(/\s+/)
    .slice(0, 3)
    .map((token) => parseNumber(token));

  const diskTokens = sections.DISK?.[0]?.split(/\s+/) ?? [];
  const filesystem = diskTokens[1] ?? 'unknown';
  const totalDisk = parseNumber(diskTokens[2]);
  const usedDisk = parseNumber(diskTokens[3]);
  const diskUsage = parseNumber((diskTokens[5] ?? '0').replace('%', ''));
  const mountPoint = diskTokens[6] && diskTokens[6] !== '-' ? diskTokens[6] : '/';

  const diskLines = sections.DISKIO ?? [];
  let readSectors = 0;
  let writeSectors = 0;
  for (const line of diskLines) {
    const tokens = line.trim().split(/\s+/);
    if (tokens.length < 10) continue;
    const name = tokens[2];
    if (!/^(sd|vd|xvd|hd|nvme)\w+/.test(name)) continue;
    readSectors += Number.parseInt(tokens[5], 10) || 0;
    writeSectors += Number.parseInt(tokens[9], 10) || 0;
  }

  const network = (sections.NET ?? [])
    .filter((line) => line.includes(':'))
    .map((line) => {
      const [ifacePart, rawStats] = line.split(':');
      const iface = ifacePart.trim();
      const values = rawStats.trim().split(/\s+/);
      return {
        interface: iface,
        uploadSpeed: 0,
        downloadSpeed: 0,
        uploadTotal: parseNumber(values[8]),
        downloadTotal: parseNumber(values[0]),
      };
    })
    .filter((item) => item.interface !== 'lo');

  const temperatureRaw = sections.TEMP?.find((line) => /\d/.test(line)) ?? '0';
  const temperatureValue = parseNumber(temperatureRaw);

  return {
    cpu: {
      usage: clamp(cpuUsage, 0, 100),
      coreUsage: [],
      load: [
        loadValues[0] ?? 0,
        loadValues[1] ?? 0,
        loadValues[2] ?? 0,
      ],
    },
    memory: {
      total: totalMemory,
      used: usedMemory,
      available: availableMemory,
      cached: cachedMemory,
      swapUsed: 0,
      swapTotal: 0,
    },
    disk: [
      {
        mountPoint,
        filesystem,
        total: totalDisk,
        used: usedDisk,
        usage: diskUsage,
      },
    ],
    diskIO: {
      readSpeed: 0,
      writeSpeed: 0,
      readTotal: readSectors * SECTOR_SIZE,
      writeTotal: writeSectors * SECTOR_SIZE,
    },
    network,
    temperature: {
      value: temperatureValue > 1000 ? temperatureValue / 1000 : temperatureValue || null,
    },
    timestamp: Date.now(),
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
    timestamp,
  };
}

export function createMockSystemInfo(server: Pick<ServerConfig, 'name' | 'host'>): SystemInfo {
  return {
    hostname: server.name,
    os: 'Ubuntu 24.04 LTS',
    kernel: '6.8.0-generic',
    arch: 'x86_64',
    cpuModel: 'AMD EPYC Virtual CPU',
    cpuCores: 4,
    totalMemory: 16 * 1024 * 1024 * 1024,
    uptime: '3 天 6 小时',
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
      return parseMonitorOutput(output);
    }
  }

  return createMockMonitorSnapshot({
    serverId: server.id,
    totalMemory: 16 * 1024 * 1024 * 1024,
    totalDisk: 256 * 1024 * 1024 * 1024,
  });
}
