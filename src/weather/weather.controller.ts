import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WeatherService, WeatherTelemetry } from './weather.service';

@ApiTags('weather')
@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current weather telemetry for hero visualizer' })
  @ApiResponse({ status: 200, description: 'Live or time-derived weather telemetry' })
  async getCurrentWeather(
    @Query('city') city?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ): Promise<WeatherTelemetry> {
    const lat = latitude === undefined ? undefined : Number(latitude);
    const lon = longitude === undefined ? undefined : Number(longitude);
    const validCoordinates = Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat!) <= 90 && Math.abs(lon!) <= 180;
    return this.weatherService.getCurrentWeather(city, validCoordinates ? lat : undefined, validCoordinates ? lon : undefined);
  }
}
