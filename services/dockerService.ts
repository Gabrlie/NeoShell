import type {
  DockerComposeAction,
  DockerComposeCreateInput,
  DockerComposeDetails,
  DockerComposeProject,
  DockerComposeService,
  DockerContainer,
  DockerContainerAction,
  DockerContainerCreateInput,
  DockerContainerDetails,
  DockerContainerLogsOptions,
  DockerContainerState,
  DockerDashboard,
  DockerEnvironmentVariable,
  DockerImage,
  DockerImageAction,
  DockerMountPoint,
  DockerNetworkAttachment,
  DockerTerminalShell,
  DockerVolume,
  DockerVolumeAction,
  ServerConfig,
} from '@/types';

function getSSHService() {
  return require('./ssh') as {
    executeSSHCommand: (server: ServerConfig, command: string) => Promise<string>;
    isSSHAvailable: () => boolean;
  };
}

function getFileEditorService() {
  return require('./fileEditorService') as {
    saveRemoteEditableFile: (
      server: ServerConfig,
      remotePath: string,
      content: string,
    ) => Promise<void>;
  };
}

function escapeShellArg(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function createComposeSearchRoots() {
  return ['/etc', '/opt', '/srv', '/home', '/root']
    .map((root) => escapeShellArg(root))
    .join(' ');
}

function parseJsonCollection<T>(output: string): T[] {
  const trimmed = output.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed as T[];
    }

    return [parsed as T];
  } catch {
    return trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as T];
        } catch {
          return [];
        }
      });
  }
}

function splitCommaList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLabels(value: string | undefined): Record<string, string> {
  return splitCommaList(value).reduce<Record<string, string>>((accumulator, item) => {
    const separatorIndex = item.indexOf('=');
    if (separatorIndex < 0) {
      accumulator[item] = '';
      return accumulator;
    }

    const key = item.slice(0, separatorIndex).trim();
    const labelValue = item.slice(separatorIndex + 1).trim();
    if (key) {
      accumulator[key] = labelValue;
    }
    return accumulator;
  }, {});
}

function normalizeContainerState(value: string | undefined): DockerContainerState {
  const normalized = (value ?? '').trim().toLowerCase();

  if (normalized.includes('running')) return 'running';
  if (normalized.includes('paused')) return 'paused';
  if (normalized.includes('restarting')) return 'restarting';
  if (normalized.includes('created')) return 'created';
  if (normalized.includes('removing')) return 'removing';
  if (normalized.includes('dead')) return 'dead';
  if (normalized.includes('exited') || normalized.includes('stopped')) return 'exited';

  return 'unknown';
}

function parseCpuPercent(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value.replace('%', '').trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseMemoryPair(value: string | undefined) {
  if (!value) {
    return {
      memoryUsage: undefined,
      memoryLimit: undefined,
    };
  }

  const [usage, limit] = value.split('/').map((item) => item.trim());
  return {
    memoryUsage: usage || undefined,
    memoryLimit: limit || undefined,
  };
}

function getFileName(path: string) {
  const trimmed = path.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return '';
  }

  const parts = trimmed.split('/');
  return parts[parts.length - 1] ?? '';
}

function getDirectoryPath(path: string) {
  const trimmed = path.trim().replace(/\/+$/, '');
  if (!trimmed || trimmed === '/') {
    return '/';
  }

  const lastSlashIndex = trimmed.lastIndexOf('/');
  return lastSlashIndex <= 0 ? '/' : trimmed.slice(0, lastSlashIndex);
}

function deriveComposeProjectName(filePath: string) {
  const directoryName = getFileName(getDirectoryPath(filePath));
  if (directoryName) {
    return directoryName;
  }

  const fileName = getFileName(filePath);
  return fileName.replace(/\.(ya?ml)$/i, '') || 'compose-project';
}

function normalizeComposeFilePaths(configFiles: string | undefined) {
  return splitCommaList(configFiles).map((item) => item.replace(/^"+|"+$/g, ''));
}

