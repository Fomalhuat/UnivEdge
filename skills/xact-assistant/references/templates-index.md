# 模板与示例索引 — 任务到代码的映射

`templates/` 目录包含两类代码资源：
- **.wl 骨架脚本** — 精简的起步模板，可直接修改使用
- **.nb 完整示例** — xAct 官方示例，展示真实的使用模式

**使用方式**：用 Grep 搜索关键函数名定位代码，或直接 Read 整个文件作为参考。

## 按任务类型查找

| 我想... | 看哪个示例 | 关键内容 |
|--------|-----------|---------|
| **定义标准时空背景** | | |
| Schwarzschild 时空 + Birkhoff 定理 | `Schwarzschild_Metric_Birkhoff_Theorem.nb` | CTensor 构建度规，Eddington-Finkelstein 坐标 |
| Kerr 时空 + null tetrad | `KerrMetric.nb` | Boyer-Lindquist 坐标，零标架，表面引力 |
| FLRW 宇宙学 + xCoba | `FriedmannLemaitreMetric_CoordinatesApproach_xCoba.nb` | 同质宇宙学，图表转换 |
| **度规扰动和变分** | | |
| 变分 Lagrangian | `ActionVariation_Metric_Fields.nb` | 通用变分函数 |
| xPert + VarD 模式 | `Lagrangian-variation-xPert-VarD.nb` | 常用模式：xPert 扰动 + VarD 变分得 Einstein 方程 |
| 高阶引力场方程 | `EDGB-and-DCS-EOMs-and-C-tensors-simplified.nb` | Einstein-dilaton-Gauss-Bonnet、DCS 引力的 EOM |
| **分量计算和坐标** | | |
| CTensor 坐标变换 | `CTensorChangeCoords.nb` | 简单的坐标变换 |
| 笛卡尔↔球坐标 | `Spherical-vs-Cartesian-Coordinates.nb` | 3D 坐标变换模板 |
| Bianchi I + xCoba | `Bianchi_I_xCoba.nb` | Bianchi I Einstein 方程的 CTensor 方法 |
| **分解和投影** | | |
| 1+3 分解（Ricci + Bianchi） | `TimelikeCongruence.nb` | 任意单位类时矢量场的 1+3 分解 |
| Weyl 张量的 3+1 分解 | `EB-decomp-and-3+1-split.nb` | Weyl 的 electric/magnetic 分解 |
| **特殊几何和拓扑** | | |
| Warped product | `Warped-product.nb` | 创建 warped product 度规 + 低维有效 Lagrangian |
| 共形变换 | `Conformal_Transformation.nb` | 共形变换工具（xPand 子代码） |
| 共形场方程 (Friedrich) | `ConformalEinsteinEqs.nb` | 4D 共形场方程实现 |
| **角向积分** | | |
| 多方向矢量角向积分 | `Angular-integration.nb` | 后牛顿计算适配 |
| **旋量和 Clifford 代数** | | |
| Gamma 矩阵（Dirac 代数） | `Gamma matrices (Dirac algebra).nb` | DefProduct 处理 gamma 代数 |
| Clifford 代数迹 | `Clifford_Algebra_Traces.nb` | 任意维 Clifford 代数，Dirac 矩阵迹 |
| Lovelock + Spinors | `SymManipulatorLovelockExample.nb` | SymManipulator 证明 Lovelock 非动力学 |
| **数值方法** | | |
| Cauchy-characteristic 提取 | `CCE-system-public.nb` | 1+1+2 形式，需要更多文档 |
| **广义相对论经典** | | |
| Raychaudhuri 方程 | `Raychaudhuri.nb` | 跟随 Wald 书的 §9.2 |

## 按 xAct 包查找

| 包 | 相关示例 |
|----|---------|
| xTensor | 全部示例都用 xTensor 基础 |
| xCoba | Schwarzschild, Kerr, FLRW, Bianchi_I, CTensorChangeCoords, Spherical-vs-Cartesian |
| xPert | Lagrangian-variation-xPert-VarD |
| xTras | ActionVariation_Metric_Fields, Lagrangian-variation |
| Spinors | Gamma matrices, Clifford_Algebra_Traces, SymManipulatorLovelockExample |
| SymManipulator | SymManipulatorLovelockExample |
| xPand | Conformal_Transformation (来自 xPand) |

## 作为模板使用

这些示例是完整的工作代码。要作为自己的计算起点：
1. **复制相关 .nb 到 templates/**（如果反复使用）
2. **修改背景定义**（如 Schwarzschild → Kerr）
3. **修改目标计算**（如算 Ricci → 算 Einstein 方程）
4. **用 wolframscript 验证**

## 示例位置

```
templates/
├── examples-README.md               ← 官方说明（英文）
├── schwarzschild-perturbation.wl    ← .wl 骨架模板（可运行）
├── Schwarzschild_Metric_Birkhoff_Theorem.nb
├── KerrMetric.nb
├── ...等21个 .nb 示例...
```

## 与教程的关系

| 资源 | 关系 |
|------|------|
| `lectures/Lecture1-14.nb` | 系统教学，由浅入深 |
| `lectures/other_lectures/*.nb` | 应用导向，更接近实际研究 |
| `templates/*.nb` | 完整工作代码，最具体 |
| `references/xact-basics.md` | agent 提取的速查模式 |