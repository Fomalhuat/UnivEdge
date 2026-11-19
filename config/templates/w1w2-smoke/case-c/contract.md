# 契约：w1w2-smoke-c（W1/W2 端到端）

- **目标**：验证 `@review` 声明 → 契约驱动档位 → R7 审查报告落盘 → INDEX 记录。
- **完成定义（DoD）**：reviewer 报告存在；`INDEX.md` 新增 `declared` 行；审查者 prompt 含 `SC-07` 与 `RC-08`。
- **验证标准与锚点**：`review_depth.py --run` 输出 `decision=T2 / coverage=1.0 / high_cost=true`；
  报告路径 `run/review/<main8>/<child8>/review.md`（可与 `reviewer child spawned` 日志对照）。
- **工作单元边界**：仅 `run/w1w2-smoke-c/**` 与审查链路；不改内核。
- **审查深度声明**：`review-depth.json`（coverage=1.0，high_cost=true）。
