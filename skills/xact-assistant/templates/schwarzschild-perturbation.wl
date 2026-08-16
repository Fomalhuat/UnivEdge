(* ============================================================
   模板 1：Schwarzschild 背景 + 度规扰动
   用途：定义任意背景度规，设置度规扰动，展开曲率/场方程
   
   核心工作流（xTensor + xPert — 抽象指标）：
   1. DefManifold → DefMetric → DefMetricPerturbation
   2. 展开曲率张量到任意阶
   3. 施加 gauge 条件
   ============================================================ *)

(* === 初始化 === *)
Needs["xAct`xTensor`"];
Needs["xAct`xPert`"];
(* 注意：加载顺序 xTensor → xPert，xCoba 按需加载 *)

$DefInfoQ = False;
$UndefInfoQ = False;
$PrePrint = ScreenDollarIndices;

(* === 定义流形和度规 === *)
(* 指标列表不含 g，因为 g 用作度规名 *)
DefManifold[M, 4, {a, b, c, d, e, f, h, i, j, k, l, m, n, o, p}];
DefMetric[-1, g[-a, -b], CD, PrintAs -> "g"];

(* === 定义扰动 === *)
DefConstantSymbol[eps, PrintAs -> "ε"];
DefMetricPerturbation[g, dg, eps, PrintAs -> "h"];

(* === 计算线性化曲率 === *)
Print["=== Linearized Ricci tensor ==="];
δR1 = Perturbed[RicciCD[-a, -b], 1] // ExpandPerturbation // ToCanonical;
Print[δR1 // Short];

Print["=== Linearized Einstein tensor ==="];
δG1 = Perturbed[EinsteinCD[-a, -b], 1] // ExpandPerturbation // ToCanonical;
Print[δG1 // Short];

Print["=== Trace of linear perturbation ==="];
trh = dg[LI[1], a, -a] // ToCanonical;
Print["h = ", trh];

(* === Trace-reversed 扰动 === *)
Print["=== Trace-reversed perturbation ==="];
DefTensor[hbar[-a, -b], M, Symmetric[{-a, -b}], PrintAs -> "\!\(\*OverscriptBox[\(h\), \(_\)]\)"];
AutomaticRules[hbar, MakeRule[{
  hbar[-a, -b],
  dg[LI[1], -a, -b] - (1/2) g[-a, -b] (dg[LI[1], c, -c])
}]];

(* === Lorenz gauge 条件 === *)
Print["=== Lorenz gauge: ∇^b ḡ_{ab} = 0 ==="];
lorenzExpr = CD[b]@dg[LI[1], -a, -b] // ToCanonical;

(* === 场方程在 Lorenz gauge 下的形式 === *)
(* 线性化 Einstein 在 Lorenz gauge 下简化为波动方程 *)
Print["=== Linearized EE in Lorenz gauge ==="];
(* 用 trace-reversed 扰动表达 *)
deltaG_Lorenz = -1/2 CD[-c][CD[c][hbar[-a, -b]]] + 
  RiemannCD[-a, c, -b, d] hbar[-c, -d] +
  CD[-a][CD[-c][hbar[-b, c]]] + CD[-b][CD[-c][hbar[-a, c]]] -
  g[-a, -b] CD[-c][CD[-d][hbar[c, d]]];

(* === 曲率恒等式验证 === *)
Print["=== Verifying contracted Bianchi identity ==="];
bianchiTest = ContractedBianchiCD[-a] // ToCanonical;
Print["Contracted Bianchi = ", bianchiTest, " (should be 0)"];

Print["=== 模板加载完成 ==="];
Print["修改此文件以定义具体背景，然后计算扰动展开。"];
