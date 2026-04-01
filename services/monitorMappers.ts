import type {
  CpuBreakdownData,
  DiskPartition,
  MonitorSnapshot,
  NetworkData,
  OSType,
  ServerCardData,
  ServerConfig,
  ServerState,
  SystemInfo,
} from '@/types';
import { formatRelativeTime, formatUptime } from '@/utils';

type IconFamily = 'ionicons' | 'material-community';

interface HistoryPoint {
  label: string;
  value: number;
}

interface ChartAxisTick {
  value: number;
  label: string;
}

interface ChartSeries {
  key: string;
  label: string;
  points: HistoryPoint[];
}

interface ChartSummaryItem {
  key: string;
  label: string;
  value: string;
}

interface TrendChartData {
  unitLabel: string;
  yAxisTicks: ChartAxisTick[];
  series: ChartSeries[];
  summary?: ChartSummaryItem[];
}

export interface OSVisualMeta {
  family: IconFamily;
  name: string;
  os: OSType;
}

interface MonitorDetailData {
  header: {
    osName: string;
    osIcon: OSVisualMeta;
    load1: number;
    load5: number;
    load15: number;
    uptime: string;
    cpuUsage: number;
  };
  cpu: {
    usage: number;
    coreUsage: number[];
    chart: TrendChartData;
    cores: number;
    breakdown: CpuBreakdownData;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    cached: number;
    chart: TrendChartData;
  };
  disk: {
    disks: DiskPartition[];
  };
  network: {
    networks: NetworkData[];
    chart: TrendChartData;
  };
}

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;
const PERCENT_AXIS_VALUES = [0, 25, 50, 75, 100];
const TREND_WINDOW_SIZE = 6;

export function inferOSType(source?: string | OSType): OSType {
  if (!source) {
    return 'unknown';
  }

  if (
    source === 'linux' ||
    source === 'ubuntu' ||
    source === 'debian' ||
    source === 'centos' ||
    source === 'windows' ||
    source === 'unknown'
  ) {
    return source;
  }

  const normalized = source.toLowerCase();
  if (normalized.includes('ubuntu')) return 'ubuntu';
  if (normalized.includes('debian')) return 'debian';
  if (normalized.includes('centos') || normalized.includes('red hat') || normalized.includes('rhel')) return 'centos';
  if (normalized.includes('windows')) return 'windows';
  if (normalized.includes('linux')) return 'linux';
  return 'unknown';
}

export function getOSVisualMeta(source?: string | OSType): OSVisualMeta {
  const osType = inferOSType(source);

  switch (osType) {
    case 'ubuntu':
      return { family: 'material-community', name: 'ubuntu', os: osType };
    case 'debian':
      return { family: 'material-community', name: 'debian', os: osType };
    case 'centos':
    case 'linux':
      return { family: 'material-community', name: 'linux', os: osType };
    case 'windows':
      return { family: 'material-community', name: 'microsoft-windows', os: osType };
    default:
      return { family: 'ionicons', name: 'server-outline', os: osType };
  }
}

function pickPrimaryDisk(disks?: DiskPartition[]): DiskPartition | undefined {
  if (!disks || disks.length === 0) {
    return undefined;
  }

  return (
    disks.find((disk) => disk.mountPoint === '/') ??
    [...disks].sort((left, right) => right.total - left.total)[0]
  );
}

function sumDiskTotal(disks?: DiskPartition[]): number {
  if (!disks || disks.length === 0) {
    return 0;
  }

  const localDeviceDisks = disks.filter((disk) => disk.device?.startsWith('/dev/'));
  const sourceDisks = localDeviceDisks.length > 0 ? localDeviceDisks : disks;
  const uniqueDisks = new Map<string, DiskPartition>();

  for (const disk of sourceDisks) {
    const key = disk.device
      ? `device:${disk.device}`
      : `mount:${disk.mountPoint}:${disk.filesystem}:${disk.total}`;

    if (!uniqueDisks.has(key)) {
      uniqueDisks.set(key, disk);
    }
  }

  return Array.from(uniqueDisks.values()).reduce((sum, disk) => sum + disk.total, 0);
}

function sumNetworkSpeed(snapshot: MonitorSnapshot, direction: 'upload' | 'download'): number {
  return snapshot.network.reduce((sum, network) => (
    sum + (direction === 'upload' ? network.uploadSpeed : network.downloadSpeed)
  ), 0);
}

function normalizeCoreUsage(coreUsage: number[], cpuCores: number): number[] {
  if (coreUsage.length > 0) {
    return coreUsage;
  }

  return Array.from({ length: Math.max(cpuCores, 1) }, () => 0);
}

