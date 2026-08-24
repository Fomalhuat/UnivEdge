# knowledge/ — 知识库（记录系统）

UnivEdge 的记录系统，agent 可读。与"生成"解耦：这里是**已核实的事实与约定**，
不是临时笔记。所有条目遵循"可溯源、可复核"原则。

## 目录

| 文件 | 内容 | 关联 |
|---|---|---|
| `conventions.md` | 约定注册表：球谐负 m、符号引擎陷阱、积分技巧、单位制规范 | METHODOLOGY §1.2 物理量定义；VERIFICATION CC-01 |
| `review-lessons.md` | 复核教训库：基层（5 根因方向）+ 新增教训流程 + 分歧日志 | METHODOLOGY §1.5、§5.3；VERIFICATION RC-03 |
| `review-lessons-examples.md` | 教训例子层：按基展开的具体教训（领域资产，L3 按需，默认不随发布） | review-lessons.md 基层的展开 |
| `benchmarks.md` | 基准结果库：文献基准值、已知特解、可复现判据（B1-B7，2026-08-16 建立） | VERIFICATION NC-01/NC-06 的参照来源 |
| `claims.md` | 主张注册表：agent 产出的主张及其状态（claimed/verified/rejected，2026-08-16 建立） | METHODOLOGY §0.3 状态机 |
| `papers/` | 文献库：已核对论文、公式溯源、约定对照（PRD67/77/89，2026-08-16 建立） | METHODOLOGY §4 文献核对 |

## 使用约定

- **加载**：L3 按需检索（渐进披露），不常驻上下文；
- **写入**：只写已核实内容；每条带日期与来源；矛盾显式记录，不静默覆盖；
- **维护**：随项目实践逐步填充；定期将 docs/ 结论与 knowledge/ 对齐。
