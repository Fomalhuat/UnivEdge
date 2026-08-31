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

/** 追加审查索引记录（时间/主会话/评估者/结论/关联任务/报告路径）。
 * S1-1 修复：首次创建用排他标志 wx（EEXIST 回退 append）——并发首写不丢记录；
 * S1-2 修复：函数内自建父目录 + 失败返回 false（由调用方记录，不静默吞）。
 * 返回 true=成功写入，false=失败（调用方应 diag）。 */
export function appendReviewIndex(root: string, rec: { mainId: string; childId: string; conclusion: string; task?: string; reportPath: string }): boolean {
  try {
    const file = reviewIndexPath(root)
    mkdirSync(dirname(file), { recursive: true }) // S1-2：自建父目录（不依赖调用顺序）
    const line = `| ${new Date().toISOString().slice(0, 19)} | ${String(rec.mainId).replace(/^session-/, '').slice(0, 8)} | ${String(rec.childId).replace(/^session-/, '').slice(0, 8)} | ${rec.conclusion} | ${rec.task ?? '—'} | ${rec.reportPath} |`
    const header = '# 审查索引（管理入口）\n\n> 每次审查落盘自动追加；按时间/任务/结论检索；时间=UTC；路径相对 UnivEdge 根；空报告也记录（结论=空）。\n\n| 时间 | 主会话 | 评估者 | 结论 | 关联任务 | 报告路径 |\n|---|---|---|---|---|---|\n'
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
