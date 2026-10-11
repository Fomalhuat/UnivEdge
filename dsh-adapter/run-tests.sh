#!/usr/bin/env bash
# UnivEdge × dsh 适配层测试入口（**唯一推荐入口**——不必记 tsx / tsconfig 参数）
#
# 用法：
#   bash dsh-adapter/run-tests.sh                    # 跑全部四套，证据写入 test-results/
#   bash dsh-adapter/run-tests.sh --update-l1-baseline   # L1 内容有变时刷新基线（见下）
#   bash dsh-adapter/run-tests.sh --dsh /path/to/deepseek-harness
#   bash dsh-adapter/run-tests.sh --date 2026-10-10   # 指定证据文件名前缀（默认沿用现有文件）
#
# 何时必须跑（内核维护要求，见 docs/08 §7 与 dsh-adapter/README.md）：
#   L1 注入面 = ① METHODOLOGY.md §0–§1 + ② knowledge/review-lessons.md 的 `## 基层` 段
#              + ③ **univedge-l1-inject.ts 内的确认纪律块（CONFIRM_DISCIPLINE）**——三者任一改动后，
#   必须重跑：① 义务不变量测试（第 H 组会比对 L1 内容指纹与基线）；② 刷新证据文件。
#   若 L1 内容确有变化 → 加 `--update-l1-baseline` 刷新 `test-results/l1-baseline.json`。
#
# 为什么基线要单独刷新：`tests/l1-invariants.ts` 第 H 组以 **L1 文本本身**（而非输入整文）的 sha256 为基线，
#   L1 变化而基线未刷新时该测试会**失败**——这是刻意的：防止"证据描述的是旧代码状态"（S1-1 类缺陷）。
set -uo pipefail

SUITES=(l1-seat l1-invariants reviewer-deliverable reviewer-decision-gates)
UPDATE_BASELINE=0
DSH_DIR="${DSH_ADAPTER_DSH:-}"
DATE_PREFIX=""

while [ $# -gt 0 ]; do
  case "$1" in
    --update-l1-baseline) UPDATE_BASELINE=1 ;;
    --dsh) shift; DSH_DIR="${1:-}" ;;
    --date) shift; DATE_PREFIX="${1:-}" ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "未知参数：$1（-h 查看用法）" >&2; exit 2 ;;
  esac
  shift
done

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"     # dsh-adapter/
ROOT="$(cd "$HERE/.." && pwd)"                            # UnivEdge 仓库根
cd "$HERE" || exit 1

# ---- 定位 dsh checkout（避免把本机路径写死）----
if [ -z "$DSH_DIR" ]; then
  for cand in "$HOME/deepseek-harness" /data/home/*/deepseek-harness /opt/deepseek-harness "$ROOT/../deepseek-harness"; do
    [ -x "$cand/node_modules/.bin/tsx" ] && { DSH_DIR="$cand"; break; }
  done
fi
if [ -z "$DSH_DIR" ] || [ ! -x "$DSH_DIR/node_modules/.bin/tsx" ]; then
  cat >&2 <<'EOM'
✖ 找不到 dsh checkout（需要其中的 node_modules/.bin/tsx 与 tsconfig.json）。
  请用 --dsh <path> 指定，或设环境变量 DSH_ADAPTER_DSH=<path>。
  常见位置：~/deepseek-harness、/data/home/<user>/deepseek-harness。
EOM
  exit 2
fi
TSX="$DSH_DIR/node_modules/.bin/tsx"
TS_CONFIG="$DSH_DIR/tsconfig.json"

# ---- 证据文件名前缀：默认沿用已存在的同名证据（保持同一任务的证据文件名稳定，避免跨天产生重复件）----
if [ -z "$DATE_PREFIX" ]; then
  existing=$(ls test-results/*-l1-seat.md 2>/dev/null | head -2)
  n=$(printf '%s\n' "$existing" | grep -c . || true)
  if [ "$n" = "1" ]; then
    DATE_PREFIX="$(basename "$existing" | sed 's/-l1-seat\.md$//')"
  elif [ "$n" -gt 1 ]; then
    echo "✖ 存在多份 l1-seat 证据：$existing" >&2
    echo "  请用 --date YYYY-MM-DD 指定要刷新哪一份。" >&2
    exit 2
  else
    DATE_PREFIX="$(date +%F)"
  fi
fi
echo "▸ dsh checkout : $DSH_DIR"
echo "▸ 证据前缀     : $DATE_PREFIX"
[ "$UPDATE_BASELINE" = "1" ] && echo "▸ L1 基线      : 将刷新（UNIVEDGE_UPDATE_L1_BASELINE=1）"
echo

# ---- 文档计数一致性（同类缺陷已复发三次：README 的用例数落后于代码 → 一道轻量检查） ----
# 判据：README 的测试表里必须能找到本轮各套件的 "<N>/<N> 通过" 字样（不匹配即提示更新 README）。
count_mismatch=""
for suite in "${SUITES[@]}"; do
  cnt=$(grep -o '[0-9]*/[0-9]* 通过' "test-results/${DATE_PREFIX}-${suite}.md" 2>/dev/null | tail -1)
  [ -z "$cnt" ] && continue
  grep -qF "$cnt" README.md 2>/dev/null || count_mismatch="$count_mismatch ${suite}(${cnt})"
