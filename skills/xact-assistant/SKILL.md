---
name: xact-assistant
description: xAct + Mathematica 符号计算能力模块。提供 xAct 包使用知识（xTensor/xCoba/xPert/xTras）、Mathematica 执行能力和代码模板。作为主 agent 的附加能力被调用，不独立做决策。不绑定具体物理项目——项目上下文由当前工作环境提供。
trigger_keywords:
  - xAct
  - xTensor
  - xPert
  - xCoba
  - xTras
  - 张量计算
  - tensor computation
  - 协变导数
  - covariant derivative
  - 度规扰动
  - metric perturbation
  - 曲率计算
  - curvature computation
  - Mathematica符号计算
agent_created: true
---

# xAct + Mathematica 能力模块

本模块提供 xAct 包的使用知识和 Mathematica 执行能力。它是一个**能力模块**，不是独立 agent——不自主选择方法或做物理判断，而是被主 agent 调用，为张量计算任务提供工具支持和知识检索。

## 定位

| 层次 | 角色 | 职责 |
|------|------|------|
| **主 agent** | 决策者 | 理解物理目标、选择方法、验证结果、调试错误 |
| **本模块（能力）** | 工具箱 | xAct 语法知识、教程索引、代码模板、执行环境配置 |
| **项目上下文** | 输入 | 具体项目的论文、方程、坐标选择（由主 agent 提供） |

**本模块不做的事**：选择用 xAct 还是纯 Mathematica、判断计算结果是否正确、决定展开到哪一阶、选择坐标系。这些是主 agent 的职责。

**本模块做的事**：提供 xAct 函数的正确语法、指出常见陷阱、给出起步模板、配置执行环境。

## 知识地图

**本文件是地图，不是说明书。** 按需加载以下模块，不要一次性全部读取。

### 快速入口

| 需要什么 | 去哪里找 |
|---------|---------|
| xAct 主题→教程章节映射 | `references/lecture-index.md` |
| 核心语法和惯用法 | `references/xact-basics.md` |
| 确定用哪个 xAct 包 | `references/index.md` |
| 官方文档函数查询 | `references/docs-index.md` |
| 模板与示例代码 | `references/templates-index.md` |

### 按任务加载

| 任务 | 参考文件 | xAct 教程 | 实战示例 |
|------|---------|----------|---------|
| 抽象张量代数 | `references/xact-basics.md` | L3, L4, L5, L6 | — |
| 度规扰动 / gauge | `references/xpert-guide.md` | Paris C §7, Jolyon §2 | `Lagrangian-variation-xPert-VarD.nb` |
| 坐标分量计算 | `references/xact-basics.md` §6 | L12, L13, L14 | `Schwarzschild_Metric_*.nb`, `KerrMetric.nb` |
| 坐标变换 | — | — | `CTensorChangeCoords.nb`, `Spherical-vs-Cartesian.nb` |
| 变分推导 | — | L8, Jolyon §3 | `ActionVariation_Metric_Fields.nb` |
| 李导数 / NP标架 | — | Paris B | `PublicNPGHP.nb` (官方文档) |
| 旋量计算 | — | Paris C §5 | `Gamma matrices.nb`, `Clifford_Algebra_Traces.nb` |
| 1+3 分解 / ADM | — | L9 | `TimelikeCongruence.nb`, `EB-decomp-and-3+1-split.nb` |
| 高阶引力 EOM | — | — | `EDGB-and-DCS-EOMs-and-C-tensors-simplified.nb` |
| 共形场方程 | — | L11 | `ConformalEinsteinEqs.nb` |

### 教程位置

xAct 教程 .nb 文件位于本模块的 `lectures/` 目录。查 `references/lecture-index.md` 确定读哪个。

## xAct vs 纯 Mathematica

不是所有计算都需要 xAct。主 agent 根据任务选择工具：

| 场景 | 用 xAct | 用纯 Mathematica |
|------|---------|-----------------|
| 抽象张量代数（指标操作、对称性） | ✅ | |
| 度规扰动展开（xPert） | ✅ | |
| 协变导数交换、Bianchi 恒等式 | ✅ | |
| 曲率张量的抽象计算 | ✅ | |
| 从度规出发的第一性原理计算（Kerr 等） | ✅ | |
| 已知度规分量的坐标展开 | | ✅ |
| Taylor 级数展开 | | ✅ |
| 度规是对角的简单计算 | | ✅ |
| 代入具体坐标值后的化简 | | ✅ |
| Legendre/球谐展开 | | ✅ |
| 椭圆积分等特殊函数计算 | | ✅ |

