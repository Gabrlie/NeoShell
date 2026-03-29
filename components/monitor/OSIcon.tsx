import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import type { OSType } from '@/types';
import { getOSVisualMeta, type OSVisualMeta } from '@/services/monitorMappers';

interface OSIconProps {
  os?: OSType;
  meta?: OSVisualMeta;
  size: number;
  color: string;
}

export function OSIcon({ os, meta, size, color }: OSIconProps) {
  const icon = meta ?? getOSVisualMeta(os);

  if (icon.family === 'material-community') {
    return <MaterialCommunityIcons name={icon.name as any} size={size} color={color} />;
  }

  return <Ionicons name={icon.name as any} size={size} color={color} />;
}
