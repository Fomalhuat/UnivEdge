import type { Context } from '@deepseek-ai/cordis'
import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync } from 'node:fs'
import { join, dirname } from 'node:path'

/** 诊断日志（临时，定位后移除）。 */
function diag(...args: any[]): void {
  try {
    appendFileSync('/tmp/univedge-reviewer.log', `[${new Date().toISOString()}] ${args.map(String).join(' ')}\n`)
  } catch { /* ignore */ }
}

export const name = 'univedge-reviewer'
export const inject = ['subagents', 'agents']

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

/** 提取审查输入包：任务描述 + 最终回复 + 产物路径。 */
function extractReviewInput(session: any): { task: string; finalReply: string; artifacts: string[] } {
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
    } else if (ev.type === 'assistant/message') {
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

/** 构造评估者 prompt（怀疑派立场，L2 上下文解耦声明）。 */
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
    '【输出格式】审查报告，包含：',
    '1. 结论：通过 / 不通过 / 需修订',
    '2. 逐条检查意见（对照 VERIFICATION 检查项）',
    '3. 实质问题清单（如有）：每条含严重程度 + 证据 + 建议',
    '4. 解耦声明：说明你在独立上下文运行，仅见审查输入包与产物文件（L2 上下文解耦），未见过主 agent 的推理链。',
  ]
  return lines.join('\n')
}

export function apply(ctx: Context): void {
  let mainId: string | undefined
  diag('apply called')

  // 记录主 agent（第一个 session-start；子 agent 的 origin 是 subagent，不会覆盖）
  ctx.on('agent/session-start', ({ agent }: { agent: any }) => {
    if (!mainId) {
      mainId = agent.id
      diag('main session-start:', agent.id, 'cwd:', agent.session?.header?.cwd)
    }
  })

  ctx.on('session/event', (session: any, event: any) => {
    if (event?.type !== 'turn/end') return
    diag('turn/end seen: session', session.id, 'origin:', session.header?.origin, 'mainId:', mainId)
    if (mainId !== undefined && session.id !== mainId) return
    if (session.header?.origin === 'subagent') return
    diag('triggering runReview')
    void runReview(ctx, session)
  })
}

async function runReview(ctx: Context, session: any): Promise<void> {
  diag('runReview start, cwd:', session.header?.cwd)
  const cwd = session.header?.cwd
  const root = findUnivEdgeRoot(cwd)
  if (!root) {
    diag('not UnivEdge workspace, skip')
    return
  }

  const input = extractReviewInput(session)
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
    return
  }

  // 读评估者最终回复
  let report = ''
  const child = ctx.agents.get(childId as any) as any
  const evts = child?.session?.events ?? []
  for (const ev of evts) {
    if (ev.type === 'assistant/message') {
      const msg = ev.data?.message
      const content = msg?.content ?? []
      const txt = content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('')
      if (txt.trim()) report = txt.trim()
    }
  }
  diag('report length:', report.length)

  if (!report) {
    diag('no report text')
    return
  }

  // 写审查报告到 run/review/<mainId-prefix>/review.md
  const shortId = String(session.id).replace(/^session-/, '').slice(0, 8)
  const dir = join(root, 'run', 'review', shortId)
  mkdirSync(dir, { recursive: true })
  const file = join(dir, 'review.md')
  writeFileSync(file, `# 独立审查报告（R7）\n\n- 主会话: ${session.id}\n- 评估者会话: ${childId}\n- 生成时间: ${new Date().toISOString()}\n\n---\n\n${report}\n`, 'utf8')
  diag('report written:', file)
}
