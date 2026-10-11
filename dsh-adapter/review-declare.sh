#!/usr/bin/env bash
# UnivEdge × dsh 审查声明生成器（**声明前的自检入口**，与 run-tests.sh 同一哲学：
# 把"正确的动作"变成最省事的动作，而不是再写一条规矩）。
#
# 用法：
#   bash dsh-adapter/review-declare.sh              # 建议 + 可直接粘贴的声明块
#   bash dsh-adapter/review-declare.sh --emit       # 只打印声明块
#   bash dsh-adapter/review-declare.sh --self-test  # 自验证（fixture 驱动）
#
# ── §0.4 产物四要素 ─────────────────────────────────────────────────────────────
# · 假设清单：① 存在 git 仓库且 git 可执行；② `run/review/INDEX.md` 是仓库内**权威**审查记录；
#   ③ 基线时刻之后的改动 = 需要声明的候选；④ 分类判据为**名称级**，不做内容断言。
# · 有效域：本仓（UnivEdge）目录结构；不覆盖"内容是否变化"（那由插件侧 declared-reuse 判定）。
# · 误差预算：名称级分类可能误判——**误判一律朝"多审"方向**（卫生面为白名单，其余默认实质面）；
#   基线的已知风险与实测漏报史见下"修订记录"。
# · 状态标签：derived（产物可核；基线与分类均有 fixture 断言，见 --self-test）
# · **"上次审查"的语义**（R7 第十一轮 CC-01：曾被指为语义自由度未定义——同一棵树两种口径
#   实测给出 4 项 vs 15 项）：基线 = `run/review/INDEX.md` **末行的时间戳**，语义为
#   "该时刻（**UTC**）之后提交、或仍有未提交改动的文件"；候选为**名称级**（不判内容是否变化，
#   内容级复用由插件 `declared-reuse` 判定）。时间戳一律按 UTC 处理（`git --since` 缺偏移会被
#   当本地时区 → 曾偏差 8 小时、把三个旧提交算进候选）；日志仅作"限定本仓路径"的兜底来源。
# · 锚点引用：`run/review/INDEX.md`（基线）、`--self-test` 的 4 组断言、R7 第十一轮报告
#   `run/review/9e496951/94511258/review.md`（S0-1/S0-2 来源）
#
# ── 修订记录 ────────────────────────────────────────────────────────────────────
# 2026-10-11（R7 第十一轮 S0-2 等）：① 基线改为**仓库内记录**（`run/review/INDEX.md` 末行），
#   不再取日志中任意 `report written`——后者会被 /tmp 沙箱里的测试运行推进，实测把 15 项改动面
#   漏报为 4 项；② 候选排除证据产物 `dsh-adapter/test-results/**`（每次测试重写 → 指纹必变 →
#   使 declared-reuse 永不命中）；③ 分类反转为**卫生面白名单**，其余默认实质面（误判朝多审方向，
#   原实现把 `tools/**`、`skills/**`、`dsh-adapter/*.sh` 误判为卫生面 → 少审）；④ 基线不可靠 →
#   **降级告警 + 不出可粘贴块**（原实现照常输出，曾静默丢弃 11 项）；⑤ 补 `--self-test`。
#   删除了初版注释里"上一轮评估者 S0=0、全是卫生项"这一论据——锚点误读（那轮实为 S0=0 / S1=6 / S2=7）。
#   注：`run/` 被有意排除（不入库、可重建）；审查通道本身把 run/** 纳入审查面，此处属**有意收窄**。
# 不加 `-e`：本脚本多处命令**有意**以非零退出表达"信息"（`grep -c` 计到 0、`git log` 无输出、
# 文件不存在），一律显式分支处理；`-e` 会在这些正常路径上中途退出（R7 第十一轮 S2 之问）。
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${UNIVEDGE_DECLARE_ROOT:-$(cd "$HERE/.." && pwd)}"
LOG="${UNIVEDGE_REVIEWER_LOG:-/tmp/univedge-reviewer.log}"
MODE="advise"
case "${1:-}" in
  --emit) MODE="emit" ;;
  --self-test) MODE="selftest" ;;
  -h|--help) sed -n '2,8p' "$0"; exit 0 ;;
  "") ;;
  *) echo "未知参数：$1（-h 查看用法）" >&2; exit 2 ;;
esac

