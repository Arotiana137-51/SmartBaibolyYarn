import dataImporter from '../src/services/database/DataImporter';
import { databaseService } from '../src/services/database/DatabaseService';

describe('DataImporter', () => {
  beforeAll(async () => {
    // Initialize the test database
    await databaseService.initDatabase();
  });

  afterAll(async () => {
    // Clean up after tests
    await databaseService.closeDatabase();
  });

  it('should import data without errors', async () => {
    // This will test the full import process
    await expect(dataImporter.importData()).resolves.not.toThrow();
    
    // You can add more specific assertions here
    // For example, verify that data was actually imported
    const hymns = await databaseService.executeQuery('SELECT * FROM Hymns');
    expect(hymns.rows.length).toBeGreaterThan(0);
    
    const verses = await databaseService.executeQuery('SELECT * FROM Verses');
    expect(verses.rows.length).toBeGreaterThan(0);
  });

  // Add more test cases as needed
});
