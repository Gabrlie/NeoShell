# 热更新说明目录

请在对应基线版本目录下创建热更新说明文件，例如：

- `release-notes/ota/1.0.0/fix-login.md`
- `release-notes/ota/1.0.0/fix-terminal-theme.md`

随后在 GitHub Actions 的 `Publish OTA Update` 工作流中填写：

- `base_version`: `1.0.0`
- `notes_file`: 具体文件路径
- `title`: 可选，自定义热更新标题
