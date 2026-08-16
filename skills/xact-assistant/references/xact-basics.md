# xAct 核心惯用法

基于 xAct 官方教程 (Lecture 1-14) 验证的用法。本文件覆盖最常用的模式和惯用法。

---

## 1. 初始化与包加载

```mathematica
(* 标准加载顺序 *)
Needs["xAct`xTensor`"];   (* 自动加载 xCore, xPerm *)
Needs["xAct`xPert`"];     (* 扰动理论，需要 xTensor *)
Needs["xAct`xCoba`"];     (* 分量计算，需要 xTensor *)

(* 设置显示 *)
$DefInfoQ = False;   (* 不显示定义信息 *)
$UndefInfoQ = False; (* 不显示取消定义信息 *)
$PrePrint = ScreenDollarIndices; (* 美化打印 *)
```

**加载顺序**：xTensor → xPert → xCoba。xCoba 自动加载 xTensor 和 xPerm。

---

## 2. 流形与度规定义

### 定义流形和度规

```mathematica
(* 定义4维流形，指标列表不能包含度规名 *)
DefManifold[M, 4, {a, b, c, d, e, f, h, i, j, k, l, m}]

(* 定义度规 — signdet=-1 表示 Lorentzian *)
DefMetric[-1, g[-a, -b], CD, PrintAs -> "g"]

(* DefMetric 自动定义：
   度规 g, 逆度规, 体积形式 epsilon, 协变导数 CD,
   Christoffel, Riemann, Ricci, RicciScalar, Einstein, Weyl, Kretschmann
   以及自动规则：Riemann→Weyl, Ricci→Einstein 等 *)
```

### 多度规系统 — 重要陷阱

```mathematica
(* 定义第二个度规 *)
DefMetric[-1, gtilde[-a, -b], CD2, PrintAs -> "g~"]
(* 警告: DefMetric::old — 这是正常的 *)

(* 关键：只有第一个定义的度规可以升降指标！
   其余度规是 "frozen"，用 frozen 度规做 ContractMetric 会报错：
   "Cannot contract frozen metric" *)
```

**注意**：第二个度规的 `RiemannDown`（全下标 Riemann）不会自动定义，需单独处理。

### 曲率约定 (MTW)

```mathematica
RiemannCD[-a, -b, -c, -d]   (* R_{abcd} *)
RicciCD[-a, -b]              (* R_{ab} = R^c_{acb} *)
RicciScalarCD[]              (* R *)
EinsteinCD[-a, -b]           (* G_{ab} = R_{ab} - 1/2 g_{ab} R *)
WeylCD[-a, -b, -c, -d]      (* C_{abcd} *)
```

---

## 3. 张量定义与操作

```mathematica
(* 矢量 — 上标用正号 *)
DefTensor[v[a], M, PrintAs -> "v"]

(* 对称 (0,2) 张量 — 下标用负号 *)
DefTensor[h[-a, -b], M, Symmetric[{-a, -b}]]

(* Weyl 对称性 *)
DefTensor[W[-a, -b, -c, -d], M, 
  Symmetric[{1, 2}, {3, 4}], Antisymmetric[{1, 2}]]

(* 张量积与缩并 — 重复上下指标自动缩并 *)
T[-a, b] U[-b, c]   (* = (T·U)^a_c *)

(* 显式度规收缩 *)
ContractMetric[expr]
```

---

## 4. 协变导数与化简

```mathematica
(* 协变导数 *)
CD[-a][T[b, -c]]

(* 交换协变导数 — 产生 Riemann 项 *)
CommuteCovDs[CD[-a][CD[-b][v[c]]]]

(* 排序协变导数 *)
SortCovDs[expr]
```

### ToCanonical — 关键选项

```mathematica
ToCanonical[expr]  (* 基本规范化 *)

(* 选项 UseMetricOnVBundle *)
(* 默认 All: 规范化时用度规升降哑指标 *)
(* 设为 None: 不升降哑指标 — "如同没有度规" *)
SetOptions[ToCanonical, UseMetricOnVBundle -> None]

(* Method -> Implode: 把协变导数作用对象定义为新张量 *)
ToCanonical[expr, Method -> Implode]
```

**陷阱**：混合度规兼容导数与偏导数 `PD` 时，`ToCanonical` 会发出 `cmods` 警告，可能需要**二次调用** `ToCanonical` 才能完成规范化。

---

## 5. 规则与代入

