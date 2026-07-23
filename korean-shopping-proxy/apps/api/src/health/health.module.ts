import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { releaseModels } from '../releases/release.schemas';
import { HealthController } from './health.controller';
@Module({ imports: [MongooseModule.forFeature(releaseModels)], controllers: [HealthController] })
export class HealthModule {}
