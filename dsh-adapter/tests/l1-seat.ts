/**
 * L1 座位迁移单元测试（L1 从"用户消息注入"改为"会话作用域 system prompt section"）
 *
 * 运行（在 dsh-adapter 目录）：
 *   <dsh>/node_modules/.bin/tsx --tsconfig <dsh>/tsconfig.json tests/l1-seat.ts
 *
 * 覆盖：
 *  - L1 内容完整性：readL1 提取 METHODOLOGY §0+§1 + review-lessons 基层（关键标记逐项）
 *  - section 注册行为（伪宿主，无需 dsh 运行）：名称/次序/文本 provider、幂等性、非 UnivEdge workspace 跳过、
 *    服务未就绪不误记状态、pre-step 兜底不改写 next() 决策
 *  - 静态回归守卫：源码不得再出现消息注入（agent.inject / source.kind='user'）与旧的双时机补齐逻辑
 *  - workspace 根发现：workspace 自身/子目录命中、/tmp 与 undefined 不命中
 *  - 审计留痕：注册事实写入 /tmp/univedge-l1.log（系统提示**落盘于 request/header**（2026-10-10 实测），
 *    诊断日志补的是 request/header 不记录的"注册时刻/对象"；2026-10-10 R7 审查修 S1-5 前此处误写为"不落盘"）
 */
