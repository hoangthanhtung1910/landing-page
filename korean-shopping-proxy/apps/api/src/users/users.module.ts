import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { userModels } from './users.schema';

@Module({
  imports: [MongooseModule.forFeature(userModels)],
  exports: [MongooseModule],
})
export class UsersModule {}
