# xPert — 度规扰动理论指南

xPert 处理度规扰动展开，是线性化引力和高阶扰动计算的核心包。

**教程来源**：`lectures/other_lectures/xTensor_Paris_C.nb` §7（系统讲解）和 `lectures/other_lectures/xActTutorial_JolyonBloomfield.nb` §2（应用示例）。这些为**增强资源**（本仓库版不含，见 SKILL.md"资源可用性"）；本指南本身已自包含常用模式，教程仅在需要深入理解时查阅。

---

## 1. 初始化

```mathematica
Needs["xAct`xCore`"];
Needs["xAct`xTensor`"];
Needs["xAct`xPert`"];

(* 定义背景 *)
DefManifold[M, 4, {a, b, c, d, e, f, h, i, j, k, l, m, n, o, p, q}];
DefMetric[-1, g[-a, -b], CD, PrintAs -> "g"];

(* 定义扰动参数 — 通常是 ε *)

(* 定义度规扰动 *)
DefMetricPerturbation[g, dg, ε, PrintAs -> "h"]
(* dg 是线性扰动，ε 是展开参数 *)

(* 可选：高阶扰动 *)
DefMetricPerturbation[g, d2g, ε, OrderOfPerturbation -> 2, PrintAs -> "h2"]
```

**关键**：`DefMetricPerturbation` 自动定义了：
- `Perturbed[g[-a,-b]]` — 扰动度规到所有阶
- `Perturbed[CD[-a]]` — 扰动协变导数
- `Perturbed[RiemannCD[...]]` — 扰动曲率

---

## 2. 展开操作

### 展开并提取各阶
```mathematica
(* 扰动度规到一个给定的阶数 (这里是 2 阶) *)
ExpandPerturbation@Perturbed[g[-a, -b], 2]
(* 输出：g_{ab} + ε h^{(1)}_{ab} + ε^2 h^{(2)}_{ab} *)

(* 提取特定阶 *)
SeparateMetric[][Perturbed[g[-a, -b], 2], g, 1]  (* 线性阶 *)
SeparateMetric[][Perturbed[g[-a, -b], 2], g, 2]  (* 二阶 *)
```

### 展开任意张量
```mathematica
(* 定义依赖于度规的张量 *)
DefTensor[T[-a, -b], M]

(* 展开到二阶 *)
ExpandPerturbation@Perturbed[T[-a, -b], 2]

(* 或者提取线性阶 *)
Perturbed[T[-a, -b], 1]  (* 直接取线性部分 *)
```

### 展开曲率
```mathematica
(* Ricci 张量展开 *)
ExpandPerturbation@Perturbed[RicciCD[-a, -b], 2]

(* Einstein 张量的线性阶 *)
Perturbed[EinsteinCD[-a, -b], 1]
(* 这给出线性化的 Einstein 方程 *)
```

---

## 3. Gauge 变换

```mathematica
(* 定义 gauge 矢量 *)
DefTensor[ξ[a], M, PrintAs -> "ξ"]

(* 度规的 gauge 变换 *)
dgGauge = LieD[ξ[a]][g[-a, -b]]
(* 或等价地：2 CD[-(a)][ξ[-b]] *)

(* 验证 gauge 不变性 — 线性化 Einstein 张量 *)
(* δG_{ab} = -1/2 (□ ḡ_{ab} + ... ) *)
(* xPert 会自动处理 *)
```

### 定义 gauge 条件
```mathematica
(* Lorenz gauge: ∇^b ḡ_{ab} = 0 *)
lorenzGauge = CD[b]@dg[-a, -b] == 0
(* 在扰动展开中使用 *)
```

---

## 4. 场方程推导

### 线性化 Einstein 方程
```mathematica
(* 方法1：直接用 Perturbed *)
δG = Perturbed[EinsteinCD[-a, -b], 1] // ExpandPerturbation
(* 结果自动用 dg 和背景度规表示 *)

(* 方法2：用 xTras 的 VarD *)
Needs["xAct`xTras`"];
δG2 = VarD[dg[-a, -b], CD][Sqrt[Detg[]] RicciScalarCD[]]
(* 变分推导 *)

(* 代入 Lorenz gauge 化简 *)
δG // ToCanonical //. lorenzGaugeRule
```

### 可分离项
```mathematica
(* 识别 trace 和 trace-free 部分 *)
expr = Perturbed[RicciCD[-a, -b], 1]
tracePart = g[-a, -b] (expr[-c, -d] g[c, d]) / 4
traceFree = expr - tracePart
```

---

## 5. 高阶扰动

```mathematica
(* 定义二阶扰动 *)
DefMetricPerturbation[g, d2g, ε, OrderOfPerturbation -> 2]

(* 二阶 Einstein 张量 *)
δ2G = Perturbed[EinsteinCD[-a, -b], 2] // ExpandPerturbation

(* 提取纯二阶项（不含一阶的乘积） *)
SeparateMetric[][δ2G, g, 2]
(* 注意：这也会包含 h^{(1)}h^{(1)} 类型的项 *)
```

---

## 6. 常用扰动操作

### Trace-reversed 扰动
```mathematica
(* ḡ_{ab} = h_{ab} - (1/2) g_{ab} h *)
DefTensor[hbar[-a, -b], M, Symmetric[{-a, -b}]]
AutomaticRules[hbar, MakeRule[{
  hbar[-a, -b],
  dg[-a, -b] - (1/2) g[-a, -b] (dg[c, -c])
}]]
```

### 波动算符（D'Alembertian）
```mathematica
(* □ h_{ab} = ∇^c ∇_c h_{ab} *)
(* xAct 中就是缩并的协变导数 *)
CD[c][CD[-c][dg[LI[1], -a, -b]]]
```

---

## 调试技巧
```mathematica
(* 检查扰动展开是否正确 *)
Perturbed[RicciCD[-a, -b], 0] // ToCanonical
(* 应该等于背景的 RicciCD *)

(* 验证线性化 Bianchi *)
Perturbed[ContractedBianchiCD[-a], 1] // ToCanonical
(* 应为 0 如果一切都对 *)
```
