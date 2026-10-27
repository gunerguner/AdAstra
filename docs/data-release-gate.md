# 数据发布门禁

## 当前结论

| 数据包 | 状态 | 可用于 |
| --- | --- | --- |
| `fixture-bright-stars` | 已锁定，项目自有星表 | 开发、CI、`pnpm build` |
| BSC5P 候选源 | 等待源级书面授权核验 | 不可进入生产包 |
| SAO 候选源 | 等待源级书面授权核验 | 不可进入生产包 |
| HYG v3.6.1（银河纹理派生源） | 等待源级书面授权核验（CC BY-SA 4.0） | 仅本地开发预览 |

`pnpm catalog:production` 会读取 `data/licenses/catalog-sources.json`。只要
`productionAllowed` 仍为 `false`，构建立即失败，从而避免把候选数据误发布。

## 现行星表

现行星表是 `data/stars.yaml`（约 420 颗：全天 V≤3.0 亮星 + 57 个著名星座棒状图顶点，V≤4.5）。`pnpm catalog:fixture` 生成 `public/data/v1/`。`pnpm dev` 和 `pnpm build` 都使用这份星表。

`pnpm catalog:production` 在 `productionAllowed` 仍为 `false` 时失败。检查通过前，它读取的仍是同一份 `stars.yaml`。BSC5P 与 SAO 在源级书面授权完成前不进入构建。

## 归档要求

生产开关只能由以下材料共同解锁：

1. 每个来源的稳定下载地址、版本、下载日期与 SHA-256；
2. 数据所有者或授权页面的原始快照及适用地域；
3. 对再分发、商用、派生格式、署名要求的书面结论；
4. 审批责任人和复审日期。

不得以“NASA/USNO 网站可访问”或第三方转存页面替代源级许可证结论。

## 银河纹理（HYG 派生）

`pnpm milkyway:dev` 从 `data/milkyway/hyg_v36_1.csv.gz`（HYG Database v3.6.1，
CC BY-SA 4.0）烘焙全天空银河亮度纹理到 `public/data/dev/milkyway.png`。
运行时加载到该文件时用真实纹理渲染银河，缺失时退回程序噪声着色，
因此 `pnpm build` 的产物不受影响。纹理是 HYG 的派生数据，在
`data/licenses/catalog-sources.json` 中登记为候选源；进入生产前需完成
书面核验，并按 CC BY-SA 要求提供署名。
