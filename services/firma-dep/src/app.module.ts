import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import * as Joi from 'joi';
import { ConfirmarConexionModule } from './confirmarconexion/confirmarconexion.module';
import { HealthModule } from './health/health.module';
import { ApiKeyGuard } from './security/api-key.guard';
import { SecurityModule } from './security/security.module';
import { SignaturesModule } from './signatures/signatures.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(4010),
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        SWAGGER_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
        API_SECURITY_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
        API_CLIENT_KEYS: Joi.string().allow('').default('local-dev:dev-key'),
        API_ALLOW_LOCALHOST: Joi.boolean().truthy('true').falsy('false').default(true),
        API_ALLOW_PRIVATE_NETWORKS: Joi.boolean().truthy('true').falsy('false').default(false),
        API_ALLOWED_IPS: Joi.string().allow('').default(''),
        HTTP_BODY_LIMIT: Joi.string().allow('').default('25mb'),
        FIRMA_GOB_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
        FIRMA_UNATTENDED_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
        FIRMA_GOB_ENVIRONMENT: Joi.string().valid('test', 'production').default('test'),
        FIRMA_GOB_API_URL: Joi.string().allow('').optional(),
        FIRMA_GOB_API_TOKEN_KEY: Joi.string().allow('').optional(),
        FIRMA_GOB_SECRET: Joi.string().allow('').optional(),
        FIRMA_GOB_DEFAULT_ENTITY: Joi.string().allow('').optional(),
        FIRMA_GOB_PURPOSE_ATTENDED: Joi.string().allow('').default('Proposito General'),
        FIRMA_GOB_PURPOSE_UNATTENDED: Joi.string().allow('').default('Desatendido'),
        FIRMA_GOB_TIMEOUT_MS: Joi.number().default(30000),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 60),
      },
    ]),
    ConfirmarConexionModule,
    HealthModule,
    SecurityModule,
    SignaturesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
  ],
})
export class AppModule {}
