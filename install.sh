#!/usr/bin/env bash
# Paperclip 简体中文汉化 —— 一键安装 (macOS / Linux)
# 用法: ./install.sh /path/to/paperclip
set -euo pipefail

REPO="${1:-}"
if [ -z "$REPO" ]; then
  echo "用法: ./install.sh /path/to/paperclip"
  exit 1
fi
if [ ! -d "$REPO/ui/src" ]; then
  echo "错误: $REPO 下未找到 ui/src，请确认是 Paperclip 仓库根目录。"
  exit 1
fi

PKG_DIR="$(cd "$(dirname "$0")" && pwd)"
FILES="$PKG_DIR/files"
BACKUP="$REPO/paperclip-zh-cn-backup"

echo "==> 目标仓库: $REPO"
mkdir -p "$BACKUP"

# 1) 备份将被覆盖/删除的文件
echo "==> 备份原文件到 $BACKUP"
while IFS= read -r rel; do
  [ -z "$rel" ] && continue
  src="$REPO/$rel"
  if [ -f "$src" ]; then
    dst="$BACKUP/$rel"
    mkdir -p "$(dirname "$dst")"
    cp -f "$src" "$dst"
  fi
done < <(cd "$FILES" && find . -type f -print | sed 's#^\./##')

# 2) 删除官方多余语言包
echo "==> 删除多余语言包（仅保留 en / zh-CN / zh-TW）"
while IFS= read -r loc; do
  [ -z "$loc" ] && continue
  rm -f "$REPO/ui/src/i18n/locales/$loc"
done < "$PKG_DIR/locales-to-remove.txt"

# 3) 覆盖汉化文件
echo "==> 覆盖汉化文件"
(cd "$FILES" && find . -type f -print | sed 's#^\./##') | while IFS= read -r rel; do
  dst="$REPO/$rel"
  mkdir -p "$(dirname "$dst")"
  cp -f "$FILES/$rel" "$dst"
done

# 4) 默认语言
echo "==> 设置默认语言 zh-CN (ui/.env.local)"
cp -f "$PKG_DIR/env.local.template" "$REPO/ui/.env.local"

echo ""
echo "✅ 汉化完成！在仓库根目录运行:  pnpm dev"
echo "   回滚：将 $BACKUP 内容拷回 ui/src，并删除 ui/.env.local"