function formatComposePublisher(publisher: Record<string, unknown>) {
  const host = String(publisher.URL ?? '0.0.0.0');
  const published = String(publisher.PublishedPort ?? '');
  const target = String(publisher.TargetPort ?? '');
  const protocol = String(publisher.Protocol ?? 'tcp');
  if (!published || !target) {
    return '';
  }

  return `${host}:${published}->${target}/${protocol}`;
}

function formatComposeServicePort(port: unknown) {
  if (typeof port === 'string') {
    return port;
  }

  if (!port || typeof port !== 'object') {
    return '';
  }

  const portRecord = port as Record<string, unknown>;
  const published = portRecord.published;
  const target = portRecord.target;
  const protocol = String(portRecord.protocol ?? 'tcp');

  if (published == null || target == null) {
    return '';
  }

  return `${String(published)}:${String(target)}/${protocol}`;
}

function formatComposeServiceVolume(volume: unknown) {
  if (typeof volume === 'string') {
    return volume;
  }

  if (!volume || typeof volume !== 'object') {
    return '';
  }

  const volumeRecord = volume as Record<string, unknown>;
  const source = String(volumeRecord.source ?? '');
  const target = String(volumeRecord.target ?? '');
  if (!source || !target) {
    return target || source;
  }

  return `${source}:${target}`;
}

function getEnvironmentCount(environment: unknown) {
  if (Array.isArray(environment)) {
    return environment.length;
  }

  if (!environment || typeof environment !== 'object') {
    return 0;
  }

  return Object.keys(environment as Record<string, unknown>).length;
}

function normalizeComposeCommand(command: unknown) {
  if (Array.isArray(command)) {
    return command.map((item) => String(item)).join(' ');
  }

  if (typeof command === 'string') {
    return command;
  }

  return undefined;
}

function buildDockerPsCommand(containerId?: string) {
  const filter = containerId ? ` --filter id=${escapeShellArg(containerId)}` : '';
  return `docker ps -a${filter} --format '{{json .}}'`;
}

function buildDockerStatsCommand(containerId?: string) {
  const target = containerId ? ` ${escapeShellArg(containerId)}` : '';
  return `docker stats --no-stream --format '{{json .}}'${target}`;
}

function buildDockerVolumeInspectCommand() {
  return [
    'volume_names=$(docker volume ls -q);',
    'if [ -z "$volume_names" ]; then',
    "  printf '[]';",
    'else',
    '  docker volume inspect $volume_names;',
    'fi',
  ].join(' ');
}

function buildComposeBaseCommand(filePath: string, projectName?: string) {
  const projectArg = projectName ? ` -p ${escapeShellArg(projectName)}` : '';
  return `docker compose -f ${escapeShellArg(filePath)}${projectArg}`;
}

function buildEnsureParentDirectoryCommand(path: string) {
  return `mkdir -p ${escapeShellArg(getDirectoryPath(path))}`;
}

async function executeDockerCommand(server: ServerConfig, command: string) {
  const sshService = getSSHService();
  return sshService.executeSSHCommand(server, command);
}

function normalizeDockerError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '未知错误');
  const normalized = message.toLowerCase();

  if (
    normalized.includes('session is down') ||
    normalized.includes('not connected') ||
    normalized.includes('channel is not opened')
  ) {
    return 'SSH 会话已断开，请重新连接服务器后再试。';
  }

  if (normalized.includes('permission denied') || normalized.includes('got permission denied')) {
    return '当前账户没有 Docker 操作权限，请确认已加入 docker 用户组或具备 sudo 权限。';
  }

  if (normalized.includes('command not found') || normalized.includes('docker: not found')) {
    return '当前服务器未安装 Docker，或 Docker 命令不在默认 PATH 中。';
  }

  if (normalized.includes('docker daemon') || normalized.includes('cannot connect')) {
    return 'Docker 服务当前不可用，请检查 Docker daemon 是否已启动。';
  }

  return message;
}

