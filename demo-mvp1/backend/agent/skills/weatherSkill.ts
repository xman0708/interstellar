/**
 * Weather Skill - 天气查询 v2
 * 
 * 多种方式尝试获取天气
 */

export async function getWeather(city: string = '北京'): Promise<any> {
  // 方法1: wttr.in
  try {
    const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
      signal: AbortSignal.timeout(8000)
    });
    if (response.ok) {
      const data = await response.json();
      const current = data.current_condition[0];
      return {
        success: true,
        city: data.nearest_area[0].areaName[0].value,
        temp: current.temp_C,
        feels: current.FeelsLikeC,
        humidity: current.humidity,
        wind: current.windspeedKm,
        condition: current.weatherDesc[0].value,
        source: 'wttr.in'
      };
    }
  } catch (e) { /* continue */ }
  
  // 方法2: Open-Meteo (免费无需 API key)
  try {
    // 先获取城市坐标
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
    const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(5000) });
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      if (geoData.results && geoData.results[0]) {
        const { latitude, longitude, name } = geoData.results[0];
        
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`;
        const weatherRes = await fetch(weatherUrl, { signal: AbortSignal.timeout(5000) });
        if (weatherRes.ok) {
          const w = await weatherRes.json();
          return {
            success: true,
            city: name,
            temp: w.current.temperature_2m,
            feels: w.current.apparent_temperature,
            humidity: w.current.relative_humidity_2m,
            wind: w.current.wind_speed_10m,
            condition: getWeatherCode(w.current.weather_code),
            source: 'Open-Meteo'
          };
        }
      }
    }
  } catch (e) { /* continue */ }
  
  return { success: false, error: 'Network unavailable' };
}

// 天气代码转中文
function getWeatherCode(code: number): string {
  const codes: Record<number, string> = {
    0: '晴朗',
    1: '晴间多云',
    2: '多云',
    3: '阴',
    45: '雾',
    48: '雾凇',
    51: '小毛毛雨',
    53: '中毛毛雨',
    55: '大毛毛雨',
    61: '小雨',
    63: '中雨',
    65: '大雨',
    71: '小雪',
    73: '中雪',
    75: '大雪',
    80: '阵雨',
    95: '雷暴',
    96: '雷暴+冰雹'
  };
  return codes[code] || '未知';
}
