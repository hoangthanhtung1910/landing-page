import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AppModule } from '../app.module';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const connection = app.get<Connection>(getConnectionToken());
    for (const model of Object.values(connection.models)) await model.createIndexes();
    process.stdout.write(`${JSON.stringify({ status: 'ok', models: Object.keys(connection.models).length })}\n`);
  } finally { await app.close(); }
}
void main();
