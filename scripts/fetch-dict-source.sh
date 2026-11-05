#!/bin/sh
# 下載 McBopomofo（MIT）詞庫原始檔到 data-src/，固定在指定 commit 以利重現。
set -eu
COMMIT="${MCBOPOMOFO_COMMIT:-26b6faaa0df5f4448b708121677cc9efab4d1cd6}"
BASE="https://raw.githubusercontent.com/openvanilla/McBopomofo/$COMMIT/Source/Data"
DEST="$(dirname "$0")/../data-src"
mkdir -p "$DEST"
for f in BPMFBase.txt BPMFMappings.txt phrase.occ heterophony1.list heterophony2.list heterophony3.list; do
  echo "下載 $f"
  curl -fsSL -o "$DEST/$f" "$BASE/$f"
done
echo "完成：$DEST"
