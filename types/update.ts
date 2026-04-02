export type UpdateEntryType = 'release' | 'ota';

export type UpdateAssetKind = 'apk' | 'aab';

export interface UpdateTimelineAsset {
  kind: UpdateAssetKind;
  name: string;
  url: string;
  sizeBytes?: number;
  sha256?: string;
}

export interface UpdateTimelineEntry {
  id: string;
  type: UpdateEntryType;
  title: string;
  version: string;
  runtimeVersion: string;
  publishedAt: string;
  notes: string;
  channel?: string;
  tag?: string;
  releaseUrl?: string;
  updateGroupId?: string;
  dashboardUrl?: string;
  assets?: UpdateTimelineAsset[];
}

export interface UpdateManifest {
  version: 1;
  generatedAt: string;
  sourceUrl: string;
  entries: UpdateTimelineEntry[];
}