```mathematica
(* 定义替换规则 *)
rule = MakeRule[{T[a, -b], v[a] u[-b]}];
expr /. rule

(* 自动规则 — 对所有后续计算生效 *)
AutomaticRules[v, MakeRule[{CD[-a][v[b]], 0}]]

(* 模式指标 — 用于 MakeRule 中的通配 *)
(* PatternIndex[name, type, character, vbundle] *)
(* type: AIndex(任意), DIndex(哑), LIndex(自由) *)
(* character: Up, Down, Null(两者) *)
PatternIndex[ab, AIndex, Up]   (* 匹配任意上标指标 *)
```

---

## 6. 分量计算 (xCoba)

xCoba 有两种框架：**TensorValues 框架**（单个分量）和 **CTensor 框架**（完整分量集）。

### 方式 A：DefMetric + DefChart + MetricInBasis（推荐）

先用 `DefMetric` 定义抽象度规，再用 `DefChart` 的 `MetricInBasis` 选项注册分量：

```mathematica
DefManifold[M, 4, {a, b, c, d, e, f, h}];
DefMetric[-1, metric[-a, -b], CD, PrintAs -> "g"];
DefConstantSymbol[Mass];

(* MetricInBasis 是 DefChart 的选项，三元组 {度规, -chart, 矩阵} *)
DefChart[schwarz, M, {0, 1, 2, 3}, {t[], r[], \[Theta][], \[Phi][]}, 
  MetricInBasis -> {metric, -schwarz, 
    DiagonalMatrix[{-(1 - 2 Mass/r[]), 1/(1 - 2 Mass/r[]), 
                     r[]^2, r[]^2 Sin[\[Theta][]]^2}]
  }
];

(* 计算所有曲率 *)
MetricCompute[metric, schwarz, All];
```

### MetricCompute 可计算的 15 种对象

| T 参数 | 含义 |
|--------|------|
| `"Metric"[-1,-1]` / `[1,1]` | 协变/逆度规 |
| `"DetMetric"[]` | 行列式 |
| `"DMetric"[-1,-1,-1]` | ∂_k g_{ij} |
| `"DDMetric"[-1,-1,-1,-1]` | ∂_k ∂_l g_{ij} |
| `"Christoffel"[-1,-1,-1]` / `[1,-1,-1]` | Γ_{ijk} / Γ^i_{jk} |
| `"Riemann"[-1,-1,-1,-1]` 等 | Riemann (4种指标配置) |
| `"Ricci"[-1,-1]` | Ricci |
| `"RicciScalar"[]` | Ricci 标量 |
| `"Weyl"[-1,-1,-1,-1]` | Weyl |
| `"Einstein"[-1,-1]` | Einstein |
| `"Kretschmann"[]` | Kretschmann 标量 |

用 `All` 计算全部。选项：`CVSimplify`（默认 `Together`）、`Parallelize`。

### 分量提取方法

```mathematica
(* 直接访问已计算的分量 *)
g00 = ToValues[metric[{0, -schwarz}, {0, -schwarz}]]
R00 = ToValues[RicciCD[{0, -schwarz}, {0, -schwarz}]]

(* 计算 ∇Riemann 分量 — 投影+求和+取值 *)
tmp = CD[-a][WeylCD[-b, -c, -d, -e]];
tmp1 = tmp * Basis[{1,-schwarz}, a] * Basis[{0,-schwarz}, b] * 
       Basis[{1,-schwarz}, c] * Basis[{0,-schwarz}, d] * Basis[{1,-schwarz}, e];
tmp1 = SeparateBasis[schwarz] @ tmp1;  (* 教程推荐用 SeparateBasis *)
tmp1 = TraceBasisDummy @ tmp1;         (* 展开基哑指标 *)
result = ToValues @ tmp1;              (* 插入实际值 *)
```

**SeparateBasis vs ToBasis**：教程使用 `SeparateBasis[basis] @ expr`。`ToBasis` 在教程 Summary 中提及但无实际示例。

### 方式 B：CTensor + SetCMetric（无抽象度规）

```mathematica
DefChart[sch, M, {0, 1, 2, 3}, {t[], r[], th[], ph[]}];
DefConstantSymbol[M0];

(* 度规 = CTensor，坐标标量必须带 [] *)
gMet = CTensor[
  {{-(1 - 2 M0/r[]), 0, 0, 0},
   {0, 1/(1 - 2 M0/r[]), 0, 0},
   {0, 0, r[]^2, 0},
   {0, 0, 0, r[]^2 Sin[th[]]^2}},
  {-sch, -sch}
];

SetCMetric[gMet, sch, SignatureOfMetric -> {3, 1, 0}];
MetricCompute[gMet, sch, All];

(* 此方式下无 RicciCD 等抽象张量头，用字符串访问 *)
RicciValues = ToValues[TensorValues[{"Ricci", -1, -1}]]
```