function createMockContainer(serverId: string, index: number): DockerContainer {
  const isRunning = index % 2 === 0;
  return {
    id: `${serverId}-container-${index}`,
    name: isRunning ? 'nginx-proxy' : 'redis-cache',
    image: isRunning ? 'nginx:1.27' : 'redis:7',
    command: isRunning ? 'nginx -g daemon off;' : 'redis-server',
    createdAt: '2026-03-31 09:00:00 +0800 CST',
    runningFor: isRunning ? '3 hours ago' : '4 hours ago',
    status: isRunning ? 'Up 3 hours' : 'Exited (0) 30 minutes ago',
    state: isRunning ? 'running' : 'exited',
    ports: isRunning ? '0.0.0.0:80->80/tcp' : '',
    cpuPercent: isRunning ? 1.8 : undefined,
    memoryUsage: isRunning ? '64.2MiB' : undefined,
    memoryLimit: isRunning ? '1.944GiB' : undefined,
    projectName: isRunning ? 'demo' : undefined,
    serviceName: isRunning ? 'web' : undefined,
  };
}

function createMockImages(): DockerImage[] {
  return [
    {
      id: 'sha256:mock-image-1',
      repository: 'nginx',
      tag: '1.27',
      reference: 'nginx:1.27',
      createdSince: '2 weeks ago',
      size: '187MB',
      digest: 'sha256:mock-digest-1',
    },
    {
      id: 'sha256:mock-image-2',
      repository: 'redis',
      tag: '7',
      reference: 'redis:7',
      createdSince: '5 days ago',
      size: '118MB',
      digest: 'sha256:mock-digest-2',
    },
  ];
}

function createMockVolumes(): DockerVolume[] {
  return [
    {
      name: 'demo_mysql_data',
      driver: 'local',
      mountpoint: '/var/lib/docker/volumes/demo_mysql_data/_data',
      createdAt: '2026-03-31T09:00:00Z',
      scope: 'local',
      projectName: 'demo',
    },
    {
      name: 'redis-cache',
      driver: 'local',
      mountpoint: '/var/lib/docker/volumes/redis-cache/_data',
      createdAt: '2026-03-31T10:00:00Z',
      scope: 'local',
    },
  ];
}

export function parseDockerContainerList(psOutput: string, statsOutput = ''): DockerContainer[] {
  const statsById = new Map(
    parseJsonCollection<Record<string, string>>(statsOutput).map((item) => [item.ID, item]),
  );

  return parseJsonCollection<Record<string, string>>(psOutput).map((item) => {
    const stats = statsById.get(item.ID);
    const labels = parseLabels(item.Labels);
    const memory = parseMemoryPair(stats?.MemUsage);

    return {
      id: item.ID ?? '',
      name: item.Names ?? item.Name ?? '',
      image: item.Image ?? '',
      command: item.Command ?? '',
      createdAt: item.CreatedAt ?? '',
      runningFor: item.RunningFor ?? item.CreatedSince ?? '',
      status: item.Status ?? '',
      state: normalizeContainerState(item.State ?? item.Status),
      ports: item.Ports ?? '',
      cpuPercent: parseCpuPercent(stats?.CPUPerc),
      memoryUsage: memory.memoryUsage,
      memoryLimit: memory.memoryLimit,
      projectName: labels['com.docker.compose.project'],
      serviceName: labels['com.docker.compose.service'],
    };
  });
}

export function parseDockerImageList(output: string): DockerImage[] {
  return parseJsonCollection<Record<string, string>>(output).map((item) => {
    const repository = item.Repository ?? '<none>';
    const tag = item.Tag ?? '<none>';
    const id = item.ID ?? '';
    const reference =
      repository !== '<none>' && tag !== '<none>' ? `${repository}:${tag}` : id;

    return {
      id,
      repository,
      tag,
      reference,
      createdSince: item.CreatedSince ?? '',
      size: item.Size ?? '',
      digest: item.Digest || undefined,
    };
  });
}

