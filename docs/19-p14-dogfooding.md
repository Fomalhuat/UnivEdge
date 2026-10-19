# 19 - P14 首次实战（dogfooding）结论：判定可用，但"可执行"还差一层

> 日期：2026-10-19 ｜ 整理：Enki ｜ 状态：**实战报告；v0.17（G1+G3）已实施并验证**
> 任务：核对 `docs/16 §7 引用总表` ↔ `docs/survey/cards/*.md` ↔ `run/survey/sources/*`
> 契约/报告/审查：`run/dogfood-p14-refs/{contract.json,report.md,sc07-review.md}`（run/ 不入库）

## 1. 流程结果

| 指标 | 结果 |
|---|---|
| `review_depth.py` 判定 | **T1+scripts**（coverage 1.00，high_cost false） |
| 判据数 / 关键步骤 | 4 条判据 / 4 个关键步骤，全部脚本化 |
| 实际审查成本 | **< 2 分钟**（核对台账 + 脚本输出），符合 T1+scripts 预期 |
| 首次运行发现 | **8 处表内"同上" + 6 张卡的人类简写** → 弱审查者/脚本无法定位 |
| 独立弱审查者（无上下文）判定 | **不满足"仅凭产物可复核"**；C1/C2 通过，**C3 失败** |

## 2. 独立审查抓到的关键问题（详见 `sc07-review.md`）

1. **负控是"声明"不是"执行"**：`review_depth.py` 只检查 `negative_control_result == "fail"` 这个字符串，
   不运行任何命令。→ 我此前说"负控会响"在当前工具里**无法被证明**。这是本轮最重要的发现。
2. **判据盲区**：`verify_refs.py` 第一版只识别带 `run/survey/sources/` 前缀的引用，裸文件名不可见；
   哈希检查"任一命中即通过"；两张卡 0 哈希直接跳过。
3. **覆盖未声明**：81 个快照只有 35 个被总表登记（46 个未登记；部分为 html/txt 双份，属正常，但未写明）。
4. **`--selftest` 副作用**：就地改写被审文件（已加 try/finally；仍是设计债）。
5. **报告引用了不存在的 `sc07-review.md`**：已补（本目录）。

## 3. 已修（本轮）

- 表 8 处"同上（合并卡）"→ 显式卡片路径；2 张卡补全快照路径前缀；
- 检查器加固：裸文件名检测 + 哈希子集 + **4 个可执行负控**（N1 哈希/N2 缺文件/N3 卡片路径/N4 URL）
  + try/finally 恢复；复跑：`ok:true`，`--selftest` 4/4 正确失败；
- 新增 `unregistered_snapshots` 信息项（当前 46）。

## 4. v0.17 落地（**已实施**，2026-10-19）

G1/G3 已实现于 `tools/review_depth.py`（`--run` 模式），并用同一任务做了三组对照：

| 场景 | 命令 | 判定 |
|---|---|---|
| 未执行（declared） | `review_depth.py contract.json` | **T1**（因未 `--run`，最高只能 T1） |
| 真执行 | `review_depth.py contract.json --run` | **T1+scripts**（4/4 覆盖，负控均失败，高代价 check 均 exit 0） |
| 负控静默 | 把 S1 的 `negative_control_cmd` 改成 `true` | **T1**（coverage 0.75，"R5 负控未失败→不计覆盖"） |
| 负控静默 + 高代价 | 再把 downstream check 改成 exit 1 | **T2**（"覆盖不足且高代价"） |

实现细节：`--run` 执行 `exec_cmd`（须 exit 0）与 `negative_control_cmd`（须 **非零**）；
高代价 false 须 `check:`（`--run` 时执行）/`file:`/`basis:`，`none` → 按高代价；
含 `basis:` 或未 `--run` → 最高 T1。负控夹具：`run/dogfood-p14-refs/negctl/s1..s4`
（每个只破坏一条判据，实测分别只触发 S1/S2/S3/S4）。

**仍存缺口**：① `--run` 只验"负控非零"，不验它**因正确原因**失败（夹具已按判据拆分，但工具不强制绑定）；
② `high_cost` 的 `check:` 可以是平凡命令（`true`），工具无法判断 check 质量；③ `critical_steps` 完整性靠人。

| # | 缺口 | 建议 | 验收 |
|---|---|---|---|
| G1 | 负控自声明 | `review_depth.py` 增 `--run`：执行 `exec_cmd`（须 exit 0）与 `negative_control_cmd`（须非零）；**未执行不得给 T1+scripts**（降级 T1 并标 `negctl=declared`） | 构造"负控实际不响"的契约 → 工具必须拒绝 T1+scripts |
| G2 | `anchor_source` 只查格式/存在 | 增可选 `anchor_check` 命令（如核对文献值是否真在 PDF/表内）；未给则标 `anchor=declared` | 伪造 anchor 内容 → 探针失败 |
| G3 | `high_cost=false` 可敷衍（`evidence:none`） | false 也须给 `check:<cmd>`（如 `grep -c artifact_id claims.md` → 0）或 `basis` 文本；缺则按高代价 | 删掉 check → 判定变 high |
| G4 | 只比前 16 位哈希 | 支持 `hash_mode: "full"`（可选） | 全文哈希不一致 → 失败 |
| G5 | `critical_steps` 完整性靠人 | 不变（诚实保留）；契约审查时单列"是否漏关键步骤"问题 | — |

**建议只先做 G1 + G3**（最小、可测、直接回应"可执行"）；G2/G4 按需。

## 5. 结论（一句话）

**P14 的"判据可得性"已在脚本层可执行**（交表、跑脚本、算覆盖），**但"负控会响"与"高代价为假"仍停在声明层**——
dogfooding 的价值就是把这句话从"以为"变成"证据"。下一步若不补 G1/G3，T1+scripts 的"便宜"仍建立在一个可伪造的字段上。
