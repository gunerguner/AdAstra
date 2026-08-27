# 目录结构修复:实施计划

原则:消除层级循环,让实际依赖回到 `docs/technical.md` 规定的方向;改动以"搬类型/搬常量"为主,不动运行时行为。先把上一轮已验证的 App 拆分改动单独提交,再分阶段实施。

## P1 打破三个层级循环(核心)

1. **config ↔ engine**:config 不再 import `@/engine/coordinates/astroConstants`,黄极常量等天文量回归 engine 侧;engine 直接从 astroConstants 取所需常量。
2. **app ↔ features**:`Playback`、`LiveClockRefs` 类型移到 `src/shared/types/playback.ts`,`TimeDeck.tsx` 改从 shared 引入。
3. **shared → i18n → engine**:`src/i18n/names.ts` 用本地最小结构化接口替代 `RuntimeCatalog` 类型依赖,切断 i18n → engine,三角环随之断开。

## P2 结构归位

4. **拆分 src/data/**:`stars.yaml`(构建期源数据)移到根目录 `data/`,更新 `scripts/catalog/build-catalog.mjs` 与相关测试路径。
5. **文档同步**:technical.md 分层表补 `engine/location`,更新依赖方向说明。

## P3 清扫杂项

6. 删除空目录 `scripts/poc/`、`.DS_Store`(如被跟踪),.gitignore 加 .DS_Store。
7. `StatusPanel.module.css` → `ErrorPanel.module.css`。
8. `shared/math.ts` → `shared/math/index.ts`(import 路径 `@/shared/math` 不变,无需改引用方)。
9. tests/ 统一改用 `@/` 别名导入。

## 验证与提交

每阶段后跑 typecheck/lint/test;数据搬迁后补跑 catalog:fixture 与 astro:golden。按现有风格分四次提交:①App 拆分(遗留)、②P1 循环修复、③P2 数据归位+文档、④P3 清扫。