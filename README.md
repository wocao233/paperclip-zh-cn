# Paperclip 简体中文汉化包 🇨🇳

让 [paperclipai/paperclip](https://github.com/paperclipai/paperclip) 的 Web 界面**一键切换为完整简体中文**。

- 复用官方多语言 i18n 基础设施，补齐并校正 **zh-CN** 全量文案（约 6400 条 key）。
- 默认即简体中文，侧栏账户菜单仍可切换其它语言。
- 覆盖 Web 界面全部主要页面：任务、代理、技能、项目/工作区、密钥、聊天/应用、例行、设置（含实验功能、适配器、插件、工具访问、公司导入）、审计/成本、协调器、收件箱等。

> 说明：本包为**覆盖式补丁**（overlay），作用于官方仓库 `ui/src` 目录，不修改后端逻辑。汉化资源来自官方多语言语言包的超集并做了大量补充翻译。

---

## 前置要求

- 已按官方说明装好依赖并能 `pnpm dev` 运行 Paperclip（Node ≥ 22、pnpm、Windows 上建议把仓库放在**不含中文/空格**的路径）。
- 目标版本：与本补丁生成时的官方 `master` 尽量接近。若官方 UI 改动较大，个别文件覆盖可能产生差异，请参照下方"手动核对"。

## 一键使用

### Windows (PowerShell)
```powershell
# 在 Paperclip 仓库根目录执行（或把 -Repo 指向它）
.\install.ps1 -Repo "C:\path\to\paperclip"
```

### macOS / Linux
```bash
./install.sh /path/to/paperclip
```

脚本会：
1. 备份目标仓库原有 `ui/src` 中将被覆盖的文件到 `paperclip-zh-cn-backup/`；
2. 删除官方多余语言包（仅保留 en / zh-CN / zh-TW，避免语言包校验失配导致启动报错）；
3. 用本包 `files/ui/src/...` 覆盖对应文件；
4. 写入 `ui/.env.local` 使默认语言为 `zh-CN`。

完成后在仓库根目录运行 `pnpm dev`，打开界面即为简体中文。

## 卸载 / 回滚
把 `paperclip-zh-cn-backup/` 里的内容按原路径拷回 `ui/src`，并删除 `ui/.env.local`（若原本没有）即可。

## 手动核对 / 可选步骤
- 本包不改后端。若你的环境在 Windows 上启动 Paperclip 遇到 native runner / db 迁移相关问题，那是**运行环境**问题，非本汉化包范围，请参考官方 issue。
- 若 `git status` 显示大量行尾差异，可在仓库设 `git config core.autocrlf false`。

## 目录结构
```
paperclip-zh-cn/
├─ install.ps1            # Windows 一键脚本
├─ install.sh             # Unix 一键脚本
├─ locales-to-remove.txt  # 需删除的官方多余语言包清单
├─ env.local.template     # ui/.env.local 内容模板
├─ files/ui/src/...       # 汉化后的源文件（覆盖用）
└─ README.md
```

## 致谢
- 基础多语言框架与部分语言包来自官方仓库及其社区贡献者。
- 简体中文补充与校正由本汉化包维护。

## 许可
与上游 Paperclip 保持一致（见其仓库 LICENSE）。
