import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

import type { UpdateManifest, UpdateTimelineAsset, UpdateTimelineEntry } from '@/types';
import { APP_UPDATES_MANIFEST_URL } from './appMetadata';

type UpdatesModuleShape = typeof Updates & {
  channel?: string;
  runtimeVersion?: string | null;
  updateId?: string | null;
  isEmbeddedLaunch?: boolean;
};

const UPDATES = Updates as UpdatesModuleShape;
const MANIFEST_FETCH_TIMEOUT_MS = 10_000;

export interface AppUpdateContext {
  currentVersion: string;
  runtimeVersion: string;
  channel: string;
  isEnabled: boolean;
  isEmbeddedLaunch: boolean;
  updateId: string | null;
  manifestUrl: string;
}

export type AppUpdateAvailability = 'available' | 'none' | 'unsupported' | 'error';

export interface AppUpdateCheckResult {
  availability: AppUpdateAvailability;
  isUpdateAvailable: boolean;
  reason?: string;
}

export interface AppUpdateFetchResult {
  applied: boolean;
  reason?: string;
}

export function createEmptyUpdateManifest(): UpdateManifest {
  return {
    version: 1,
    generatedAt: '',
    sourceUrl: APP_UPDATES_MANIFEST_URL,
    entries: [],
  };
}

export function getCurrentAppUpdateContext(): AppUpdateContext {
  const currentVersion = Constants.expoConfig?.version ?? '1.0.0';
  const runtimeVersion = UPDATES.runtimeVersion?.trim() || currentVersion;

  return {
    currentVersion,
    runtimeVersion,
    channel: UPDATES.channel?.trim() || 'production',
    isEnabled: !__DEV__ && Updates.isEnabled,
    isEmbeddedLaunch: Boolean(UPDATES.isEmbeddedLaunch),
    updateId: UPDATES.updateId ?? null,
    manifestUrl: APP_UPDATES_MANIFEST_URL,
  };
}

export async function loadPublicUpdateManifest(fetchImpl: typeof fetch = fetch): Promise<UpdateManifest> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MANIFEST_FETCH_TIMEOUT_MS);

  try {
    const response = await fetchImpl(APP_UPDATES_MANIFEST_URL, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return createEmptyUpdateManifest();
    }

    const payload = (await response.json()) as unknown;
    return normalizeUpdateManifest(payload);
  } catch {
    return createEmptyUpdateManifest();
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkForAvailableAppUpdate(): Promise<AppUpdateCheckResult> {
  const context = getCurrentAppUpdateContext();

  if (!context.isEnabled) {
    return {
      availability: 'unsupported',
      isUpdateAvailable: false,
      reason: '当前构建不支持应用内热更新，请使用正式发布构建后再检查更新。',
    };
  }

  try {
    const result = await Updates.checkForUpdateAsync();
    return {
      availability: result.isAvailable ? 'available' : 'none',
      isUpdateAvailable: result.isAvailable,
    };
  } catch (error) {
    return {
      availability: 'error',
      isUpdateAvailable: false,
      reason: error instanceof Error ? error.message : '检查更新失败，请稍后重试。',
    };
  }
}

export async function fetchAndReloadAppUpdate(): Promise<AppUpdateFetchResult> {
  const context = getCurrentAppUpdateContext();

  if (!context.isEnabled) {
    return {
      applied: false,
      reason: '当前构建不支持应用内热更新。',
    };
  }

  try {
    const result = await Updates.fetchUpdateAsync();

    if (!result.isNew) {
      return {
        applied: false,
        reason: '当前已经是最新版本，无需重启。',
      };
    }

    await Updates.reloadAsync();
    return { applied: true };
  } catch (error) {
    return {
      applied: false,
      reason: error instanceof Error ? error.message : '下载更新失败，请稍后重试。',
    };
  }
}

export function getLatestCompatibleUpdateEntry(
  manifest: UpdateManifest,
  runtimeVersion: string
): UpdateTimelineEntry | null {
  return manifest.entries.find((entry) => entry.runtimeVersion === runtimeVersion) ?? null;
}

function normalizeUpdateManifest(input: unknown): UpdateManifest {
  if (!isRecord(input)) {
    return createEmptyUpdateManifest();
  }

  const entries = Array.isArray(input.entries)
    ? input.entries
        .map((entry) => normalizeUpdateTimelineEntry(entry))
        .filter((entry): entry is UpdateTimelineEntry => entry !== null)
        .sort(compareUpdateTimelineEntries)
    : [];

  return {
    version: 1,
    generatedAt: readString(input.generatedAt),
    sourceUrl: readString(input.sourceUrl) || APP_UPDATES_MANIFEST_URL,
    entries,
  };
}

function normalizeUpdateTimelineEntry(input: unknown): UpdateTimelineEntry | null {
  if (!isRecord(input)) {
    return null;
  }

  const type = readString(input.type);
  if (type !== 'release' && type !== 'ota') {
    return null;
  }

  const id = readString(input.id);
  const title = readString(input.title);
  const version = readString(input.version);
  const runtimeVersion = readString(input.runtimeVersion);
  const publishedAt = readString(input.publishedAt);
  const notes = readString(input.notes);

  if (!id || !title || !version || !runtimeVersion || !publishedAt) {
    return null;
  }

  return {
    id,
    type,
    title,
    version,
    runtimeVersion,
    publishedAt,
    notes,
    channel: readString(input.channel) || undefined,
    tag: readString(input.tag) || undefined,
    releaseUrl: readString(input.releaseUrl) || undefined,
    updateGroupId: readString(input.updateGroupId) || undefined,
    dashboardUrl: readString(input.dashboardUrl) || undefined,
    assets: normalizeUpdateAssets(input.assets),
  };
}

function normalizeUpdateAssets(input: unknown): UpdateTimelineAsset[] | undefined {
  if (!Array.isArray(input)) {
    return undefined;
  }

  const assets = input.reduce<UpdateTimelineAsset[]>((collection, item) => {
      if (!isRecord(item)) {
        return collection;
      }

      const kind = readString(item.kind);
      if (kind !== 'apk' && kind !== 'aab') {
        return collection;
      }

      const name = readString(item.name);
      const url = readString(item.url);
      if (!name || !url) {
        return collection;
      }

      collection.push({
        kind,
        name,
        url,
        sizeBytes: readNumber(item.sizeBytes),
        sha256: readString(item.sha256) || undefined,
      });

      return collection;
    }, []);

  return assets.length > 0 ? assets : undefined;
}

function compareUpdateTimelineEntries(a: UpdateTimelineEntry, b: UpdateTimelineEntry): number {
  return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