import { readFileSync, existsSync, rmSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { name, inject, apply, readL1, findUnivEdgeRoot, L1_SECTION_NAME, L1_SECTION_ORDER, L1_CHAR_LIMIT, l1CharLimit } from '../univedge-l1-inject.ts'

let pass = 0
let fail = 0
const results: string[] = []

function check(caseName: string, got: unknown, expected: unknown, ref = ''): void {
  const ok = JSON.stringify(got) === JSON.stringify(expected)
  ok ? pass++ : fail++
  results.push(`| ${caseName} | ${JSON.stringify(expected)} | ${JSON.stringify(got)} | ${ref} | ${ok ? '✅' : '❌'} |`)
}

// 主体包进 async 函数：tsx 以 cjs 输出时不支持顶层 await。
async function main(): Promise<void> {
// 测试用的诊断日志写到临时文件（UNIVEDGE_L1_LOG 覆盖），避免污染生产审计日志 /tmp/univedge-l1.log
const diagPath = '/tmp/univedge-l1-test.log'
process.env.UNIVEDGE_L1_LOG = diagPath
try { rmSync(diagPath, { force: true }) } catch { /* 不存在即可 */ }

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(dirname(here))
const sourcePath = join(repoRoot, 'dsh-adapter', 'univedge-l1-inject.ts')
const source = readFileSync(sourcePath, 'utf8')

// ---------- 1. 导出契约（dsh 插件加载器读取的字段） ----------
check('插件名', name, 'univedge-l1-inject', '契约')
check('依赖声明含 systemPrompt', inject, ['systemPrompt'], '契约')
check('section 名', L1_SECTION_NAME, 'univedge:l1', '契约')
check('section 次序（persona 0 之后、工具 100+ 之前）', L1_SECTION_ORDER > 0 && L1_SECTION_ORDER < 100, true, '契约')
check('apply 是函数', typeof apply, 'function', '契约')

// ---------- 2. L1 内容完整性（readL1 提取） ----------
const l1 = readL1(repoRoot)
check('L1 首行为 section 标题', l1.split('\n')[0].includes('UnivEdge 方法论 L1 层'), true, '内容')
check('L1 规模 > 4000 字符（全量，非精简版）', l1.length > 4000, true, '内容')
for (const marker of ['B1', 'B2', 'B3', 'B4', 'P 流程', '启动自省', '确认纪律', '锚点原则', '任务契约', '状态机', 'claimed', '产物格式', '工具代算', '审查触发']) {
  check(`L1 含标记「${marker}」`, l1.includes(marker), true, '内容')
}

// ---------- 3. L1 字符预算门（尺寸监控；防"每次版本头悄悄长大"） ----------
// **判据用字符**（可直接测量、无换算歧义）。R7 审查（2026-10-10）指出：原实现以
// "6000 tokens × 1.76 字符/token"折算字符门，而该比值**未标定**——它是
// "（文本+推理字符）/ output tokens"的输出侧口径，不是输入侧中文比，且 reasoning 是否回传未知；
// 全库复算同一口径得 0.22（仅文本）～2.39（含推理），跨内容类型在 2.2–3.4 波动。
// 故：**门以字符定义**；token 数一律标"估计（换算比未标定）"，不得用于判据。
// 增长趋势（git 逐 commit 重建实测）：08-27 4,537 → 10-10 7,691 字符（+70%/6 周）；
// 增量主要来自版本头：v0.10 +606、v0.11 +835、v0.12 +1,290 字符。
// 取值：**政策余量** round(8,093 × 1.30) = 10,520（与任何 token 换算比无关；原值 10,560 是"6000 tokens × 1.76"的乘积，已废弃——R7 第三轮 S0-2）。
// 越过即须**显式决定**（接受并上调门 / 瘦身）。
// 字符门常量来自插件（**单一事实来源**，见 univedge-l1-inject.ts 的 L1_CHAR_LIMIT 注释）——
// 插件在**每次提示组装**时检查并告警（门真正会被触达）；本测试断言"当前未越界"。
const L1_CHARS_PER_TOKEN_EST = 1.76 // 仅供"量级参考"，**未标定**，不参与判据，也不参与门限取值
check('L1 尺寸在字符门内', l1.length <= L1_CHAR_LIMIT, true,
  `字符门 ${L1_CHAR_LIMIT}（现值 ${l1.length} 字符；≈${Math.round(l1.length / L1_CHARS_PER_TOKEN_EST)} tokens 为未标定估计）`)
check('L1 首行标题（度量脚本判定串）', l1.split('\n')[0].startsWith('## UnivEdge 方法论 L1 层'), true, '预算门')
check('未设环境覆盖时门限 = 默认常量', l1CharLimit(), L1_CHAR_LIMIT, '预算门')
for (const h of ['## 0. 总则', '## 1. 通用执行框架']) {
  check(`结构完整：${h}`, l1.includes(h), true, '预算门')
}
for (const s of ['### 1.1', '### 1.2', '### 1.3', '### 1.4', '### 1.5', '### 1.6', '### 1.7']) {
  check(`结构完整：${s}`, l1.includes(s), true, '预算门')
}

// ---------- 4. workspace 根发现 ----------
check('workspace 自身', findUnivEdgeRoot(repoRoot), repoRoot, '发现')
check('子目录向上命中', findUnivEdgeRoot(join(repoRoot, 'dsh-adapter', 'tests')), repoRoot, '发现')
check('非 UnivEdge 目录不命中', findUnivEdgeRoot('/tmp'), undefined, '发现')
check('cwd 缺失不命中', findUnivEdgeRoot(undefined), undefined, '发现')

// ---------- 5. section 注册行为（伪宿主） ----------
interface Captured {
  name: string
  order: number
  text: string | ((context: unknown) => string)
}
const handlers: Record<string, (...args: any[]) => any> = {}
const fakeCtx: any = { on: (event: string, handler: (...args: any[]) => any) => { handlers[event] = handler } }
apply(fakeCtx)
check('注册 session-start 处理器', typeof handlers['agent/session-start'], 'function', '接口')
check('注册 pre-step 兜底处理器', typeof handlers['agent/pre-step'], 'function', '接口')

const captured: Captured[] = []
const injectCalls: string[][] = []
const makeScope = () => ({ systemPrompt: { section: (cfg: Captured) => { captured.push(cfg); return () => {} } } })
const makeAgent = (cwd: string, id: string, withScope = true): any => ({
  session: { header: { cwd, id } },
  ctx: withScope
    ? { inject: (deps: string[], cb: (scope: unknown) => void) => { injectCalls.push(deps); cb(makeScope()) } }
    : {},
})

const a1 = makeAgent(repoRoot, 'session-test-0001')
handlers['agent/session-start']({ agent: a1 })
check('session-start 注册 1 个 section', captured.length, 1, '注册')
check('section 名（agent 作用域）', captured[0]?.name, 'univedge:l1', '注册')
check('section 次序', captured[0]?.order, 10, '注册')
check('text 为 provider（每请求求值，与源同步）', typeof captured[0]?.text, 'function', '注册')
const rendered = typeof captured[0]?.text === 'function' ? (captured[0].text as (c: unknown) => string)({}) : ''
check('provider 返回全量 L1', rendered.length > 4000 && rendered.includes('B1'), true, '注册')

handlers['agent/session-start']({ agent: a1 })
check('重复 session-start 不重复注册（同名会 throw）', captured.length, 1, '幂等')

const sentinel = { kind: 'enter', messages: [] }
const decision = await handlers['agent/pre-step']({ agent: a1 }, () => sentinel)
check('pre-step 不改写 next() 决策', decision, sentinel, '兜底')
check('pre-step 对已注册 agent 不重复注册', captured.length, 1, '幂等')

const a2 = makeAgent('/tmp', 'session-test-0002')
handlers['agent/session-start']({ agent: a2 })
handlers['agent/pre-step']({ agent: a2 }, () => sentinel)
check('非 UnivEdge workspace 不注册（且不干扰用户）', captured.length, 1, '隔离')

const a3 = makeAgent(repoRoot, 'session-test-0003', false)
handlers['agent/session-start']({ agent: a3 })
check('作用域不可用时不注册', captured.length, 1, '时序')
check('作用域不可用时不误记状态（未调用 inject）', injectCalls.length, 1, '时序')
a3.ctx.inject = (deps: string[], cb: (scope: unknown) => void) => { injectCalls.push(deps); cb(makeScope()) }
handlers['agent/pre-step']({ agent: a3 }, () => sentinel)
check('作用域就绪后兜底补注册', captured.length, 2, '时序')
check('按 dsh 惯用法声明依赖（agent.ctx.inject）', injectCalls[1], ['systemPrompt'], '时序')

// ---------- 6. 审计留痕（注册事实需独立留痕） ----------
const diagText = existsSync(diagPath) ? readFileSync(diagPath, 'utf8') : ''
check('注册事实写入诊断日志（含 session id）', diagText.includes('session=session-test-0001'), true, '审计')
check('注册事实写入诊断日志（含 workspace 根）', diagText.includes(`workspace=${repoRoot}`), true, '审计')

// ---------- 7. 静态回归守卫 ----------
check('源码不再注入消息（agent.inject）', source.includes('agent.inject('), false, '回归')
check('源码不再出现用户消息身份（kind: user）', /kind:\s*'user'/.test(source), false, '回归')
check('旧版每步补精简版逻辑已删除（readL1Brief）', source.includes('readL1Brief'), false, '回归')
check('旧版上下文扫描已删除（l1InContext）', source.includes('l1InContext'), false, '回归')
check('源码含模块级 inject 声明', source.includes("inject = ['systemPrompt']"), true, '回归')
check('源码用 in-tree 惯用法 agent.ctx.inject（避开未知属性抛错）', source.includes("agent.ctx.inject(['systemPrompt']"), true, '回归')
check('源码不直接属性访问服务（agent.ctx.systemPrompt）', source.includes('agent.ctx.systemPrompt'), false, '回归')
check('section 注册限制在 agent 作用域（非全局 ctx.systemPrompt）', /\bctx\.systemPrompt\.section\(/.test(source), false, '回归')

// ---------- 8. 门在注入路径上真的会响（R7 第二轮 S0） ----------
// 只在测试里设门 = 没人执行（仓内无 CI / 无 hook / 无人调用本文件）。
// 故门已下沉到插件的 render()（每次提示组装求值），此处用压低门限的方式实测告警确实触发。
process.env.UNIVEDGE_L1_CHAR_LIMIT = '100'
const diagBefore = existsSync(diagPath) ? readFileSync(diagPath, 'utf8') : ''
const overLimitText = typeof captured[0]?.text === 'function' ? (captured[0].text as (c: unknown) => string)({}) : ''
const diagAfter = existsSync(diagPath) ? readFileSync(diagPath, 'utf8') : ''
delete process.env.UNIVEDGE_L1_CHAR_LIMIT
check('未设 env 时门限 = 默认常量', l1CharLimit() === L1_CHAR_LIMIT, true, '门·触发')
process.env.UNIVEDGE_L1_CHAR_LIMIT = '12345'
check('env 覆盖真的生效（可临时调门）', l1CharLimit() === 12345, true, '门·触发')
delete process.env.UNIVEDGE_L1_CHAR_LIMIT
check('越界时 provider 仍正常返回文本（不中断组装）', overLimitText.length > 4000, true, '门·触发')
check('越界时返回文本含告警行（agent/用户当轮即见——R7 第五轮 S1-4a 反例）',
  overLimitText.startsWith('> ⚠ UnivEdge L1 尺寸超预算'), true, '门·触发')
check('越界时写入 WARN 告警（门真的会响）',
  diagAfter.length > diagBefore.length && diagAfter.includes('WARN l1 size over budget'), true, '门·触发')

// ---------- 9. 运行时证据新鲜度门（R7 第十轮 S1-5：机制此前只有 /tmp 日志一行、无断言防护） ----------
// 与尺寸门同构：在伪根 + 伪宿主上调 provider，三态（不符/一致/缺失）逐态断言。
// 缺此断言时，该门若日后被重构破坏，四套测试仍全绿（B4 型静默失效）。
{
  const fx = mkdtempSync(join(tmpdir(), 'l1gate-'))
  mkdirSync(join(fx, 'knowledge'), { recursive: true })
  mkdirSync(join(fx, 'dsh-adapter/test-results'), { recursive: true })
  writeFileSync(join(fx, 'METHODOLOGY.md'), '## 0. 总则\n\n测试用最小 L1。\n\n## 2. 任务类\n')
  writeFileSync(join(fx, 'knowledge/review-lessons.md'), '## 基层\n\nB1 x\n\n## 新增教训流程\n\n（略）\n')
  const baselinePath = join(fx, 'dsh-adapter/test-results/l1-baseline.json')
  const renderOnce = (): string => {
    const captured: any[] = []
    const handlers: Record<string, any> = {}
    const agent: any = {
      session: { header: { cwd: fx, id: 'session-gate' } },
      ctx: { inject: (_d: string[], cb: any) => cb({ systemPrompt: { section: (c: any) => captured.push(c) } }) },
    }
    apply({ on: (e: string, h: any) => { handlers[e] = h } } as any)
    handlers['agent/session-start']({ agent })
    return typeof captured[0]?.text === 'function' ? (captured[0].text as (c: unknown) => string)({}) : ''
  }
  writeFileSync(baselinePath, JSON.stringify({ l1Sha256_16: 'deadbeefdeadbeef' }))
  check('运行时门：基线不符 → 渲染文本以 ⚠ 告警开头', renderOnce().startsWith('> ⚠ UnivEdge L1'), true, 'S1-5')
  const goodSha = createHash('sha256').update(readL1(fx)).digest('hex').slice(0, 16)
  writeFileSync(baselinePath, JSON.stringify({ l1Sha256_16: goodSha }))
  check('运行时门：基线一致 → 无告警', renderOnce().startsWith('> ⚠'), false, 'S1-5')
  rmSync(baselinePath)
  check('运行时门：基线缺失 → 静默（不打扰生产用户，已声明盲区）', renderOnce().startsWith('> ⚠'), false, 'S1-5')
  rmSync(fx, { recursive: true, force: true })
}

// ---------- 输出 ----------
const lines = [
  '# L1 座位迁移单元测试结果（用户消息注入 → 系统提示 section）',
  '',
  `- 日期：${new Date().toISOString().slice(0, 10)}`,
  '- 命令：`<dsh>/node_modules/.bin/tsx --tsconfig <dsh>/tsconfig.json tests/l1-seat.ts`',
  '- 覆盖：导出契约 + L1 内容完整性 + **L1 token 预算门（尺寸监控）** + workspace 根发现 + section 注册行为（伪宿主，无需 dsh 运行）+ 审计留痕 + 静态回归守卫',
  '- 边界说明：本测试用伪宿主验证插件自身的注册逻辑；**宿主集成（真实 dsh 提示组装中 L1 是否出现）需重启实例后验证**，本测试不对其作断言。',
  '',
  '| 用例 | 期望 | 实测 | 关联 |',
  '|---|---|---|---|',
  ...results,
  '',
  `**${pass}/${pass + fail} 通过, ${fail} 失败**`,
]
process.stdout.write(lines.join('\n') + '\n')
process.exit(fail > 0 ? 1 : 0)
}

void main()
