/**
 * L1 义务不变量测试（"强制力不降"的可判定判据）
 *
 * 运行（在 dsh-adapter 目录）：
 *   <dsh>/node_modules/.bin/tsx --tsconfig <dsh>/tsconfig.json tests/l1-invariants.ts
 *
 * 用途：任何对 METHODOLOGY §0–§1 / review-lessons 基层（= L1 注入面）的改写（压缩、搬移、重写），
 * 必须保持本文件全绿。R7 审查（2026-10-10，报告见会话）指出两处必须显式处理的盲区，本文件据此设计：
 *
 *  1. **计数规则显式**（修 S0-2）：**一条断言 = 一个义务**；括号内子项不合并、逐条列出。
 *     因此 N 是确定的、可复核的，不依赖读者如何拆分。
 *  2. **定义级断言，而非仅关键词存在性**（修 S0-3）：关键词仍在、但判据被掏空是可以构造的
 *     （例：把四信号压成四个词名，"四信号"仍命中、判据全失）。故对四信号**逐条**断言
 *     「信号名 + 该信号的判据文字**在 200 字符内共现**」（就近约束，见 `dutyNear`）——
 *     注意：仅用全文 `includes` 只能挡住"压成词名"的钝刀式攻击，删掉 ②③④ 的判据文字仍会全绿
 *     （R7 第三轮 S0-1 已构造性复现），故必须就近；对 §1.7 保留文本所依赖的术语
 *     （capability/regression/retired/实质发现/20 次/查表不判断）做**依赖闭包**断言
 *     ——保留"使用处"而移走"定义处"会在此失败。
 *
 * 边界（诚实标注）：本文件是**代理判据**——它保证"操作义务与判据文字仍在 L1 中"，
 * 不保证"模型一定遵守"，也不覆盖语义改写（同义替换）导致的弱化。后者需 R7 审查。
 */
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { readL1 } from '../univedge-l1-inject.ts'

let pass = 0
let fail = 0
const rows: string[] = []

/**
 * **就近断言**（修 R7 第三轮 S0-1）：判据文字必须出现在信号名之后的 `maxGap` 字符内。
 * 理由：全文 `includes()` 只挡得住"把整块压成词名"的钝刀式攻击；把 ②③④ 的判据文字删掉、
 * 只留信号名则依旧全绿（R7 已构造性复现）。就近约束同时排除"跨节借词"。
 */
function dutyNear(group: string, obligation: string, anchorLit: string, criteriaLit: string, text: string, maxGap = 200): void {
  const i = text.indexOf(anchorLit)
  const j = i < 0 ? -1 : text.indexOf(criteriaLit, i)
  const ok = i >= 0 && j >= 0 && j - i <= maxGap
  ok ? pass++ : fail++
  rows.push(`| ${group} | ${obligation} | \`${anchorLit}\` +≤${maxGap}字符内 \`${criteriaLit}\` | ${ok ? '✅' : '❌'} |`)
}

/** 一条断言 = 一个义务（不做合并、不做括号展开） */
function duty(group: string, obligation: string, literal: string, text: string): void {
  const ok = text.includes(literal)
  ok ? pass++ : fail++
  rows.push(`| ${group} | ${obligation} | \`${literal}\` | ${ok ? '✅' : '❌'} |`)
}

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))  // 修 R7 第三轮 S2-5：路径含空格/非 ASCII 时 URL.pathname 会读失败
const l1 = readL1(repoRoot)

// ---------- A. §0 总则 / 产物状态机 / 产物格式（逐条） ----------
const A: Array<[string, string]> = [
  ['总则·锚点原则', '锚点原则'],
  ['总则·未锚定只标 claimed', 'claimed'],
  ['状态机·derived', 'derived'],
  ['状态机·analytically-checked', 'analytically-checked'],
  ['状态机·numerically-checked', 'numerically-checked'],
  ['状态机·data-supported', 'data-supported'],
  ['产物格式·假设清单', '假设清单'],
  ['产物格式·有效域', '有效域'],
  ['产物格式·误差预算', '误差预算'],
  ['产物格式·状态标签', '状态标签'],
  ['产物格式·锚点引用', '锚点引用'],
]
for (const [o, s] of A) duty('§0', o, s, l1)

// ---------- B. §1.1 执行框架 / §1.4 防死循环 ----------
const B: Array<[string, string]> = [
  ['§1.1·检索教训（每子任务必做）', '检索教训'],
  ['§1.1·基层内省', '基层'],
  ['§1.1·工具代算', '工具代算'],
  ['§1.4·防死循环', '防死循环'],
  ['§1.4·连续失败达阈值', '连续失败达阈值'],
  ['§1.4·强制反思', '强制反思'],
  ['§1.4·迭代上限 MAX_ITER', 'MAX_ITER'],
]
for (const [o, s] of B) duty('§1.1/§1.4', o, s, l1)

