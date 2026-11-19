# W1/W2 运行时 smoke（两套，5 分钟）

> 目的：验证 **W1（SC-07/RC-08 进入审查提示）** 与 **W2（档位由 `review-depth.json` 驱动）**
> 在真实审查路径上生效——不是单测，而是"@review → 审查者子代理 → 报告落盘"。
>
> 本地已验证契约判定：**case-a → T1+scripts**、**case-b → T2**。
> 模板在 `config/templates/`（入库）；运行时复制到 `run/`（gitignore）。

## 0. 前置

- 在 dsh 会话中，workspace = `/data/home/hanwu/UnivEdge`；
- `tools/review_depth.py` 存在；`python3` 可用；
- `knowledge/claims.md` 存在（case-b 的高代价证据指向它）。

## 1. 复制（在仓库根执行）

```bash
cp -r config/templates/w1w2-smoke/case-a run/w1w2-smoke-a
cp -r config/templates/w1w2-smoke/case-b run/w1w2-smoke-b
cp -r config/templates/w1w2-smoke/case-c run/w1w2-smoke-c
ls run/w1w2-smoke-{a,b,c}     # 每个目录应有 report.md + review-depth.json
```

> 目录名必须是 `w1w2-smoke-a/b/c`——契约里的路径写死了。
>
> **⚠ 声明必须是纯文本**：`@review run/...` 不能放在反引号/代码块/引号里。
> 插件按"引述中和"规则处理——**写在反引号里的声明会被当成引用，不触发审查**（2026-11-19 实际踩到）。

## 2. 触发 case A（期望 T1+scripts → tier t1）

在 dsh 会话里发送一条消息（**必须带 `@review` + 路径**）：

```
@review run/w1w2-smoke-a/report.md
```

等待 1–3 分钟（审查者子代理可能异步返回）。观察：

```bash
tail -20 /tmp/univedge-reviewer.log | grep -E 'review tier|depth decision|report written'
# 期望：depth decision: … T1+scripts → review tier: t1 → report written
tail -3 run/review/INDEX.md
# 期望：新增一行，通道列为 declared
```

## 3. 触发 case B（覆盖不足 + 高代价 → 期望 T2）

```
@review run/w1w2-smoke-b/report.md
```

观察同上。期望：`depth decision: … T2` → `review tier: t2`。

## 3b. 触发 case C（全覆盖 + 高代价 → 期望 T2；**S0-1 回归**）

```
@review run/w1w2-smoke-c/report.md
```

这是 2026-11-19 实战审查发现的 S0-1 的回归用例：**脚本覆盖 1.0 不得掩盖高代价**。
期望：`coverage=1.0`、`high_cost=true`、`decision=T2`、`review tier: t2`。

## 3c. 目录声明回归（契约发现）

再发一条**目录**（不带 `/report.md`）：

```
@review run/w1w2-smoke-c
```

期望同样是 **t2**。这验证 `findDepthContract` 在"声明目录"时能从目录本身找到
`review-depth.json`（旧实现从 `dirname` 开始，永远找不到）。

## 4. 验证"提示里真的有检查项"（关键）

找到最新的审查者子代理会话，解压并检索：

```bash
cd ~/.dsh/sessions/--data-home-hanwu-UnivEdge--/
ls -lt | head -5                      # 取最新的子代理 session 目录
zstd -dc <session-id>/session.jsonl.zstd \
  | grep -o 'SC-07\|RC-08\|T1 锚点链\|T2 全量' | sort | uniq -c
```

| case | 期望 |
|---|---|
| A（t1） | `SC-07` 出现；**不应**出现 `RC-08`；含 `T1 锚点链` |
| B（t2） | `SC-07` 与 `RC-08` 都出现；含 `T2 全量` |
| C（t2） | 同 B；且工具输出 `high_cost=true`、`coverage=1.0` |

> 如果 `zstd` 不可用：`module load` 或直接用 `python3 -c` 的 `zstandard` 库；远程一般有 `/data/apps/mambaforge/bin/zstd`。

## 5. 清理

```bash
rm -rf run/w1w2-smoke-a run/w1w2-smoke-b run/w1w2-smoke-c
```

（`run/` 不入库，清理不影响仓库。）

## 6. 故障排查

| 现象 | 检查 |
|---|---|
| 完全没有审查 | turn 文本里是否**真的有纯文本** `@review` + 可解析路径（**不能放在反引号里**）；`run/.../report.md` 是否存在 |
| tier 一直是 t1（B 应为 t2） | `review-depth.json` 是否与产物**同目录**；日志是否有 `depth decision`；`tools/review_depth.py` 是否可执行 |
| tier 变成 t2（A 应为 t1） | 契约里负控命令是否 **exit 0**（应 exit≠0）；`high_cost` 是否误填 `true`/缺证据 |
| C 仍是 t1（应为 t2） | 工具是否为修复前版本——S0-1 修复后 `high_cost=true` 必须先于 coverage 分支 |
| 工具缺失 | W2 设计为 **fail-closed T2**；先修 `tools/review_depth.py` |
| 报告没进 INDEX | 看 `/tmp/univedge-reviewer.log` 的 `report written` 与 `run/review/` 新目录；可能是迟到回收（30 min 上限） |

## 7. 边界

- 这两个 smoke 只验证"接线"，不验证审查质量；
- case-a 的负控是"缺文件"（真实会响），不是万能负控；
- case-b 的 `downstream_amplification=true` 是声明值（证据指向 claims.md），用于触发 T2，不代表真实下游。
