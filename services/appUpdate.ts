export type UpdateMirrorSourceKey = 'github' | 'custom';

export interface UpdateMirrorSource {
  key: UpdateMirrorSourceKey;
  label: string;
  releasesApiBaseUrl: string;
  releaseDownloadBaseUrl: string;
}

export interface UpdateCheckOptions {
  currentVersion: string;
  mirrorSourceKey?: UpdateMirrorSourceKey | string;
  customApiBaseUrl?: string;
  customDownloadBaseUrl?: string;
}

export interface UpdateCheckResult {
  currentVersion: string;
  latestReleaseUrl: string;
  releaseMetadataUrl: string;
  mirrorSource: UpdateMirrorSource;
}

const DEFAULT_REPOSITORY_OWNER = 'gabrlie';
const DEFAULT_REPOSITORY_NAME = 'neoshell';

const BUILTIN_UPDATE_MIRRORS: UpdateMirrorSource[] = [
  {
    key: 'github',
    label: 'GitHub Releases',
    releasesApiBaseUrl: `https://api.github.com/repos/${DEFAULT_REPOSITORY_OWNER}/${DEFAULT_REPOSITORY_NAME}/releases`,
    releaseDownloadBaseUrl: `https://github.com/${DEFAULT_REPOSITORY_OWNER}/${DEFAULT_REPOSITORY_NAME}/releases/download`,
  },
  {
    key: 'custom',
    label: '自定义镜像源',
    releasesApiBaseUrl: '',
    releaseDownloadBaseUrl: '',
  },
];

export function listUpdateMirrorSources(): UpdateMirrorSource[] {
  return BUILTIN_UPDATE_MIRRORS;
}

export function normalizeUpdateMirrorSourceKey(key?: string): UpdateMirrorSourceKey {
  if (key === 'custom') {
    return 'custom';
  }

  return 'github';
}

export function getDefaultUpdateMirrorSource(): UpdateMirrorSource {
  return BUILTIN_UPDATE_MIRRORS[0];
}

export function resolveUpdateMirrorSource(options?: {
  key?: UpdateMirrorSourceKey | string;
  customApiBaseUrl?: string;
  customDownloadBaseUrl?: string;
}): UpdateMirrorSource {
  const normalizedKey = normalizeUpdateMirrorSourceKey(options?.key);

  if (normalizedKey === 'custom') {
    return {
      key: 'custom',
      label: '自定义镜像源',
      releasesApiBaseUrl: options?.customApiBaseUrl?.trim() ?? '',
      releaseDownloadBaseUrl: options?.customDownloadBaseUrl?.trim() ?? '',
    };
  }

  return getDefaultUpdateMirrorSource();
}

export function buildLatestReleaseMetadataUrl(options?: {
  key?: UpdateMirrorSourceKey | string;
  customApiBaseUrl?: string;
}): string {
  const source = resolveUpdateMirrorSource({
    key: options?.key,
    customApiBaseUrl: options?.customApiBaseUrl,
  });

  if (!source.releasesApiBaseUrl) {
    return '';
  }

  return `${source.releasesApiBaseUrl}/latest`;
}

export function buildReleaseAssetDownloadUrl(input: {
  tag: string;
  assetName: string;
  key?: UpdateMirrorSourceKey | string;
  customDownloadBaseUrl?: string;
}): string {
  const source = resolveUpdateMirrorSource({
    key: input.key,
    customDownloadBaseUrl: input.customDownloadBaseUrl,
  });

  if (!source.releaseDownloadBaseUrl) {
    return '';
  }

  return `${source.releaseDownloadBaseUrl}/${encodeURIComponent(input.tag)}/${encodeURIComponent(input.assetName)}`;
}

export async function checkForAppUpdate(options: UpdateCheckOptions): Promise<UpdateCheckResult> {
  const mirrorSource = resolveUpdateMirrorSource({
    key: options.mirrorSourceKey,
    customApiBaseUrl: options.customApiBaseUrl,
    customDownloadBaseUrl: options.customDownloadBaseUrl,
  });

  return {
    currentVersion: options.currentVersion,
    latestReleaseUrl: mirrorSource.releaseDownloadBaseUrl,
    releaseMetadataUrl: buildLatestReleaseMetadataUrl({
      key: mirrorSource.key,
      customApiBaseUrl: mirrorSource.releasesApiBaseUrl,
    }),
    mirrorSource,
  };
}
