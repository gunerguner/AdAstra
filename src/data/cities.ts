export const cities = [
  { name: '上海', latitude: 31.2304, longitude: 121.4737, timeZone: 'Asia/Shanghai' },
  { name: '北京', latitude: 39.9042, longitude: 116.4074, timeZone: 'Asia/Shanghai' },
  { name: '伦敦', latitude: 51.5072, longitude: -0.1276, timeZone: 'Europe/London' },
  { name: '纽约', latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' },
  { name: '悉尼', latitude: -33.8688, longitude: 151.2093, timeZone: 'Australia/Sydney' },
] as const

export const defaultCityIndex = cities.findIndex((city) => city.name === '上海')
