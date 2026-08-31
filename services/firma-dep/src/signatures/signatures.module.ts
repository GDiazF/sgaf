import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/security.module';
import { SignaturesController } from './signatures.controller';
import { SignaturesService } from './signatures.service';

@Module({
  imports: [SecurityModule],
  controllers: [SignaturesController],
  providers: [SignaturesService],
})
export class SignaturesModule {}