done
if [ -n "$count_mismatch" ]; then
  echo "⚠ 文档计数可能落后（README 中未找到：$count_mismatch）——请同步 dsh-adapter/README.md 的测试表。"
  echo "   依据：'文档计数落后于代码'同类缺陷已复发三次（R7 第八轮 S1-1）。"
  echo
fi

# ---- 契约提醒（R7 第八轮 S1-2：同一缺陷已第三次复发 → 按 §1.5 用门控而非教训库拦） ----
# 判据：内核邻近文件有未提交改动，而 run/ 下**没有任何**契约比这些改动更新 → 提示先落契约（§1.2）。
# 取"内核邻近的**源码类**改动"：限定路径 + 排除证据目录（test-results/ 常被重跑，且重命名项会带旧 mtime）。
dirty="$(cd "$ROOT" && { git diff --name-only -- METHODOLOGY.md VERIFICATION.md AGENTS.md knowledge dsh-adapter docs 2>/dev/null; \
  git diff --cached --name-only -- METHODOLOGY.md VERIFICATION.md AGENTS.md knowledge dsh-adapter docs 2>/dev/null; } \
  | sort -u | grep -v '^dsh-adapter/test-results/' | head -20)"
if [ -n "$dirty" ]; then
  # 以"最近的契约 mtime 是否晚于最新的脏文件 mtime"为准；取不到脏文件 mtime 时退化为"是否存在契约"
  # 用**最旧**的脏文件近似"本轮工作起点"：只要契约比它新，就说明本轮已落过契约 → 静默。
  # （用最新脏文件会几乎每次活跃编辑都响，噪声过大。）
  oldest_dirty=""
  for f in $dirty; do
    [ -f "$ROOT/$f" ] || continue
    if [ -z "$oldest_dirty" ] || [ "$ROOT/$f" -ot "$oldest_dirty" ]; then oldest_dirty="$ROOT/$f"; fi
  done
  has_fresh_contract=0
  for c in "$ROOT"/run/*/contract.md; do
    [ -f "$c" ] || continue
    if [ -n "$oldest_dirty" ] && [ "$c" -nt "$oldest_dirty" ]; then has_fresh_contract=1; fi
  done
  if [ "$has_fresh_contract" = "0" ]; then
    echo "⚠ 契约提醒（§1.2）：检测到内核邻近文件有未提交改动，但 run/ 下没有比这些改动更新的任务契约。"
    echo "   请先落 run/<任务>/contract.md（目标 / DoD / 验证标准与锚点 / 工作单元边界，四行起）。"
    echo "   依据：同一缺陷已第三次复发（R7 第八轮 S1-2）——教训库拦不住流程缺失，故由入口脚本提醒。"
    echo
  fi
fi
# ---- 逐套跑，证据落盘 ----
failed=0
printf '%-28s %s\n' "测试套件" "结果"
printf '%s\n' "------------------------------------------------------------"
for suite in "${SUITES[@]}"; do
  [ -f "tests/$suite.ts" ] || { printf '%-28s %s\n' "$suite" "✖ 源文件缺失"; failed=1; continue; }
  out="test-results/${DATE_PREFIX}-${suite}.md"
  if [ "$suite" = "l1-invariants" ] && [ "$UPDATE_BASELINE" = "1" ]; then
    UNIVEDGE_UPDATE_L1_BASELINE=1 "$TSX" --tsconfig "$TS_CONFIG" "tests/$suite.ts" > "$out" 2>&1
  else
    "$TSX" --tsconfig "$TS_CONFIG" "tests/$suite.ts" > "$out" 2>&1
  fi
  rc=$?
  summary=$(tail -1 "$out")
  if [ $rc -eq 0 ]; then
    printf '%-28s %s\n' "$suite" "✅ $summary  → $out"
  else
    printf '%-28s %s\n' "$suite" "❌ $summary  → $out"
    failed=1
  fi
done

echo
if [ $UPDATE_BASELINE = "1" ]; then
  echo "▸ 已刷新基线：test-results/l1-baseline.json（记得随证据一起提交）"
fi
if [ $failed -eq 0 ]; then
  echo "✅ 全部通过。提示：本脚本保证四份证据出自**同一次运行**；它无法验证"这次运行发生在最后一次编辑之后"——"
  echo "   请自行确认提交前未再改动源码（改了就要重跑）。"
  exit 0
else
  echo "❌ 有套件失败——先看对应 test-results/ 文件；若是 L1 内容变化导致第 H 组失败，"
  echo "   用：bash dsh-adapter/run-tests.sh --update-l1-baseline"
  exit 1
fi