# 卫生面白名单（其余一律实质面——误判朝"多审"方向）
is_hygiene() {
  case "$1" in
    docs/*.md|dsh-adapter/README.md|dsh-adapter/test-results/*|dsh-adapter/tests/*.ts) return 0 ;;
    *) return 1 ;;
  esac
}

# 逐行打印已收集的路径：**不用未加引号的展开**（`$subst` 会被再分词/通配展开，含空格的路径会碎掉）
print_list() { while IFS= read -r _l; do [ -n "$_l" ] && printf '     %s\n' "$_l"; done <<< "${1:-}"; }

analyze() {
  # 输出：基线|来源|降级原因（空=可靠）
  local baseline="" src="" deg=""
  if [ -f "$ROOT/run/review/INDEX.md" ]; then
    baseline="$(grep -E '^\| [0-9]{4}-' "$ROOT/run/review/INDEX.md" 2>/dev/null | tail -1 | awk -F'|' '{gsub(/^ +| +$/,"",$2); print $2}')"
    [ -n "$baseline" ] && src="run/review/INDEX.md（仓库内权威记录）"
  fi
  if [ -z "$baseline" ] && [ -f "$LOG" ]; then
    baseline="$(grep -F "$ROOT/run/review/" "$LOG" 2>/dev/null | grep -E 'report written|declared review via @review' | tail -1 | sed -E 's/^\[([^]]+)\].*/\1/')"
    [ -n "$baseline" ] && src="$LOG（限定本仓 run/review/ 路径）"
  fi
  [ -z "$baseline" ] && deg="无从判定基线（既无 INDEX 记录，也无本仓 review 日志行）→ 建议全量声明"
  git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1 || deg="不是 git 仓库 → 建议全量声明"
  printf '%s\n%s\n%s\n' "$baseline" "$src" "$deg"
}

# INDEX/日志里的时间戳是 UTC（ISO，带或不带小数），git 的 --since 若无时区会按**本地**解释 → 偏差 8 小时。
to_git_date() { printf '%s' "$1" | sed -E 's/T/ /; s/\.[0-9]+//; s/Z$//; s/$/ +0000/'; }

candidates() {
  local baseline committed uncommitted
  baseline="$(to_git_date "$1")"
  [ -z "${1:-}" ] && return 0
  # core.quotePath=false：否则含非 ASCII 的路径会被转义成 \345… 形式（重命名后的旧路径亦会出现）
  committed="$(git -C "$ROOT" -c core.quotePath=false log --since="$baseline" --name-only --pretty=format: 2>/dev/null)" || return 1
  uncommitted="$(git -C "$ROOT" -c core.quotePath=false status --porcelain -z 2>/dev/null | tr '\0' '\n' | sed 's/^...//')"
  { printf '%s\n' "$committed"; printf '%s\n' "$uncommitted"; } | sed '/^$/d' | sort -u \
    | grep -Ev '^(run/|dsh-adapter/test-results/)' \
    | while IFS= read -r f; do [ -e "$ROOT/$f" ] && printf '%s\n' "$f"; done
}

# ─────────────────────────── 自验证（fixture 驱动） ───────────────────────────
if [ "$MODE" = "selftest" ]; then
  tmp="$(mktemp -d)"; pass=0; fail=0
  ok() { if [ "$2" = "$3" ]; then pass=$((pass+1)); printf '| %s | %s | %s | ✅ |\n' "$1" "$3" "$2"
         else fail=$((fail+1)); printf '| %s | %s | %s | ❌ |\n' "$1" "$3" "$2"; fi }
  ( cd "$tmp" && git init -q . && mkdir -p run/review dsh-adapter/tests dsh-adapter/test-results docs knowledge
    for f in dsh-adapter/univedge-reviewer.ts dsh-adapter/run-tests.sh dsh-adapter/tests/t.ts \
             docs/08-kernel-maintenance-workflow.md knowledge/review-lessons.md; do echo x > "$f"; done
    git add -A && git -c user.email=t@t -c user.name=t commit -qm init
    printf '| 2020-01-01T00:00:00 | a | b | 通过 | declared | — | p |\n' > run/review/INDEX.md
    echo y > dsh-adapter/univedge-reviewer.ts    # 未提交的实质面改动
  ) >/dev/null 2>&1

  out="$(UNIVEDGE_DECLARE_ROOT="$tmp" bash "$HERE/review-declare.sh" 2>&1)"
  ok "① 基线取自仓库内 INDEX（而非日志）" "$(printf '%s' "$out" | grep -c 'INDEX.md（仓库内权威记录）')" "1"
  ok "② 存在实质面 → 输出可粘贴块" "$(printf '%s' "$out" | grep -c '^@review$')" "1"
  subst_block="$(printf '%s' "$out" | awk '/—— 实质面/{f=1;next} /—— 卫生面/{f=0} f')"
  hyg_block="$(printf '%s' "$out" | awk '/—— 卫生面/{f=1;next} /^$/{if(f)exit} f')"
  ok "③ 卫生面白名单：docs/README/tests 入卫生面" "$(printf '%s' "$hyg_block" | grep -c 'docs/08-kernel-maintenance-workflow.md')" "1"
  ok "④ 实质面默认：univedge-*.ts / knowledge/*.md / run-tests.sh" "$(printf '%s' "$subst_block" | grep -cE 'univedge-reviewer\.ts|knowledge/review-lessons\.md|run-tests\.sh')" "3"
  # ⑤ 基线不可靠 → 降级、不出可粘贴块、退出码 3
  rm -f "$tmp/run/review/INDEX.md"
  out2="$(UNIVEDGE_DECLARE_ROOT="$tmp" UNIVEDGE_REVIEWER_LOG="$tmp/nonexistent.log" bash "$HERE/review-declare.sh" 2>&1)"; rc2=$?
  ok "⑤ 基线不可靠 → 打印降级告警" "$(printf '%s' "$out2" | grep -c '⚠ 降级')" "1"
  ok "⑥ 基线不可靠 → 不输出可粘贴块" "$(printf '%s' "$out2" | grep -c '^@review$')" "0"
  ok "⑦ 基线不可靠 → 退出码 3" "$rc2" "3"

  # ⑧⑨⑩ 时区与证据排除（R7 第十一轮 S0-2 的时区面 / S1-8）：基线必须按 UTC 解释。
  # 反例构造：一次提交发生在基线前 6 小时（本地时区口径会把它算进候选）。
  tmp2="$(mktemp -d)"
  ( cd "$tmp2" && git init -q . && mkdir -p run/review docs dsh-adapter/test-results
    echo a > docs/before.md; git add -A
    GIT_AUTHOR_DATE='2026-05-31T18:00:00+0000' GIT_COMMITTER_DATE='2026-05-31T18:00:00+0000' \
      git -c user.email=t@t -c user.name=t commit -qm before
    echo b > docs/after.md; git add -A
    GIT_AUTHOR_DATE='2026-06-01T00:10:00+0000' GIT_COMMITTER_DATE='2026-06-01T00:10:00+0000' \
      git -c user.email=t@t -c user.name=t commit -qm after
    printf '| 2026-06-01T00:00:00 | a | b | 通过 | declared | — | p |\n' > run/review/INDEX.md
    echo c > dsh-adapter/test-results/evidence.md; echo d > dsh-adapter/until.sh
  ) >/dev/null 2>&1
  out3="$(UNIVEDGE_DECLARE_ROOT="$tmp2" bash "$HERE/review-declare.sh" 2>&1)"
  ok "⑧ 基线按 UTC 解释（前 6 小时的提交不入候选；本地时区口径会误纳）" \
     "$(printf '%s' "$out3" | grep -c 'docs/before.md')" "0"
  ok "⑨ 基线之后的提交与未提交改动均入候选" \
     "$(printf '%s' "$out3" | grep -cE 'docs/after\.md|dsh-adapter/until\.sh')" "2"
  ok "⑩ 证据产物（test-results/）不入候选（否则指纹必变 → reuse 永不命中）" \
     "$(printf '%s' "$out3" | grep -c 'test-results/evidence.md')" "0"
  rm -rf "$tmp" "$tmp2"
  printf '\n**%d/%d 通过, %d 失败**\n' "$pass" "$((pass+fail))" "$fail"
  exit $([ "$fail" -eq 0 ] && echo 0 || echo 1)
