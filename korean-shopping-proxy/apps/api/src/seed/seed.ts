import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { runSeed } from './seed.core';

/**
 * Seed CLI (T015). Default is NON-DESTRUCTIVE (upsert seed-owned records; preserve
 * admin data + release history). Pass `--force-reset` for a full dev reset (refused
 * in production). NON-PRODUCTION content only — the launch gate (FR-045) requires
 * real content.
 */
async function main(): Promise<void> {
  const forceReset = process.argv.includes('--force-reset');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const result = await runSeed(app, { forceReset });
    console.log(`Seed complete (${forceReset ? 'force-reset' : 'non-destructive'}):`);
    console.log(
      `  release #${result.releaseNumber ?? '-'} (${result.releaseCreated ? 'created' : 'preserved existing'})`,
    );
    console.log(
      `  services=${result.counts.Service} trustPoints=${result.counts.TrustPoint} processSteps=${result.counts.ProcessStep} categories=${result.counts.Category} faq=${result.counts.Faq} contacts=${result.counts.ContactChannel}`,
    );
    console.log(
      `  reviews seeded=${result.counts.Review} approved(public)=${result.reviewsApprovedPublic} (reviews section disabled by default)`,
    );
    console.log(`  admin username="${result.adminUsername}"`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
