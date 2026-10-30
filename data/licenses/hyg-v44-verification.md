# HYG Database v4.4 书面核验

## 来源

- **名称**：HYG Database v4.4
- **维护者**：David Nash（astronexus）
- **仓库**：https://codeberg.org/astronexus/hyg
- **文件**：`data/hyg/CURRENT/hyg_v44.csv.gz`
- **下载日期**：2026-10-30
- **SHA-256（gzip）**：`00b349893b9a53106dd488d8371e8d2fa586043e500bb3cdb8bff3931682197d`
- **SHA-256（解压后 CSV）**：`ea0e1699a1e7d48daa197b5fe567fcf447420e367f37619862ee1d6f077599cd`

## 授权

- **许可证**：Creative Commons Attribution-ShareAlike 4.0 International（CC BY-SA 4.0）
- **授权页面**：https://codeberg.org/astronexus/hyg/raw/branch/main/README.md
- **授权快照日期**：2026-10-30
- **授权条款**：
  - **署名（BY）**：必须给出适当署名，提供许可证链接，并标明是否做了修改。
  - **相同方式共享（SA）**：基于本数据创作的派生作品，须以相同许可证（CC BY-SA 4.0）发布。

## 书面结论

1. **再分发**：允许。CC BY-SA 4.0 明确授予"以任何媒介或格式复制并分享本材料"的权利。
2. **商用**：允许。许可证未限制商业用途。
3. **派生格式**：允许。许可证明确授予"重混、转换、及基于本材料进行创作"的权利。
4. **署名要求**：必须在应用内展示：
   - 数据名称：HYG Database v4.4
   - 维护者：David Nash / astronexus
   - 许可证：CC BY-SA 4.0
   - 来源链接：https://codeberg.org/astronexus/hyg
5. **相同方式共享**：本项目烘焙的银河亮度纹理（`public/data/dev/milkyway.png`）是 HYG v4.4 的派生作品，须以 CC BY-SA 4.0 发布。项目已在 `public/data/dev/milkyway.json` 中记录来源、许可证与生成参数，并在页脚提供署名链接。

## 审批

- **责任人**：项目维护者
- **复核日期**：2026-10-30
- **状态**：通过

## 备注

- v3.6.1（原候选源）的许可证为 CC BY-SA 2.5；v4.0 起 HYG 更新为 CC BY-SA 4.0。v4.4 与 v3.6.1 的星表数据几乎一致（差异主要在 IAU 恒星命名和少量 ID 修正），烘焙结果无显著变化。
- 页脚署名实现见 `src/app/components/SiteFooter.tsx`。
