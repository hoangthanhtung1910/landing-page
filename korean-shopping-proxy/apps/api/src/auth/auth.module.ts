import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from '../users/users.module';
import { authModels } from './auth.schemas';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AdminGuard } from './admin.guard';
import { CsrfGuard } from './csrf.guard';

/**
 * Admin authentication (T024/T024B). Owns the session/throttle/security-event
 * collections and exports `AuthService` + the guards so admin content/media/
 * publish modules (later batches) can protect their write routes.
 */
@Module({
  imports: [UsersModule, MongooseModule.forFeature(authModels)],
  controllers: [AuthController],
  providers: [AuthService, AdminGuard, CsrfGuard],
  exports: [AuthService, AdminGuard, CsrfGuard],
})
export class AuthModule {}
