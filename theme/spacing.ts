/**
 * NeoShell 间距系统
 * 基于 4px 网格
 */

export const Spacing = {
  /** 4px - 图标和文字间距 */
  xs: 4,
  /** 8px - 组件内部间距 */
  sm: 8,
  /** 12px - 组件间间距 */
  md: 12,
  /** 16px - 区块间距 */
  lg: 16,
  /** 24px - 大区块间距 */
  xl: 24,
  /** 32px - 页面边距 */
  xxl: 32,
} as const;

export const BorderRadius = {
  /** 6px - 按钮、输入框 */
  sm: 6,
  /** 10px - 卡片 */
  md: 10,
  /** 16px - 弹窗/底部面板 */
  lg: 16,
  /** 9999px - 圆形 */
  full: 9999,
} as const;
