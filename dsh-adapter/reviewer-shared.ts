/**
 * univedge-reviewer 共享逻辑（单一事实来源——源码与测试共同 import，防常量/逻辑漂移，S1-2 闭合）
 */
import { existsSync, writeFileSync, appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname } from 'node:path'

/** 审查自输出语义（用户裁定 2026-08-31）：
 * - run/ 顶层只两类：**review/**（审查系统全部产物）与 **<任务名>/**（任务工作区）；任务名不得前缀 review-
 * - 正式审查报告：run/review/<主8>/<评估者8>/review.md（分目录写盘）
 * - 空报告记录：  run/review/<主8>/empty/<评估者8>.md
 * - 自检产物：    run/review/selfcheck/（2026-08-31 起迁入；旧 run/review-selfcheck* 兼容待清理）
 * - 审查索引：    run/review/INDEX.md（审查管理入口，每次落盘追加记录）
 * - **不排除**（重新进入审查面，S1-1 收窄）：handoff-*.md、其他 run/review/ 下审计文档
 * - **2026-08-31 storm-diagnosis §7 修订**：r7- 前缀目录（早期审查存档命名）加入豁免——审查存档不再入审查面
 */
export const REVIEW_DIR = 'run/review'

const HEX8 = '[0-9a-fA-F]{8}'

/** 是否审查自输出路径（精确模式，非整目录排除）。 */
export function isReviewSelfOutput(p: string): boolean {
  if (!p.includes('run/')) return false
  // 分目录正式报告：run/review/<主8>/<评估者8>/review.md
  if (new RegExp(`${REVIEW_DIR}/${HEX8}/${HEX8}/review\\.md$`).test(p)) return true
  // 单层旧格式（迁移期历史槽）：run/review/<主8>/review.md——完善项 1（历史报告也是自输出）
  if (new RegExp(`${REVIEW_DIR}/${HEX8}/review\\.md$`).test(p)) return true
  // 空报告记录：run/review/<主8>/empty/
  if (new RegExp(`${REVIEW_DIR}/${HEX8}/empty/`).test(p)) return true
  // 审查自检产物：run/review/selfcheck/（2026-08-31 起自检产物迁入 review/ 下）
  if (p.includes(`${REVIEW_DIR}/selfcheck`)) return true
  // 审查索引文件（S2-8：review/ 下产物语义闭合——INDEX.md 是插件写的管理入口）
  if (p.includes(`${REVIEW_DIR}/INDEX.md`)) return true
  // 审查存档目录（storm-diagnosis §7：r7- 前缀是早期审查存档命名，不入审查面，防存档被重复审）
  if (p.includes(`${REVIEW_DIR}/r7-`)) return true
  return false
}

