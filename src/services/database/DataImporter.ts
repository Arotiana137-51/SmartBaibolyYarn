// src/services/database/DataImporter.ts
import { bibleDatabaseService, hymnsDatabaseService } from './DatabaseService';
import { 
  getBibleDataPath, 
  getHymnsDataPath, 
  getTestamentPath, 
  getHymnFilePath,
  readFileSafe, 
  readDirSafe,
  fileExistsSafe
} from '../../utils/paths';

// Types for Bible data
export interface BibleVerse {
  chapter: number;
  verse: number;
  text: string;
}

// Types for Hymns data
export interface HymnVerse {
  andininy: number;
  tononkira: string;
  fiverenany: boolean;
}

export interface HymnData {
  laharana: string;
  sokajy?: string;
  lohateny: string;
  mpanoratra: string[];
  hira: HymnVerse[];
}

export interface HymnJson {
  [hymnId: string]: HymnData;
}

export class DataImporter {
  // Import all data
  async importData(): Promise<void> {
    throw new Error(
      'DataImporter is disabled in production because the app uses prebuilt SQLite assets (BibleMG65.db and Hymns.db).'
    );
  }

  // Import Bible data from JSON files
  private async importBibleData(): Promise<void> {
    try {
      const basePath = getBibleDataPath();
      const testaments = ['old_testament', 'new_testament'];
      
      console.log(`📂 Scanning for Bible data in: ${basePath}`);
      
      for (const testament of testaments) {
        const testamentPath = getTestamentPath(testament as 'old_testament' | 'new_testament');
        console.log(`\n📜 Processing ${testament.replace('_', ' ')}...`);
        
        try {
          const files = await readDirSafe(testamentPath);
          console.log(`   Found ${files.length} files in ${testament}`);
          
          for (const file of files) {
            if (file.isFile && file.name.endsWith('.json')) {
              const bookName = file.name.replace('.json', '');
              const filePath = `${testamentPath}/${file.name}`;
              console.log(`   📚 Importing book: ${bookName}`);
              
              try {
                await this.importBibleBook(bookName, filePath, testament as 'old' | 'new');
                console.log(`   ✅ Successfully imported: ${bookName}`);
              } catch (error) {
                console.error(`   ❌ Failed to import ${bookName}:`, error);
                throw error; // Re-throw to be caught by outer try-catch
              }
            }
          }
        } catch (error) {
          console.error(`   ❌ Error processing ${testament}:`, error);
          throw error; // Re-throw to be caught by outer try-catch
        }
      }
    } catch (error) {
      console.error('Error importing Bible data:', error);
      throw error;
    }
  }