// ---------- C. §1.2 任务契约（模板字段逐条） ----------
const C: Array<[string, string]> = [
  ['契约·任务契约本身', '任务契约'],
  ['契约·启动自省', '启动自省'],
  ['自省·B1', 'B1'],
  ['自省·B2', 'B2'],
  ['自省·B3', 'B3'],
  ['自省·B4', 'B4'],
  ['自省·P 流程', 'P 流程'],
  ['契约·物理量定义判据', '物理量定义'],
  ['契约·配置基线', '配置基线'],
  ['契约·副作用前核对清单', '副作用前核对清单'],
  ['核对·步长 h', '步长 h'],
  ['核对·截断 lmax', '截断 lmax'],
  ['核对·GL 节点', 'GL 节点'],
  ['核对·轨道半径 r_p', 'r_p'],
  ['核对·对照值 reference', 'reference'],
  ['核对·对端配置', '对端配置'],
  ['核对·gate 脚本可执行化', 'slurm_submit_template.sh'],
  ['契约·完成定义 DoD', '完成定义'],
  ['契约·工作单元边界', '工作单元边界'],
  ['契约·单元结束即审查', '单元结束即审查'],
  ['契约·硬阈值（任一不达标即整体不通过）', '硬阈值'],
  ['契约·验证标准', '验证标准'],
  ['契约·测试计划', '测试计划'],
  ['测试计划·概要层', '概要层'],
  ['测试计划·明细层', '明细层'],
  ['契约·锚点', '锚点：独立参照'],
  ['契约·权限等级', '权限等级'],
  ['契约·预计产物', '预计产物'],
]
for (const [o, s] of C) duty('§1.2', o, s, l1)

// ---------- D. §1.3 权限门 / §1.5 复核回写 / §1.6 产物存储 ----------
const D: Array<[string, string]> = [
  ['§1.3·L0 只读', 'L0 只读'],
  ['§1.3·L1 本地写', 'L1 本地写'],
  ['§1.3·L2 高危', 'L2 高危'],
  ['§1.3·检查→中断→批准链', '检查 → 中断 → 批准'],
  ['§1.5·复核回写', '复核回写'],
  ['§1.5·沉淀为规则', '沉淀'],
  ['§1.5·根因基', '根因基'],
  ['§1.6·产物存储（宿主提供）', '产物存储'],
  ['§1.6·任务工作区', '任务工作区'],
  ['§1.6·换宿主不迁移', '不迁移'],
  ['§1.6·不入版本库', '不入版本库'],
]
for (const [o, s] of D) duty('§1.3–§1.6', o, s, l1)

// ---------- E. §1.7 审查触发：操作面 + 定义级判据 + 依赖闭包 ----------
const E: Array<[string, string]> = [
  ['§1.7·轨道 1 完成宣告', '轨道 1'],
  ['§1.7·轨道 2 决策门', '轨道 2'],
  ['§1.7·宣告语法 @review', '@review'],
  ['§1.7·quiet 指令 --no-review', '--no-review'],
  ['§1.7·quiet 指令 review:off', 'review:off'],
  ['§1.7·修订不自动重宣', '修订不自动重宣'],
  ['§1.7·档位·轻量审查', '轻量审查'],
  ['§1.7·档位·全量审查', '全量审查'],
  ['§1.7·双对象审查', '双对象'],
  ['§1.7·兜底（防漏审）', '兜底'],
  ['§1.7·观察期说明', '观察期'],
  ['§1.7·四信号（概念）', '四信号'],
  ['§1.7·四信号·任一命中即触发', '任一命中即触发'],
  // 定义级（修 S0-3）：信号名与其判据文字必须同时在场，压缩成词名即失败
  ['§1.7·信号①名', '能力边界'],
  ['§1.7·信号②名', '下游代价'],
  ['§1.7·信号③名', '生命周期边界'],
  ['§1.7·信号④名', '变更事件'],
  // 依赖闭包（修 S0-3 第二段 / S1-4）：保留文本依赖的术语，其定义亦须在场
  ['§1.7·依赖·工作类型状态表', '工作类型状态表'],
  ['§1.7·依赖·capability', 'capability'],
  ['§1.7·依赖·regression', 'regression'],
  ['§1.7·依赖·retired', 'retired'],
  ['§1.7·依赖·查表不判断', '查表不判断'],
  ['§1.7·依赖·实质发现（状态迁移判据）', '实质发现'],
  ['§1.7·依赖·同类审查 20 次阈值', '20 次'],
]
for (const [o, s] of E) duty('§1.7', o, s, l1)

