import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBase64,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SignatureOptionsDto {
  @ApiProperty({ enum: ['atendida', 'desatendida'], example: 'desatendida' })
  @IsString()
  @IsIn(['atendida', 'desatendida'])
  mode: 'atendida' | 'desatendida';

  @ApiProperty({ example: '22.222.222-2' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9.\-kK]+$/, {
    message: 'rut debe tener un formato valido, por ejemplo 22.222.222-2.',
  })
  rut: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  otp?: string | null;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  visibleSeal?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sealPage?: number;

  @ApiPropertyOptional({ example: 22, default: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(30)
  sealTopMarginCm?: number;

  @ApiPropertyOptional({ example: 1.5, default: 1.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(30)
  sealLeftMarginCm?: number;

  @ApiPropertyOptional({
    description:
      'PNG/JPEG en base64 para el fondo del sello visible. Si no viene, se usa assets/logo-dep.png. FirmaGob sigue dibujando el texto (layer2).',
  })
  @IsOptional()
  @IsString()
  sealImageBase64?: string;

  @ApiPropertyOptional({
    example: 205,
    default: 205,
    description: 'Ancho del recuadro de firma visible en puntos PDF (default 205).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(80)
  @Max(400)
  sealWidthPt?: number;

  @ApiPropertyOptional({
    example: 84,
    default: 84,
    description: 'Alto del recuadro de firma visible en puntos PDF (default 84).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(40)
  @Max(200)
  sealHeightPt?: number;

  @ApiPropertyOptional({ example: 'Subsecretaría General de la Presidencia' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  entity?: string;
}

class ValidationOptionsDto {
  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 'https://miapp.cl/validar/DEP-2026-0001' })
  @IsOptional()
  @IsUrl({
    require_tld: false,
    require_protocol: true,
  })
  url?: string;

  @ApiPropertyOptional({ example: 'DEP-2026-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  documentId?: string;

  @ApiPropertyOptional({
    example: 'https://miapp.cl/validar/DEP-2026-0001',
    description: 'Si no viene, el backend puede reutilizar validation.url como fuente del QR.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  qrPayload?: string;

  @ApiPropertyOptional({
    example:
      'Este documento ha sido firmado electrónicamente de acuerdo con la ley N 19.799.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  footerText?: string;
}

class ResponseOptionsDto {
  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  returnSignedPdfBase64?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  returnPreparedPdfBase64?: boolean;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Si es true, el error incluye el detalle completo de FirmaGob. Por defecto solo devuelve el mensaje de error.',
  })
  @IsOptional()
  @IsBoolean()
  verboseError?: boolean;
}

export class SignPdfDto {
  @ApiProperty({
    example: 'JVBERi0xLjcKJcTl8uXrp...',
    description: 'PDF base en base64. La API lo prepara y luego lo firma.',
  })
  @IsString()
  @IsNotEmpty()
  @IsBase64()
  pdfBase64: string;

  @ApiPropertyOptional({ example: 'cdp-0001.pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fileName?: string;

  @ApiProperty({ type: SignatureOptionsDto })
  @ValidateNested()
  @Type(() => SignatureOptionsDto)
  signature: SignatureOptionsDto;

  @ApiPropertyOptional({ type: ValidationOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ValidationOptionsDto)
  validation?: ValidationOptionsDto;

  @ApiPropertyOptional({ type: ResponseOptionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResponseOptionsDto)
  options?: ResponseOptionsDto;
}
