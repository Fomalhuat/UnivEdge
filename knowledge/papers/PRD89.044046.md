# PRD 89.044046 —— Applying the effective-source approach to frequency-domain self-force calculations

- **作者**：Niels Warburton, Barry Wardell（UCD / Cornell, 2014）
- **本地 PDF**：`C:\Users\wu_ha\WorkBuddy\2026-07-25-12-51-42\papers\PhysRevD.89.044046.pdf`
- **核对日期**：2026-08-12（Step 4A 推导 vertical slice）
- **核对范围**：(2.3) 场方程、(2.6) 球谐正交归一、(2.10) 径向算子——逐项复现

## 已核对内容（公式溯源）

### 1. 场方程与源约定（(2.3)）
- **□Φ = −4πρ**（论文约定）；Step 4A 任务输入为 +4πρ——差异已在报告中显式标注（约定对照，非错误）；
- 背景：Schwarzschild，ds² = −f dt² + f⁻¹ dr² + r² dΩ²，f = 1−2M/r，度规符号 (−,+,+,+)（约定声明见 run/step4a/contract.md）。

### 2. 球谐正交归一（(2.6)）
- ∫Y_lm Y*_l'm' dΩ = δ_ll' δ_mm'（标准 Condon-Shortley）；
- 负 m 恒等式：Y_{l,−m} = (−1)^m Y*_{l,m}（与 conventions.md §1.1 一致）。

### 3. 径向算子（(2.10)）——Step 4A 逐项复现
```
□_lm = d²/dr² + 2(r−M)/(f r²) d/dr + (1/f)[ω²/f − l(l+1)/r²]
```
- 频域约定：e^{−iωt}，∂_t → −iω；
- 平直极限（M→0, f→1）：□_lm → d²/dr² + (2/r)d/dr + ω² − l(l+1)/r² ✓；
- **复现结论：与文献逐项残差 0**（符号引擎 xAct/Mathematica 工具代算，NC-01 锚点对照表见 run/step4a/anchor_table.json）。

## 与本内核产物的关联

- benchmarks **B3**（□_lm 径向算子，文献锚点）；
- claims **C-V3**（□_lm 复现，verified）。

## 陷阱与注意

1. **源符号约定**：论文 (2.3) 为 −4πρ，任务输入若为 +4πρ 须显式声明差异，不能静默归一（违反 CC-01 精神）；
2. **频域约定**：e^{−iωt} vs e^{+iωt} 会改变 ω 项符号——引用该论文公式时必须附带约定声明。

## 核对记录

| 日期 | 核对项 | 结论 |
|---|---|---|
| 2026-08-12 | (2.10) 径向算子逐项对照 | 残差 0，NC-01 通过 |
| 2026-08-12 | (2.3)/(2.6) 约定对照 | 与任务输入差异已显式标注 |