export function parseDockerVolumeList(output: string): DockerVolume[] {
  return parseJsonCollection<Record<string, unknown>>(output).map((item) => {
    const labels = (item.Labels ?? {}) as Record<string, string>;

    return {
      name: String(item.Name ?? ''),
      driver: String(item.Driver ?? ''),
      mountpoint: String(item.Mountpoint ?? ''),
      createdAt: String(item.CreatedAt ?? ''),
      scope: String(item.Scope ?? ''),
      projectName: labels['com.docker.compose.project'],
    };
  });
}

export function parseComposeProjects(
  lsOutput: string,
  discoveredFiles: string[],
): DockerComposeProject[] {
  const runtimeProjects = parseJsonCollection<Record<string, string>>(lsOutput).map((item) => ({
    name:
      item.Name ??
      item.name ??
      deriveComposeProjectName(normalizeComposeFilePaths(item.ConfigFiles ?? item.configFiles)[0] ?? ''),
    status: item.Status ?? item.status ?? 'unknown',
    configFiles: normalizeComposeFilePaths(item.ConfigFiles ?? item.configFiles),
    source: 'runtime' as const,
  }));
  const knownFiles = new Set(runtimeProjects.flatMap((item) => item.configFiles));
  const discoveredProjects = discoveredFiles
    .filter((filePath) => !knownFiles.has(filePath))
    .map((filePath) => ({
      name: deriveComposeProjectName(filePath),
      status: '未部署',
      configFiles: [filePath],
      source: 'discovered' as const,
    }));

  return [...runtimeProjects, ...discoveredProjects];
}

export function parseComposeConfig(
  filePath: string,
  configOutput: string,
  psOutput = '',
): DockerComposeDetails {
  const parsed = JSON.parse(configOutput) as {
    name?: string;
    services?: Record<string, Record<string, unknown>>;
  };
  const projectName = parsed.name ?? deriveComposeProjectName(filePath);
  const runtimeRows = parseJsonCollection<Record<string, unknown>>(psOutput);
  const services = Object.entries(parsed.services ?? {}).map(([name, service]) => {
    const containers = runtimeRows.filter(
      (item) => String(item.Service ?? item.service ?? '') === name,
    );

    return {
      name,
      image: typeof service.image === 'string' ? service.image : undefined,
      command: normalizeComposeCommand(service.command),
      ports: Array.isArray(service.ports)
        ? service.ports.map((item) => formatComposeServicePort(item)).filter(Boolean)
        : [],
      volumes: Array.isArray(service.volumes)
        ? service.volumes.map((item) => formatComposeServiceVolume(item)).filter(Boolean)
        : [],
      environmentCount: getEnvironmentCount(service.environment),
      containerCount: containers.length,
    } satisfies DockerComposeService;
  });

  const containers = runtimeRows.map((item) => ({
    id: String(item.ID ?? ''),
    name: String(item.Name ?? item.name ?? ''),
    image: String(item.Image ?? item.image ?? ''),
    command: '',
    createdAt: '',
    runningFor: '',
    status: String(item.Status ?? item.status ?? ''),
    state: normalizeContainerState(String(item.State ?? item.state ?? '')),
    ports: Array.isArray(item.Publishers)
      ? item.Publishers.map((publisher) => formatComposePublisher(publisher as Record<string, unknown>))
          .filter(Boolean)
          .join(', ')
      : '',
    cpuPercent: undefined,
    memoryUsage: undefined,
    memoryLimit: undefined,
    projectName,
    serviceName: String(item.Service ?? item.service ?? ''),
  }));

  return {
    filePath,
    projectName,
    services,
    containers,
  };
}

