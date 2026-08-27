import { Module } from '@nestjs/common';
import { ConfirmarConexionController } from './confirmarconexion.controller';

@Module({
  controllers: [ConfirmarConexionController],
})
export class ConfirmarConexionModule {}
