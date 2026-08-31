import type { Context } from '@deepseek-ai/cordis'
import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { isArtifactPath, textHasDeliverable, reviewOutDir, emptyOutDir, pickReport } from './reviewer-shared'

/** 诊断日志（临时，定位后移除）。 */
function diag(...args: any[]): void {
  try {
    appendFileSync('/tmp/univedge-reviewer.log', `[${new Date().toISOString()}] ${args.map(String).join(' ')}\n`)
  } catch { /* ignore */ }
}

export const name = 'univedge-reviewer'
export const inject = ['subagents', 'agents']

/** 审查输出目录（相对 workspace 根）。hasDeliverable 的排除判断与写盘路径必须引用同一常量——
 * "审查自输出目录永不触发审查"（防自激循环）是通用原则，不依赖具体使用者的工作流；
 * 若改输出目录，只需改此处，排除逻辑自动同步（可移植性）。 */
const REVIEW_DIR = 'run/review'

/** 从 workspace（session cwd）向上发现 UnivEdge 根：含 METHODOLOGY.md 的目录。 */
function findUnivEdgeRoot(start: string | undefined): string | undefined {
  let dir = start
  for (let depth = 0; dir && depth < 16; depth += 1) {
    if (existsSync(join(dir, 'METHODOLOGY.md'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return undefined
}

/** 提取审查输入包：任务描述 + 最终回复（窗口化——L2-5）+ 产物路径。 */
function extractReviewInput(session: any, startSeq = 0, endSeq = Number.MAX_SAFE_INTEGER): { task: string; finalReply: string; artifacts: string[] } {
  let task = ''
  let finalReply = ''
  const artifacts = new Set<string>()
  const cwd = session?.header?.cwd ?? ''
  const evts = session?.events ?? []
  for (const ev of evts) {
    if (ev.type === 'user/message') {
      const content = ev.data?.content ?? []
      const txt = content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('')
      if (!task && txt.trim()) task = txt.trim().slice(0, 4000)
    } else if (ev.type === 'assistant/message' && typeof ev.seq === 'number' && ev.seq >= startSeq && ev.seq <= endSeq) {
      // 只取触发轮区间内的回复（多轮任务中不取旧轮内容）
      const msg = ev.data?.message
      const content = msg?.content ?? []
      const txt = content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('')
      if (txt.trim()) finalReply = txt.trim().slice(0, 6000)
    } else if (ev.type === 'tool/call') {
      const data = ev.data ?? {}
      const s = JSON.stringify(data)
      // 提取 workspace 下的产物路径（run/ 目录或 cwd 下的相对/绝对路径）
      const re = new RegExp(`${cwd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s"']{3,200}`, 'g')
      for (const m of s.match(re) ?? []) {
        if (/\.(md|txt|json|yaml|yml|log|csv)$/i.test(m) && !/node_modules/.test(m)) artifacts.add(m)
      }
    }
  }
  return { task, finalReply, artifacts: [...artifacts].slice(0, 12) }
}

/** 触发判据：本 turn 内是否有"实质交付物"（写了产物文件 OR 文本明确指向产物文件）。
 * 无交付物的轮次（讨论/中间探索）不触发审查——审查的功能是产物质量把关，不是任务管理。
 * 实现要点（R7 审查 6f11970 修订）：
 * - 信号 A：反序列化取路径字段匹配（原 `$` 锚定对 JSON 序列化永不匹配，是死代码——L0-1）；
 *   白名单不含 todo_write（只写计划文本，非交付——L1-3）；
 * - 信号 B：只匹配"完成态动词 + 文件名"（排除未来式规划句如"下一步将写入 x.md"——L1-2）。
 */
function hasDeliverable(session: any, startSeq: number, endSeq: number): boolean {
  const evts = session?.events ?? []
  for (const ev of evts) {
    if (typeof ev.seq !== 'number' || ev.seq < startSeq || ev.seq > endSeq) continue
    if (ev.type === 'tool/call') {
      const name = ev.data?.name ?? ev.data?.tool ?? ''
      if (!['write', 'edit', 'str_replace_editor'].includes(name)) continue
      // 先反序列化取路径字段精确匹配；失败回退字符串匹配
      let hit = false
      try {
        const parsed = typeof ev.data === 'object' ? ev.data : JSON.parse(String(ev.data ?? '{}'))
        const candidates: string[] = [
          parsed?.file_path, parsed?.path, parsed?.file, parsed?.filePath, parsed?.new_path, parsed?.newPath,
          ...(Array.isArray(parsed?.items) ? parsed.items : []),
        ].filter((p): p is string => typeof p === 'string')
        hit = candidates.some(isArtifactPath)
      } catch { /* fall through */ }
      if (!hit) {
        const s = JSON.stringify(ev.data ?? {})
        const paths = s.match(/[^\s"']{1,200}\.(?:md|json|txt|log|csv|yaml|yml|dat)\b/gi) ?? []
        hit = paths.some((p) => isArtifactPath(p.replace(/^"|"$/g, '')))
      }
      if (hit) return true
    } else if (ev.type === 'assistant/message') {
      const msg = ev.data?.message
      const content = msg?.content ?? []
      const txt = content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('')
      // 文本层按"路径片段粒度"判定（S1-4）：存在完成态动词+非自输出路径即交付
      if (textHasDeliverable(txt)) return true
    }
  }
  return false
}

/** 本 turn 的起点 seq（最近的 turn/start；turn 字段缺失时回退到最后一个 user/message——L2-4）。 */
function turnStartSeq(session: any, turn: number): number {
  let seq = 0
  let lastUser = 0
  for (const ev of session?.events ?? []) {
    if (typeof ev.seq !== 'number') continue
    if (ev.type === 'turn/start' && ev.data?.turn === turn) seq = ev.seq
    if (ev.type === 'user/message') lastUser = ev.seq
  }
  return seq || lastUser || 0
}

/** 构造评估者 prompt（怀疑派立场，L2 上下文解耦声明，问题分级）。 */
function buildReviewerPrompt(root: string, input: { task: string; finalReply: string; artifacts: string[] }): string {
  const lines = [
    '你是 UnivEdge 的独立审查评估者（R7，怀疑派）。以下是主 agent 完成物理科研任务后的审查请求。',
    '',
    '【立场】产物"合格" = 你找不出实质性问题。你的职责是尽力找出问题（锚点缺失、手算代替工具、约定/量纲错误、验证失效、假设未声明等），而不是确认工作。',
    '',
    '【审查规范】先读 workspace 的审查规范，再按规范逐条审查：',
    `- ${join(root, 'METHODOLOGY.md')} 的 §5（怀疑派评估器）`,
    `- ${join(root, 'VERIFICATION.md')}（检查项列表，若存在）`,
    '',
    '【审查输入包】',
    `- 任务描述：\n${input.task || '（无）'}`,
    '',
    `- 主 agent 最终回复：\n${input.finalReply || '（无）'}`,
    '',
    input.artifacts.length
      ? `- 产物文件（请读取核实）：\n${input.artifacts.map((a) => `  - ${a}`).join('\n')}`
      : '- 产物文件：未在日志中识别到明确路径，请自行在工作区 run/ 等目录查找产物',
    '',
    '【问题分级（重要，决定哪些需要用户确认；严重度 S 系列，区别于权限门 L 系列与解耦等级——L1-1）】',
    '- **S0 实质问题**（会导致错误结论或违反核心方法论：锚点缺失、手算冒充、约定/量纲错误、验证失效）：必须列出，每条标注【需用户确认】；',
    '- **S1 有文档依据的问题**（仓库文档/代码已明确但产物未遵循，如约定注册表已有条目、METHODOLOGY 明示规则）：自行判定并直接给出修正建议（引用依据出处），**不要求用户确认**；',
    '- **S2 建议项**（改进空间、风格、可选优化）：只列出，不进确认流。',
    '',
    '【输出格式】审查报告，包含：',
    '1. 结论：通过 / 需修订（标注 S0 问题数）',
    '2. S0 实质问题清单（如有）：每条含严重程度 + 证据 + 建议 + 【需用户确认】',
    '3. S1 有依据问题（如有）：每条含依据出处 + 修正建议',
    '4. S2 建议项（如有）',
    '5. 逐条检查意见摘要（对照 VERIFICATION 检查项）',
    '6. 解耦声明：说明你在独立上下文运行，仅见审查输入包与产物文件（L2 上下文解耦），未见过主 agent 的推理链。',
  ]
  return lines.join('\n')
}

export function apply(ctx: Context): void {
  let mainId: string | undefined
  diag('apply called')

  // 记录主 agent（第一个 session-start；子 agent 的 origin 是 subagent，不会覆盖）
  ctx.on('agent/session-start', ({ agent }: { agent: any }) => {
    // S2-5：mainId 只取非 subagent 会话（子代理先启动不会定错主会话）
    if (!mainId && agent.session?.header?.origin !== 'subagent') {
      mainId = agent.id
      diag('main session-start:', agent.id, 'cwd:', agent.session?.header?.cwd)
    }
  })

  ctx.on('session/event', (session: any, event: any) => {
    if (event?.type !== 'turn/end') return
    diag('turn/end seen: session', session.id, 'origin:', session.header?.origin, 'mainId:', mainId)
    if (mainId !== undefined && session.id !== mainId) return
    if (session.header?.origin === 'subagent') return
    // 触发判据：本 turn 有实质交付物才审查（无产物的讨论轮不触发）
    const turn = event.data?.turn
    const endSeq = event.seq
    const startSeq = turnStartSeq(session, turn)
    if (!hasDeliverable(session, startSeq, endSeq)) {
      diag('turn', turn, 'no deliverable, skip review')
      return
    }
    diag('turn', turn, 'has deliverable, triggering runReview')
    void runReview(ctx, session, turn, startSeq, endSeq)
  })
}

async function runReview(ctx: Context, session: any, turn?: number, startSeq?: number, endSeq?: number): Promise<void> {
  diag('runReview start, cwd:', session.header?.cwd)
  const cwd = session.header?.cwd
  const root = findUnivEdgeRoot(cwd)
  if (!root) {
    diag('not UnivEdge workspace, skip')
    return
  }

  const input = extractReviewInput(session, startSeq ?? 0, endSeq ?? Number.MAX_SAFE_INTEGER)
  if (!input.task && !input.finalReply) {
    diag('no content to review, skip')
    return
  }

  const prompt = buildReviewerPrompt(root, input)
  const parent = ctx.agents.get(session.id) as any
  if (!parent) {
    diag('parent agent not found in registry')
    return
  }
  diag('parent found:', parent.id)

  // 5 分钟超时保护
  const signal = AbortSignal.timeout(300_000)
  let childId: string | undefined

  try {
    const started = await (ctx.subagents as any).startContinuable({
      provider: 'spawn',
      label: 'univedge-review',
      request: {
        prompt: [{ type: 'text', text: prompt }],
        parent,
        signal,
        agentOptions: {},
      },
      signal,
    })
    childId = started.childId
    diag('reviewer child spawned:', childId)
  } catch (e) {
    diag('spawn failed:', String(e))
    return
  }

  // 等待评估者子 agent 完成第一轮（turn/end）
  try {
    await new Promise<void>((resolve, reject) => {
      const off = ctx.on('session/event', (s: any, ev: any) => {
        if (s?.id === childId && ev?.type === 'turn/end') {
          off()
          resolve()
        }
      })
      signal.addEventListener('abort', () => {
        off()
        reject(new Error('review timeout'))
      }, { once: true })
    })
    diag('reviewer child turn/end received')
  } catch (e) {
    diag('wait failed:', String(e))
    // 缺陷 6：超时中止后迟到 turn/end 的完整报告回收——先查当前会话事件，再挂迟到监听，杜绝静默丢失
    void collectLateReport(ctx, root, session, childId, startSeq, endSeq)
    return
  }

  // 读评估者回复（缺陷 4 + S2-2：pickReport 取"含报告标志的实质消息中最长"，防摘要桩也防长分析顶掉）
  const child = ctx.agents.get(childId as any) as any
  const report = pickReport(child?.session?.events ?? [])
  diag('report length:', report.length)

  if (!report) {
    // 缺陷 2：空报告显式落盘（含 childId/时间/turn 窗口），而非静默 return——供诊断 token/速率限制
    diag('no report text, persisting empty-report record')
    persistEmpty(root, session, childId, startSeq, endSeq)
    return
  }

  // 写审查报告（缺陷 3：按评估者会话分目录，杜绝后写覆盖先写）
  persistReport(root, session, childId, report)
}

/** 写审查报告（缺陷 3：按评估者会话分目录）。 */
function persistReport(root: string, session: any, childId: string, report: string): void {
  const dir = reviewOutDir(root, session.id, childId)
  mkdirSync(dir, { recursive: true })
  const file = join(dir, 'review.md')
  writeFileSync(file, `# 独立审查报告（R7）\n\n- 主会话: ${session.id}\n- 评估者会话: ${childId}\n- 生成时间: ${new Date().toISOString()}\n\n---\n\n${report}\n`, 'utf8')
  diag('report written:', file)
}

/** 空报告/中止记录落盘（缺陷 2 + 缺陷 6）。 */
function persistEmpty(root: string, session: any, childId: string, startSeq?: number, endSeq?: number): void {
  const shortChild = String(childId).replace(/^session-/, '').slice(0, 8)
  const emptyDir = emptyOutDir(root, session.id)
  mkdirSync(emptyDir, { recursive: true })
  writeFileSync(join(emptyDir, `${shortChild}.md`),
    `# 空报告记录\n\n- 主会话: ${session.id}\n- 评估者会话: ${childId}\n- 时间: ${new Date().toISOString()}\n- turn 窗口: ${startSeq}-${endSeq}\n- 状态: 评估者结束但未产出文本（可能 token 额度/速率限制或超时中止）\n`, 'utf8')
}

/** 缺陷 6：超时中止后回收迟到报告——先查当前会话事件（竞态窗口），再挂迟到监听（限时 5 分钟），
 * 仍无报告则落盘"中止"记录。杜绝"wait failed 后直接 return"导致的迟到完整报告静默丢失。 */
async function collectLateReport(ctx: Context, root: string, session: any, childId: string | undefined, startSeq?: number, endSeq?: number): Promise<void> {
  if (!childId) return
  diag('collectLateReport start, child:', childId)
  const tryPick = (): string => {
    const child = ctx.agents.get(childId as any) as any
    return pickReport(child?.session?.events ?? [])
  }
  // 1) 竞态窗口：wait failed 瞬间可能已产出（如 turn/end 刚完成但事件未及时送达）
  const immediate = tryPick()
  if (immediate) {
    diag('late report already available, persisting')
    persistReport(root, session, childId, immediate)
    return
  }
  // 2) 挂迟到监听（限时 5 分钟）：子代理稍后完成 turn/end 则回收
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { off(); reject(new Error('late report timeout')) }, 300_000)
      const off = ctx.on('session/event', (s: any, ev: any) => {
        if (s?.id === childId && ev?.type === 'turn/end') {
          clearTimeout(timer)
          off()
          resolve()
        }
      })
    })
    const late = tryPick()
    if (late) {
      diag('late report recovered')
      persistReport(root, session, childId, late)
    } else {
      diag('late turn/end but no report text, persisting empty')
      persistEmpty(root, session, childId, startSeq, endSeq)
    }
  } catch {
    // 3) 迟到超时仍无报告 → 落盘"中止"记录（可诊断）
    diag('late report timeout, persisting abort record')
    persistEmpty(root, session, childId, startSeq, endSeq)
  }
}
