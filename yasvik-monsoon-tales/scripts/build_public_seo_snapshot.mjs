import { getSnapshotFilePath, loadPublicSnapshotWithFallback } from './seo/publicSnapshot.mjs';

async function main() {
  const snapshot = await loadPublicSnapshotWithFallback();
  console.log(`[seo-snapshot] ready (${snapshot.source}) -> ${getSnapshotFilePath()}`);
}

main().catch((error) => {
  console.error('[seo-snapshot] failed', error);
  process.exit(1);
});
