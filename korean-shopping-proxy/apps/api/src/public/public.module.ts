import { Module } from '@nestjs/common';
import { ReleasesModule } from '../releases/releases.module';
import { PublicController } from './public.controller';

@Module({
  imports: [ReleasesModule],
  controllers: [PublicController],
})
export class PublicModule {}