fi

# analyze 输出三行（基线/来源/降级原因）——不用 \t 分隔：bash 的 IFS 会把制表符当空白而吞掉空字段
_an="$(analyze)"
baseline="$(printf '%s\n' "$_an" | sed -n 1p)"
src="$(printf '%s\n' "$_an" | sed -n 2p)"
deg="$(printf '%s\n' "$_an" | sed -n 3p)"
if ! cand="$(candidates "$baseline")"; then deg="git 查询失败 → 建议全量声明"; cand=""; fi

subst=""; hyg=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  if is_hygiene "$f"; then hyg="$hyg$f"$'\n'; else subst="$subst$f"$'\n'; fi
done <<< "$cand"
n_subst="$(printf '%s' "$subst" | grep -c . || true)"
n_hyg="$(printf '%s' "$hyg" | grep -c . || true)"

if [ "$MODE" = "emit" ]; then
  echo "@review"; printf '%s\n' "$cand"; exit 0
fi

[ -n "$deg" ] && { echo "⚠ 降级：$deg"; echo; }
echo "▸ 基线：${baseline:-未知}${src:+  （来源：$src）}"
echo "▸ 候选改动（已排除 run/ 与 test-results/ 证据产物）：$(printf '%s' "$cand" | grep -c . || true) 项"
echo "  —— 实质面：$n_subst 项"
print_list "$subst"
echo "  —— 卫生面：$n_hyg 项"
print_list "$hyg"
echo

if [ -n "$deg" ]; then
  echo "⚠ 基线不可靠 → **不给出可直接粘贴的建议**。请先手工列全改动面（git status / git log）再决定。"
  exit 3
fi
if [ "$n_subst" -gt 0 ]; then
  echo "✅ 建议：**声明**（存在实质面改动：行为/契约/锚点）。可直接粘贴："
  echo; echo "@review"; printf '%s\n' "$cand"; echo
  echo "（含卫生面 $n_hyg 项——声明面**宁全勿漏**：清单即评估者的输入包范围）"
  echo "（被评估者指出问题后的修订不自动重宣——是否再验一轮由你判断）"
else
  echo "⏸ 建议：**本轮不声明**（仅卫生面改动）。跑 \`bash dsh-adapter/run-tests.sh\` 即可；"
  echo "   若仍要声明：bash dsh-adapter/review-declare.sh --emit"
fi
echo
echo "▸ 提示：declared-reuse（同清单+同指纹 → 0 成本复用）的状态**存在进程内**，重启即清空。"