function padTime(value: number): string {
  return value.toString().padStart(2, '0');
}

function buildTimelineLabels(history: MonitorSnapshot[]): string[] {
  if (history.length === 0) {
    return [];
  }

  const hourSlots = new Set(
    history.map((item) => {
      const date = new Date(item.timestamp);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
    }),
  );

  const minuteSlots = new Set(
    history.map((item) => {
      const date = new Date(item.timestamp);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
    }),
  );

  return history.map((item) => {
    const date = new Date(item.timestamp);

    if (hourSlots.size > 1) {
      return `${padTime(date.getHours())}:00`;
    }

    if (minuteSlots.size > 1) {
      return `${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
    }

    return `${padTime(date.getMinutes())}:${padTime(date.getSeconds())}`;
  });
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function buildPercentAxisTicks(): ChartAxisTick[] {
  return PERCENT_AXIS_VALUES.map((value) => ({
    value,
    label: `${Math.round(value)}%`,
  }));
}

function buildPercentChart({
  history,
  key,
  label,
  getValue,
}: {
  history: MonitorSnapshot[];
  key: string;
  label: string;
  getValue: (snapshot: MonitorSnapshot) => number;
}): TrendChartData {
  const labels = buildTimelineLabels(history);

  return {
    unitLabel: '%',
    yAxisTicks: buildPercentAxisTicks(),
    series: [
      {
        key,
        label,
        points: history.map((item, index) => ({
          label: labels[index] ?? '',
          value: clampPercent(getValue(item)),
        })),
      },
    ],
  };
}

function resolveRateUnit(maxBytesPerSecond: number): { divisor: number; unitLabel: string } {
  if (maxBytesPerSecond >= GB) {
    return { divisor: GB, unitLabel: 'GB/s' };
  }

  if (maxBytesPerSecond >= MB) {
    return { divisor: MB, unitLabel: 'MB/s' };
  }

  return { divisor: KB, unitLabel: 'KB/s' };
}

function formatRateValue(bytesPerSecond: number, divisor: number): number {
  return Number((bytesPerSecond / divisor).toFixed(2));
}

function buildRateAxisTicks(maxBytesPerSecond: number, divisor: number): ChartAxisTick[] {
  const maxValue = Math.max(formatRateValue(maxBytesPerSecond, divisor), 1);
  const step = maxValue / 4;

  return Array.from({ length: 5 }, (_, index) => {
    const value = Number((step * index).toFixed(2));
    return {
      value,
      label: value.toFixed(2),
    };
  });
}

function buildNetworkChart(history: MonitorSnapshot[], snapshot: MonitorSnapshot): TrendChartData {
  const labels = buildTimelineLabels(history);
  const uploadHistory = history.map((item) => sumNetworkSpeed(item, 'upload'));
  const downloadHistory = history.map((item) => sumNetworkSpeed(item, 'download'));
  const currentUpload = sumNetworkSpeed(snapshot, 'upload');
  const currentDownload = sumNetworkSpeed(snapshot, 'download');
  const maxBytesPerSecond = Math.max(
    currentUpload,
    currentDownload,
    ...uploadHistory,
    ...downloadHistory,
    0,
  );
  const { divisor, unitLabel } = resolveRateUnit(maxBytesPerSecond);

  return {
    unitLabel,
    yAxisTicks: buildRateAxisTicks(maxBytesPerSecond, divisor),
    series: [
      {
        key: 'upload',
        label: '上传',
        points: history.map((item, index) => ({
          label: labels[index] ?? '',
          value: formatRateValue(sumNetworkSpeed(item, 'upload'), divisor),
        })),
      },
      {
        key: 'download',
        label: '下载',
        points: history.map((item, index) => ({
          label: labels[index] ?? '',
          value: formatRateValue(sumNetworkSpeed(item, 'download'), divisor),
        })),
      },
    ],
    summary: [
      {
        key: 'upload',
        label: '实时上传',
        value: `${formatRateValue(currentUpload, divisor).toFixed(2)} ${unitLabel}`,
      },
      {
        key: 'download',
        label: '实时下载',
        value: `${formatRateValue(currentDownload, divisor).toFixed(2)} ${unitLabel}`,
      },
    ],
  };
}

export function toServerCardData({
  server,
  state,
  snapshot,
  systemInfo,
}: {
  server: ServerConfig;
  state?: ServerState;
  snapshot?: MonitorSnapshot;
  systemInfo?: SystemInfo;
}): ServerCardData {
  const primaryDisk = pickPrimaryDisk(snapshot?.disk);
  const primaryNetwork = snapshot?.network[0];

  let status: ServerCardData['status'] = 'offline';
  if (state?.status === 'disconnected') {
    status = 'offline';
  } else if (state?.status === 'error') {
    status = 'error';
  } else if (state?.status === 'connecting' || state?.status === 'reconnecting') {
    status = 'connecting';
  } else if (snapshot || state?.status === 'connected') {
    status = 'online';
  }

  const lastSeen = state?.lastUpdated ? formatRelativeTime(state.lastUpdated) : undefined;
  const fallbackMessage =
    status === 'error' || status === 'offline'
      ? state?.error ?? (lastSeen ? `最后更新：${lastSeen}` : '服务器当前不可达')
      : status === 'connecting'
        ? '正在获取监控数据...'
        : lastSeen
          ? `最后更新：${lastSeen}`
          : '尚未开始采集';

  return {
    id: server.id,
    name: server.name,
    os: systemInfo?.os ? inferOSType(systemInfo.os) : (server.osType ?? 'unknown'),
    status,
    temperature: snapshot?.temperature.value ?? null,
    load: snapshot?.cpu.load[0] ?? 0,
    cpuUsage: snapshot?.cpu.usage ?? 0,
    memUsage: snapshot && snapshot.memory.total > 0
      ? (snapshot.memory.used / snapshot.memory.total) * 100
      : 0,
    memTotal: snapshot?.memory.total ?? systemInfo?.totalMemory ?? 0,
    diskUsage: primaryDisk?.usage ?? 0,
    diskTotal: sumDiskTotal(snapshot?.disk) || primaryDisk?.total || 0,
    netUpload: primaryNetwork?.uploadSpeed ?? 0,
    netDownload: primaryNetwork?.downloadSpeed ?? 0,
    netUploadTotal: primaryNetwork?.uploadTotal ?? 0,
    netDownloadTotal: primaryNetwork?.downloadTotal ?? 0,
    ioRead: snapshot?.diskIO.readSpeed ?? 0,
    ioWrite: snapshot?.diskIO.writeSpeed ?? 0,
    ioReadTotal: snapshot?.diskIO.readTotal ?? 0,
    ioWriteTotal: snapshot?.diskIO.writeTotal ?? 0,
    cpuCores: systemInfo?.cpuCores ?? Math.max(snapshot?.cpu.coreUsage.length ?? 0, 1),
    uptime: snapshot ? formatUptime(snapshot.uptimeSeconds) : (systemInfo?.uptime ?? '--'),
    message: status === 'online' ? undefined : fallbackMessage,
    lastSeen,
  };
}

export function toMonitorDetailData({
  snapshot,
  systemInfo,
  history,
  server,
}: {
  snapshot: MonitorSnapshot;
  systemInfo: SystemInfo;
  history: MonitorSnapshot[];
  server?: Pick<ServerConfig, 'osType'>;
}): MonitorDetailData {
  const timelineSource = history.length > 0 ? history : [snapshot];
  const timeline = timelineSource.slice(-TREND_WINDOW_SIZE);

  return {
    header: {
      osName: `${systemInfo.os} ${systemInfo.arch}`.trim(),
      osIcon: getOSVisualMeta(systemInfo.os || server?.osType),
      load1: snapshot.cpu.load[0] ?? 0,
      load5: snapshot.cpu.load[1] ?? 0,
      load15: snapshot.cpu.load[2] ?? 0,
      uptime: formatUptime(snapshot.uptimeSeconds),
      cpuUsage: snapshot.cpu.usage,
    },
    cpu: {
      usage: snapshot.cpu.usage,
      coreUsage: normalizeCoreUsage(snapshot.cpu.coreUsage, systemInfo.cpuCores),
      chart: buildPercentChart({
        history: timeline,
        key: 'cpu',
        label: 'CPU',
        getValue: (item) => item.cpu.usage,
      }),
      cores: systemInfo.cpuCores,
      breakdown: snapshot.cpu.breakdown,
    },
    memory: {
      total: snapshot.memory.total,
      used: snapshot.memory.used,
      available: snapshot.memory.available,
      cached: snapshot.memory.cached,
      chart: buildPercentChart({
        history: timeline,
        key: 'memory',
        label: '内存',
        getValue: (item) => (
          item.memory.total > 0
            ? (item.memory.used / item.memory.total) * 100
            : 0
        ),
      }),
    },
    disk: {
      disks: snapshot.disk,
    },
    network: {
      networks: snapshot.network,
      chart: buildNetworkChart(timeline, snapshot),
    },
  };
}
