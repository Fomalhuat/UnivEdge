# xAct 官方文档索引 — 主题到 .nb 文件的映射

xAct 官方文档位于 `references/xAct/Documentation/English/` 目录。这些是包自带的权威文档，每个函数或主题有独立的 .nb 文件。

**使用方式**：用 Grep 搜索函数名，或直接 Read 特定 .nb 文件。

## 主要 Doc.nb 文件（综合文档）

| 文件 | 用途 | 大小 |
|------|------|------|
| `xTensorDoc.nb` | xTensor 核心文档 | 8.2 MB |
| `xCobaDoc.nb` | xCoba 完整文档 | 34.8 MB（最大） |
| `xPertDoc.nb` | xPert 扰动理论文档 | 6.9 MB |
| `xCoreDoc.nb` | xCore 基础架构 | 112 KB |
| `xPermDoc.nb` | xPerm 置换群 | 860 KB |
| `xTras.pdf` | xTras 文档（PDF 格式） | — |
| `SpinorsDoc.nb` | Spinors 包文档 | 2.6 MB |
| `SymManipulatorDoc.nb` | SymManipulator 文档 | 2.2 MB |
| `xTeriorDoc.nb` | xTerior 外微分文档 | 3.1 MB |
| `AVFDoc.nb` | AVF（代数值形式）文档 | 3.1 MB |
| `InvarDoc.nb` | Invar 不变量文档 | 3.0 MB |
| `PublicNPGHP.nb` | NP 和 GHP 形式 | 5.5 MB |

## 按主题查找

| 我想知道... | 看哪个 Doc.nb |
|------------|--------------|
| xTensor 基础（DefManifold, DefTensor, ToCanonical） | `xTensorDoc.nb` |
| xCoba（DefChart, CTensor, MetricCompute） | `xCobaDoc.nb` |
| xPert（DefMetricPerturbation, ExpandPerturbation） | `xPertDoc.nb` |
| 某个函数的详细参数 | `xTensor/<FuncName>.nb` 等子目录 |

## 子目录（按函数组织的文档）

```
Documentation/English/
├── xTensor/       ← 每个 xTensor 函数有独立 .nb
├── xCoba/         ← 每个 xCoba 函数有独立 .nb
├── xIdeal/        ← xIdeal 文档
├── xPerm/         ← xPerm 文档
├── changes/       ← 版本变更日志
└── data/          ← 文档辅助数据
```

子目录中的 .nb 文件命名规则：`$VariableName.nb` 或 `FunctionName.nb`。如 `$Bases.nb`、`DefBasis.nb`。

## 已知限制

- **xCoreDoc.nb 较小**：xCore 是底层包，文档相对简略
- **xCobaDoc.nb 很大**：内容最全面，但阅读较慢。建议用 Grep 定位特定内容
- **部分内容重复**：主 Doc.nb 与子目录文档可能有重叠

## 使用建议

1. **查找函数用法**：先查 `references/xact-basics.md` 找常用模式，特定细节再查 Doc.nb
2. **查找函数完整签名**：用 Grep 搜索函数名
3. **查找选项说明**：直接 Read 对应的 .nb 文件
4. **包内 `?FunctionName`**：在 Mathematica 内运行 `?FunctionName` 会调用相同的文档

## 文档位置

```
references/xAct/Documentation/English/
├── xTensorDoc.nb     ← xTensor 综合
├── xCobaDoc.nb       ← xCoba 综合
├── xPertDoc.nb       ← xPert 综合
├── xCoreDoc.nb       ← xCore 综合
├── xTras.pdf         ← xTras（PDF）
├── ...其他包...
└── <包名>/           ← 按函数拆分的 .nb
```