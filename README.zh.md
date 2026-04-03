# NeoShell

NeoShell 是一款面向个人运维场景的移动端服务器管理工具。它通过 SSH 直连 Linux 服务器，将监控、终端、文件管理和 Docker 操作整合到同一个移动端界面中。

## 功能特性

- 实时监控 CPU、内存、磁盘、网络和 I/O
- 基于 `xterm.js` 的交互式 SSH 终端
- 支持上传、下载、编辑、压缩与解压的 SFTP 文件管理
- Docker 工作台，支持容器、Compose、镜像、存储卷与日志管理
- 支持应用锁、生物识别优先验证与私钥管理
- 支持明暗主题和终端外观自定义

## 预览

| 首页 | 监控详情 | 终端 |
| --- | --- | --- |
| <img src="./docs/screenshots/home.jpg" alt="首页" width="220" /> | <img src="./docs/screenshots/monitor-detail.jpg" alt="监控详情" width="220" /> | <img src="./docs/screenshots/terminal.jpg" alt="终端" width="220" /> |

| 文件管理 | Docker | 设置 |
| --- | --- | --- |
| <img src="./docs/screenshots/files.jpg" alt="文件管理" width="220" /> | <img src="./docs/screenshots/docker.jpg" alt="Docker" width="220" /> | <img src="./docs/screenshots/settings.jpg" alt="设置" width="220" /> |

## 技术栈

- Expo SDK 55
- React Native 0.83
- TypeScript
- Expo Router
- Zustand
- `@dylankenneally/react-native-ssh-sftp`
- `react-native-webview`
- `react-native-svg`

## 项目结构

```text
NeoShell/
├── app/              # Expo Router 页面
├── assets/           # 图片、图标与字体资源
├── components/       # 可复用组件
├── hooks/            # 共享 Hooks
├── services/         # SSH、SFTP、监控、Docker 等服务层
├── stores/           # Zustand 状态管理
├── theme/            # 主题与设计 Token
├── types/            # TypeScript 类型定义
├── LICENSE
├── README.md
└── README.zh.md
```

## 未来开发计划

- [ ] 监控详情页小工具
- [ ] 文件与文件夹权限管理
- [ ] 终端后台常驻
- [ ] 终端完整键盘
- [ ] Docker 镜像更新检测
- [ ] Docker 镜像构建
- [ ] 更多主题与字体
- [ ] 导入与导出
- [ ] WebDAV 备份配置

## 社区

学 AI，上 L 站 — [LinuxDO](https://linux.do/)

## 开始使用

### 环境要求

- Node.js 20 及以上
- npm
- Android Studio（本地 Android 构建时）
- Expo / EAS 开发环境

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run start
```

### 启动 Dev Client

```bash
npm run start:dev-client
```

### 本地运行 Android

```bash
npm run android
```

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run start` | 启动 Expo 开发服务器 |
| `npm run start:dev-client` | 以 Dev Client 模式启动 |
| `npm run android` | 本地运行 Android |
| `npm run build:android:development` | 发起 Android development 云构建 |
| `npm run build:android:preview` | 发起 Android preview 云构建 |
| `npm test` | 运行 Vitest 测试 |

## 许可证

本项目基于 MIT License 发布，详细条款见 [LICENSE](./LICENSE)。
