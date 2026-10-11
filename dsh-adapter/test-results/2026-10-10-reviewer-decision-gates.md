# 测试落盘：reviewer-decision-gates

- 日期：2026-10-11
- 命令：`tsx --tsconfig <dsh>/tsconfig.json tests/reviewer-decision-gates.ts`
- 场景：审查四项裁决实现（漂移即失效 / 同目标复用 + --force-review / auto 最小间隔常量 / 报告全文落盘）
- 依据：`run/review/handoff-reviewer-overreview.md` §六 待裁决 1/2/4（裁决 3 为触发路径参数，见源码 `AUTO_MIN_GAP_MIN` 注释）

| 用例 | 期望 | 实际 | 依据 | 结果 |
|---|---|---|---|---|
| --force-review 识别 | true | true | 裁决2 | ✅ |
| review: force 识别 | true | true | 裁决2 | ✅ |
| quiet 字面量不误判为 force | false | false | 裁决2 | ✅ |
| 普通讨论文本不触发 | false | false | 裁决2 | ✅ |
| 同清单 + 同指纹 → 复用 | true | true | 裁决2 | ✅ |
| 清单顺序无关（内部排序比较） | true | true | 裁决2 | ✅ |
| 任一产物指纹变化 → 不复用（宁审勿漏） | false | false | 裁决2 | ✅ |
| 清单不同 → 不复用 | false | false | 裁决2 | ✅ |
| 无上轮记录 → 不复用 | false | false | 裁决2 | ✅ |
| 清单为空 → 不复用 | false | false | 裁决2 | ✅ |
| 产物不存在（读取失败）→ 不复用 | false | false | 裁决2 | ✅ |
| transcriptOf：多消息按 seq 顺序拼接 | 第一段

---

第二段 | 第一段

---

第二段 | 裁决4 | ✅ |
| transcriptOf：无可提取文本 → 空串 |  |  | 裁决4 | ✅ |
| 漂移：报告头标"已失效" | true | true | 裁决1 | ✅ |
| 漂移：报告头声明为机制判定 | true | true | 裁决1 | ✅ |
| 漂移：报告头状态行标注 | true | true | 裁决1 | ✅ |
| 漂移：索引结论带失效后缀 | true | true | 裁决1 | ✅ |
| 全文落盘：transcript.md 存在 | true | true | 裁决4 | ✅ |
| 全文落盘：内容正确 | true | true | 裁决4 | ✅ |
| 无漂移：报告头不标失效 | false | false | 裁决1 | ✅ |
| 无漂移：索引结论不带失效后缀 | false | false | 裁决1 | ✅ |
| transcript 缺省 → 不落盘（可选参数） | false | false | 裁决4 | ✅ |
| 复用记录：通道列标 declared-reuse | true | true | 裁决2 | ✅ |
| 复用记录：结论标注复用来源 | true | true | 裁决2 | ✅ |
| 复用记录：报告路径指向上轮 | true | true | 裁决2 | ✅ |

**25/25 通过, 0 失败**