// ---------- E2. 四信号判据的就近断言（修 R7 第三轮 S0-1） ----------
// 逐信号、逐判据：判据文字须出现在信号名后 200 字符内。删掉任一判据文字即失败。
const NEAR: Array<[string, string, string]> = [
  ['信号①·跨实现对照 → B4', '能力边界', 'B4 参照独立性'],
  ['信号①·离散化/插值/截断 → B3', '能力边界', '有效域'],
  ['信号①·约定类自由度 → B2', '能力边界', 'B2 语义'],
  ['信号①·宣布根因 → B1/P', '能力边界', '宣布根因'],
  ['信号②·长作业', '下游代价', '长作业'],
  ['信号②·全链重算', '下游代价', '全链重算'],
  ['信号②·归档交付', '下游代价', '归档交付'],
  ['信号②·成为后续锚点', '下游代价', '成为后续锚点'],
  ['信号③·跨 session', '生命周期边界', '跨 session'],
  ['信号③·context reset', '生命周期边界', 'context reset'],
  ['信号③·进入下一工作单元', '生命周期边界', '进入下一工作单元'],
  ['信号③·handoff artifact', '生命周期边界', 'handoff artifact'],
  ['信号④·模型升级', '变更事件', '模型升级'],
  ['信号④·参照库或基准更新', '变更事件', '参照库或基准更新'],
  ['信号④·约定或有效域变更', '变更事件', '约定或有效域变更'],
  ['信号④·已审产物依赖项改动', '变更事件', '已审产物的依赖项改动'],
  ['信号④·重审受影响者', '变更事件', '重审受影响者'],
]
for (const [o, a, c] of NEAR) dutyNear('§1.7·定义级', o, a, c, l1)
// 注意：`四信号` 的首次出现在 §1.2（"对应 §1.7 四信号皆不命中"），故不能用它做就近锚点，
// 改用 L1 中逐字存在的共现串（避免跨节借词导致的假通过）。
duty('§1.7·定义级', '四信号 + 任一命中即触发（同一列表项）', '四信号（任一命中即触发', l1)

// ---------- F. 基层五根因方向 + 确认纪律 ----------
const F: Array<[string, string]> = [
  ['基层·B1 无依据断言', 'B1 无依据断言'],
  ['基层·B2 语义歧义', 'B2 语义歧义'],
  ['基层·B3 工具/方法误用', 'B3 工具/方法误用'],
  ['基层·B4 验证失效', 'B4 验证失效'],
  ['基层·P 流程执行', 'P 流程执行'],
  ['确认纪律·4 类情形', '4 类情况'],
  ['确认纪律·①方向分叉', '方向分叉'],
  ['确认纪律·②新契约/契约变更', '新契约'],
  ['确认纪律·③结论化', '结论化'],
  ['确认纪律·④外部副作用', '外部副作用'],
  ['确认纪律·不以问句结尾', '不以问句结尾'],
]
for (const [o, s] of F) duty('基层/确认纪律', o, s, l1)

// ---------- G. 结构完整性（搬移不得破坏层级） ----------
const G: string[] = [
  '## UnivEdge 方法论 L1 层',
  '## 0. 总则',
  '### 0.1', '### 0.2', '### 0.3', '### 0.4',
  '## 1. 通用执行框架',
  '### 1.1', '### 1.2', '### 1.3', '### 1.4', '### 1.5', '### 1.6', '### 1.7',
  '## 基层',
]
for (const s of G) duty('结构', `层级完整：${s}`, s, l1)

