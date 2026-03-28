import type { OSType } from './server';

/**
 * 监控数据类型定义
 */

/** 系统基础信息（连接时采集一次） */
export interface SystemInfo {
  hostname: string;
  os: string;
  kernel: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: number;
  uptime: string;
}

/** CPU 实时数据 */
export interface CpuData {
  /** 总体使用率 (0-100) */
  usage: number;
  /** 各核心使用率 */
  coreUsage: number[];
  /** 1/5/15 分钟负载 */
  load: [number, number, number];
}

/** 内存实时数据 */
export interface MemoryData {
  /** 总内存（bytes） */
  total: number;
  /** 已用内存（bytes） */
  used: number;
  /** 可用内存（bytes） */
  available: number;
  /** 缓存（bytes） */
  cached: number;
  /** Swap 已用（bytes） */
  swapUsed: number;
  /** Swap 总计（bytes） */
  swapTotal: number;
}

/** 磁盘分区信息 */
export interface DiskPartition {
  /** 挂载点 */
  mountPoint: string;
  /** 文件系统类型 */
  filesystem: string;
  /** 总大小（bytes） */
  total: number;
  /** 已用（bytes） */
  used: number;
  /** 使用率 (0-100) */
  usage: number;
}

/** 磁盘 IO 数据 */
export interface DiskIOData {
  /** 读取速率（bytes/s） */
  readSpeed: number;
  /** 写入速率（bytes/s） */
  writeSpeed: number;
  /** 读取总量（bytes） */
  readTotal: number;
  /** 写入总量（bytes） */
  writeTotal: number;
}

/** 网络接口数据 */
export interface NetworkData {
  /** 接口名称 */
  interface: string;
  /** 上传速率（bytes/s） */
  uploadSpeed: number;
  /** 下载速率（bytes/s） */
  downloadSpeed: number;
  /** 上传总量（bytes） */
  uploadTotal: number;
  /** 下载总量（bytes） */
  downloadTotal: number;
}

/** CPU 温度 */
export interface TemperatureData {
  /** 温度值（摄氏度），null 表示不可用 */
  value: number | null;
}

/** 完整的实时监控数据快照 */
export interface MonitorSnapshot {
  cpu: CpuData;
  memory: MemoryData;
  disk: DiskPartition[];
  diskIO: DiskIOData;
  network: NetworkData[];
  temperature: TemperatureData;
  /** 采样时间戳 */
  timestamp: number;
}

/** 监听端口 */
export interface ListeningPort {
  port: number;
  protocol: string;
  process: string;
  pid?: number;
}

/** 进程信息 */
export interface ProcessInfo {
  pid: number;
  name: string;
  cpuPercent: number;
  memoryPercent: number;
  memoryUsed: number;
  user: string;
}

export type ServerVisualStatus = 'online' | 'offline' | 'connecting' | 'error';

export interface ServerCardData {
  id: string;
  name: string;
  os: OSType;
  status: ServerVisualStatus;
  temperature: number | null;
  load: number;
  cpuUsage: number;
  memUsage: number;
  memTotal: number;
  diskUsage: number;
  diskTotal: number;
  netUpload: number;
  netDownload: number;
  ioRead: number;
  ioWrite: number;
  message?: string;
  lastSeen?: string;
}
