import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { AuthModule } from './auth/auth.module';
import { ContentModule } from './content/content.module';
import { MediaModule } from './media/media.module';
import { UsersModule } from './users/users.module';
import { ReleasesModule } from './releases/releases.module';
import { PublicModule } from './public/public.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RequestLoggingInterceptor } from './common/request-logging.interceptor';

// Root module. Auth (T024/T024B) is wired; admin CRUD controllers (T025–T027),
// publish/rollback (T029), and health (T051) feature modules are added in later batches.
@Module({
  imports: [
    AppConfigModule,
    AuthModule,
    ContentModule,
    MediaModule,
    UsersModule,
    ReleasesModule,
    PublicModule,
    AuditModule,
    HealthModule,
  ],
  controllers: [],
  providers: [{ provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor }],
})
export class AppModule {}
