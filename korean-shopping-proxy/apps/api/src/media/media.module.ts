import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { mediaModels } from './media.schema';
import { AuthModule } from '../auth/auth.module';
import { ReleasesModule } from '../releases/releases.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { LocalStorageAdapter, S3StorageAdapter, STORAGE_ADAPTER } from './storage';
import { ConfigService } from '@nestjs/config';

/**
 * Media metadata collection (T013). Upload/list/delete endpoints + storage
 * adapter + security (MIME allowlist, size/dimension limits, reference-aware
 * deletion) are added in US2 (T028/T028B).
 */
@Module({
  imports: [
    MongooseModule.forFeature(mediaModels),
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        limits: { fileSize: config.get<number>('MEDIA_MAX_BYTES') ?? 5_242_880 },
      }),
    }),
    AuthModule,
    ReleasesModule,
  ],
  controllers: [MediaController],
  providers: [
    MediaService,
    LocalStorageAdapter,
    S3StorageAdapter,
    {
      provide: STORAGE_ADAPTER,
      inject: [ConfigService, LocalStorageAdapter, S3StorageAdapter],
      useFactory: (config: ConfigService, local: LocalStorageAdapter, s3: S3StorageAdapter) =>
        config.get<string>('STORAGE_DRIVER') === 's3' ? s3 : local,
    },
  ],
  exports: [MongooseModule, MediaService],
})
export class MediaModule {}
