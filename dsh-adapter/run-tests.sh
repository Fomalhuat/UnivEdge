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
  # 第十二轮：改用 find（原 `"$ROOT"/run/*/contract.md` 只覆盖一层，深层契约 run/a/b/contract.md 不在扫描面）
  while IFS= read -r c; do
    [ -f "$c" ] || continue
    if [ -n "$oldest_dirty" ] && [ "$c" -nt "$oldest_dirty" ]; then has_fresh_contract=1; fi
  done < <(find "$ROOT/run" -type f -name contract.md 2>/dev/null)
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
  # 隔离测试日志（R7 第十一轮 S0-2）：插件的 diag 现在支持 UNIVEDGE_REVIEWER_LOG 覆盖，
  # 测试运行写临时日志，不再把 /tmp/univedge-reviewer.log 推进（否则 review-declare.sh 的基线会被测试推进）。
  export UNIVEDGE_REVIEWER_LOG="${TEST_REVIEW_LOG:-/tmp/univedge-reviewer-test.log}"
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

# ---- 文档计数**一致性**（不只是"存在性"）----
# R7 第八轮 S1-1 → 第九轮 S1-2：原检查问"README 里有没有这个串"（存在即过），
# 于是同一文件里并存 94/94 与 93 也照样通过。现改为：README 中出现的**所有** `<N>/<N> 通过`
# 必须恰好等于本轮四套的计数集合（多一个、少一个都报）。
# 第十三轮修正（本次重写暴露）：`fresh` 原先把整个 `"70/70 通过"` 当作一个 token 塞进去——shell 会把它
# 拆成 `70/70` 与 `通过` 两个词，而文档侧的旧采集恰好也产出同样的词，于是"通过"这个词**对称地**出现在两侧，
# 掩盖了口径不一致（把两侧都改成纯数字后，缺失列表立刻报出 5 个"通过"）。现统一为**纯数字集合**。
fresh=""
for suite in "${SUITES[@]}" review-declare; do
  full=$(grep -oE '\b([0-9]+)/\1 通过' "test-results/${DATE_PREFIX}-${suite}.md" 2>/dev/null | tail -1)
  [ -z "$full" ] && continue
  fresh="$fresh ${full%%/*}"
done
# 同时覆盖套件表里的**裸计数**行（| \`suite\` | N | ），第九轮 S1-2 指出仅查 "N/N 通过" 会漏掉这里
# 扫描面 = README + **当前单元契约**（最新 mtime 的那一份）。R7 第十轮 S1-1 要求把契约纳入扫描面；
# 第十二轮修正：**全部** run/*/contract.md 会把已结题的单元契约也算进来——那些计数是**当时的**记录，
# 追溯改写等于篡改审计留痕，且会让本检查长期假红、被当噪声忽略。故改为只强制"当前单元"。
# 且以 `历史留档` 标记显式排除已结题单元——否则"碰一下旧契约"就会让它变成"当前单元"，
# 而真正的现行契约**反而失检**（假绿，比假红更危险：这是检查自身的盲区，故由标记显式化而非靠 mtime 序）。
# 第十二轮：`run/*/contract.md` 只覆盖一层 → 深层契约写假计数不会被看见（实测 run/zz-deep/sub/contract.md 静默通过）。
# 改用 find 递归 + 按 mtime 倒序（GNU find -printf 取时间戳，避免依赖 ls 的排序语义）。
CONTRACT_DOCS=""
while IFS= read -r c; do
  grep -q '历史留档' "$c" 2>/dev/null && continue
  CONTRACT_DOCS="$c"; break
done < <(find "$ROOT/run" -type f -name contract.md -printf '%T@\t%p\n' 2>/dev/null | sort -rn | cut -f2-)
# R7 第十二轮（提交侧受控实验）修正：**解析面**盲区——原实现对契约用 `'[0-9]*/[0-9]* 通过'`，
# 而契约的书写格式是**裸计数**（`70/70、126/126、…`，见 run/*/contract.md 的"五套检查"行），
# 故该模式对契约 **0 命中** → 契约侧扫描面**空转**（"README + 当前单元契约"名不副实）。
# 受控实验：把现行契约的 116/116 改成 115/115 后，本检查仍报"全部通过"（假绿）。
# 改用**等值反向引用** `\b([0-9]+)/\1\b`：计数天然是 N/N 等值形式，且不误抓路径片段
# （实测契约中命中恰为 5 个计数；而 `[0-9]*/[0-9]*` 会抓到 `/` 等噪声）。
# ── 计数面（第十二轮 DRY 根治）：README **只允许套件表**承载当前计数（单一表面），
# 契约允许 `N/N` 形式（它记录判决依据）。上一版的漏在于：README 侧只采集 `N/N 通过` 与表格单元格，
# 而散文里的 `N 用例 / N 断言` 不参与比对 → 受控实验（把 `**116 用例**` 改成 115）仍报"全部通过"（假绿）。
readme_cells="$(for suite in "${SUITES[@]}" review-declare.sh; do
  sed -nE "s/^\| \`?${suite}\`? \| ([0-9]+) \|.*/\1/p" README.md 2>/dev/null; done)"
