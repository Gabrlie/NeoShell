export const APP_NAME = 'NeoShell';
export const APP_TAGLINE = '移动端服务器监控与管理工具';
export const APP_AUTHOR_NAME = 'Gabrlie';
export const APP_AUTHOR_GITHUB_URL = 'https://github.com/Gabrlie';
export const APP_AUTHOR_GRAVATAR_URL =
  'https://www.gravatar.com/avatar/d37334124f03eecbde02f27fd4bea109?s=256&d=identicon';
export const APP_REPOSITORY_URL = 'https://github.com/gabrlie/neoshell';
export const APP_DEFAULT_BRANCH = 'master';
export const APP_RELEASES_URL = `${APP_REPOSITORY_URL}/releases`;
export const APP_UPDATES_MANIFEST_URL =
  'https://raw.githubusercontent.com/gabrlie/neoshell/master/updates-manifest.json';
export const APP_LICENSE_NAME = 'MIT License';
export const APP_LICENSE_SUMMARY = '允许商业和非商业使用、修改、分发与私有部署，但需保留原始版权与许可证声明。';

export const TECH_STACK = [
  { label: '框架', value: 'Expo SDK 55' },
  { label: '语言', value: 'TypeScript (strict)' },
  { label: '路由', value: 'Expo Router v4' },
  { label: '状态管理', value: 'Zustand' },
  { label: 'SSH/SFTP', value: 'react-native-ssh-sftp' },
  { label: '终端', value: 'xterm.js + WebView' },
  { label: '图表', value: 'react-native-svg' },
] as const;
