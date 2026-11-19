# review_depth fixtures — 期望档位（2026-11-19）

> 来源：R7 独立审查（`run/review/090ccd24/a9b050e6/review.md` 的 t1…t11 判别集）。
> 运行：`python3 dsh-adapter/tests/check_review_depth_fixtures.py`（在仓库根）。
> **t11 是 S0-1 的回归**：`est_wall_min: 0` + `source: slurm:--time=24:00:00` 曾判 T1+scripts；修为 T2。

| fixture | decision | coverage | high_cost | 判据 |
|---|---|---|---|---|
| `t1_exec_fails.json` | blocked | 0.0 | false | exec 失败 → 先修 |
| `t2_negctl_silent.json` | T1 | 0.0 | false | 负控不响 → 不计覆盖 |
| `t4_hc_none.json` | T2 | 1.0 | true | 无证据 → 按高代价 |
| `t5_hc_tautology.json` | T1+scripts | 1.0 | false | `check:true` 恒真，低代价 |
| `t6_check_false.json` | T2 | 1.0 | true | 证据命令失败 → 高代价 |
| `t7_file_ok.json` | T1+scripts | 1.0 | false | 证据文件存在 |
| `t8_file_missing.json` | T2 | 1.0 | true | 证据文件缺失 → 高代价 |
| `t9_check_echo.json` | T1+scripts | 1.0 | false | 恒真 check（设计取舍） |
| `t10_cost_huge.json` | T2 | 1.0 | true | 成本超限 |
| `t11_cost_slurm.json` | T2 | 1.0 | true | **S0-1 回归**：24h SLURM 冲突取高 |
