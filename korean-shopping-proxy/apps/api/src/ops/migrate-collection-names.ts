import 'dotenv/config';
import mongoose from 'mongoose';
import {
  COLLECTION_NAMES,
  LEGACY_COLLECTION_NAMES,
  type ModelName,
} from '../database/collection-names';

type Outcome = {
  from: string;
  to: string;
  status: 'renamed' | 'already-migrated' | 'not-created';
};

async function migrate(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is required.');

  await mongoose.connect(uri);
  const database = mongoose.connection.db;
  if (!database) throw new Error('MongoDB connection has no database.');

  const existing = new Set(
    (await database.listCollections({}, { nameOnly: true }).toArray()).map(
      (collection) => collection.name,
    ),
  );
  const outcomes: Outcome[] = [];

  for (const modelName of Object.keys(COLLECTION_NAMES) as ModelName[]) {
    const from = LEGACY_COLLECTION_NAMES[modelName];
    const to = COLLECTION_NAMES[modelName];
    if (from === to) continue;

    if (!existing.has(from)) {
      outcomes.push({
        from,
        to,
        status: existing.has(to) ? 'already-migrated' : 'not-created',
      });
      continue;
    }

    if (existing.has(to)) {
      const targetCount = await database.collection(to).estimatedDocumentCount();
      if (targetCount > 0) {
        throw new Error(
          `Cannot rename ${from} to ${to}: both collections contain data.`,
        );
      }
      await database.collection(to).drop();
      existing.delete(to);
    }

    await database.collection(from).rename(to);
    existing.delete(from);
    existing.add(to);
    outcomes.push({ from, to, status: 'renamed' });
  }

  for (const outcome of outcomes) {
    console.log(`${outcome.status}: ${outcome.from} -> ${outcome.to}`);
  }
}

void migrate()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
