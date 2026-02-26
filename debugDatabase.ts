import DatabaseService from './src/services/database/DatabaseService';
import dataImporter from './src/services/database/DataImporter';

async function testDatabase() {
  try {
    console.log('=== Starting Database Test ===');
    
    // 1. Test Database Connection
    console.log('1. Testing database connection...');
    const db = DatabaseService;  // Use the already instantiated singleton
    await db.initDatabase();

    // 2. Test Basic Query
    console.log('\n2. Testing basic query...');
    const testQuery = await db.executeQuery('SELECT name FROM sqlite_master WHERE type=\'table\' AND name NOT LIKE \'sqlite_%\'');
    console.log('Tables in database:', testQuery.rows);

    // 3. Test Data Import
    console.log('\n3. Testing data import...');
    await dataImporter.importData();
    console.log('✅ Data import completed successfully');

    // 4. Verify Data
    console.log('\n4. Verifying imported data...');
    const books = await db.executeQuery('SELECT * FROM Books LIMIT 5');
    console.log('Sample books:', books.rows);

    const verses = await db.executeQuery('SELECT * FROM Verses LIMIT 5');
    console.log('Sample verses:', verses.rows);

    const hymns = await db.executeQuery('SELECT * FROM Hymns LIMIT 5');
    console.log('Sample hymns:', hymns.rows);

    console.log('\n=== Database Test Completed Successfully ===');
  } catch (error) {
    console.error('\n❌ Database Test Failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n') + '...'
      });
    }
    process.exit(1);
  }
}

// Run the test
testDatabase().catch(console.error);
