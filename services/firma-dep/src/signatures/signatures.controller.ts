import { Body, Controller, Get, Headers, Post, Res, StreamableFile } from '@nestjs/common';
import { ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { SignPdfDto } from './dto/sign-pdf.dto';
import { SignaturesService } from './signatures.service';

@ApiTags('signatures')
@Controller('signatures')
export class SignaturesController {
  constructor(private readonly signaturesService: SignaturesService) {}

  @ApiOperation({
    summary: 'Expone las capacidades del servicio de firma reutilizable.',
  })
  @Get('capabilities')
  getCapabilities() {
    return this.signaturesService.getCapabilities();
  }

  @ApiOperation({
    summary:
      'Prepara un PDF base para revision previa. Este endpoint se usara para footer de validacion, QR y preview de firma visible.',
  })
  @Post('preview-pdf')
  previewPdf(@Body() dto: SignPdfDto, @Headers('x-client-id') clientId?: string) {
    return this.signaturesService.previewPdf(dto, clientId);
  }

  @ApiOperation({
    summary:
      'Recibe un PDF base y el contrato documental comun para firmarlo con FirmaGob.',
  })
  @Post('sign-pdf')
  signPdf(@Body() dto: SignPdfDto, @Headers('x-client-id') clientId?: string) {
    return this.signaturesService.signPdf(dto, clientId);
  }

  @ApiOperation({
    summary:
      'Recibe un PDF base, lo firma con FirmaGob y responde directamente el archivo PDF firmado.',
  })
  @ApiProduces('application/pdf')
  @Post('sign-pdf-file')
  async signPdfFile(
    @Body() dto: SignPdfDto,
    @Headers('x-client-id') clientId: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const signedFile = await this.signaturesService.signPdfFile(dto, clientId);
    const safeFileName = signedFile.fileName.replace(/[".;\r\n\\]/g, '_');

    response.setHeader('Content-Type', signedFile.contentType);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFileName}"`,
    );

    return new StreamableFile(signedFile.buffer);
  }
}
