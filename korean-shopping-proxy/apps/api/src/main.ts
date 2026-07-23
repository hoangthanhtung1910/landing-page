import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { parseCorsOrigins, parseTrustProxy } from './config/env.validation';

/**
 * Bootstrap (T008). CORS is restricted to the env-configured web/admin origins
 * (credentials enabled for the direct browser-to-API admin session). A global
 * ValidationPipe (whitelist + transform) and the standardized exception filter
 * are applied. Cookie-session + CSRF are wired in T024.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // `trust proxy` governs how req.ip is derived — the login throttle keys on it, so
  // it must be configured (never blindly trust X-Forwarded-For). Default: trust none.
  const expressApp = app.getHttpAdapter().getInstance() as {
    set(key: string, value: unknown): void;
  };
  expressApp.set('trust proxy', parseTrustProxy(config.get<string>('TRUST_PROXY')));

  const origins = parseCorsOrigins(config.get<string>('CORS_ORIGINS') ?? '');

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = Number(config.get<number>('PORT') ?? 4000);
  await app.listen(port);
  console.log(`CMS API listening on http://localhost:${port}`);
}

void bootstrap();