/** 交付物路径判定：run/ 下产物或任意 .md，且非审查自输出。 */
export function isArtifactPath(p: string): boolean {
  const isProduct = (
    /\brun\/[^\s"']*\.(md|json|txt|log|csv|yaml|yml|dat)\b/i.test(p) || /\.md\b/i.test(p)
  )
  return isProduct && !isReviewSelfOutput(p)
}

/** 输入包产物上限（R7 第十一轮 S2：原 `12` 在长会话里丢弃 18 项，含本轮的行为定义源）。 */
export const ARTIFACT_CAP = 20

/** 低优先级产物（**仅在超出上限时才让位**，绝不清空输入包）：
 *  证据产物（每次测试重写）、README（每次计数刷新）、docs/（描述"为什么这样设计"，
 *  行为定义源在代码与规范文档里）。R7 第十一轮 S2：原实现纯按"最近写入"排序，
 *  使同轮被重写的证据文件挤掉 `univedge-l1-inject.ts` / `reviewer-shared.ts` 这类真正要审的源文件。 */
export function isLowPriorityArtifact(p: string): boolean {
  return (
    /(?:^|\/)(?:test-results|archive)\//.test(p) ||
    /(?:^|\/)README\.md$/i.test(p) ||
    /(?:^|\/)docs\//.test(p)
  )
}

/** 产物选择（单一事实来源：插件与测试共用）——声明项恒入列；推断项按
 *  「优先级 → 最近写入」排序后填满剩余名额，落选者显式回报（宁审勿漏 + 显式化）。 */
export function selectArtifacts(
  declaredPresent: string[],
  inferred: string[],
  recentFirst: (p: string) => number,
  cap: number = ARTIFACT_CAP,
): { picked: string[]; notPicked: string[] } {
  const rank = (p: string): number => (isLowPriorityArtifact(p) ? 1 : 0)
  const sorted = [...inferred].sort((a, b) => rank(a) - rank(b) || recentFirst(b) - recentFirst(a))
  const room = Math.max(0, cap - declaredPresent.length)
  return { picked: [...declaredPresent, ...sorted.slice(0, room)], notPicked: sorted.slice(room) }
}

/** 完成态动词+文件名（信号 B 文本模式）。 */
export const DELIVER_WORDS = /(?:已写入|已保存到|已保存至|产物在|写入完成|已落盘)\s*(?:run\/)?[^\s"']+\.(?:md|json|txt|csv|yaml|yml)\b/i

/** 文本层交付判定：存在"完成态动词 + 非审查自输出路径"即交付（S1-4：按路径片段粒度，整段含自输出不连坐）。
 * 注意：捕获组必须吞下完整路径（含 run/ 前缀）——`(?:run\/)?` 会把前缀排除出捕获，导致自输出判定拿到残缺路径。 */
export function textHasDeliverable(txt: string): boolean {
  const re = /(?:已写入|已保存到|已保存至|产物在|写入完成|已落盘)\s*([^\s"']+\.(?:md|json|txt|csv|yaml|yml))/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(txt)) !== null) {
    if (!isReviewSelfOutput(m[1])) return true
  }
  return false
}

/** 审查报告写盘目录：run/review/<主8>/<评估者8>/（缺陷 3 分目录）。 */
export function reviewOutDir(root: string, mainId: string, childId: string): string {
  const main8 = String(mainId).replace(/^session-/, '').slice(0, 8)
  const child8 = String(childId).replace(/^session-/, '').slice(0, 8)
  return `${root}/${REVIEW_DIR}/${main8}/${child8}`
}

/** 空报告记录目录：run/review/<主8>/empty/（缺陷 2）。 */
export function emptyOutDir(root: string, mainId: string): string {
  const main8 = String(mainId).replace(/^session-/, '').slice(0, 8)
  return `${root}/${REVIEW_DIR}/${main8}/empty`
}

/** 报告提取：含报告专有锚的实质消息中取最长（完善项 3b：去高频词"通过/S0/S1/S2"——中间分析也常含，
 * 改用报告结构专有锚；防"长分析顶掉报告"）。 */
export function pickReport(events: any[]): string {
  const REPORT_FLAG = /(##\s*结论|#\s*独立审查报告|解耦声明|需修订|问题清单|实质问题清单|S0 实质|S1 有依据|S2 建议)/i
  let best = ''
  for (const ev of events) {
    if (ev.type !== 'assistant/message') continue
    const content = ev.data?.message?.content ?? []
    const txt = content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('').trim()
    if (!txt) continue
    if (!REPORT_FLAG.test(txt)) continue // 只考虑含报告专有锚的消息（排除纯思考/中间输出）
    if (txt.length > best.length) best = txt
  }
  return best
}

/** 从报告文本提取结论（通过/需修订/不通过；先剥 markdown 强调，找不到标未知）。 */
export function extractConclusion(report: string): string {
  const plain = report.replace(/\*\*/g, '') // S2-2：剥 markdown 加粗（## **结论**：需修订 也能提取）
  const m = plain.match(/结论[:：]\s*(通过|需修订|不通过)/)
  return m ? m[1] : '（未知）'
}

/** 从产物路径提取任务名（run/<任务名>/ 前缀；取最后匹配=当前活动任务；review 前缀不算任务名）。
 * 注意（S2-3）：仅用于索引的"关联任务"字段（非权威归属），多任务轮归最后写入者；勿据此做文件迁移。 */
export function extractTaskName(paths: string[]): string | undefined {
  let task: string | undefined
  for (const p of paths) {
    const m = p.match(/\brun\/([^/]+)\//i)
    if (m && !m[1].startsWith('review')) task = m[1]
  }
  return task
}

/** 审查索引路径：run/review/INDEX.md（管理入口，按时间/任务/结论检索）。 */
export function reviewIndexPath(root: string): string {
  return `${root}/${REVIEW_DIR}/INDEX.md`
}

/** 追加审查索引记录（时间/主会话/评估者/结论/触发通道/关联任务/报告路径）。
 * S1-1 修复：首次创建用排他标志 wx（EEXIST 回退 append）——并发首写不丢记录；
 * S1-2 修复：函数内自建父目录 + 失败返回 false（由调用方记录，不静默吞）。
 * 触发通道列（2026-08-31 selfcheck S2，观察期统计用）：declared=@review 声明 / auto=自动嗅探；
 * 历史记录无 channel 字段时缺省标 auto（统计兼容旧行）。
 * 返回 true=成功写入，false=失败（调用方应 diag）。 */
export function appendReviewIndex(root: string, rec: { mainId: string; childId: string; conclusion: string; task?: string; reportPath: string; channel?: string }): boolean {
  try {
    const file = reviewIndexPath(root)
    mkdirSync(dirname(file), { recursive: true }) // S1-2：自建父目录（不依赖调用顺序）
    const channel = rec.channel ?? 'auto'
    const line = `| ${new Date().toISOString().slice(0, 19)} | ${String(rec.mainId).replace(/^session-/, '').slice(0, 8)} | ${String(rec.childId).replace(/^session-/, '').slice(0, 8)} | ${rec.conclusion} | ${channel} | ${rec.task ?? '—'} | ${rec.reportPath} |`
    const header = '# 审查索引（管理入口）\n\n> 每次审查落盘自动追加；按时间/任务/结论检索；时间=UTC；路径相对 UnivEdge 根；空报告也记录（结论=空）；触发通道：declared=@review 声明 / auto=自动嗅探。\n\n| 时间 | 主会话 | 评估者 | 结论 | 触发通道 | 关联任务 | 报告路径 |\n|---|---|---|---|---|---|---|\n'
    try {
      writeFileSync(file, header + line + '\n', { flag: 'wx', encoding: 'utf8' }) // S1-1：排他创建
    } catch (e: any) {
      if (e?.code === 'EEXIST') {
        appendFileSync(file, line + '\n', 'utf8') // 已存在 → 追加（O_APPEND 行级原子）
      } else {
        throw e
      }
    }
    return true
  } catch (e) {
    try { console.error(`[univedge-reviewer] appendReviewIndex failed: ${String(e)}`) } catch { /* ignore */ }
    return false
  }
}

// ==================== 审查风暴抑制（2026-08-31 review-storm-diagnosis 修复）====================
// 触发判据原本只问"本 turn 有无实质交付物"，不问"该产物是否已被审查过/改动是否只是响应审查意见"，
// 导致 审查→修订→审查 固定反馈环（2 小时 6 次审查）。此处三件套补上这层感知：
// - P0-A 冷却期：同主会话滑动窗口内成功审查 ≥N 次 → 暂停自动审查（延迟而非丢弃，下次审查读最新会话状态）
// - P0-B hash 去重：本 turn 产物内容与上次被审时全同 → 跳过（拦"内容没变还触发"）
// - P1-A quiet 指令：turn 文本含 --no-review / review:off → 跳过（用户/主 agent 细粒度控制，替代全关硬开关）

/** quiet 指令判定（P1-A）：turn 内 user/assistant 文本含 --no-review 或 review:off 即跳过审查。 */
export const QUIET_RE = /(?:--no-review|review\s*:\s*off)/i
export function hasQuietDirective(txt: string): boolean {
  return QUIET_RE.test(txt)
}

/** 强制重审指令（2026-10-10 裁决 2）：`--force-review` / `review:force`。
 *  用途：declared 通道下"清单与指纹与上轮完全相同 → 复用上轮结论"（去重复用）时，
 *  仍保留显式强制重审的出口——与 `--no-review` 对称，把否决权留给用户/主 agent。 */
export const FORCE_RE = /(?:--force-review|review\s*:\s*force)/i
export function hasForceDirective(txt: string): boolean {
  return FORCE_RE.test(txt)
}

/** 产物内容 SHA-256 hex（P0-B）。读失败返回 undefined——不参与去重判定（宁审勿漏）。 */
export function contentHash(p: string): string | undefined {
  try {
    return createHash('sha256').update(readFileSync(p)).digest('hex')
  } catch {
    return undefined
  }
}

/** 是否全部产物内容与上次审查时一致（P0-B）。空路径列表或任一产物读取失败/有变化 → false（不跳过）。 */
export function allArtifactsUnchanged(paths: string[], reviewed: Map<string, string>): boolean {
  if (!paths.length) return false
  for (const p of paths) {
    const h = contentHash(p)
    if (h === undefined || reviewed.get(p) !== h) return false
  }
  return true
}

/** 冷却期判定（P0-A）：滑动窗口 windowMs 内成功审查次数 ≥ maxPerWindow → true（应跳过）。
 * times 为升序成功审查时间戳（最近在末尾），调用方负责维护与裁剪。 */
export function shouldCooldown(times: number[], now: number, maxPerWindow: number, windowMs: number): boolean {
  if (times.length < maxPerWindow) return false
  const cutoff = now - windowMs
  return times.filter((t) => t >= cutoff).length >= maxPerWindow
}

// ==================== 显式审查点（2026-08-31 framework-redesign 方向 1：双通道并存观察期）====================
// 理念：审查触发权交还主 agent——交付时显式声明 `@review <路径>`（claimed → 审查请求 → verified）。
// 观察期保留自动嗅探判据（hasDeliverable）双通道并存；声明通道触发即必审（不受冷却/hash 约束，
// 显式声明 = 意志信号，与"响应审查的修订"无关），自动通道继续受冷却/hash 约束。
// 切换期删除自动通道后：判据 = 声明 + 会话结束兜底。

/** @review 声明（P1 声明通道，framework-redesign 方向 1）。
 *
 * 语义（METHODOLOGY §1.7:226）："`@review <路径>`，可列多路径清单，**审查其后全部路径**"。
 * 实现要点（2026-10-10 R7 第五轮 S0-1 修复）：
 *  - **取消 200 字符截断**：原实现只取 @review 后 200 字符，实测 12 项交付清单（748 字符）只解析出 2 条；
 *  - 声明段 = 从 @review 到**空行**（段落边界），逐行提取，不在段内的讨论文字自然出局；
 *  - 路径白名单补 `.ts/.tsx/.js/.py/.sh/.tex/.toml`（原白名单只有 md/json/…，源码路径全被漏掉）；
 *  - 剥离内联代码跨度里**纯讨论**的写法（如 `@review <路径>`："@" 出现在反引号内且该跨度无可解析路径 → 整段忽略）；
 *  - 过滤审查自输出与通配符（`test-results/*.md` 不是路径）。
 */
export const REVIEW_DECLARE_RE = /@review\b/gi

const PATH_EXT = 'md|markdown|json|jsonl|txt|csv|yaml|yml|log|dat|ts|tsx|js|mjs|py|sh|tex|toml'
/** 路径 token 的**源串**（注意：一律现用现建 `new RegExp(..., 'gi')`，绝不在模块级持有带 `g` 的正则
 *  并用 `.test()` —— 那次 `lastIndex` 跨调用残留导致同一输入连续调用结果翻转，
 *  属 2026-10-10 引入的真实回归，R7 第七轮 S0-1 已构造性复现）。 */
// \p{L}\p{N} 覆盖 CJK 等非 ASCII 路径字符（R7 第九轮：此前 `\w` 只含 [A-Za-z0-9_]，
// 中文文件名（如 docs/08-内核维护工作流.md）会被静默丢弃）；使用 `u` 标志启用 Unicode 属性转义。
const PATH_TOKEN_SRC = `[\\p{L}\\p{N}._/\\-]+\\.(?:${PATH_EXT})\\b`

/** 行首的声明头（仅用于判定"是否需要把后续行纳入同一声明块"）。 */
const DECL_LINE_RE = /^[ \t>*\-]*@review\b/i

/** 取一行的路径 token（每次新建正则，无状态）。 */
function pathsInLine(line: string): string[] {
  const cleaned = line.replace(/[`"']/g, '')
  return cleaned.match(new RegExp(PATH_TOKEN_SRC, 'giu')) ?? []
}

/** `@review` 之后的剩余文字是否**只由路径与连接词构成**（= 纯声明）。
 *  规则：去掉路径 token 后，剩下的只能是空白/中英文连接词/标点；出现其他散文词 → 视为"讨论/引述"而非声明。
 *  这修掉 R7 第七轮 S0-2 的残留：不带反引号的"讨论 + 真路径"（如 `我们在讨论 @review a.md 的语义`）不再触发。 */
const SEPARATOR_ONLY_RE = /^[\s、，,。；;：:与和及或\-\*>·（）()【】\[\]"'`]*$/
/** 括号注释开头（`@review a.md（本轮交付）` 这类带简注的声明仍算声明）。 */
const COMMENT_TAIL_RE = /^\s*[（(【\[「『—–-]/
function isPureDeclarationTail(tail: string): boolean {
  const withoutPaths = tail
    .replace(new RegExp(PATH_TOKEN_SRC, 'giu'), '')
    .replace(new RegExp(REVIEW_DECLARE_RE.source, 'gi'), '')   // 同一行的后续 @review 不算散文
  // 纯路径清单（只剩分隔符）→ 声明；以括号/破折号开头的简注 → 仍视为声明（如"（本轮交付）"）；
  // 其余（出现散文词，如"的语义""这个案例"）→ 判为讨论/引述，不触发。
  return SEPARATOR_ONLY_RE.test(withoutPaths) || COMMENT_TAIL_RE.test(withoutPaths)
}

/** 中和"引述式"内联代码跨度：跨度内含 `@review` → 整段视为引述（无论是否含路径），替换为空格。
 *  这样 ``见 `@review x.md` 的说明`` 不再是声明；而裸写 `@review x.md` 仍是声明。 */
function neutralizeQuotedMentions(txt: string): string {
  return txt.replace(/`[^`]*`/g, (span) => (/@review\b/i.test(span) ? ' '.repeat(span.length) : span))
}

/**
 * 提取 `@review` 声明的产物路径（P1 声明通道）。
 *
 * 语义（METHODOLOGY §1.7:226："`@review <路径>`，可列多路径清单，**审查其后全部路径**"）：
 *  - **无 200 字符截断**（原实现只取其后 200 字符 → 12 项清单只解析出 2 条）；
 *  - 一条声明 = 从 `@review` 到**行尾**；若 `@review` 位于行首，则继续把后续行纳入同一声明块，
 *    直到空行或下一条 `@review`（支持多行清单）；
 *  - 路径白名单含源码扩展名（`.ts/.py/…`）——原实现缺此，导致"声明了源码但审查者从未收到"；
 *  - **引述 ≠ 声明**：内联代码跨度内的 `@review` 一律中和（见 `neutralizeQuotedMentions`）；
 *  - 过滤审查自输出与含通配符的伪路径。
 *  - **确定性**：不持有任何带 `g` 的模块级正则做 `.test()`（R7 第七轮 S0-1 的回归根因）。
 */
export function extractReviewDeclarations(txt: string): string[] {
  const out: string[] = []
  const cleaned = neutralizeQuotedMentions(txt)
  const lines = cleaned.split('\n')
  const re = new RegExp(REVIEW_DECLARE_RE.source, 'gi')
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const local = new RegExp(REVIEW_DECLARE_RE.source, 'gi')
    let m: RegExpExecArray | null
    while ((m = local.exec(line)) !== null) {
      const tail = line.slice(m.index + m[0].length)
      if (!isPureDeclarationTail(tail)) continue          // 讨论/引述（含散文词）→ 不是声明
      const block: string[] = [tail]
      if (DECL_LINE_RE.test(line.trim())) {                 // 行首声明 → 续行并入同一块
        for (let j = i + 1; j < lines.length; j += 1) {
          if (lines[j].trim() === '' || DECL_LINE_RE.test(lines[j].trim())) break
          block.push(lines[j])
        }
      }
      for (const raw of block) {
        for (const c of pathsInLine(raw)) {
          if (c.includes('*') || /^https?:/i.test(c)) continue
          if (isReviewSelfOutput(c)) continue
          out.push(c)
        }
      }
    }
  }
  void re
  return [...new Set(out)]
}

/** 触发判据说明（R7 第七轮 S0-2 修复）：生产接线点是 `scanTurnDeclarations()`（由 `univedge-reviewer.ts`
 *  的触发分支调用），其语义 = 调用 {@link extractReviewDeclarations} 且结果非空。
 *  此前另有一个零调用点的 `hasReviewDeclaration()` 谓词，已知会误导（文档/知识库把它当成生效判据）→ 已删除。 */

/** 谓词便捷包装（**测试与复现探针用**）：等价于 `extractReviewDeclarations(txt).length > 0`。
 *  生产触发判据的接线点是 `scanTurnDeclarations()`（见 `univedge-reviewer.ts` 触发分支注释）——
 *  不要把它写成"生效的触发判据"（R7 第七轮 S0-2 的教训：文档/知识库曾指向未接线的谓词）。 */
export function hasReviewDeclaration(txt: string): boolean {
  return extractReviewDeclarations(txt).length > 0
}

/** 用户文本白名单（R7 第十一轮 S0-1，**单一事实来源**）：只有 kind === 'user'（或缺失=旧日志）才算"人发的文本"。
 *  此前黑名单只排 subagent-report/settled，实测漏掉 `agent-instructions`（6 条）与 `plugin`（3 条）——
 *  后果：① 任务描述被取成 AGENTS.md 的 system-reminder（2188 字符，评估者拿到错误任务）；
 *  ② quiet / force 扫描会把**注入文本**里的 `--no-review` / `--force-review` 字面量当真
 *  （METHODOLOGY §1.7 正含这些字面量）→ 静默吞掉本应发生的审查。
 *  **四个扫描面（任务描述 / quiet / force / 声明）一律经本函数判定**：合并前声明扫描在本模块内联了
 *  同一判据，属"同库两套口径"的跨文件再现（与 R7 第九轮 S0-1 同型），故下沉至此（依赖方向 univedge-reviewer → shared）。 */
export function isUserAuthored(ev: any): boolean {
  const kind = ev?.data?.source?.kind
  return kind === undefined || kind === null || kind === 'user'
}

/** 事件级扫描：turn 窗口内 user/assistant 文本中的 @review 声明路径（P1 声明通道）。
 * 与 hasQuietDirective 同构（扫描同一类事件），独立函数便于单测。 */
export function scanTurnDeclarations(events: any[], startSeq: number, endSeq: number): string[] {
  const out: string[] = []
  for (const ev of events) {
    if (typeof ev.seq !== 'number' || ev.seq < startSeq || ev.seq > endSeq) continue
    if (ev.type !== 'user/message' && ev.type !== 'assistant/message') continue
    // R7 第十一轮 S0-1：经共享白名单判定（本轮合并——此前本处内联了与 univedge-reviewer 相同的判据）
    if (ev.type === 'user/message' && !isUserAuthored(ev)) continue
    const msg = ev.data?.message ?? ev.data
    const content = msg?.content ?? []
    const txt = content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('')
    out.push(...extractReviewDeclarations(txt))
  }
  return [...new Set(out)]
}

/** 评估者会话全文（2026-10-10 裁决 4：审查报告全文落盘）。
 *
 *  存在理由：`pickReport` 只取"含报告锚的**单条**最长消息"（实测落盘 review.md 仅 2–4 KB），
 *  而评估者的完整产出（逐项判定、中间核验、被截断的长分析）散在会话事件里——
 *  单份 141–183 K 字符，需解压 session.jsonl.zstd 才能读 → **审查历史不可直接复核**（B4 型）。
 *  本函数按 seq 顺序拼接全部 assistant 文本块，供落盘 `transcript.md` 归档。 */
export function transcriptOf(events: any[]): string {
  const parts: string[] = []
  for (const ev of events) {
    if (ev?.type !== 'assistant/message') continue
    const content = ev.data?.message?.content ?? []
    const txt = content
      .filter((b: any) => b?.type === 'text')
      .map((b: any) => b?.text ?? '')
      .join('')
      .trim()
    if (txt) parts.push(txt)
  }
  return parts.join('\n\n---\n\n')
}
