#!/usr/bin/env bash
# 插件类型检查（2026-10-15 新增）。
#
# 用途：抓**编译期**错误——典型是"跨作用域引用"这类 tsx 查不出的问题。
# 实证（本脚本存在的直接原因）：`univedge-reviewer.ts` 的模块级 `collectLateReport()`
#   引用了 `runReview()` 体内的 `const REVIEW_TIMEOUT_MS` → TS2304（tsc 能直接报出），
#   但插件由 **tsx 运行（只转译、不做类型检查）** → 该错误只在运行时炸成 `ReferenceError`，
#   又被裸 `catch` 吞掉 → **3 轮完整审查（17 条实质发现）被记为「（空）」**，回归点 `552b63c`。
#   即：本脚本补上了"运行时检查之外"的第一道闸。
#
# 会响性（内建 self-test；负控注册表据此登记破坏式）：
#   无参数运行时**先跑 self-test**——临时构造一个"模块级函数引用函数体内 const"的探针文件，
#   断言 tsc 必须报 TS2304（正是本次真实缺陷的形态）。破坏 `grep -q "TS2304"` 即令本脚本失败。
#
# 用法：bash dsh-adapter/tools/typecheck.sh      （无参数：self-test + 主检查）
# 环境：UNIVEDGE_DSH_DIR 可显式指定 dsh 检出目录（默认探测常见位置）
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# 探测 dsh 检出目录（含 node_modules/.bin/tsc 者）
if [ -n "${UNIVEDGE_DSH_DIR:-}" ]; then
  DSH="$UNIVEDGE_DSH_DIR"
else
  DSH=""
  for cand in "$HOME/deepseek-harness" /data/home/*/deepseek-harness /opt/deepseek-harness "$ROOT/../deepseek-harness"; do
    [ -x "$cand/node_modules/.bin/tsc" ] && { DSH="$cand"; break; }
  done
fi
TSC="${DSH:-}/node_modules/.bin/tsc"
if [ ! -x "$TSC" ]; then
  echo "SKIP: 未找到 tsc（设 UNIVEDGE_DSH_DIR 指向 dsh 检出目录可启用）"
  exit 0    # 环境不可用 → 跳过而非报红（与 negative-control 的"可选目标"同策）
fi

# ── ① self-test：证明本判据"会响"（临时探针，不触碰仓库文件）──
_probe="$(mktemp -d)"; trap 'rm -rf "$_probe"' EXIT
cat > "$_probe/probe.ts" <<'EOF'
function innerScope(): void { const LOCAL_ONLY = 1; void LOCAL_ONLY }
function moduleLevel(): void { void LOCAL_ONLY }   // 跨作用域引用 → tsc 必报 TS2304
EOF
_probe_out="$("$TSC" --noEmit --skipLibCheck --target es2022 --module esnext "$_probe/probe.ts" 2>&1 || true)"
if ! printf '%s' "$_probe_out" | grep -q "TS2304"; then
  echo "❌ self-test 失败：跨作用域引用未被 tsc 捕获 → 本判据不会响"
  printf '%s\n' "$_probe_out" | head -5
  exit 1
fi
echo "✔ self-test：跨作用域引用被 tsc 捕获（TS2304）"

cd "$ROOT/dsh-adapter" || exit 1
# 收集真实类型错误：TS2591 = 缺 @types/node 的环境类噪声（本机无该类型包时必然出现）→ 过滤
raw="$("$TSC" --noEmit --skipLibCheck --target es2022 --module esnext \
  --moduleResolution bundler --allowImportingTsExtensions \
  univedge-reviewer.ts reviewer-shared.ts 2>&1 | grep "error TS" | grep -v "error TS2591" || true)"

if [ -z "$raw" ]; then
  echo "✅ 插件类型检查通过（0 error；已滤除 TS2591 环境类噪声）"
  exit 0
fi

# 标准化为 `文件: 错误码`（去行列，避免代码移动/重排造成误报），与基线比对，**只对新增判失败**
BASE="$ROOT/dsh-adapter/tools/typecheck-baseline.txt"
cur="$(printf '%s\n' "$raw" | sed -E 's/^([^(]+)\([0-9]+,[0-9]+\): (error TS[0-9]+).*/\1: \2/' | sort -u)"
known="$(grep -v '^#' "$BASE" 2>/dev/null | sed '/^[[:space:]]*$/d' | sort -u || true)"
if [ -z "$known" ]; then
  new="$cur"; note="⚠ 无基线（$BASE 缺失或为空）→ 全部错误视为新增"
else
  new="$(comm -13 <(printf '%s\n' "$known") <(printf '%s\n' "$cur"))"
  note="基线已知 $(printf '%s\n' "$known" | sed '/^[[:space:]]*$/d' | wc -l) 项"
fi

if [ -z "$new" ]; then
  echo "✅ 无新增编译期错误（$note）"
  exit 0
fi
echo "❌ 新增编译期错误（基线中无记录）："
printf '%s\n' "$new" | head -10
echo "--- 全部错误明细（含行列）---"
printf '%s\n' "$raw" | head -12
exit 1
