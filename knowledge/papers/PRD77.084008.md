# PRD 77.084008 —— Regularization of fields for self-force problems in curved spacetime

- **作者**：Ian Vega, Steven Detweiler（Florida, 2008）
- **本地 PDF**：`C:\Users\wu_ha\WorkBuddy\2026-07-25-12-51-42\papers\PhysRevD.77.084008.pdf`
- **核对日期**：2026-08-14（Step 4C-Full 对照）、2026-08-10（用户复现过程，见 08-10 交接摘要）
- **核对范围**：有效源方法（effective-source）；时间域正则化框架；Table 数据一致性

## 已核对内容

### 1. 有效源方法（Effective-Source Approach）
- 核心思想：把奇异部分吸收进源项，构造**有效源** S_eff = −(□Φ) + 源 使得演化量 = 正则（residual）场；
- 远程 `THZ-effective-source`（用户仓库）基于该方法 + PRD67 THZ 坐标实现，成功复现理论结果 **ψ^R(R) = −1.0495947e-3**（2026-08，用户验证）；
- 与本内核 ret−singular 路线互证：Φ_res 差 **0.0086%**（两种完全独立的方法收敛到同一物理值——最强正确性证据）。

### 2. 时间域正则化（Detweiler-Whiting 分解）
- 场分解为 retarded − singular；奇异场用局部构造（THZ 坐标 4 阶展开）；
- 对应本内核 Step 4C 的 **Φ_res = Φ_ret − Φ_S** 构造（用户 Teukolsky ret 数据 − THZ 4 阶奇异场）。

## 与本内核产物的关联

- benchmarks **B6**（有效源方法 ψ^R(R) = −1.0495947e-3）；
- claims **C-V5**（有效源方法值，独立方法）。

## 陷阱与注意

1. **Table 1 与论文自身图直和差 2.8%**（用户 07-25 科研过程发现）：印刷表可能错误——**数值锚点优先于印刷表**；同一量在不同来源（表/图/公式）不一致时必须显式标记并判断可信度。教训：review-lessons（文献来源冲突，现归入 B2）。
2. **有效源方法 vs ret−singular 是不同路线**：前者时域演化 + 有效源；后者频域数据相减——两者互证是 NC-06（外部锚点）的最强形式。

## 核对记录

| 日期 | 核对项 | 结论 |
|---|---|---|
| 2026-08-14 | 有效源方法定义与远程实现 | 远程复现 ψ^R = −1.0495947e-3（用户验证） |
| 2026-08-14 | 与本内核 ret−singular 互证 | 差 0.0086%，两独立方法一致 |
