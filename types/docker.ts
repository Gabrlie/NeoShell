/**
 * Docker 相关类型定义
 */

export type DockerContainerState =
  | 'created'
  | 'restarting'
  | 'running'
  | 'removing'
  | 'paused'
  | 'exited'
  | 'dead'
  | 'unknown';

export type ContainerStatus = DockerContainerState;

export interface DockerOverview {
  engineVersion: string;
  containersRunning: number;
  containersStopped: number;
  containersTotal: number;
  imagesTotal: number;
  composeProjectsTotal: number;
  volumesTotal: number;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  command: string;
  createdAt: string;
  runningFor: string;
  status: string;
  state: DockerContainerState;
  ports: string;
  cpuPercent?: number;
  memoryUsage?: string;
  memoryLimit?: string;
  projectName?: string;
  serviceName?: string;
}

export interface DockerEnvironmentVariable {
  key: string;
  value: string;
}

export interface DockerMountPoint {
  source: string;
  destination: string;
  mode: string;
  readOnly: boolean;
}

export interface DockerNetworkAttachment {
  name: string;
  ipAddress?: string;
  gateway?: string;
}

export interface DockerContainerDetails extends DockerContainer {
  environment: DockerEnvironmentVariable[];
  mounts: DockerMountPoint[];
  networks: DockerNetworkAttachment[];
  labels: DockerEnvironmentVariable[];
}

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  reference: string;
  createdSince: string;
  size: string;
  digest?: string;
}

export interface DockerVolume {
  name: string;
  driver: string;
  mountpoint: string;
  createdAt: string;
  scope: string;
  projectName?: string;
}

export type DockerComposeProjectSource = 'runtime' | 'discovered';

export interface DockerComposeProject {
  name: string;
  status: string;
  configFiles: string[];
  source: DockerComposeProjectSource;
}

export interface DockerComposeService {
  name: string;
  image?: string;
  command?: string;
  ports: string[];
  volumes: string[];
  environmentCount: number;
  containerCount: number;
}

export interface DockerComposeDetails {
  filePath: string;
  projectName: string;
  services: DockerComposeService[];
  containers: DockerContainer[];
}

export interface DockerDashboard {
  hasDocker: boolean;
  overview: DockerOverview;
  containers: DockerContainer[];
  composeProjects: DockerComposeProject[];
  images: DockerImage[];
  volumes: DockerVolume[];
}

export interface DockerContainerCreateInput {
  image: string;
  name?: string;
  command?: string;
  env?: DockerEnvironmentVariable[];
  ports?: string[];
  volumes?: string[];
  restartPolicy?: 'no' | 'unless-stopped' | 'always' | 'on-failure';
  network?: string;
  detached?: boolean;
}

export interface DockerComposeCreateInput {
  filePath: string;
  content: string;
  autoStart?: boolean;
  projectName?: string;
}

export interface DockerContainerLogsOptions {
  tail?: number;
  since?: string;
  timestamps?: boolean;
}

export type DockerContainerAction = 'start' | 'stop' | 'restart' | 'delete';

export type DockerComposeAction = 'up' | 'stop' | 'restart' | 'down';

export type DockerImageAction = 'pull' | 'delete';

export type DockerVolumeAction = 'delete';

export type DockerTerminalShell = 'bash' | 'sh' | 'ash' | 'custom';

export interface DockerRuntimeState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  dashboard?: DockerDashboard;
  error?: string;
  isMutating: boolean;
  lastActionMessage?: string;
}