contract_counts=""
# 注意：`grep -o` 输出的是**整个匹配**（`70/70`），捕获组只在替换里可用 → 必须再切掉分母。
[ -n "$CONTRACT_DOCS" ] && contract_counts="$(grep -ohE '\b([0-9]+)/\1\b' $CONTRACT_DOCS 2>/dev/null | cut -d/ -f1)"
doc_counts="$( { printf '%s\n' "$readme_cells"; printf '%s\n' "$contract_counts"; } | grep -v '^$' | sort -u | tr '\n' ' ')"
echo "▸ 计数来源：README 套件表 $(printf '%s\n' "$readme_cells" | grep -c . || true) 项 · 契约 $(printf '%s\n' "$contract_counts" | grep -c . || true) 项（契约：${CONTRACT_DOCS:-无}）"
missing=""
for c in $fresh; do case " $doc_counts " in *" $c "*) ;; *) missing="$missing $c";; esac; done
extra=""
for c in $doc_counts; do case " $fresh " in *" $c "*) ;; *) extra="$extra $c";; esac; done
if [ -n "$missing$extra" ]; then
  echo "⚠ 文档计数不一致（README + 当前单元契约：${CONTRACT_DOCS:-无未标记历史的契约}）：缺少${missing:- 无}；多出/过期${extra:- 无}"
  echo "   本轮实测：$fresh"
  echo "   依据：'文档计数落后于代码'同类第 4 次复发（R7 第九轮 S1-2：存在性检查漏掉并存矛盾）。"
  echo
fi
# ── 计数**位置**检测器（值无关，故新句式/新位置也拦得住——这正是"只补正则"拦不住的漏）：
# 套件表之外出现计数claim（`N/N 通过` 或 `N 用例/断言`）→ 报警。判据不依赖数值，故不会因换写法而失效。
tbl_lines="$(grep -nE '^\| \`?[A-Za-z0-9_.-]+\`? \| [0-9]+ \|' README.md 2>/dev/null | cut -d: -f1 | tr '\n' ' ')"
stray="$(grep -nE '[0-9]+/[0-9]+ 通过|[0-9]+ *[条个]? *(用例|断言)' README.md 2>/dev/null | while IFS=: read -r ln _rest; do
  case " $tbl_lines " in *" $ln "*) ;; *) printf '%s ' "$ln";; esac
done)"
if [ -n "$stray" ]; then
  echo "⚠ 计数位置违规（DRY）：README 的当前计数只应出现在套件表，但第 ${stray}行另有计数claim。"
  echo "   同一数字存在多个副本必然漂移（同类已复发 4 次）；请改为引用套件表。"
  echo
fi

# ---- 环境记录（R7 第十轮 S2-3）：与证据同批落盘，供 NC-04 直接核对 ----
envfile="test-results/${DATE_PREFIX}-env.md"
{
  echo "# 运行环境（run-tests.sh 自动记录）"
  echo
  echo "- 时间（UTC）: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo "- dsh checkout: $DSH_DIR"
  echo "- node: $("$DSH_DIR/node_modules/.bin/tsx" --version 2>/dev/null | head -1 || true) / $(node -v 2>/dev/null || echo '?')"
  echo "- tsconfig: $TS_CONFIG"
  echo "- UnivEdge HEAD: $(cd "$ROOT" && git log -1 --format='%h %ci' 2>/dev/null || echo '?')"
  echo "- 工作树: $(cd "$ROOT" && [ -z "$(git status --porcelain 2>/dev/null)" ] && echo 干净 || echo '有未提交改动')"
  echo
  echo "> 五份证据文件由同一次运行产生；本文件记录该次运行的环境（证据文件本身不重跑不会变）。"
} > "$envfile"
echo "▸ 环境记录: $envfile"
# ---- 第五项：声明生成器自验证（R7 第十一轮 S1-1：新工具须有自验证用例并登记） ----
selftest_out="test-results/${DATE_PREFIX}-review-declare.md"
if bash review-declare.sh --self-test > "$selftest_out" 2>&1; then
  printf '%-28s %s\n' "review-declare self-test" "✅ $(tail -1 "$selftest_out")  → $selftest_out"
else
  printf '%-28s %s\n' "review-declare self-test" "❌ $(tail -1 "$selftest_out")  → $selftest_out"
  failed=1
fi

echo
if [ $UPDATE_BASELINE = "1" ]; then
  echo "▸ 已刷新基线：test-results/l1-baseline.json（记得随证据一起提交）"
fi
if [ $failed -eq 0 ]; then
  echo "✅ 全部通过。五份证据出自同一次运行。"
  echo "   注：'证据是否晚于源码改动'**不在本脚本内判定**——本脚本自己会刷新证据，故在运行内判定恒为真"
  echo "   （第十二轮受控实验实测：写进去的空门从不触发）。该检查在 bash dsh-adapter/review-declare.sh（声明前自检）里。"
  exit 0
else
  echo "❌ 有套件失败——先看对应 test-results/ 文件；若是 L1 内容变化导致第 H 组失败，"
  echo "   用：bash dsh-adapter/run-tests.sh --update-l1-baseline"
  exit 1
fi