**原则**：如果计算主要涉及具体坐标分量和级数展开，纯 Mathematica 更高效。如果涉及抽象指标操作、张量恒等式、或从度规出发的曲率计算，用 xAct。

## Mathematica 执行

### 环境配置（首次使用必须完成）

本模块依赖 Wolfram Engine（外部安装）。xAct 包**不随仓库版打包**（完整版见 user 级 skill 的 `references/xAct/`，或使用官方安装，见下 §2）。

**1. Wolfram Engine / wolframscript 路径**

常见探测方法：
```bash
# Linux/Mac
which wolframscript
which math

# Windows (PowerShell)
Get-Command wolframscript
# 或搜索标准安装位置
Get-ChildItem "C:\Program Files\Wolfram Research" -Recurse -Filter "wolframscript.exe" -ErrorAction SilentlyContinue
Get-ChildItem "C:\Program Files (x86)\Wolfram Research" -Recurse -Filter "wolframscript.exe" -ErrorAction SilentlyContinue
```

如果找不到，询问用户：*"请问你的 Mathematica 或 Wolfram Engine 安装在哪里？"*

**2. xAct 包路径**

xAct 是开源包，获取方式二选一：
- **官方安装**（推荐）：`PacletInstall["xAct"]` 或在 Mathematica 中用 `Needs["xAct`xTensor`"]` 触发自动安装（xAct 官网：xact.es）；
- **随包提供**：若宿主提供了完整版 skill（含 `references/xAct/` 包源码），设 `$SKILL_DIR` 为本 skill 安装目录，则 xAct 路径为 `$SKILL_DIR/references`。

**3. 记录路径**

确认 Wolfram Engine 路径后，主 agent 应记住它（设为 `$WOLFRAM`），供本会话所有后续脚本使用。

### 执行方式

```
# 调用（用实际路径替换 $WOLFRAM）
$WOLFRAM -file script.wl
```

**已验证的参考配置（2026-08-06，仅示例）**：
- wolframscript 路径：`C:\Program Files\Wolfram Research\Wolfram Engine\15.0\wolframscript.exe`
- 实际 kernel 由 `WolframScript.conf` 的 `WOLFRAMSCRIPT_KERNELPATH` 决定，可指向 Mathematica 学生版等
- **bash 下直接调用 wolframscript.exe 即可**（-code / -file 均验证通过）；PowerShell 工具输出可能被吞，改用 bash 重定向到文件再读取
- 快速验证命令：
  ```bash
  "C:/Program Files/Wolfram Research/Wolfram Engine/15.0/wolframscript.exe" -code "Print[2+2]; Quit[]"
  ```

脚本开头配置 xAct（`$SKILL_DIR` 由主 agent 替换为实际路径）：
```mathematica
PrependTo[$Path, "$SKILL_DIR/references"];
Needs["xAct`xTensor`"];
Needs["xAct`xPert`"];
Needs["xAct`xCoba`"];
```

- 脚本必须包含所有 `Needs[]` 调用
- 长时间计算设置足够 timeout
- 用 `Print[]` 或 `Export[]` 保存结果
- **Teukolsky 包不支持** Wolfram Engine（需要 Mathematica 前端）

## 不变量（必须遵守）

1. **加载顺序**：xTensor → xPert → xCoba（xCoba 自动加载 xTensor 和 xPerm）
2. **度规名与指标名冲突**：若度规名为 `g`，指标列表不能包含 `g`
3. **多度规系统**：只有第一个定义的度规能升降指标，其余为 frozen
4. **坐标标量带 `[]`**：用 `r[]`、`t[]`，不用 `r`、`t`
5. **DefConstantSymbol 不带 `[]`**：`DefConstantSymbol[M]` → 用 `M`，不是 `M[]`
6. **ToCanonical 可能需二次调用**：混合度规兼容导数与偏导数时
7. **化简前用 ToCanonical**：否则输出不可读
8. **`Sum` 在含数组索引的嵌套求和时可能失败**：用 `Table + Total + Flatten` 代替

## 模板与示例

`templates/` 目录包含：
- `.wl` 骨架脚本 — 精简起步模板，可直接修改
- `.nb` 完整示例 — xAct 官方示例，展示真实使用模式

查 `references/templates-index.md` 按任务类型找到对应代码。