  // Import a single Bible book
  private async importBibleBook(bookName: string, filePath: string, testament: 'old' | 'new'): Promise<void> {
    try {
      const fileName = filePath.split('/').pop() || '';
      const bookId = parseInt(fileName.split('-')[0]) || 0;
      const bookTitle = bookName.split('-').slice(1).join(' ').replace(/_/g, ' ');
      
      // Read and validate file
      const fileContent = await readFileSafe(filePath, 'utf8');
      let versesData: any[];
      
      try {
        versesData = JSON.parse(fileContent);
        if (!Array.isArray(versesData)) {
          throw new Error('Expected an array of verses');
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
        throw new Error(`Invalid JSON in ${fileName}: ${errorMessage}`);
      }

      // Process verses
      const chapters = new Set<number>();
      const versesToInsert = [];

      for (const verse of versesData) {
        if (!this.isValidBibleVerse(verse)) {
          console.warn(`Skipping invalid verse in ${fileName}:`, verse);
          continue;
        }
        
        chapters.add(verse.chapter);
        versesToInsert.push([
          bookId,
          verse.chapter,
          verse.verse,
          verse.text
        ]);
      }

      // Insert or update book
      await bibleDatabaseService.executeQuery(
        `INSERT OR REPLACE INTO Books (id, name, testament, chapters, filename) 
         VALUES (?, ?, ?, ?, ?)`,
        [bookId, bookTitle, testament, chapters.size, fileName]
      );

      // Insert verses in batches
      const batchSize = 100;
      for (let i = 0; i < versesToInsert.length; i += batchSize) {
        const batch = versesToInsert.slice(i, i + batchSize);
        await bibleDatabaseService.executeQuery(
          `INSERT OR REPLACE INTO Verses (book_id, chapter, verse_number, text)
           VALUES ${batch.map(() => '(?, ?, ?, ?)').join(',')}`,
          batch.flat()
        );
      }

      console.log(`Imported ${versesToInsert.length} verses from ${bookTitle}`);

    } catch (error: unknown) {
      console.error(`Error importing book ${bookName}:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  // Import hymns data
  private async importHymnsData(): Promise<void> {
    try {
      const hymnsPath = getHymnsDataPath();
      
      // Import FFPM Hymns
      const ffpmFile = getHymnFilePath('01_fihirana_ffpm.json');
      const ffpmExists = await fileExistsSafe(ffpmFile);
      if (ffpmExists) {
        await this.importHymnFile(ffpmFile, 'ffpm');
      } else {
        console.warn('FFPM hymns file not found:', ffpmFile);
      }
      
      // Import Fihirana Fanampiny
      const fanampinyFile = getHymnFilePath('02_fihirana_fanampiny.json');
      const fanampinyExists = await fileExistsSafe(fanampinyFile);
      if (fanampinyExists) {
        await this.importHymnFile(fanampinyFile, 'ff');
      } else {
        console.warn('Fihirana Fanampiny file not found:', fanampinyFile);
      }
    } catch (error) {
      console.error('Error importing hymns data:', error);
      throw error;
    }
  }

  // Import a single hymn file
  private async importHymnFile(filePath: string, defaultCategory: string): Promise<void> {
    try {
      console.log(`Importing hymns from: ${filePath}`);
      const fileContent = await readFileSafe(filePath, 'utf8');
      let hymnsData: any;
      
      try {
        hymnsData = JSON.parse(fileContent);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Invalid JSON in ${filePath}: ${errorMessage}`);
      }

      let totalVerses = 0;
      const hymnCount = Object.keys(hymnsData).length;
      console.log(`Found ${hymnCount} hymns in ${filePath}`);
      
      for (const [hymnId, hymnData] of Object.entries(hymnsData as HymnJson)) {
        if (!this.isValidHymnData(hymnData)) {
          console.warn(`Skipping invalid hymn data for ID ${hymnId}`);
          continue;
        }
        
        // Ensure the category is set
        if (!hymnData.sokajy) {
          hymnData.sokajy = defaultCategory;
        }

        // Insert or update hymn
        await hymnsDatabaseService.executeQuery(
          `INSERT OR REPLACE INTO Hymns (id, number, category, title, authors)
           VALUES (?, ?, ?, ?, ?)`,
          [
            hymnId,
            parseInt(hymnData.laharana) || 0,
            hymnData.sokajy || '',
            hymnData.lohateny || '',
            hymnData.mpanoratra.length > 0 ? JSON.stringify(hymnData.mpanoratra) : null
          ]
        );
        
        // Prepare verses for batch insert
        const versesToInsert = hymnData.hira
          .filter(verse => this.isValidHymnVerse(verse))
          .map(verse => [
            hymnId,
            verse.andininy,
            verse.tononkira,
            verse.fiverenany ? 1 : 0
          ]);

        // Insert in batches
        const batchSize = 50;
        for (let i = 0; i < versesToInsert.length; i += batchSize) {
          const batch = versesToInsert.slice(i, i + batchSize);
          await hymnsDatabaseService.executeQuery(
            `INSERT OR REPLACE INTO HymnVerses (hymn_id, verse_number, text, is_chorus)
             VALUES ${batch.map(() => '(?, ?, ?, ?)').join(',')}`,
            batch.flat()
          );
        }

        totalVerses += versesToInsert.length;
      }

      console.log(`Imported ${Object.keys(hymnsData).length} hymns with ${totalVerses} verses from ${filePath.split('/').pop()}`);

    } catch (error) {
      console.error(`Error importing hymn file ${filePath}:`, error);
      throw error;
    }
  }

  // Validation methods
  private isValidBibleVerse(data: any): data is BibleVerse {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.chapter === 'number' &&
      typeof data.verse === 'number' &&
      typeof data.text === 'string' &&
      data.chapter > 0 &&
      data.verse > 0 &&
      data.text.trim().length > 0
    );
  }

  private isValidHymnVerse(data: any): data is HymnVerse {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.andininy === 'number' &&
      typeof data.tononkira === 'string' &&
      typeof data.fiverenany === 'boolean' &&
      data.andininy > 0 &&
      data.tononkira.trim().length > 0
    );
  }

  private isValidHymnData(data: any): data is HymnData {
    if (!data || typeof data !== 'object') return false;
    
    return (
      typeof data.laharana === 'string' &&
      (data.sokajy === undefined || typeof data.sokajy === 'string') &&
      typeof data.lohateny === 'string' &&
      Array.isArray(data.mpanoratra) &&
      data.mpanoratra.every((a: any) => typeof a === 'string') &&
      Array.isArray(data.hira) &&
      data.hira.length > 0 &&
      data.hira.every((v: any) => this.isValidHymnVerse(v))
    );
  }
}

export default new DataImporter();