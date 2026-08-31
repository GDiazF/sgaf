import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';

type AuthenticatedRequest = Request & {
  authenticatedClientId?: string;
};

/**
 * Protege la API con varias capas simples:
 * - cliente + API key
 * - whitelist de IPs
 * - permiso especial para localhost
 *
 * La decision final es estricta:
 * si la seguridad esta activa, la request debe venir desde una IP permitida
 * y ademas pasar la validacion de cliente + API key.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic || !this.isSecurityEnabled()) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const requestIp = this.extractRequestIp(request);

    if (!this.isAllowedIp(requestIp)) {
      throw new ForbiddenException(
        `La IP "${requestIp}" no esta autorizada para consumir firma-dep.`,
      );
    }

    const clientId = String(request.headers['x-client-id'] ?? '').trim();
    const apiKey = String(request.headers['x-api-key'] ?? '').trim();

    if (!clientId || !apiKey) {
      throw new UnauthorizedException(
        'Debes enviar los headers x-client-id y x-api-key para consumir esta API.',
      );
    }

    const allowedClients = this.parseAllowedClients();
    const expectedApiKey = allowedClients.get(clientId);

    if (!expectedApiKey || !this.safeCompare(expectedApiKey, apiKey)) {
      throw new ForbiddenException('Credenciales invalidas para consumir firma-dep.');
    }

    request.authenticatedClientId = clientId;
    return true;
  }

  private safeCompare(expected: string, received: string): boolean {
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  private isSecurityEnabled(): boolean {
    return !this.isEnvFalsy('API_SECURITY_ENABLED');
  }

  /** Joi/Config puede devolver boolean o string desde process.env. */
  private isEnvTruthy(key: string): boolean {
    const value = this.configService.get<string | boolean | number>(key);
    if (value === true || value === 1) {
      return true;
    }
    const s = String(value ?? '').trim().toLowerCase();
    return s === 'true' || s === '1';
  }

  private isEnvFalsy(key: string): boolean {
    const value = this.configService.get<string | boolean | number>(key);
    if (value === false || value === 0) {
      return true;
    }
    const s = String(value ?? '').trim().toLowerCase();
    return s === 'false' || s === '0';
  }

  private parseAllowedClients(): Map<string, string> {
    const raw = String(this.configService.get<string>('API_CLIENT_KEYS') ?? '').trim();
    const entries = raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const clients = new Map<string, string>();

    for (const entry of entries) {
      const separatorIndex = entry.indexOf(':');
      if (separatorIndex <= 0) {
        continue;
      }

      const clientId = entry.slice(0, separatorIndex).trim();
      const apiKey = entry.slice(separatorIndex + 1).trim();
      if (clientId && apiKey) {
        clients.set(clientId, apiKey);
      }
    }

    return clients;
  }

  private isAllowedIp(requestIp: string): boolean {
    if (!requestIp) {
      return false;
    }

    if (this.isLocalhostAllowed() && this.isLocalIp(requestIp)) {
      return true;
    }

    if (this.isPrivateNetworksAllowed() && this.isPrivateNetworkIp(requestIp)) {
      return true;
    }

    const allowedIps = this.parseAllowedIps();
    return allowedIps.has(requestIp);
  }

  private isPrivateNetworksAllowed(): boolean {
    return this.isEnvTruthy('API_ALLOW_PRIVATE_NETWORKS');
  }

  private isPrivateNetworkIp(ip: string): boolean {
    const normalized = ip.replace(/^::ffff:/, '');
    if (normalized.includes(':')) {
      return normalized === '::1' || normalized.startsWith('fe80:');
    }
    const parts = normalized.split('.').map((p) => Number(p));
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) {
      return false;
    }
    if (parts[0] === 10) {
      return true;
    }
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
      return true;
    }
    if (parts[0] === 192 && parts[1] === 168) {
      return true;
    }
    return false;
  }

  private isLocalhostAllowed(): boolean {
    return !this.isEnvFalsy('API_ALLOW_LOCALHOST');
  }

  private parseAllowedIps(): Set<string> {
    const raw = String(this.configService.get<string>('API_ALLOWED_IPS') ?? '').trim();
    return new Set(
      raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }

  private extractRequestIp(request: AuthenticatedRequest): string {
    // request.ip/request.ips ya respetan la configuracion de "trust proxy"
    // de Express (ver main.ts): solo se confia en X-Forwarded-For si viene
    // del numero de proxies configurado, evitando que el cliente lo spoofee.
    const candidate =
      request.ips?.[0] ||
      String(request.ip ?? '').trim() ||
      String(request.socket?.remoteAddress ?? '').trim();

    return candidate.replace(/^::ffff:/, '');
  }

  private isLocalIp(ip: string): boolean {
    const normalized = ip.replace(/^::ffff:/, '');
    return normalized === '127.0.0.1' || normalized === '::1' || normalized === 'localhost';
  }
}
