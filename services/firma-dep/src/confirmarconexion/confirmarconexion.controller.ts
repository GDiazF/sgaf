import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../security/public.decorator';

@ApiExcludeController()
@Controller('confirmarconexion')
export class ConfirmarConexionController {
  @Public()
  @Get()
  getConnectionStatus() {
    return {
      mensaje: 'conexion exitosa',
    };
  }
}