export function buildDockerRunCommand(input: DockerContainerCreateInput): string {
  const commandParts = ['docker run'];
  const detached = input.detached ?? true;

  if (detached) {
    commandParts.push('-d');
  }

  if (input.name?.trim()) {
    commandParts.push(`--name ${escapeShellArg(input.name.trim())}`);
  }

  if (input.restartPolicy?.trim()) {
    commandParts.push(`--restart ${escapeShellArg(input.restartPolicy.trim())}`);
  }

  if (input.network?.trim()) {
    commandParts.push(`--network ${escapeShellArg(input.network.trim())}`);
  }

  for (const port of input.ports ?? []) {
    if (port.trim()) {
      commandParts.push(`-p ${escapeShellArg(port.trim())}`);
    }
  }

  for (const volume of input.volumes ?? []) {
    if (volume.trim()) {
      commandParts.push(`-v ${escapeShellArg(volume.trim())}`);
    }
  }

  for (const env of input.env ?? []) {
    if (!env.key.trim()) {
      continue;
    }

    commandParts.push(`-e ${escapeShellArg(`${env.key.trim()}=${env.value}`)}`);
  }

  commandParts.push(escapeShellArg(input.image.trim()));

  if (input.command?.trim()) {
    commandParts.push(`sh -lc ${escapeShellArg(`exec ${input.command.trim()}`)}`);
  }

  return commandParts.join(' ');
}

export function buildDockerLogsCommand(
  containerId: string,
  options: DockerContainerLogsOptions = {},
): string {
  const commandParts = ['docker logs'];
  const tail = options.tail ?? 200;

  commandParts.push(`--tail ${Math.max(1, tail)}`);

  if (options.timestamps) {
    commandParts.push('--timestamps');
  }

  if (options.since?.trim()) {
    commandParts.push(`--since ${escapeShellArg(options.since.trim())}`);
  }

  commandParts.push(escapeShellArg(containerId));

  return `${commandParts.join(' ')} 2>&1 || true`;
}

export function buildDockerExecCommand(
  containerId: string,
  shell: DockerTerminalShell,
  customCommand?: string,
): string {
  if (shell === 'custom') {
    const command = customCommand?.trim();
    if (!command) {
      throw new Error('自定义终端命令不能为空。');
    }

    return `docker exec -it ${escapeShellArg(containerId)} sh -lc ${escapeShellArg(`exec ${command}`)}`;
  }

  return `docker exec -it ${escapeShellArg(containerId)} ${shell}`;
}

export async function getDockerDashboard(server: ServerConfig): Promise<DockerDashboard> {
  const sshService = getSSHService();

  if (server.dataSource !== 'ssh' || !sshService.isSSHAvailable()) {
    const containers = [createMockContainer(server.id, 0), createMockContainer(server.id, 1)];
    const images = createMockImages();
    const volumes = createMockVolumes();
    return {
      hasDocker: true,
      overview: {
        engineVersion: 'mock-28.0.0',
        containersRunning: containers.filter((item) => item.state === 'running').length,
        containersStopped: containers.filter((item) => item.state !== 'running').length,
        containersTotal: containers.length,
        imagesTotal: images.length,
        composeProjectsTotal: 1,
        volumesTotal: volumes.length,
      },
      containers,
      composeProjects: [
        {
          name: 'demo',
          status: 'running(1)',
          configFiles: ['/srv/demo/compose.yml'],
          source: 'runtime',
        },
      ],
      images,
      volumes,
    };
  }

  try {
    const versionOutput = await executeDockerCommand(
      server,
      "docker version --format '{{.Server.Version}}'",
    );
    const psOutput = await executeDockerCommand(server, buildDockerPsCommand());
    const statsOutput = await executeDockerCommand(server, buildDockerStatsCommand());
    const imagesOutput = await executeDockerCommand(server, "docker images --format '{{json .}}'");
    const volumesOutput = await executeDockerCommand(server, buildDockerVolumeInspectCommand());
    const discoveredFilesOutput = await executeDockerCommand(
      server,
      `find ${createComposeSearchRoots()} -maxdepth 4 -type f \\( -name 'compose.yml' -o -name 'compose.yaml' -o -name 'docker-compose.yml' -o -name 'docker-compose.yaml' \\) 2>/dev/null | sort -u | head -n 60`,
    );
    let composeLsOutput = '';

    try {
      composeLsOutput = await executeDockerCommand(server, 'docker compose ls --all --format json');
    } catch {
      composeLsOutput = '';
    }

    const containers = parseDockerContainerList(psOutput, statsOutput);
    const images = parseDockerImageList(imagesOutput);
    const volumes = parseDockerVolumeList(volumesOutput);
    const composeProjects = parseComposeProjects(
      composeLsOutput,
      discoveredFilesOutput
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
    );

    return {
      hasDocker: true,
      overview: {
        engineVersion: versionOutput.trim(),
        containersRunning: containers.filter((item) => item.state === 'running').length,
        containersStopped: containers.filter((item) => item.state !== 'running').length,
        containersTotal: containers.length,
        imagesTotal: images.length,
        composeProjectsTotal: composeProjects.length,
        volumesTotal: volumes.length,
      },
      containers,
      composeProjects,
      images,
      volumes,
    };
  } catch (error) {
    throw new Error(normalizeDockerError(error));
  }
}

