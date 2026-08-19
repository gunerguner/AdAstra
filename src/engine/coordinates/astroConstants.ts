/**
 * 天文与时间尺度常量。
 * 着色器里的颜色/光晕微调不要放这里。
 */

export const MS_PER_DAY = 86_400_000
export const HOURS_PER_DAY = 24
/** 赤经 1 小时 = 15°。 */
export const DEG_PER_HOUR = 15

/** Unix 纪元对应的儒略日（1970-01-01 0h UTC）。 */
export const JULIAN_UNIX_EPOCH = 2_440_587.5
/** J2000.0 儒略日。 */
export const JULIAN_J2000 = 2_451_545.0
/** J2000 格林尼治平恒星时（小时），Meeus 近似。 */
export const GMST_HOURS_AT_J2000 = 18.697374558
/** 一个平太阳日内的平恒星时小时数。 */
export const SIDEREAL_HOURS_PER_SOLAR_DAY = 24.06570982441908

/** J2000 平黄赤交角（度）。用来画黄道，不含章动。 */
export const OBLIQUITY_DEG = 23.439

/** 天球大圆弧细分步长。 */
export const GREAT_CIRCLE_STEP_DEG = 2
export const GREAT_CIRCLE_STEP_RAD = (GREAT_CIRCLE_STEP_DEG * Math.PI) / 180

/** 曙暮光：太阳高度角阈值（度）。 */
export const CIVIL_TWILIGHT_ALTITUDE_DEG = -6
export const NAUTICAL_TWILIGHT_ALTITUDE_DEG = -12
export const ASTRONOMICAL_TWILIGHT_ALTITUDE_DEG = -18
/** 白昼混合视为「全白天」的太阳高度。 */
export const DAYLIGHT_FULL_ALTITUDE_DEG = 6

/** IAU 银道：北银极与银心（赤经时、赤纬度）。 */
export const NORTH_GALACTIC_POLE = { raHours: 12.857298, decDeg: 27.12825 }
export const GALACTIC_CENTER = { raHours: 17.760333, decDeg: -28.936175 }
