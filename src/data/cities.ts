export const cities = [
  { id: 'shanghai', names: { zh: '上海', en: 'Shanghai' }, latitude: 31.2304, longitude: 121.4737, timeZone: 'Asia/Shanghai' },
  { id: 'beijing', names: { zh: '北京', en: 'Beijing' }, latitude: 39.9042, longitude: 116.4074, timeZone: 'Asia/Shanghai' },
  { id: 'london', names: { zh: '伦敦', en: 'London' }, latitude: 51.5072, longitude: -0.1276, timeZone: 'Europe/London' },
  { id: 'newYork', names: { zh: '纽约', en: 'New York' }, latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' },
  { id: 'sydney', names: { zh: '悉尼', en: 'Sydney' }, latitude: -33.8688, longitude: 151.2093, timeZone: 'Australia/Sydney' },
] as const

export const defaultCityIndex = cities.findIndex((city) => city.id === 'shanghai')
