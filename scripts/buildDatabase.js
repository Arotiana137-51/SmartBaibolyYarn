// scripts/buildDatabase.js
//
// Orchestrator: builds BOTH the Bible and Hymns databases (dev .db + prod .zip)
// and copies them into the android and ios asset folders. For partial rebuilds
// when only one source changed, prefer the targeted scripts:
//
//   yarn build:bible    — only the Bible
//   yarn build:hymns    — only the Hymns
//   yarn build:database — both (this script)
//
// All three scripts share helpers and FTS optimizations from
// scripts/utils/buildDb.js so the artifacts are byte-identical regardless of
// which entry point you used.

const { main: buildBibleMain } = require('./buildBibleDatabase');
const { main: buildHymnsMain } = require('./buildHymnsDatabase');

async function main() {
  const startedAt = Date.now();
  console.log('🚀 Building Bible + Hymns databases\n');

  await buildBibleMain();
  console.log('');
  await buildHymnsMain();

  console.log(`\n🎉 Full DB build done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error('❌ DB build failed:', err);
  process.exit(1);
});