export async function getDockerContainerDetails(
  server: ServerConfig,
  containerId: string,
): Promise<DockerContainerDetails> {
  try {
    const psOutput = await executeDockerCommand(server, buildDockerPsCommand(containerId));
    const statsOutput = await executeDockerCommand(server, buildDockerStatsCommand(containerId));
    const inspectOutput = await executeDockerCommand(server, `docker inspect ${escapeShellArg(containerId)}`);
    const base =
      parseDockerContainerList(psOutput, statsOutput)[0] ??
      ({
        id: containerId,
        name: containerId,
        image: '',
        command: '',
        createdAt: '',
        runningFor: '',
        status: '',
        state: 'unknown',
        ports: '',
      } satisfies DockerContainer);

    const inspect = parseJsonCollection<Record<string, unknown>>(inspectOutput)[0] ?? {};
    const environment = Array.isArray((inspect.Config as Record<string, unknown> | undefined)?.Env)
      ? ((inspect.Config as Record<string, unknown>).Env as string[]).map((item) => {
          const separatorIndex = item.indexOf('=');
          return {
            key: separatorIndex >= 0 ? item.slice(0, separatorIndex) : item,
            value: separatorIndex >= 0 ? item.slice(separatorIndex + 1) : '',
          } satisfies DockerEnvironmentVariable;
        })
      : [];
    const mounts = Array.isArray(inspect.Mounts)
      ? (inspect.Mounts as Array<Record<string, unknown>>).map((item) => ({
          source: String(item.Source ?? ''),
          destination: String(item.Destination ?? ''),
          mode: String(item.Mode ?? ''),
          readOnly: Boolean(item.RW === false),
        } satisfies DockerMountPoint))
      : [];
    const networks = inspect.NetworkSettings && typeof inspect.NetworkSettings === 'object'
      ? Object.entries(
          ((inspect.NetworkSettings as Record<string, unknown>).Networks ??
            {}) as Record<string, Record<string, unknown>>,
        ).map(([name, item]) => ({
          name,
          ipAddress: String(item.IPAddress ?? '') || undefined,
          gateway: String(item.Gateway ?? '') || undefined,
        } satisfies DockerNetworkAttachment))
      : [];
    const labels = Object.entries(
      (((inspect.Config as Record<string, unknown> | undefined)?.Labels as Record<string, string>) ??
        {}),
    ).map(([key, value]) => ({ key, value }));

    return {
      ...base,
      environment,
      mounts,
      networks,
      labels,
    };
  } catch (error) {
    throw new Error(normalizeDockerError(error));
  }
}

