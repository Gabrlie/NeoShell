/**
 * Docker 相关类型定义
 */

/** Docker 引擎信息 */
export interface DockerInfo {
  version: string;
  containersRunning: number;
  containersStopped: number;
  containersTotal: number;
  images: number;
}

/** 容器状态 */
export type ContainerStatus = 'running' | 'stopped' | 'paused' | 'restarting' | 'exited' | 'dead';

/** 容器基础信息 */
export interface Container {
  id: string;
  name: string;
  image: string;
  status: ContainerStatus;
  state: string;
  /** 创建时间 */
  created: string;
  /** 运行时长描述 */
  runningFor: string;
  /** 端口映射 */
  ports: string;
  /** CPU 使用率 */
  cpuPercent?: number;
  /** 内存使用 */
  memoryUsage?: string;
  /** 内存限制 */
  memoryLimit?: string;
}

/** Docker 镜像 */
export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
  created: string;
}
