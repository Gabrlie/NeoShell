function normalizeFileBrowserPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === '.' || trimmed === './') {
    return '/';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const collapsed = withLeadingSlash.replace(/\/+/g, '/');
  if (collapsed.length > 1 && collapsed.endsWith('/')) {
    return collapsed.slice(0, -1);
  }

  return collapsed;
}

export function shouldInterceptFileBrowserBack(
  currentPath: string | undefined,
  isSSHFileBrowserReady: boolean,
  bypassNextRemove: boolean,
): boolean {
  if (!isSSHFileBrowserReady || bypassNextRemove || !currentPath) {
    return false;
  }

  return normalizeFileBrowserPath(currentPath) !== '/';
}
