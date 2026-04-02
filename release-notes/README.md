# 发布说明目录

这个目录用于维护 NeoShell 的正式版本说明和热更新说明，供 GitHub Actions 自动发布时读取。

## 正式版本

- 文件命名：`release-notes/vX.Y.Z.md`
- 例如：`release-notes/v1.0.0.md`
- 当你推送 `v1.0.0` 这样的 Git tag 时，工作流会自动读取同名说明文件创建 GitHub Release

## 热更新

- 目录建议：`release-notes/ota/<base_version>/`
- 文件示例：`release-notes/ota/1.0.0/fix-terminal-copy.md`
- 热更新通过 GitHub Actions 手动触发，并读取你指定的说明文件追加到 `updates-manifest.json`

## 建议格式

```md
# 标题

- 更新项一
- 更新项二
- 更新项三
```