export async function getDockerContainerLogs(
  server: ServerConfig,
  containerId: string,
  options: DockerContainerLogsOptions = {},
): Promise<string> {
  try {
    const output = await executeDockerCommand(server, buildDockerLogsCommand(containerId, options));
    return output.trim();
  } catch (error) {
    throw new Error(normalizeDockerError(error));
  }
}

export async function inspectComposeFile(
  server: ServerConfig,
  filePath: string,
  projectName?: string,
): Promise<DockerComposeDetails> {
  try {
    const baseCommand = buildComposeBaseCommand(filePath, projectName);
    const configOutput = await executeDockerCommand(server, `${baseCommand} config --format json`);
    let psOutput = '';

    try {
      psOutput = await executeDockerCommand(server, `${baseCommand} ps --all --format json`);
    } catch {
      psOutput = '';
    }

    return parseComposeConfig(filePath, configOutput, psOutput);
  } catch (error) {
    throw new Error(normalizeDockerError(error));
  }
}

export async function runDockerContainerAction(
  server: ServerConfig,
  containerId: string,
  action: DockerContainerAction,
): Promise<void> {
  try {
    const command =
      action === 'delete'
        ? `docker rm -f ${escapeShellArg(containerId)}`
        : `docker ${action} ${escapeShellArg(containerId)}`;

    await executeDockerCommand(server, command);
  } catch (error) {
    throw new Error(normalizeDockerError(error));
  }
}

export async function createDockerContainer(
  server: ServerConfig,
  input: DockerContainerCreateInput,
): Promise<string> {
  try {
    const output = await executeDockerCommand(server, buildDockerRunCommand(input));
    return output.trim();
  } catch (error) {
    throw new Error(normalizeDockerError(error));
  }
}

export async function createDockerComposeProject(
  server: ServerConfig,
  input: DockerComposeCreateInput,
): Promise<void> {
  try {
    await executeDockerCommand(server, buildEnsureParentDirectoryCommand(input.filePath));
    const { saveRemoteEditableFile } = getFileEditorService();
    await saveRemoteEditableFile(server, input.filePath, input.content);

    if (input.autoStart) {
      await runDockerComposeAction(server, input.filePath, 'up', input.projectName);
    }
  } catch (error) {
    throw new Error(normalizeDockerError(error));
  }
}

export async function runDockerComposeAction(
  server: ServerConfig,
  filePath: string,
  action: DockerComposeAction,
  projectName?: string,
): Promise<void> {
  try {
    const baseCommand = buildComposeBaseCommand(filePath, projectName);
    const actionCommand =
      action === 'up'
        ? `${baseCommand} up -d`
        : action === 'stop'
          ? `${baseCommand} stop`
          : action === 'restart'
            ? `${baseCommand} restart`
            : `${baseCommand} down`;

    await executeDockerCommand(server, actionCommand);
  } catch (error) {
    throw new Error(normalizeDockerError(error));
  }
}

export async function runDockerImageAction(
  server: ServerConfig,
  image: DockerImage,
  action: DockerImageAction,
): Promise<void> {
  try {
    if (action === 'pull') {
      if (!image.reference || image.reference === image.id) {
        throw new Error('悬空镜像不支持拉取更新，请先确认镜像仓库和标签。');
      }

      await executeDockerCommand(server, `docker pull ${escapeShellArg(image.reference)}`);
      return;
    }

    await executeDockerCommand(server, `docker image rm -f ${escapeShellArg(image.id)}`);
  } catch (error) {
    throw new Error(normalizeDockerError(error));
  }
}

export async function runDockerVolumeAction(
  server: ServerConfig,
  volumeName: string,
  action: DockerVolumeAction,
): Promise<void> {
  try {
    if (action === 'delete') {
      await executeDockerCommand(server, `docker volume rm -f ${escapeShellArg(volumeName)}`);
    }
  } catch (error) {
    throw new Error(normalizeDockerError(error));
  }
}
