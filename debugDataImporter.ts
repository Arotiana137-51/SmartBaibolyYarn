const path = require('path');
const fs = require('fs');

// Import using require
const { databaseService } = require('./src/services/database/DatabaseService');
const DataImporter = require('./src/services/database/DataImporter').default;

async function debugDataImporter() {
  try {
    console.log('Starting database initialization...');
    await databaseService.initDatabase();
    
    console.log('Starting data import...');
    const dataImporter = new DataImporter();
    await dataImporter.importData();
    
    console.log('Data import completed successfully!');
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  } finally {
    try {
      if (databaseService && typeof databaseService.closeDatabase === 'function') {
        await databaseService.closeDatabase();
      }
    } catch (closeError) {
      console.error('Error closing database:', closeError);
    }
    process.exit(0);
  }
}

debugDataImporter();
