import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, PDFImage, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { AuditLogService } from '../security/audit-log.service';
import { SignPdfDto } from './dto/sign-pdf.dto';

type FirmaMode = 'atendida' | 'desatendida';

type FirmaGobJwtPayload = {
  run: string;
  entity: string;
  purpose: string;
  expiration: string;
};

type PreparedPdfArtifacts = {
  buffer: Buffer;
  checksum: string;
  sealPlacement: VisibleSealPlacement | null;
};

type VisibleSealPlacement = {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type CompletedSignatureArtifacts = {
  fileName: string;
  signedPdfBuffer: Buffer;
  signedPdfBase64: string;
  responseData: any;
  file: any;
  jwtPayload: FirmaGobJwtPayload;
  preparedPdf: PreparedPdfArtifacts;
  originalChecksum: string;
  usedOtp: boolean;
  layoutXml: string | null;
};

@Injectable()
export class SignaturesService {
  private readonly logger = new Logger(SignaturesService.name);
  private readonly sealLogoBase64 = this.loadSealLogoBase64();

  constructor(
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Expone un resumen seguro del servicio para que otras apps sepan
   * si el backend de firma esta operativo sin revelar secretos.
   */
  getCapabilities() {
    return {
      service: 'firma-dep',
      enabled: this.isEnabled(),
      environment: this.getEnvironment(),
      apiUrl: this.getApiUrl(),
      supports: {
        previewPdf: true,
        signPdf: true,
        signatureModes: {
          atendida: true,
          desatendida: this.isUnattendedModeEnabled(),
        },
        visibleSeal: true,
        validationFooter: true,
        qrFooter: true,
      },
    };
  }

  /**
   * Genera una previsualizacion real del PDF aplicando el pie de validacion
   * y, si corresponde, un sello visual estimado para revisar posicion.
   */
  async previewPdf(dto: SignPdfDto, clientId?: string) {
    this.validateSignatureRules(dto);

    const originalPdfBuffer = this.decodeAndValidatePdf(dto.pdfBase64);
    const preparedPdf = await this.preparePdfForSignature(originalPdfBuffer, dto);
    const previewBuffer =
      dto.signature.visibleSeal === false
        ? preparedPdf.buffer
        : await this.buildPreviewPdfBuffer(preparedPdf.buffer, dto, preparedPdf.sealPlacement);

    await this.auditLogService.register({
      event: 'preview_pdf',
      clientId: clientId || 'sin-client-id',
      signatureMode: dto.signature.mode,
      fileName: dto.fileName ?? null,
      validationEnabled: Boolean(dto.validation?.enabled),
      checksumOriginal: this.sha256(originalPdfBuffer),
      checksumPrepared: preparedPdf.checksum,
      checksumPreview: this.sha256(previewBuffer),
      status: 'OK',
    });

    return {
      ok: true,
      message:
        'Previsualizacion generada correctamente. Este PDF ya incluye el footer de validacion y una referencia visual del sello antes de firmar.',
      requestInfo: {
        fileName: dto.fileName ?? null,
        signatureMode: dto.signature.mode,
        validationEnabled: Boolean(dto.validation?.enabled),
        visibleSeal: dto.signature.visibleSeal !== false,
      },
      result: {
        contentType: 'application/pdf',
        checksumOriginal: this.sha256(originalPdfBuffer),
        checksumPrepared: preparedPdf.checksum,
        checksumPreview: this.sha256(previewBuffer),
        previewPdfBase64: previewBuffer.toString('base64'),
      },
    };
  }

  /**
   * Ejecuta el flujo completo:
   * 1. prepara el PDF con footer y QR
   * 2. firma el JWT de acceso
   * 3. envia el documento a FirmaGob
   * 4. devuelve el PDF firmado
   */
  async signPdf(dto: SignPdfDto, clientId?: string) {
    let signed: CompletedSignatureArtifacts;
    try {
      signed = await this.executeSignFlow(dto, clientId);
    } catch (error) {
      const verboseAllowed = this.configService.get<string>('NODE_ENV') !== 'production';
      return this.resolveErrorResponse(
        error,
        verboseAllowed && dto.options?.verboseError === true,
      );
    }

    return {
      ok: true,
      message:
        'FirmaGob respondio correctamente. El PDF se preparo con validacion y luego se envio al proveedor para su firma.',
      requestInfo: {
        environment: this.getEnvironment(),
        apiUrl: this.getApiUrl(),
        signatureMode: dto.signature.mode,
        usedOtp: signed.usedOtp,
        signer: signed.jwtPayload,
        validationEnabled: Boolean(dto.validation?.enabled),
        checksumOriginal: signed.originalChecksum,
        checksumPrepared: signed.preparedPdf.checksum,
        usedLayoutXml: Boolean(signed.layoutXml),
      },
      result: {
        status: signed.file?.status ?? null,
        description: signed.file?.description ?? null,
        contentType: signed.file?.contentType ?? signed.file?.['content-type'] ?? null,
        checksumOriginal:
          signed.file?.checksum_original ?? signed.file?.checksumOriginal ?? null,
        checksumSigned:
          signed.file?.checksum_signed ?? signed.file?.checksumSigned ?? signed.file?.checksum ?? null,
        preparedPdfBase64:
          dto.options?.returnPreparedPdfBase64 === true
            ? signed.preparedPdf.buffer.toString('base64')
            : null,
        signedPdfBase64:
          dto.options?.returnSignedPdfBase64 === false
            ? null
            : signed.signedPdfBase64,
        metadata: signed.responseData?.metadata ?? null,
        rawResponse: signed.responseData,
      },
    };
  }

  /**
   * Variante pensada para integraciones entre apps.
   * Devuelve el archivo PDF firmado listo para descargar o reenviar.
   */
  async signPdfFile(dto: SignPdfDto, clientId?: string) {
    const signed = await this.executeSignFlow(dto, clientId);

    return {
      fileName: signed.fileName,
      contentType: 'application/pdf',
      buffer: signed.signedPdfBuffer,
    };
  }

  private validateSignatureRules(dto: SignPdfDto) {
    if (dto.signature.mode === 'atendida' && !dto.signature.otp?.trim()) {
      throw new BadRequestException('En firma atendida debes enviar signature.otp.');
    }

    if (dto.signature.mode === 'desatendida' && dto.signature.otp?.trim()) {
      throw new BadRequestException('En firma desatendida no debes enviar signature.otp.');
    }

    if (dto.signature.mode === 'desatendida' && !this.isUnattendedModeEnabled()) {
      throw new BadRequestException(
        'La firma desatendida esta deshabilitada. Ajusta FIRMA_UNATTENDED_ENABLED=true para habilitarla.',
      );
    }

    if (dto.validation?.enabled && !this.resolveValidationUrl(dto)) {
      throw new BadRequestException(
        'Si validation.enabled=true debes enviar validation.url o validation.qrPayload.',
      );
    }
  }

  private async preparePdfForSignature(
    originalPdf: Buffer,
    dto: SignPdfDto,
  ): Promise<PreparedPdfArtifacts> {
    const pdfDoc = await PDFDocument.load(originalPdf);

    const maxPages = Number(this.configService.get<string>('PDF_MAX_PAGES') ?? 300);
    if (pdfDoc.getPageCount() > maxPages) {
      throw new BadRequestException(
        `El PDF excede el numero maximo de paginas permitido (${maxPages}).`,
      );
    }

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // El sello se resuelve primero porque puede agregar una nueva pagina al doc.
    // El footer se aplica despues para que esa pagina nueva tambien lo reciba.
    const sealPlacement = this.resolveVisibleSealPlacement(pdfDoc, dto);
    await this.applyValidationFooter(pdfDoc, regularFont, boldFont, dto);

    const preparedBytes = await pdfDoc.save();
    const preparedBuffer = Buffer.from(preparedBytes);

    return {
      buffer: preparedBuffer,
      checksum: this.sha256(preparedBuffer),
      sealPlacement,
    };
  }

  private async executeSignFlow(
    dto: SignPdfDto,
    clientId?: string,
  ): Promise<CompletedSignatureArtifacts> {
    this.ensureEnabled();
    this.validateSignatureRules(dto);

    const originalPdfBuffer = this.decodeAndValidatePdf(dto.pdfBase64);
    const preparedPdf = await this.preparePdfForSignature(originalPdfBuffer, dto);
    const jwtPayload = this.buildJwtPayload(dto);
    const token = this.signJwt(jwtPayload);
    const layoutXml =
      dto.signature.visibleSeal === false
        ? null
        : this.buildVisibleSealLayout(preparedPdf.sealPlacement);
    const fileName = this.resolveSignedFileName(dto.fileName);

    const body = {
      token,
      api_token_key: this.getRequiredEnv(
        'FIRMA_GOB_API_TOKEN_KEY',
        'Falta configurar FIRMA_GOB_API_TOKEN_KEY para usar FirmaGob.',
      ),
      files: [
        {
          'content-type': 'application/pdf',
          content: preparedPdf.buffer.toString('base64'),
          description: fileName,
          checksum: preparedPdf.checksum,
          ...(layoutXml ? { layout: layoutXml } : {}),
        },
      ],
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (dto.signature.mode === 'atendida' && dto.signature.otp?.trim()) {
      headers.OTP = dto.signature.otp.trim();
    }

    this.logger.debug(
      JSON.stringify(
        {
          event: 'firma_dep_outgoing_request',
          apiUrl: this.getApiUrl(),
          signatureMode: dto.signature.mode,
          normalizedRun: jwtPayload.run ? `***${jwtPayload.run.slice(-2)}` : null,
          entity: jwtPayload.entity,
          purpose: jwtPayload.purpose,
          expiration: jwtPayload.expiration,
          apiTokenKey: body.api_token_key ? '[PRESENTE]' : '[NO_CONFIGURADO]',
          headers: {
            'Content-Type': headers['Content-Type'],
            OTP: headers.OTP ? '[PRESENTE]' : '[NO_ENVIADO]',
          },
          files: body.files.map((file) => ({
            contentType: file['content-type'],
            description: file.description,
            checksum: file.checksum,
            base64Length: file.content.length,
            hasLayout: Boolean((file as { layout?: string }).layout),
            layoutXml,
          })),
        },
        null,
        2,
      ),
    );

    try {
      const response = await axios.post(this.getApiUrl(), body, {
        headers,
        timeout: this.getTimeoutMs(),
      });

      const file = Array.isArray(response.data?.files) ? response.data.files[0] : undefined;
      const signedPdfBase64 = String(file?.content ?? '').trim();

      if (!signedPdfBase64) {
        throw new BadRequestException(
          'FirmaGob respondio sin contenido de PDF firmado.',
        );
      }

      await this.auditLogService.register({
        event: 'sign_pdf',
        clientId: clientId || 'sin-client-id',
        signatureMode: dto.signature.mode,
        fileName,
        validationEnabled: Boolean(dto.validation?.enabled),
        checksumOriginal: this.sha256(originalPdfBuffer),
        checksumPrepared: preparedPdf.checksum,
        checksumSigned:
          file?.checksum_signed ?? file?.checksumSigned ?? file?.checksum ?? null,
        firmaGobStatus: file?.status ?? null,
        usedLayoutXml: Boolean(layoutXml),
        usedOtp: Boolean(headers.OTP),
        status: 'OK',
      });

      return {
        fileName,
        signedPdfBuffer: Buffer.from(signedPdfBase64, 'base64'),
        signedPdfBase64,
        responseData: response.data,
        file,
        jwtPayload,
        preparedPdf,
        originalChecksum: this.sha256(originalPdfBuffer),
        usedOtp: Boolean(headers.OTP),
        layoutXml,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Inserta el footer institucional de validacion con QR y link.
   * Este pie queda embebido en el PDF antes de firmarlo.
   */
  private async applyValidationFooter(
    pdfDoc: PDFDocument,
    regularFont: PDFFont,
    boldFont: PDFFont,
    dto: SignPdfDto,
  ) {
    if (!dto.validation?.enabled) {
      return;
    }

    const qrPayload = this.resolveQrPayload(dto);
    const validationUrl = this.resolveValidationUrl(dto) ?? '[URL_VALIDACION]';
    const qrImage = qrPayload ? await this.buildQrImage(pdfDoc, qrPayload) : null;
    const footerText =
      dto.validation.footerText?.trim() ||
      'Este documento ha sido firmado electronicamente de acuerdo con la ley N 19.799.';

    for (const page of pdfDoc.getPages()) {
      this.drawValidationFooter(page, regularFont, boldFont, qrImage, footerText, validationUrl);
    }
  }

  private drawValidationFooter(
    page: PDFPage,
    regularFont: PDFFont,
    boldFont: PDFFont,
    qrImage: PDFImage | null,
    footerText: string,
    validationUrl: string,
  ) {
    const { width } = page.getSize();
    const blockX = 22;
    const blockY = 18;
    const blockWidth = width - 44;
    const blockHeight = 58;
    const qrSize = 40;
    const textX = blockX + qrSize + 14;

    page.drawRectangle({
      x: blockX,
      y: blockY,
      width: blockWidth,
      height: blockHeight,
      color: rgb(1, 1, 1),
      opacity: 0.98,
    });

    page.drawLine({
      start: { x: blockX, y: blockY + blockHeight - 2 },
      end: { x: blockX + blockWidth, y: blockY + blockHeight - 2 },
      thickness: 1,
      color: rgb(0.15, 0.15, 0.15),
    });

    if (qrImage) {
      page.drawImage(qrImage, {
        x: blockX,
        y: blockY + 8,
        width: qrSize,
        height: qrSize,
      });
    } else {
      page.drawRectangle({
        x: blockX,
        y: blockY + 8,
        width: qrSize,
        height: qrSize,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1,
      });
    }

    page.drawText(this.fitLine(footerText, 92), {
      x: textX,
      y: blockY + 34,
      size: 8.5,
      font: regularFont,
      color: rgb(0.08, 0.09, 0.12),
    });

    page.drawText(
      'Para verificar la integridad y autenticidad de este documento ingrese al siguiente link:',
      {
        x: textX,
        y: blockY + 21,
        size: 8.5,
        font: regularFont,
        color: rgb(0.08, 0.09, 0.12),
      },
    );

    page.drawText(this.fitLine(validationUrl, 86), {
      x: textX,
      y: blockY + 8,
      size: 9,
      font: boldFont,
      color: rgb(0.12, 0.2, 0.85),
    });
  }

  /**
   * La previsualizacion agrega un sello estimado en el PDF preparado.
   * Es solo una referencia visual; la firma final visible la inserta FirmaGob.
   */
  private async buildPreviewPdfBuffer(
    preparedPdf: Buffer,
    dto: SignPdfDto,
    sealPlacement: VisibleSealPlacement | null,
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(preparedPdf);
    const pages = pdfDoc.getPages();

    if (!pages.length) {
      throw new BadRequestException(
        'El PDF enviado no contiene paginas para generar la previsualizacion.',
      );
    }

    if (!sealPlacement) {
      return Buffer.from(await pdfDoc.save());
    }

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const logoImage = await this.embedPreviewLogo(pdfDoc);
    const pageToDraw = pages[Math.max(0, sealPlacement.pageNumber - 1)];

    if (logoImage) {
      pageToDraw.drawImage(logoImage, {
        x: sealPlacement.x,
        y: sealPlacement.y,
        width: 78,
        height: 78,
      });
    }

    pageToDraw.drawText('Firmado XXXXX', {
      x: sealPlacement.x + 86,
      y: sealPlacement.y + 50,
      size: 8.5,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    pageToDraw.drawText('Cargo XXXXXX', {
      x: sealPlacement.x + 86,
      y: sealPlacement.y + 36,
      size: 8.5,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    pageToDraw.drawText('Fecha XXXXXXX', {
      x: sealPlacement.x + 86,
      y: sealPlacement.y + 22,
      size: 8.5,
      font: regularFont,
      color: rgb(0, 0, 0),
    });

    const previewBytes = await pdfDoc.save();
    return Buffer.from(previewBytes);
  }

  /**
   * Layout XML visible para FirmaGob.
   * Aqui definimos la caja de firma en coordenadas PDF y la imagen base
   * que el proveedor usara para estampar la firma visible real.
   */
  private buildVisibleSealLayout(sealPlacement: VisibleSealPlacement | null): string | null {
    if (!sealPlacement) {
      return null;
    }

    const llx = sealPlacement.x;
    const lly = sealPlacement.y;
    const urx = sealPlacement.x + sealPlacement.width;
    const ury = sealPlacement.y + sealPlacement.height;
    const page = String(sealPlacement.pageNumber);

    return [
      '<AgileSignerConfig>',
      '<Application id="THIS-CONFIG">',
      '<pdfPassword/>',
      '<Signature>',
      '<Visible active="true" layer2="true" label="true" pos="1">',
      `<llx>${Math.round(llx)}</llx>`,
      `<lly>${Math.round(lly)}</lly>`,
      `<urx>${Math.round(urx)}</urx>`,
      `<ury>${Math.round(ury)}</ury>`,
      `<page>${page}</page>`,
      '<image>BASE64</image>',
      `<BASE64VALUE>${this.sealLogoBase64}</BASE64VALUE>`,
      '</Visible>',
      '</Signature>',
      '</Application>',
      '</AgileSignerConfig>',
    ].join('');
  }

  private buildJwtPayload(dto: SignPdfDto): FirmaGobJwtPayload {
    return {
      run: this.normalizeRutToRun(dto.signature.rut),
      entity:
        dto.signature.entity?.trim() ||
        this.getRequiredEnv(
          'FIRMA_GOB_DEFAULT_ENTITY',
          'Debes enviar signature.entity o configurar FIRMA_GOB_DEFAULT_ENTITY.',
        ),
      purpose: this.getPurposeBySignatureMode(dto.signature.mode),
      expiration: this.buildChileExpirationIso(10),
    };
  }

  /**
   * Firma el JWT en HS256 sin depender de paquetes extra.
   * La estructura debe ser compatible con lo esperado por FirmaGob.
   */
  private signJwt(payload: FirmaGobJwtPayload): string {
    const secret = this.getRequiredEnv(
      'FIRMA_GOB_SECRET',
      'Falta configurar FIRMA_GOB_SECRET para usar FirmaGob.',
    );
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(unsignedToken)
      .digest('base64url');

    return `${unsignedToken}.${signature}`;
  }

  private decodeAndValidatePdf(pdfBase64: string): Buffer {
    const buffer = Buffer.from(pdfBase64, 'base64');

    if (!buffer.length || buffer.subarray(0, 4).toString() !== '%PDF') {
      throw new BadRequestException(
        'El contenido enviado no parece ser un PDF valido. Se esperaba encabezado %PDF.',
      );
    }

    if (this.pdfAlreadyContainsSignature(buffer)) {
      throw new BadRequestException(
        'El PDF enviado ya contiene una firma digital. Por ahora no se permite volver a firmar documentos previamente firmados.',
      );
    }

    return buffer;
  }

  /**
   * Validacion temporal para evitar doble firma.
   * Busca marcadores comunes de firmas PDF/CMS embebidas antes de iniciar
   * cualquier preparacion o envio a FirmaGob.
   */
  private pdfAlreadyContainsSignature(buffer: Buffer): boolean {
    const pdfText = buffer.toString('latin1');
    const signatureMarkers = [
      '/Type /Sig',
      '/Subtype /Widget',
      '/FT /Sig',
      '/ByteRange',
      '/Contents <',
      '/SigFlags',
      '/DocMDP',
      '/TransformMethod /DocMDP',
    ];

    return signatureMarkers.some((marker) => pdfText.includes(marker));
  }

  private sha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private ensureEnabled() {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException(
        'firma-dep esta desactivado. Ajusta FIRMA_GOB_ENABLED=true para habilitar el servicio.',
      );
    }
  }

  private isEnabled(): boolean {
    return this.configService.get<string>('FIRMA_GOB_ENABLED') !== 'false';
  }

  private isUnattendedModeEnabled(): boolean {
    return this.configService.get<string>('FIRMA_UNATTENDED_ENABLED') !== 'false';
  }

  private getEnvironment(): string {
    return this.configService.get<string>('FIRMA_GOB_ENVIRONMENT') || 'test';
  }

  private getApiUrl(): string {
    const customUrl = this.getTrimmedEnv('FIRMA_GOB_API_URL');
    if (customUrl) {
      return customUrl;
    }

    return this.getEnvironment() === 'production'
      ? 'https://api.firma.digital.gob.cl/firma/v2/files/tickets'
      : 'https://api.firma.cert.digital.gob.cl/firma/v2/files/tickets';
  }

  private getTimeoutMs(): number {
    const value = Number(this.configService.get<number>('FIRMA_GOB_TIMEOUT_MS') ?? 30000);
    return Number.isFinite(value) && value > 0 ? value : 30000;
  }

  private getPurposeBySignatureMode(mode: FirmaMode): string {
    if (mode === 'desatendida') {
      return this.getTrimmedEnv('FIRMA_GOB_PURPOSE_UNATTENDED') || 'Desatendido';
    }

    return this.getTrimmedEnv('FIRMA_GOB_PURPOSE_ATTENDED') || 'Proposito General';
  }

  private normalizeRutToRun(rut: string): string {
    const cleaned = String(rut ?? '')
      .trim()
      .replace(/\./g, '')
      .replace(/-/g, '');

    if (cleaned.length < 2) {
      throw new BadRequestException('signature.rut no tiene un formato valido.');
    }

    const run = cleaned.slice(0, -1);
    if (!/^\d+$/.test(run)) {
      throw new BadRequestException(
        'signature.rut no tiene un formato valido para extraer el RUN numerico.',
      );
    }

    return run;
  }

  private resolveValidationUrl(dto: SignPdfDto): string | null {
    const url = dto.validation?.url?.trim();
    const payload = dto.validation?.qrPayload?.trim();
    return url || payload || null;
  }

  private resolveQrPayload(dto: SignPdfDto): string | null {
    const payload = dto.validation?.qrPayload?.trim();
    if (payload) {
      return payload;
    }

    return dto.validation?.url?.trim() || null;
  }

  private async buildQrImage(pdfDoc: PDFDocument, payload: string): Promise<PDFImage | null> {
    try {
      const qrDataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        margin: 0,
        width: 160,
      });
      const base64 = qrDataUrl.replace(/^data:image\/png;base64,/, '');
      return pdfDoc.embedPng(Buffer.from(base64, 'base64'));
    } catch (error) {
      this.logger.warn(
        `No se pudo generar el QR de validacion. Se continuara sin imagen QR. ${String(error)}`,
      );
      return null;
    }
  }

  private resolvePreviewPage(pdfDoc: PDFDocument, requestedPage?: number): PDFPage {
    const pages = pdfDoc.getPages();
    const targetIndex = Math.min(
      Math.max((requestedPage ?? pages.length) - 1, 0),
      pages.length - 1,
    );
    return pages[targetIndex];
  }

  /**
   * Calcula la posicion real del sello visible y, si no cabe en la hoja
   * objetivo, agrega una nueva pagina para que FirmaGob firme en la misma
   * ubicacion que ya muestra la previsualizacion.
   */
  private resolveVisibleSealPlacement(
    pdfDoc: PDFDocument,
    dto: SignPdfDto,
  ): VisibleSealPlacement | null {
    if (dto.signature.visibleSeal === false) {
      return null;
    }

    const sealPage = this.resolvePreviewPage(pdfDoc, dto.signature.sealPage);
    const topMarginCm = this.normalizeTopMargin(dto.signature.sealTopMarginCm);
    const leftMarginCm = this.normalizeLeftMargin(dto.signature.sealLeftMarginCm);
    const position = this.resolveSealPlacement(sealPage, topMarginCm, leftMarginCm);
    const pageToUse = position.targetPage ?? sealPage;

    return {
      pageNumber: pdfDoc.getPages().indexOf(pageToUse) + 1,
      x: position.x,
      y: position.y,
      width: 205,
      height: 84,
    };
  }

  private resolveSealPlacement(
    targetPage: PDFPage,
    topMarginCm?: number,
    leftMarginCm?: number,
  ) {
    const { width, height } = targetPage.getSize();
    const sealWidth = 205;
    const sealHeight = 84;
    // La firma visible por defecto queda alineada con la referencia institucional,
    // no pegada al borde derecho. Ambos margenes son configurables por el cliente.
    const x = Math.min(
      Math.max(this.normalizeLeftMargin(leftMarginCm) * 28.3465, 0),
      Math.max(width - sealWidth, 0),
    );
    const requestedY = height - this.normalizeTopMargin(topMarginCm) * 28.3465 - sealHeight;
    const minimumY = this.getValidationFooterReservedHeight();

    if (requestedY >= minimumY) {
      return {
        x,
        y: requestedY,
        targetPage: null as PDFPage | null,
      };
    }

    const newPage = targetPage.doc.addPage([width, height]);
    // Pagina nueva creada solo para la firma: siempre arriba (2cm desde el borde).
    const newPageY = height - 2 * 28.3465 - sealHeight;

    return {
      x,
      y: Math.max(minimumY, newPageY),
      targetPage: newPage,
    };
  }

  private normalizeTopMargin(topMarginCm?: number): number {
    if (!Number.isFinite(topMarginCm)) {
      return 2;
    }

    return Math.min(Math.max(Number(topMarginCm), 0), 30);
  }

  private normalizeLeftMargin(leftMarginCm?: number): number {
    if (!Number.isFinite(leftMarginCm)) {
      return 1.5;
    }

    return Math.min(Math.max(Number(leftMarginCm), 0), 30);
  }

  private getValidationFooterReservedHeight(): number {
    return 88;
  }

  private buildChileExpirationIso(minutesAhead: number): string {
    const nowInChile = new Date(
      new Date().toLocaleString('en-US', {
        timeZone: 'America/Santiago',
      }),
    );

    nowInChile.setMinutes(nowInChile.getMinutes() + minutesAhead);

    const year = nowInChile.getFullYear();
    const month = String(nowInChile.getMonth() + 1).padStart(2, '0');
    const day = String(nowInChile.getDate()).padStart(2, '0');
    const hours = String(nowInChile.getHours()).padStart(2, '0');
    const minutes = String(nowInChile.getMinutes()).padStart(2, '0');
    const seconds = String(nowInChile.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  private buildChilePreviewLabel(): string {
    return new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
  }


  private fitLine(value: string, maxLength: number): string {
    const normalized = String(value ?? '').trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }

    return `${normalized.slice(0, Math.max(0, maxLength - 3))}...`;
  }

  private async embedPreviewLogo(pdfDoc: PDFDocument): Promise<PDFImage | null> {
    if (!this.sealLogoBase64) {
      return null;
    }

    try {
      return await pdfDoc.embedPng(Buffer.from(this.sealLogoBase64, 'base64'));
    } catch {
      this.logger.warn(
        'No se pudo incrustar el logo institucional en la previsualizacion del PDF.',
      );
      return null;
    }
  }

  private loadSealLogoBase64(): string {
    const logoPath = path.join(process.cwd(), 'assets', 'logo-dep.png');
    if (!fs.existsSync(logoPath)) {
      this.logger.warn(
        `No se encontro logo institucional en ${logoPath}. La firma visible seguira sin imagen base.`,
      );
      return '';
    }

    return fs.readFileSync(logoPath, { encoding: 'base64' });
  }

  private base64UrlEncode(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
  }

  private resolveSignedFileName(fileName?: string): string {
    const normalized = String(fileName ?? '').trim();
    if (!normalized) {
      return 'documento-firmado.pdf';
    }

    return normalized.toLowerCase().endsWith('.pdf') ? normalized : `${normalized}.pdf`;
  }

  private getTrimmedEnv(key: string): string {
    return String(this.configService.get<string>(key) ?? '').trim();
  }

  private getRequiredEnv(key: string, message: string): string {
    const value = this.getTrimmedEnv(key);
    if (!value) {
      throw new BadRequestException(message);
    }

    return value;
  }

  private resolveErrorResponse(error: unknown, verboseError = false): object {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      const status = axiosError.response?.status ?? 500;
      const responseData = axiosError.response?.data;
      const apiMessage =
        responseData?.error ||
        responseData?.message ||
        axiosError.message ||
        'Error desconocido al llamar a FirmaGob.';

      this.logger.error(
        `FirmaGob respondio con error. status=${status} message=${apiMessage}`,
      );

      // Preferir el mensaje real de FirmaGob cuando aporta detalle (certificado, OTP, etc.).
      const userMessage =
        typeof apiMessage === 'string' && apiMessage.trim().length > 0
          ? apiMessage.trim()
          : this.resolveFirmaGobErrorMessage(status);

      return verboseError
        ? { ok: false, message: userMessage, statusCode: status, error: apiMessage, firmaGobRaw: responseData ?? null }
        : { ok: false, error: userMessage };
    }

    // BadRequestException y demás HttpException de Nest (PDF ya firmado, validación, etc.)
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const response = error.getResponse();
      const msg =
        typeof response === 'string'
          ? response
          : (response as { message?: string | string[] })?.message;
      const text = Array.isArray(msg) ? msg.join(' ') : msg || error.message;
      this.logger.error(error);
      return { ok: false, error: text, statusCode: status };
    }

    this.logger.error(error);
    return { ok: false, error: 'Error inesperado al invocar FirmaGob.' };
  }


  private resolveFirmaGobErrorMessage(status: number): string {
    const messages: Record<number, string> = {
      400: 'Token inválido, OTP vacío o formato incorrecto.',
      404: 'Certificado no encontrado.',
      412: 'OTP inválido o sin permisos.',
      429: 'Demasiados intentos de OTP. Intente más tarde.',
      500: 'Error interno en FirmaGob.',
    };

    return messages[status] ?? 'Error desconocido al llamar a FirmaGob.';
  }
}
