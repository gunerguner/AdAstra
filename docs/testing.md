# Ad Astra 测试说明

Ad Astra 的测试是**纯逻辑单测**:不起浏览器、不跑 WebGL,只验证驱动星空的那些计算和状态。本文说明测试栈、测什么、怎么跑和怎么写。

## 技术栈

| 组成 | 选择 | 说明 |
| --- | --- | --- |
| 测试框架 | Vitest 4 | 与 Vite 共用一套配置,`@/` 路径别名直接可用 |
| 运行环境 | Node | 没有 jsdom,不做组件渲染测试 |
| 测试位置 | `tests/*.test.ts` | 一个被测模块对应一个测试文件,按模块名命名 |
| 代码检查 | oxlint | `pnpm lint` 同样检查 `tests/` |

所有测试在秒级跑完。Three.js 渲染效果由肉眼验收，代码里只测它接收到的数据和参数。

## 能测什么

覆盖的典型对象:

- **数学与几何**:`shared/math` 的钳位/插值/角度换算、天球几何、坐标投影。
- **时间与状态**:`SimulationClock` 的暂停/倍速推进、时间控件的本地时间解析。
- **数据与目录**:星表加载、亮星覆盖率、星座连线数据、目录多语言。
- **交互与服务**:天空拾取、地理编码、定位、图层渲染顺序、资源生命周期。
- **天文精度门禁**:`pnpm astro:golden` 把 `astronomy-engine` 的输出和仓库里的基准值 `scripts/astronomy/golden.json` 对比,角误差超阈值即失败,防止星历计算被无意改坏。

## 怎么跑

```sh
pnpm test                # 跑一遍全部测试(CI / 提交前)
pnpm vitest              # 监听模式,改代码自动重跑
pnpm test math           # 只跑文件名含 math 的测试
pnpm astro:golden        # 只跑天文精度门禁
pnpm verify              # typecheck + lint + test + golden,一条龙
```

`pnpm build:release` 内部会执行 `pnpm verify`,发版前测试不过就构建不出来。

## 怎么写

在 `tests/` 下新建 `<模块名>.test.ts`,用 `describe/it/expect` 组织,从 `@/` 直接导入被测代码:

```ts
import { describe, expect, it } from 'vitest'
import { clamp } from '@/shared/math'

describe('shared math', () => {
  it('clamps to inclusive bounds', () => {
    expect(clamp(-1, 0, 1)).toBe(0)
  })
})
```

约定:

- **测纯逻辑,不测渲染。** 想测 UI 行为,先把它抽成可独立调用的纯函数再测函数。
- **涉及时钟用假计时器**,测完恢复,参考 `tests/simulationClock.test.ts`:

  ```ts
  vi.useFakeTimers()
  vi.spyOn(performance, 'now').mockReturnValue(1000)
  // ...断言时间推进
  vi.useRealTimers()
  ```

- **命名对齐模块**:被测对象在 `src/shared/math.ts`,测试就叫 `tests/math.test.ts`,目录里一眼能对上。

写完跑 `pnpm verify`,四项全绿即可提交。