// ---------- H. 证据新鲜度门（2026-10-10 加固） ----------
// 为什么按 **L1 文本本身** 而不是输入文件整文做指纹：
//   L1 = METHODOLOGY §0–§1 + review-lessons `## 基层` 两个**切片**；整文件指纹会因切片外的改动
//   （版本头、§2+、分歧日志）产生**假警报**（2026-10-10 实测：review-lessons 只加了分歧日志行，L1 未变却报不一致）。
// 为什么基线单独存 JSON 而不是读落盘的 .md：
//   用法是 `tsx tests/l1-invariants.ts > test-results/xxx.md`，shell 会在**测试开始前截断**该文件——
//   若基线取自它，每次都会被读成空 → 门形同虚设。故基线写到独立的 `test-results/l1-baseline.json`
//   （由测试自己写，不经重定向）。
// 行为：L1 文本变化且未刷新基线 → **测试失败**并打印刷新命令（`bash dsh-adapter/run-tests.sh --update-l1-baseline`；
// 等价的底层开关是环境变量 UNIVEDGE_UPDATE_L1_BASELINE=1，供脚本内部使用）。
{
  const l1Hash = createHash('sha256').update(l1).digest('hex').slice(0, 16)
  const baselinePath = join(repoRoot, 'dsh-adapter', 'test-results', 'l1-baseline.json')  // 刷新：bash dsh-adapter/run-tests.sh --update-l1-baseline
  const shouldUpdate = process.env.UNIVEDGE_UPDATE_L1_BASELINE === '1'
  let freshNote = ''
  if (shouldUpdate || !existsSync(baselinePath)) {
    writeFileSync(baselinePath, `${JSON.stringify({
      note: 'L1 义务不变量基线的内容指纹（按 L1 文本本身，非输入整文）；L1 变化后请运行：bash dsh-adapter/run-tests.sh --update-l1-baseline（底层等价开关 UNIVEDGE_L1…等见 run-tests.sh）',
      l1Chars: l1.length,
      l1Lines: l1.split('\n').length,
      l1Sha256_16: l1Hash,
      updatedAt: new Date().toISOString(),
    }, null, 2)}\n`, 'utf8')
    freshNote = shouldUpdate ? '已刷新（UNIVEDGE_UPDATE_L1_BASELINE=1）' : '基线不存在 → 已创建'
  } else {
    const base = JSON.parse(readFileSync(baselinePath, 'utf8')) as { l1Sha256_16?: string; l1Chars?: number }
    if (base.l1Sha256_16 === l1Hash) {
      freshNote = `一致（${l1Hash}，${base.l1Chars} 字符）`
    } else {
      freshNote = `**已过期**：基线 ${base.l1Sha256_16}（${base.l1Chars} 字符）≠ 现值 ${l1Hash}（${l1.length} 字符）`
    }
  }
  const fresh = freshNote.startsWith('一致') || freshNote.startsWith('已刷新') || freshNote.startsWith('基线不存在')
  fresh ? pass++ : fail++
  rows.push(`| H·证据新鲜度 | L1 内容指纹与基线一致（证据未过期） | \`${l1Hash}\` ${freshNote}${fresh ? '' : '——请运行 `bash dsh-adapter/run-tests.sh --update-l1-baseline` 并提交 test-results/l1-baseline.json（见 docs/08 §7）'} | ${fresh ? '✅' : '❌'} |`)
}

// ---------- 输出 ----------
// R7 第五轮 S2-4：落盘时记录**输入文件指纹**——否则知识库改动（如 review-lessons 的基层段）
// 会让基线静默过期而不自知。指纹算法与 reviewer 插件同源（size/mtime/sha256前12）。
const inputs = [join(repoRoot, 'METHODOLOGY.md'), join(repoRoot, 'knowledge/review-lessons.md')]
const inputFingerprints = inputs.map((f) => {
  try {
    const st = statSync(f)
    const h = createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 12)
    return `  - \`${f.replace(repoRoot + '/', '')}\` → ${st.size}B/${new Date(st.mtimeMs).toISOString()}/${h}`
  } catch { return `  - \`${f}\` → （读取失败）` }
})

const lines = [
  '# L1 义务不变量测试结果（"强制力不降"的可判定判据）',
  '',
  `- 日期：${new Date().toISOString().slice(0, 10)}`,
  '- 命令：`tsx --tsconfig <dsh>/tsconfig.json tests/l1-invariants.ts`',
  '- 计数规则：**一条断言 = 一个义务**（括号子项逐条列出，不合并）——N 是确定的',
  '- 判据层次：关键词存在性 + **定义级**（信号名与其判据文字同时在场）+ **依赖闭包**（保留文本依赖的术语其定义亦须在场）',
  `- L1 实测规模：${l1.length} 字符 / ${l1.split('\n').length} 行`,
  '- 边界：本测试是代理判据——保证"义务与判据文字仍在 L1 中"，**不**保证模型遵守，**不**覆盖同义改写的弱化',
  '- **基线 = L1 内容指纹**（`test-results/l1-baseline.json`；L1 变化后运行 `bash dsh-adapter/run-tests.sh --update-l1-baseline` 刷新）',
  '- 以下为**输入整文件**指纹（仅供参考，**不**作为判据——切片外改动不应触发过期）：',
  ...inputFingerprints,
  '',
  '| 组 | 义务 | 断言文本 | 结果 |',
  '|---|---|---|---|',
  ...rows,
  '',
  `**${pass}/${pass + fail} 通过, ${fail} 失败**`,
]
process.stdout.write(lines.join('\n') + '\n')
process.exit(fail > 0 ? 1 : 0)
