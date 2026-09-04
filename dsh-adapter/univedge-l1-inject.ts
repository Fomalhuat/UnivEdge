import type { Context } from '@deepseek-ai/cordis'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'

export const name = 'univedge-l1-inject'

/**
 * 确认纪律（注入器层行为约定，2026-09-02 加入）：
 * 澄清 §1 确认义务的执行粒度——锚点自检仍是每步内化义务，但"停下来问用户"
 * 从默认动作改为仅 4 类条件触发。目的：抑制"每 turn 结尾都问方向"的过度确认，
 * 同时不削弱锚点自检的约束力（自检内化，确认外化）。
 */
const CONFIRM_DISCIPLINE = `【确认纪律（澄清 §1 确认义务的粒度——本纪律优先）】
锚点自检是每步内化义务，不停止；但自检结果不必逐条以问句形式汇报给用户。
仅以下 4 类情况停下来向用户确认：
① 方向分叉：存在 ≥2 条可行路径，且选择影响后续任务；
② 新契约/契约变更：完成定义或验证标准未定、或需实质变更；
③ 结论化：产物将进入 claimed/verified 状态、写入知识库、或对外交付；
④ 外部副作用：push/删除/写 workspace 外文件/发外部消息等。
纯执行步骤（跑脚本/读文件/分析/生成中间产物）直接做，收尾用进展简报（"已做 X，结果 Y，下一步 Z"），不以问句结尾。
用户已给出方向或说"你判断"时，收敛为推荐 + 自执行；同一事项不重复确认。`

/**
 * 从 workspace（session cwd）向上发现 UnivEdge 根：
 * 逐级向上找含 METHODOLOGY.md 的目录；找不到返回 undefined（不注入，避免干扰其他 workspace）。
 */
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

/** 提取 UnivEdge L1 层：METHODOLOGY §0+§1 + review-lessons 基层（与 METHODOLOGY 加载协议 L1 一致）。 */
function readL1(root: string): string {
  const methodology = readFileSync(join(root, 'METHODOLOGY.md'), 'utf8')
  const lines = methodology.split('\n')
  const start = lines.findIndex((l) => l.startsWith('## 0.'))
  const end = lines.findIndex((l) => l.startsWith('## 2.'))
  const l1 = start >= 0 && end > start ? lines.slice(start, end).join('\n') : ''

  const reviewLessons = readFileSync(join(root, 'knowledge/review-lessons.md'), 'utf8')
  const rlStart = reviewLessons.indexOf('## 基层')
  const rlEnd = reviewLessons.indexOf('## 新增教训流程')
  const base = rlStart >= 0 && rlEnd > rlStart ? reviewLessons.slice(rlStart, rlEnd) : ''

  return [
    '以下是你必须遵循的 UnivEdge 方法论 L1 层（每次任务开始必加载，来自 METHODOLOGY §0+§1 与 review-lessons 基层）：',
    '',
    l1,
    '',
    base,
    '',
    CONFIRM_DISCIPLINE,
  ].join('\n')
}

/** 精简版 L1（长会话保障，~25 行）：基层 + 契约要点 + 产物格式。基层动态提取（与源同步），要点为稳定摘要。 */
function readL1Brief(root: string): string {
  const reviewLessons = readFileSync(join(root, 'knowledge/review-lessons.md'), 'utf8')
  const rlStart = reviewLessons.indexOf('## 基层')
  const rlEnd = reviewLessons.indexOf('## 新增教训流程')
  const base = rlStart >= 0 && rlEnd > rlStart ? reviewLessons.slice(rlStart, rlEnd).trim() : ''

  return [
    '以下是你必须遵守的 UnivEdge 方法论精简版（每步自省提醒；完整版与任务契约模板见 workspace 的 METHODOLOGY.md）：',
    '',
    '【启动自省（B1-B4+P，动手前逐条内省）】',
    base,
    '',
    '【任务契约要点（动手前声明）】完成定义 + 验证标准 + 测试计划（概要层给研究者：测试项+判据+目的；明细层给评估器）+ 配置基线 + 已知参照值。',
    '【状态机】未锚定（无独立参照）的结论只能标 claimed；LLM 无权自标 verified，须经独立验证/人工复核。',
    '【审查触发】产物达到 claimed（完成态、可被独立验证）时宣告审查请求（宿主语法 @review <路径>，可列多路径）；响应审查意见的修订不自动重宣；quiet: --no-review / review:off。',
    '【产物格式】假设清单 + 有效域 + 误差预算 + 状态标签。',
    '【工具代算】LLM 永不手算作为最终产物；符号/数值计算由工具执行，并做独立交叉验证（多路线互证）。',
    '【确认纪律】锚点自检每步内化不停；但仅 4 类情况停下来问用户：①方向分叉 ②新契约/契约变更 ③产物结论化（claimed/verified/入库/交付）④外部副作用（push/删除/写 workspace 外）。纯执行步骤直接做，收尾用进展简报（"已做 X，结果 Y，下一步 Z"），不以问句结尾；用户已给方向时收敛为推荐+自执行；同一事项不重复确认。',
  ].join('\n')
}

/** 检查 L1（全量或精简版）是否已在模型可见上下文（session surface）。在则跳过注入——省 token；compaction 影子化后自动恢复。 */
function l1InContext(agent: any): boolean {
  const events = agent.session?.events ?? []
  const nodes = agent.session?.surface?.nodes ?? []
  for (const seq of nodes) {
    const ev = events[seq]
    if (ev?.type === 'user/message') {
      const content = ev.data?.content ?? []
      const txt = content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('')
      if (txt.includes('UnivEdge 方法论')) return true
    }
  }
  return false
}

export function apply(ctx: Context): void {
  // 会话启动：注入全量 L1（L0 AGENTS.md 之外的完整方法论层）
  ctx.on('agent/session-start', ({ agent }) => {
    const cwd = agent.session.header.cwd
    const root = findUnivEdgeRoot(cwd)
    if (!root) return
    agent.inject({
      content: [{ type: 'text', text: readL1(root) }],
      source: { kind: 'user' },
    })
  })

  // 长会话保障：每步前检查 L1 是否仍在模型可见上下文；被 compaction 压缩/影子化后自动重新注入精简版。
  // 与 agent-instructions（AGENTS.md 每步注入）同模式；仅在 L1 缺失时注入，避免每步重复的 token 成本。
  ctx.on('agent/pre-step', async ({ agent }, next) => {
    const root = findUnivEdgeRoot(agent.session.header.cwd)
    if (!root) return next()
    if (l1InContext(agent)) return next()
    agent.inject({
      content: [{ type: 'text', text: readL1Brief(root) }],
      source: { kind: 'user' },
    })
    return next()
  })
}
