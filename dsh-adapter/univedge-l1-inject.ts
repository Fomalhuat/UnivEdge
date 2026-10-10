import type { Context } from '@deepseek-ai/cordis'
import { readFileSync, existsSync, appendFileSync } from 'node:fs'
import { join, dirname } from 'node:path'

export const name = 'univedge-l1-inject'

/**
 * 依赖声明：`systemPrompt` 服务就绪后再 apply。
 * dsh 插件加载器识别模块级 `inject`（in-tree 先例：packages/client/ui-deliverables/src/index.ts:12，经
 * packages/bundle/web-app/cordis.patch.yml 作为插件加载）。
 */
export const inject = ['systemPrompt']

/**
 * L1 section 的名字与次序。
 * order 约定（packages/core/system-prompt/src/index.ts:56-60）：`-100` harness 身份、`-99` harness 源码、
 * `0` 部署 persona、`100–199` 工具指导。L1 取 10 —— 排在 persona 之后、工具指导之前，即"先是谁、再是纪律、后是工具"。
 */
export const L1_SECTION_NAME = 'univedge:l1'
export const L1_SECTION_ORDER = 10

/**
 * 诊断日志（与 univedge-reviewer 同惯例：`/tmp/univedge-*.log`）。
 * 存在理由：**系统提示不落盘**（实测：app-boot 的 harness 源码 section 特征串在 session.jsonl.zstd 中 0 命中），
 * 因此"L1 已注册"这一事实在会话日志里不可见，只能由本日志留痕供审计。
 * 路径可用 `UNIVEDGE_L1_LOG` 覆盖（测试用：避免测试注册污染生产审计日志）。
 */
function diagPath(): string {
  return process.env.UNIVEDGE_L1_LOG ?? '/tmp/univedge-l1.log'
}

function diag(...args: unknown[]): void {
  try {
    appendFileSync(diagPath(), `[${new Date().toISOString()}] ${args.map(String).join(' ')}\n`)
  } catch {
    // 诊断不可用不影响注入本身。
  }
}

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
 * 逐级向上找含 METHODOLOGY.md 的目录；找不到返回 undefined（不注册，避免干扰其他 workspace）。
 */
export function findUnivEdgeRoot(start: string | undefined): string | undefined {
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
export function readL1(root: string): string {
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
    '## UnivEdge 方法论 L1 层（常驻规范：METHODOLOGY §0+§1 + review-lessons 基层）',
    '',
    l1,
    '',
    base,
    '',
    CONFIRM_DISCIPLINE,
  ].join('\n')
}

/**
 * section 文本求值：每次提示组装时从磁盘重读（保持"与源同步"，与旧版每步注入的行为一致）。
 * 读取失败时降级为可读告警而非抛错——provider 抛错会波及整次组装，等于让方法论层拖垮会话。
 */
function render(root: string): string {
  try {
    return readL1(root)
  } catch (error) {
    return [
      '## UnivEdge 方法论 L1 层加载失败',
      '',
      `读取 ${root} 下的 METHODOLOGY.md / knowledge/review-lessons.md 失败：${(error as Error).message}`,
      '',
      '本次组装未提供 L1。请手动加载 METHODOLOGY.md §0/§1 与 knowledge/review-lessons.md 基层后再动手。',
    ].join('\n')
  }
}

/** 每个 agent 只播种一次：同层同名 section 重复注册会 throw。 */
const seeded = new WeakMap<object, 'registered' | 'skipped'>()

function seedSection(agent: any): void {
  if (agent === undefined || agent === null) return
  if (seeded.has(agent)) return
  if (typeof agent.ctx?.inject !== 'function') return // 作用域不可用：不记状态，留给下次重试
  const root = findUnivEdgeRoot(agent.session?.header?.cwd)
  if (root === undefined) {
    seeded.set(agent, 'skipped') // 非 UnivEdge workspace：不注册，且不必每步重走目录发现
    return
  }
  seeded.set(agent, 'registered')
  // 在 agent 自己的作用域注册 → 只对本会话生效，并随会话作用域释放而注销。
  // 用 dsh in-tree 惯用法 `agent.ctx.inject([服务], cb)`（先例：packages/context/file-reference-local/src/index.ts:69）
  // 而非直接属性访问——服务未就绪时直接访问会撞上 Cordis 的未知属性抛错。
  agent.ctx.inject(['systemPrompt'], (scope: any) => {
    scope.systemPrompt.section({
      name: L1_SECTION_NAME,
      order: L1_SECTION_ORDER,
      text: () => render(root),
    })
    diag('l1 section registered', `session=${agent.session?.header?.id}`, `workspace=${root}`)
  })
}

export function apply(ctx: Context): void {
  // 主路径：会话启动即把 L1 注册为系统提示 section。
  // L1 因此恒在系统提示中（每次请求重新组装 → 对 compaction 免疫），且不进入对话流（不再显示为用户消息）。
  ctx.on('agent/session-start', ({ agent }) => {
    seedSection(agent)
  })

  // 兜底：若 session-start 晚于首个请求的提示组装，首步补播种。
  // 幂等（WeakMap 去重），且**不注入任何消息**——与旧版"缺失补精简版"的本质区别。
  ctx.on('agent/pre-step', async ({ agent }, next) => {
    seedSection(agent)
    return next()
  })
}
