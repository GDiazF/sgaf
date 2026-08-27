import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Guarda una traza simple en disco para auditar quien llamo a la API,
 * que endpoint uso y cual fue el resultado del flujo.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  private readonly logsDirectory = path.join(process.cwd(), 'logs');
  private readonly auditLogPath = path.join(this.logsDirectory, 'firma-dep-audit.log');

  async register(event: Record<string, unknown>): Promise<void> {
    try {
      if (!fs.existsSync(this.logsDirectory)) {
        fs.mkdirSync(this.logsDirectory, { recursive: true });
      }

      const line = `${JSON.stringify({
        timestamp: new Date().toISOString(),
        ...event,
      })}\n`;

      await fs.promises.appendFile(this.auditLogPath, line, 'utf8');
    } catch (error) {
      this.logger.error(`No se pudo escribir el log de auditoria. ${String(error)}`);
    }
  }
}
