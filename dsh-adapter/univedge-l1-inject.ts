import type { Context } from '@deepseek-ai/cordis'
import { readFileSync, existsSync, appendFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
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
 * L1 字符预算门（**单一事实来源**：本插件与 `tests/l1-seat.ts` 共用，避免两处漂移）。
 *
 * **为什么门放在注入路径上**（R7 第二轮 S0-1）：仓内无 CI、无 git hook，也没有任何东西调用单元测试；
 * 只在测试里设门，实测语义是"下次有人手动跑测试时才报错"，与该门要防的失效模式同构。
 * 故门由 {@link render} 在**每次提示组装**求值时检查，越界即写诊断日志告警，不依赖任何人记得跑测试。
 *
 * **取值依据（政策选择，不是换算产物）**（R7 第三轮 S0-2）：原值 10,560 = 6000 × 1.76 是
 * "被判定未标定"的换算比的乘法残余，与"该比值不参与判据"的声明自相矛盾。现改为：
 *
 *     L1_CHAR_LIMIT = 10,520  ≈  8,093 × 1.30 = 10,520.9（**向下取整**）  // 政策余量 +30%
 *
 * 即门限只由"当前实测字符数 × 政策余量"定义，与任何 token 换算比无关。
 * 判据用**字符**（可直接测量、无换算歧义）；token 数一律标"未标定估计"，不作判据。
 * 门限可用 `UNIVEDGE_L1_CHAR_LIMIT` 覆盖（测试与临时调门用）。
 */
export const L1_CHAR_LIMIT = 10520

/** 生效的门限：默认 {@link L1_CHAR_LIMIT}，可用 `UNIVEDGE_L1_CHAR_LIMIT` 覆盖。 */
export function l1CharLimit(): number {
  const raw = Number(process.env.UNIVEDGE_L1_CHAR_LIMIT)
  return Number.isFinite(raw) && raw > 0 ? raw : L1_CHAR_LIMIT
}

/**
 * 诊断日志（与 univedge-reviewer 同惯例：`/tmp/univedge-*.log`）。
 * 存在理由：留痕**注册侧**事实——何时、为哪个 session/workspace 注册了 section。
 * 更正（2026-10-10 实测）：系统提示**是落盘的**，位于 `request/header` 事件的 `data.header.system`
 * （换座位后该字段 14387 字符且含 L1 段；旧机制时期为 6292 字符、不含 L1）。
 * 故本日志不是 L1 可核性的唯一来源，而是对 request/header 不记录的"注册时刻/注册对象"的补充；
 * `analyze_session.py` 以 request/header 记录为首选判定源，本日志为次选。
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
/**
 * L1 证据新鲜度门的**运行时触达路径**（R7 第八轮 S1-5）：
 * 与尺寸门同构——测试若只被手动运行，门就不会自己响（该缺陷 2026-10-10 已被裁决为必须下沉）。
 * 这里在**每次提示组装**求值 L1 时，顺带比对 `dsh-adapter/test-results/l1-baseline.json` 记录的基线指纹：
 *   - 基线缺失（生产环境/未建基线）→ **不告警**（门只对维护者有意义，不打扰普通用户）；
 *   - 基线存在但与现值不符 → 在 section 前追加一行告警，提示刷新证据（agent 与用户当轮可见）。
 */
function baselineSha(root: string): string | undefined {
  // **不做缓存**（R7 第十轮 S1-5 的断言当场抓到的缺陷）：曾用 `(path, mtimeMs)` 作缓存键，
  // 但在同一 mtime 刻度内重写基线（且新旧 sha 串长度相同 → size 也相同）时缓存不失效，
  // 门会持续报"过期"。基线文件只有几百字节，且 L1 本身每请求都要读两个更大的文件，
  // 省这一次小读属过早优化 —— 正确性优先，取消缓存。
  const path = join(root, 'dsh-adapter', 'test-results', 'l1-baseline.json')
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as { l1Sha256_16?: string }
    return parsed.l1Sha256_16
  } catch {
    return undefined
  }
}

/** 已告警的键集合：**按 `workspace + 尺寸 + 门限` 去重**——同一尺寸只告警一次避免每请求刷屏；
 * 用集合而非单一变量，避免同进程多 agent / 多 workspace 时互相抑制（R7 第四轮 S2-5）。 */
const warned = new Set<string>()

function render(root: string): string {
  try {
    const text = readL1(root)
    const limit = l1CharLimit()
    if (text.length > limit) {
      const key = `${root}:${text.length}:${limit}`
      if (!warned.has(key)) {
        warned.add(key)
        diag('WARN l1 size over budget', `chars=${text.length}`, `limit=${limit}`,
          `over=${(100 * (text.length / limit - 1)).toFixed(1)}%`,
          '→ 显式决定：接受并上调 L1_CHAR_LIMIT / 瘦身（预案见 run/l1-trim/plan.md）')
      }
      // R7 第四轮 S2-2：越界只写日志仍属"有人看才起作用"→ 把告警行并入 section 文本，
      // 使 agent 与用户当轮即见（门因此真正"迫使显式决定"），日志留痕供审计。
      return `> ⚠ UnivEdge L1 尺寸超预算：${text.length} 字符 > 门限 ${limit}（政策余量 +30%）。`
        + `请显式决定：上调 L1_CHAR_LIMIT / 瘦身（预案见 run/l1-trim/plan.md）。\n\n${text}`
    }
    // 证据新鲜度（与尺寸门同构的运行时触达）：基线存在且不符 → 告警一行
    const expected = baselineSha(root)
    const actual = createHash('sha256').update(text).digest('hex').slice(0, 16)
    if (expected !== undefined && expected !== actual) {
      const key = `baseline:${root}:${expected}:${actual}`
      if (!warned.has(key)) {
        warned.add(key)
        diag('WARN l1 evidence stale', `baseline=${expected}`, `current=${actual}`)
      }
      return `> ⚠ UnivEdge L1 与 ` + '`test-results/l1-baseline.json`' + ` 记录的基线不一致（基线 ${expected} ≠ 现值 ${actual}）：内核文档已改但验证证据未刷新。`
        + `请运行 \`bash dsh-adapter/run-tests.sh --update-l1-baseline\` 并提交基线 + 证据。\n\n${text}`
    }
    return text
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
