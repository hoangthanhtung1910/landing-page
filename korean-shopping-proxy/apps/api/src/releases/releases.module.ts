import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { releaseModels } from './release.schemas';
import { ReleasesService } from './releases.service';
import { contentModels } from '../content/schemas';
import { AuthModule } from '../auth/auth.module';
import { ReleaseAssemblerService } from './release-assembler.service';
import { RevalidationService } from './revalidation.service';
import { ReleasesController } from './releases.controller';
import { VisibilityService } from './visibility.service';
import { VisibilityController } from './visibility.controller';

@Module({
  imports: [MongooseModule.forFeature([...releaseModels, ...contentModels]), AuthModule],
  controllers: [ReleasesController, VisibilityController],
  providers: [ReleasesService, ReleaseAssemblerService, RevalidationService, VisibilityService],
  exports: [ReleasesService, MongooseModule],
})
export class ReleasesModule {}
