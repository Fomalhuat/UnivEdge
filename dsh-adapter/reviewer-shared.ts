/**
 * univedge-reviewer 共享逻辑（单一事实来源——源码与测试共同 import，防常量/逻辑漂移，S1-2 闭合）
 *
 * 审查自输出语义（用户裁定 2026-08-31）：
 * - 正式审查报告：run/review/<主8>/<评估者8>/review.md（分目录写盘）
 * - 空报告记录：  run/review/<主8>/empty/<评估者8>.md
 * - 自检产物：    run/review-selfcheck*（selfcheck 输入包/报告属审查流程自输出）
 * - **不排除**（重新进入审查面，S1-1 收窄）：handoff-*.md、r7- 存档目录、其他 run/review/ 下审计文档
 */
export const REVIEW_DIR = 'run/review'

const HEX8 = '[0-9a-fA-F]{8}'

/** 是否审查自输出路径（精确模式，非整目录排除）。 */
export function isReviewSelfOutput(p: string): boolean {
  if (!p.includes('run/')) return false
  // 分目录正式报告：run/review/<主8>/<评估者8>/review.md
  if (new RegExp(`${REVIEW_DIR}/${HEX8}/${HEX8}/review\\.md$`).test(p)) return true
  // 空报告记录：run/review/<主8>/empty/
  if (new RegExp(`${REVIEW_DIR}/${HEX8}/empty/`).test(p)) return true
  // 自检产物目录（用户裁定）
  if (p.includes('run/review-selfcheck')) return true
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

/** 报告提取：含报告标志的实质消息中取最长（S2-2：防"长分析/长报错"顶掉报告，也防摘要桩）。 */
export function pickReport(events: any[]): string {
  const REPORT_FLAG = /(结论|需修订|通过|S0|S1|S2|解耦声明|审查报告)/i
  let best = ''
  for (const ev of events) {
    if (ev.type !== 'assistant/message') continue
    const content = ev.data?.message?.content ?? []
    const txt = content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('').trim()
    if (!txt) continue
    if (!REPORT_FLAG.test(txt)) continue // 只考虑含报告标志的消息（排除纯思考/中间输出）
    if (txt.length > best.length) best = txt
  }
  return best
}