### CTensor 与抽象张量的转换

```mathematica
(* 抽象张量 → CTensor *)
ct = ToCTensor[T, {sch, sch}]

(* CTensor 也可用抽象指标访问 *)
gMet[-a, -b]
```

### CCovD 容器（协变导数的 CTensor 版本）

```mathematica(* CCovD 用于在 CTensor 框架下做协变导数 *)
(* 需要：参考协变导数 + Christoffel 的 CTensor *)
(* ToCCovD 可从抽象协变导数转换 *)
```

### 缓存系统

```mathematica
ClearxCobaCache[All]  (* 清空所有 CTensor 缓存 *)
(* 注意：手动修改缓存条目后，错误值会被直接使用，不重新计算 *)
```

### 实测验证记录（2026-08-06，Mathematica 13.0.1 + xTensor 1.3.0 + xCoba 0.8.6）

Schwarzschild 真空解 RicciScalar=0 验证通过的**最小可运行脚本**（wolframscript 执行）：

```mathematica
PrependTo[$Path, "<SKILL_DIR>/references"];
Needs["xAct`xTensor`"]; Needs["xAct`xCoba`"];
DefManifold[M4, 4, IndexRange[a, f]];   (* 关键陷阱：不能用 IndexRange[a, l]（含 g 与度规名冲突！）*)
DefMetric[-1, metricg[-a, -b], cd, PrintAs -> "g"];
DefChart[schw, M4, {0, 1, 2, 3}, {t[], r[], theta[], phi[]}];
DefScalarFunction[Mass];
$Assumptions = And[Mass[] > 0, r[] > 2 Mass[]];
(* MetricInBasis 独立三参数调用形式（非 DefChart 选项）也可用 *)
MetricInBasis[metricg, -schw, DiagonalMatrix[{
    -(1 - 2 Mass[]/r[]), 1/(1 - 2 Mass[]/r[]),
    r[]^2, r[]^2 Sin[theta[]]^2}]];
MetricCompute[metricg, schw, All, CVSimplify -> Simplify, Verbose -> False];
(* 分量取值：用 ComponentValue（返回 expr -> value 规则）*)
ComponentValue[RicciScalarcd[]]   (* 输出：RicciScalarcd[] -> 0 ✓ *)
```

**踩坑教训**：
1. **`IndexRange[a, l]` 会报 `Symbol g is already used as an abstract index`** —— a~l 包含 g！指标范围必须避开度规字母，用 `IndexRange[a, f]` 或显式列表。
2. `MetricInBasis[g, -schw] = matrix` **赋值形式在新版被 Protected**，必须用三参数函数形式 `MetricInBasis[g, -schw, matrix]`。
3. `Ricci[g, -schw]`、`Christoffel[cd, PDschw][r,-t,-t]` 等**抽象/混合写法在 0.8.6 不直接求值**；正确路径是 `MetricCompute` 预计算 + `ComponentValue`/`ToValues` 取值（见上文分量提取方法）。
4. 曲率张量分量必须经 `MetricCompute` 后才可访问，`Ricci[cd]` 裸调用返回未求值形式。
5. `ComponentArray[expr, IndexList[...]]` 在此版本对 Christoffel/Ricci 会触发 `$RecursionLimit`，**优先用 `ComponentValue`/`ToValues`**。


---

## 7. 输出与调试

```mathematica
SlotsOfTensor[T]           (* 检查指标结构 *)
SymmetryGroupOfTensor[T]   (* 检查对称性 *)
Definition[T]              (* 检查定义 *)
Length[expr]               (* 项数 *)
LeafCount[expr]            (* 表达式复杂度 *)
```

---

## 常见陷阱

| 问题 | 原因 | 解决 |
|------|------|-----|
| `ValidateSymbol::used` | 指标名与度规名冲突 | 指标列表排除度规名 |
| `Cannot contract frozen metric` | 用非主度规做 ContractMetric | 只有第一个度规能升降指标 |
| `ToCanonical::cmods` | 混合度规兼容导数与偏导数 | 可能需二次调用 ToCanonical |
| `CTensor::unknown` | CTensor 不识别的表达式 | 常数用 `DefConstantSymbol[M]`，用 `M` 不用 `M[]` |
| 坐标标量未识别 | 缺少 `[]` | 用 `r[]` 不用 `r` |
| 第二度规无 RiemannDown | DefMetric 不自动生成 | 需单独定义 |
