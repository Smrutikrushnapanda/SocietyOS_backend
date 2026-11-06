import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

export type WeatherScene =
  | 'sunny'
  | 'partly-cloudy'
  | 'cloudy'
  | 'rainy'
  | 'stormy'
  | 'sunset'
  | 'night'
  | 'foggy';

export interface WeatherTelemetry {
  scene: WeatherScene;
  temperature: number;
  condition: string;
  humidity: number;
  windKph: number;
  location: string;
  isLive: boolean;
  solarKw: number;
  waterLevelPct: number;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private memoryCache: { key: string; data: WeatherTelemetry; expiresAt: number } | null = null;

  constructor(private readonly redis: Redis) {}

  async getCurrentWeather(queryCity?: string, latitude?: number, longitude?: number): Promise<WeatherTelemetry> {
    const locationQuery = latitude !== undefined && longitude !== undefined ? `${latitude},${longitude}` : queryCity || 'Bhubaneswar';
    const cacheKey = `weather:telemetry:${locationQuery}`;

    // Try Redis cache first (5-minute TTL)
    try {
      if (this.redis && typeof this.redis.get === 'function') {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as WeatherTelemetry;
        }
      }
    } catch {
      // Redis fallback to memory
    }

    if (this.memoryCache?.key === cacheKey && Date.now() < this.memoryCache.expiresAt) {
      return this.memoryCache.data;
    }

    const apiKey =
      process.env.weather_key ||
      process.env.WEATHER_KEY ||
      process.env.WEATHER_API_KEY ||
      process.env.WEATHERAPI_KEY ||
      '';

    const city = locationQuery;

    if (apiKey) {
      try {
        const url = `https://api.weatherapi.com/v1/current.json?key=${encodeURIComponent(
          apiKey.trim(),
        )}&q=${encodeURIComponent(city)}&aqi=no`;

        const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
        if (res.ok) {
          const json = await res.json();
          const conditionText = json.current?.condition?.text || 'Clear';
          const conditionCode = json.current?.condition?.code;
          const isDay = json.current?.is_day === 1;
          const tempC = Math.round(json.current?.temp_c ?? 28);
          const humidity = json.current?.humidity ?? 65;
          const windKph = Math.round(json.current?.wind_kph ?? 12);
          const locName = json.location?.name || city;

          const scene = this.deriveScene(conditionText, isDay, conditionCode);
          const telemetry: WeatherTelemetry = {
            scene,
            temperature: tempC,
            condition: conditionText,
            humidity,
            windKph,
            location: locName,
            isLive: true,
            solarKw:
              scene === 'sunny'
                ? 28.4
                : scene === 'partly-cloudy'
                ? 21.2
                : scene === 'cloudy'
                ? 14.5
                : scene === 'sunset'
                ? 6.8
                : scene === 'rainy' || scene === 'stormy'
                ? 2.1
                : 0,
            waterLevelPct: scene === 'rainy' || scene === 'stormy' ? 95 : 82,
          };

          try {
            if (this.redis && typeof this.redis.set === 'function') {
              await this.redis.set(cacheKey, JSON.stringify(telemetry), 'EX', 300);
            }
          } catch {}

          this.memoryCache = { key: cacheKey, data: telemetry, expiresAt: Date.now() + 300_000 };
          return telemetry;
        } else {
          this.logger.warn(`WeatherAPI returned ${res.status}: ${res.statusText}`);
        }
      } catch (err: any) {
        this.logger.warn(`WeatherAPI request failed: ${err.message}`);
      }
    }

    // Default fallback based on current local hour
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const istDate = new Date(utcTime + 3600000 * 5.5);
    const hour = istDate.getHours();
    const minutes = istDate.getMinutes();
    const decimalHour = hour + minutes / 60;

    let scene: WeatherScene = 'sunny';
    let temp = 29;
    let cond = 'Sunny';
    let solarKw = 28.0;

    if (decimalHour >= 19 || decimalHour < 5.5) {
      scene = 'night';
      temp = 23;
      cond = 'Clear Night';
      solarKw = 0;
    } else if (decimalHour >= 16.5 && decimalHour < 19) {
      scene = 'sunset';
      temp = 27;
      cond = 'Golden Sunset';
      solarKw = 7.2;
    } else if (decimalHour >= 12 && decimalHour < 15) {
      scene = 'sunny';
      temp = 31;
      cond = 'Sunny';
      solarKw = 28.4;
    } else {
      scene = 'partly-cloudy';
      temp = 28;
      cond = 'Partly Cloudy';
      solarKw = 22.0;
    }

    const fallback: WeatherTelemetry = {
      scene,
      temperature: temp,
      condition: cond,
      humidity: 62,
      windKph: 14,
      location: city,
      isLive: false,
      solarKw,
      waterLevelPct: 82,
    };

    this.memoryCache = { key: cacheKey, data: fallback, expiresAt: Date.now() + 60_000 };
    return fallback;
  }

  private deriveScene(conditionText: string, isDay: boolean, conditionCode?: number): WeatherScene {
    const c = conditionText.toLowerCase();

    // 1. Stormy
    if (
      c.includes('thunder') ||
      c.includes('storm') ||
      c.includes('tornado') ||
      c.includes('blizzard') ||
      (conditionCode && [1087, 1273, 1276, 1279, 1282].includes(conditionCode))
    ) {
      return 'stormy';
    }

    // 2. Rainy / Monsoon
    if (
      c.includes('rain') ||
      c.includes('drizzle') ||
      c.includes('shower') ||
      c.includes('sleet') ||
      c.includes('monsoon') ||
      (conditionCode && [1063, 1150, 1153, 1180, 1183, 1186, 1189, 1192, 1195, 1240, 1243, 1246].includes(conditionCode))
    ) {
      return 'rainy';
    }

    // 3. Foggy
    if (
      c.includes('fog') ||
      c.includes('mist') ||
      c.includes('haze') ||
      c.includes('smoke') ||
      (conditionCode && [1030, 1135, 1147].includes(conditionCode))
    ) {
      return 'foggy';
    }

    // 4. Night
    if (!isDay) {
      return 'night';
    }

    // 5. Sunset / Golden Hour check
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const istHour = new Date(utcTime + 3600000 * 5.5).getHours();
    const istMinutes = new Date(utcTime + 3600000 * 5.5).getMinutes();
    const decHour = istHour + istMinutes / 60;
    if (decHour >= 16.5 && decHour <= 18.75) {
      return 'sunset';
    }

    // 6. Cloudy / Overcast
    if (c.includes('overcast') || (c.includes('cloudy') && !c.includes('partly'))) {
      return 'cloudy';
    }

    // 7. Partly cloudy
    if (c.includes('partly') || c.includes('scattered')) {
      return 'partly-cloudy';
    }

    // 8. Default sunny
    return 'sunny';
  }
}
