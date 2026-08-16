# xAct 教程索引 — 主题到章节的映射

xAct 教程位于完整版的 `lectures/` 目录下。本文件是**主题到章节的映射表**：根据你要做什么，查表确定读哪个 lecture。

> **资源可用性**：`lectures/` 为**增强资源**，不随本仓库版打包。本索引保留为知识地图——先用 `xact-basics.md` / `xpert-guide.md` 的自包含速查；确需教程时按 SKILL.md "资源可用性" 顺序解析（宿主完整版 → 公开 GitHub 仓库 → xAct 官网）。找不到时不要卡住。

## 按任务类型查找

| 我想要... | 读哪个 Lecture | 关键函数/概念 |
|----------|---------------|-------------|
| 了解 xAct 整体能力和包结构 | L1 | xTensor, xPert, xCoba, xTras 概览 |
| 定义张量、流形、协变导数 | L3 | DefManifold, DefTensor, DefCovD |
| 化简张量表达式 | L3, L5 | ToCanonical, CanonicalOrder |
| 定义和使用度规 | L4 | DefMetric, MetricQ, ContractMetric |
| 处理多个度规（如背景+扰动） | L4 | 多度规系统, frozen 度规 |
| 化简含协变导数的表达式 | L5 | CommuteCovDs, SortCovDs |
| 使用模式指标（pattern indices） | L5 | IndexPattern, WithIndices |
| 实现自定义张量规则 | L6, Paris B | MakeRule, IndexRule, AutomaticRules |
| 定义常数、标量函数、参数 | L7 | DefConstantSymbol, DefScalarFunction |
| 李导数、李括号 | L7, **Paris B** | LieD, Lie brackets, 方向导数 |
| 变分推导（Einstein-Hilbert 等） | L8, **Jolyon** | VarD, Lagrangian 变分 |
| f(R) 引力、Lovelock 张量 | L8 | 高阶曲率变分 |
| 1+3 分解、ADM 形式 | L9 | 3+1 split, 投影 |
| Killing 矢量恒等式 | L10 | Killing identities |
| 共形方程 | L11 | Conformal transformation |
| 在具体坐标系下计算分量 | L12 | DefChart, CTensor, ComponentValue |
| CTensor 和 CCovD 的转换 | L13 | SeparateBasis, ContractBasis, cache |
| 用 xCoba 计算曲率 | L14 | MetricCompute, Christoffel, Riemann |
| **度规扰动 (xPert)** | **Paris C §7, Jolyon §2** | DefMetricPerturbation, ExpandPerturbation, Perturbed |
| **曲率张量扰动** | **Paris C §7** | Perturbed[RiemannCD], Perturbed[EinsteinCD] |
| **宇宙学扰动 (xPand)** | **Jolyon §5** | xPand, FRW 扰动, 规范选择 |
| **旋量计算 (Spinors)** | **Paris C §5** | 4D 旋量, soldering form |
| **Newman-Penrose 标架** | **Paris B** | NP 形式, 零标架, DefBasis |
| **非兼容导数与 Implosion** | **Paris B** | 非度规兼容导数, Implode 方法 |
| **规范理论联络** | **Paris C §4** | Inner connections, 规范场 |
| **规范化器内部机制** | **Paris C §8** | canonicalizer, 生成集 |

## 按xAct包查找

| 包 | 相关 Lecture | 用途 |
|----|-------------|------|
| xTensor | L3, L4, L5, L6, L7, Paris B | 抽象张量代数 |
| xCoba | L12, L13, L14 | 分量计算 |
| **xPert** | **Paris C §7, Jolyon §2** | 度规扰动理论 |
| **xPand** | **Jolyon §5** | 宇宙学扰动 |
| **Spinors** | **Paris C §5** | 4D 旋量计算 |
| xTras | L8, Jolyon §3 | 变分、场方程 |

## 补充教程 (other_lectures/)

| 文件 | 主要新内容 |
|------|----------|
| **xActTutorial_JolyonBloomfield.nb** | xPert 应用 (§2), VarD 运动方程 (§3), xPand 宇宙学扰动 (§5) |
| **xTensor_Paris_B.nb** | 李导数, Newman-Penrose 标架, 非兼容导数, MakeRule 高级控制 |
| **xTensor_Paris_C.nb** | xPert 系统讲解 (§7), Spinors 包 (§5), 规范理论联络, 规范化器内部 |

## 使用方法

1. **确定任务类型** — 从上表找到对应的 Lecture
2. **获取 .nb 文件** — 按 SKILL.md"资源可用性"解析（完整版/公开仓库/官网）；拿到后用 Grep 搜索关键函数名定位代码，或直接 Read
3. **应用到当前任务** — 参考教程中的模式，适配到具体问题

## 教程位置（增强资源）

```
lectures/   (完整版 skill 目录下，本仓库版不含)
├── README.txt                    ← 各 Lecture 的简述（含补充教程说明）
├── Lecture1.nb ... Lecture14.nb  ← 主教程（L2 缺失，假定已掌握 Mathematica）
└── other_lectures/
    ├── xActTutorial_JolyonBloomfield.nb   ← xPert + xPand + VarD 应用
    ├── xTensor_Paris_B.nb                 ← 李导数 + NP标架 + 非兼容导数
    └── xTensor_Paris_C.nb                 ← xPert系统 + Spinors + 规范理论
```

## 更多资源

xAct 官方文档：https://www.xact.es/documentation.html
（教程中未覆盖的主题可在此查找，如 xTerior 外微分包）
