import type { MonitorSnapshot, OSType, ServerCardData, ServerConfig, ServerState, SystemInfo } from '@/types';
import { formatRelativeTime } from '@/utils';

function resolveOSType(os?: string): OSType {
  if (!os) {
    return 'unknown';
  }

  const normalized = os.toLowerCase();
  if (normalized.includes('ubuntu')) return 'ubuntu';
  if (normalized.includes('debian')) return 'debian';
  if (normalized.includes('centos') || normalized.includes('red hat') || normalized.includes('rhel')) return 'centos';
  if (normalized.includes('windows')) return 'windows';
  if (normalized.includes('linux')) return 'linux';
  return 'unknown';
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
  const primaryDisk = snapshot?.disk[0];
  const primaryNetwork = snapshot?.network[0];

  let status: ServerCardData['status'] = 'offline';
  if (state?.status === 'error') {
    status = snapshot ? 'online' : 'error';
  } else if (snapshot || state?.status === 'connected') {
    status = 'online';
  } else if (state?.status === 'connecting' || state?.status === 'reconnecting') {
    status = 'connecting';
  }

  const lastSeen = state?.lastUpdated ? formatRelativeTime(state.lastUpdated) : undefined;
  const fallbackMessage =
    status === 'error'
      ? state?.error ?? '监控采集失败'
      : status === 'connecting'
        ? '正在获取监控数据...'
        : lastSeen
          ? `最后更新：${lastSeen}`
          : '尚未开始采集';

  return {
    id: server.id,
    name: server.name,
    os: resolveOSType(systemInfo?.os),
    status,
    temperature: snapshot?.temperature.value ?? null,
    load: snapshot?.cpu.load[0] ?? 0,
    cpuUsage: snapshot?.cpu.usage ?? 0,
    memUsage: snapshot && snapshot.memory.total > 0
      ? (snapshot.memory.used / snapshot.memory.total) * 100
      : 0,
    memTotal: snapshot?.memory.total ?? systemInfo?.totalMemory ?? 0,
    diskUsage: primaryDisk?.usage ?? 0,
    diskTotal: primaryDisk?.total ?? 0,
    netUpload: primaryNetwork?.uploadSpeed ?? 0,
    netDownload: primaryNetwork?.downloadSpeed ?? 0,
    netUploadTotal: primaryNetwork?.uploadTotal ?? 0,
    netDownloadTotal: primaryNetwork?.downloadTotal ?? 0,
    ioRead: snapshot?.diskIO.readSpeed ?? 0,
    ioWrite: snapshot?.diskIO.writeSpeed ?? 0,
    ioReadTotal: snapshot?.diskIO.readTotal ?? 0,
    ioWriteTotal: snapshot?.diskIO.writeTotal ?? 0,
    cpuCores: systemInfo?.cpuCores ?? 1,
    uptime: systemInfo?.uptime ?? '0s',
    message: status === 'online' ? undefined : fallbackMessage,
    lastSeen,
  };
}
