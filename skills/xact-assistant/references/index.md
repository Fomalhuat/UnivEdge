# xAct 渐进披露索引

这是 xAct 知识的入口。根据当前任务，先在此定位需要的包和功能，再按需加载具体参考文件。

---

## xAct 包地图

| 包 | 功能 | 加载命令 |
|----|------|---------|
| xCore | 基础架构、符号定义 | `Needs["xAct`xCore`"]` |
| xPerm | 置换群、对称性管理 | 自动随 xTensor 加载 |
| xTensor | 抽象张量代数 | `Needs["xAct`xTensor`"]` |
| xCoba | 分量计算、坐标基 | `Needs["xAct`xCoba`"]` |
| xPert | 度规扰动理论 | `Needs["xAct`xPert`"]` |
| xTras | 扩展张量操作、变分 | `Needs["xAct`xTras`"]` |
| xTerior | 外微分形式 | `Needs["xAct`xTerior`"]` |
| Harmonics | 球谐函数分解 | `Needs["xAct`Harmonics`"]` |
| Spinors | 旋量计算 | `Needs["xAct`Spinors`"]` |

---

## 任务 → 包/参考 映射

> 标注"教程"的项为**增强资源**（`lectures/`，本仓库版不含），解析顺序见 SKILL.md"资源可用性"；标注"参考/模板"的项为仓库版自包含文件。

### 定义时空背景（Schwarzschild/Kerr/FLRW 等）
- 包：xTensor, xCoba
- 参考：`xact-basics.md`
- 模板：`schwarzschild-perturbation.wl`

### 度规扰动展开（线性/高阶）
- 包：xTensor, xPert
- 参考：`xpert-guide.md`
- 教程：Paris C §7, Jolyon §2

### 场方程推导（Einstein 方程、线性化 EE）
- 包：xTensor, xTras, xPert
- 参考：`xpert-guide.md`
- 教程：L8, Jolyon §3

### Gauge 变换
- 包：xPert
- 参考：`xpert-guide.md`

### 坐标分量计算
- 包：xCoba
- 参考：`xact-basics.md` §6
- 教程：L12, L13, L14

### Tetrad / Newman-Penrose 形式
- 包：xCoba, Spinors
- 教程：Paris B

---

## 快速查询

### 常见函数速查

| 操作 | xAct 函数 |
|------|----------|
| 定义流形 | `DefManifold[M, 4, {a,b,c,d,e,f,h,i,j,k,l,m}]` |
| 定义度规 | `DefMetric[-1, g[-a,-b], CD]` |
| 定义张量 | `DefTensor[T[-a,-b], M]` |
| 协变导数 | `CD[-a][T[b,c]]` |
| Lie 导数 | `LieD[V[a]][T[-b,-c]]` |
| 度规扰动 | `DefMetricPerturbation[g, dg, e]` |
| 展开到 n 阶 | `ExpandPerturbation@Perturbed[expr, n]` |
| 提取某阶 | `SeparateMetric[][expr, g, n]` |
| 坐标卡 | `DefChart[sch, M, {0,1,2,3}, {t[],r[],th[],ph[]}]` |
| 分量值 | `ComponentValue[...]` |
| 张量化简 | `ToCanonical[expr]` |
| 代入规则 | `expr /. rule` 或 `MakeRule` |
| 对称性 | `SymmetryGroupOfTensor[T]` |
| 曲率计算 | `MetricCompute[g, ch, All]` |

---

## 按需加载指令

阅读完此索引后，用 Read 工具加载对应的 reference 文件。例如：

```
任务：推导 Schwarzschild 背景上的二阶度规扰动
→ 需要加载：xact-basics.md, xpert-guide.md
→ 如果涉及坐标分量：额外看 xact-basics.md §6
```
