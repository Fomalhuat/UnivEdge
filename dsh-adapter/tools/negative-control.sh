#!/usr/bin/env bash
# 负控门（R7 第十七轮 S0-1 → 用户 2026-10-12 批准）：
#   对注册在 dsh-adapter/negative-controls.txt 的**判据脚本**施加"破坏式"，
#   要求 ① 原样运行必须成功；② 破坏后运行**必须失败**。
#   ②不成立 ⇒ 该判据"不会响"（结构上不可能失败）→ 门失败。
# 用法：bash dsh-adapter/tools/negative-control.sh [--list]
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
REG="$HERE/../negative-controls.txt"
pass=0; fail=0
[ -f "$REG" ] || { echo "✖ 缺少注册表：$REG" >&2; exit 2; }
while IFS='|' read -r name target mutant; do
  case "$name" in ''|\#*) continue ;; esac
  # 去首尾空白**不能**用 xargs：它会吃掉反斜杠，把 sed 表达式里的 \[ 变成 [（初版即因此报"sed 无效"）
  trim() { printf '%s' "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'; }
  name="$(trim "$name")"; target="$(trim "$target")"; mutant="$(trim "$mutant")"
  # 目标路径前加 `?` = 可选（不存在则 SKIP 而非失败）：用于登记在 gitignore 目录（run/）下的任务级判据，
  # 否则干净检出会因"目标不存在"整套失败（R7 第十八轮 S1-4）。版本库内的判据一律**不加** `?`。
  optional=0
  case "$target" in \?*) optional=1; target="${target#?}" ;; esac
  case "$target" in /*) tgt="$target" ;; *) tgt="$ROOT/$target" ;; esac
  if [ ! -f "$tgt" ]; then
    if [ "$optional" = "1" ]; then echo "⏭  $name：可选目标不在场（$target）→ SKIP"; continue; fi
    echo "❌ $name：目标不存在 $target"; fail=$((fail+1)); continue
  fi
  # 解释器按扩展名选择（修：初版把路径当命令 eval，导致"原样运行即失败"）
  case "$tgt" in
    *.py) RUN=(python3 "$tgt") ;;
    *.sh) RUN=(bash "$tgt") ;;
    *)    RUN=("$tgt") ;;
  esac
  # ① 原样须成功
  if ! out1="$(cd "$ROOT" && "${RUN[@]}" 2>&1)"; then
    echo "❌ $name：原样运行即失败（无法作为判据基线）"; fail=$((fail+1)); continue
  fi
  # ② 破坏后须失败
  tmp="$(mktemp)"; sed -e "$mutant" "$tgt" > "$tmp"
  if cmp -s "$tgt" "$tmp"; then
    echo "❌ $name：破坏式未命中（sed 无效）→ 门本身不可信"; fail=$((fail+1)); rm -f "$tmp"; continue
  fi
  if (cd "$ROOT" && python3 "$tmp" >/dev/null 2>&1); then
    echo "❌ $name：破坏后仍报成功 ⇒ 判据不会响"; fail=$((fail+1))
  else
    echo "✅ $name：破坏式被判定失败（判据会响）"; pass=$((pass+1))
  fi
  rm -f "$tmp"
done < "$REG"
printf '\n**%d/%d 通过, %d 失败**\n' "$pass" "$((pass+fail))" "$fail"
exit $([ "$fail" -eq 0 ] && echo 0 || echo 1)
