import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../security/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @ApiOperation({
    summary: 'Expone un estado simple del servicio para pruebas y monitoreo.',
  })
  @Public()
  @Get()
  getHealth() {
    return {
      ok: true,
      service: 'firma-dep',
      timestamp: new Date().toISOString(),
    };
  }
}
