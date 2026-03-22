import React, {useEffect, useState} from 'react';
import {View, Text, ScrollView, StyleSheet, Button, TextInput, Platform} from 'react-native';
import * as FileSystem from 'react-native-fs';
import {bibleDatabaseService, hymnsDatabaseService} from '../services/database/DatabaseService';
import {useJesusName} from '../contexts/JesusNameContext';

// Utility function to handle errors consistently
const handleError = (error: unknown, context: string): string => {
  console.error(`Error ${context}:`, error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  return `Error: ${errorMessage}`;
};

export const DatabaseTestScreen = () => {
  const isAndroid = Platform.OS === 'android';
  const {transformText} = useJesusName();
  const [books, setBooks] = useState<any[]>([]);
  const [hymns, setHymns] = useState<any[]>([]);
  const [verses, setVerses] = useState<any[]>([]);
  const [hymnVerses, setHymnVerses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('Ready');
  const [dbDiagnostics, setDbDiagnostics] = useState<string>('');
  const bibleDbName = 'BibleMG65.db';
  const hymnsDbName = 'Hymns.db';

  const initializeDatabase = async () => {
    try {
      setStatus('Initializing database...');
      await Promise.all([
        bibleDatabaseService.initDatabase(),
        hymnsDatabaseService.initDatabase(),
      ]);
      setStatus('Database initialized');
    } catch (error) {
      setStatus(handleError(error, 'initializing database'));
    }
  };

  const forceCopyDatabase = async () => {
    try {
      setStatus('Forcing database copy...');
      await Promise.all([
        bibleDatabaseService.closeDatabase(),
        hymnsDatabaseService.closeDatabase(),
      ]);

      const dbDirectory = isAndroid
        ? `${FileSystem.DocumentDirectoryPath}/default`
        : FileSystem.DocumentDirectoryPath;
      const bibleDbPath = `${dbDirectory}/${bibleDbName}`;
      const hymnsDbPath = `${dbDirectory}/${hymnsDbName}`;

      const [bibleExists, hymnsExists] = await Promise.all([
        FileSystem.exists(bibleDbPath),
        FileSystem.exists(hymnsDbPath),
      ]);
      if (bibleExists) {
        await FileSystem.unlink(bibleDbPath);
      }
      if (hymnsExists) {
        await FileSystem.unlink(hymnsDbPath);
      }

      await Promise.all([
        bibleDatabaseService.initDatabase(),
        hymnsDatabaseService.initDatabase(),
      ]);
      setStatus('Database copied and re-initialized');
    } catch (error) {
      setStatus(handleError(error, 'forcing database copy'));
    }
  };

  const runDiagnostics = async () => {
    try {
      setStatus('Running diagnostics...');
      await Promise.all([
        bibleDatabaseService.initDatabase(),
        hymnsDatabaseService.initDatabase(),
      ]);

      const dbDirectory = isAndroid
        ? `${FileSystem.DocumentDirectoryPath}/default`
        : FileSystem.DocumentDirectoryPath;

      const bibleDbPath = `${dbDirectory}/${bibleDbName}`;
      const hymnsDbPath = `${dbDirectory}/${hymnsDbName}`;
      const [bibleExists, hymnsExists] = await Promise.all([
        FileSystem.exists(bibleDbPath),
        FileSystem.exists(hymnsDbPath),
      ]);
      const bibleSize = bibleExists ? (await FileSystem.stat(bibleDbPath)).size : 0;
      const hymnsSize = hymnsExists ? (await FileSystem.stat(hymnsDbPath)).size : 0;

      const bibleDbList = await bibleDatabaseService.executeQuery<{file: string; name: string}>(
        'PRAGMA database_list'
      );
      const hymnsDbList = await hymnsDatabaseService.executeQuery<{file: string; name: string}>(
        'PRAGMA database_list'
      );

      const [booksCount, versesCount, versesFtsCount] = await Promise.all([
        bibleDatabaseService.executeQuery<{count: number}>('SELECT COUNT(*) as count FROM Books'),
        bibleDatabaseService.executeQuery<{count: number}>('SELECT COUNT(*) as count FROM Verses'),
        bibleDatabaseService.executeQuery<{count: number}>(
          "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='VersesFts'"
        ),
      ]);

      const [hymnsCount, hymnVersesCount, hymnsFtsCount, hymnVersesFtsCount] = await Promise.all([
        hymnsDatabaseService.executeQuery<{count: number}>('SELECT COUNT(*) as count FROM Hymns'),
        hymnsDatabaseService.executeQuery<{count: number}>('SELECT COUNT(*) as count FROM HymnVerses'),
        hymnsDatabaseService.executeQuery<{count: number}>(
          "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='HymnsFts'"
        ),
        hymnsDatabaseService.executeQuery<{count: number}>(
          "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='HymnVersesFts'"
        ),
      ]);

      const diagnostics = [
        `Platform: ${Platform.OS}`,
        `Bible DB file: ${bibleDbPath} (${bibleSize} bytes)`,
        `Hymns DB file: ${hymnsDbPath} (${hymnsSize} bytes)`,
        `Opened Bible DB: ${bibleDbList.rows?.[0]?.file ?? 'unknown'}`,
        `Opened Hymns DB: ${hymnsDbList.rows?.[0]?.file ?? 'unknown'}`,
        `Books: ${booksCount.rows[0]?.count ?? 0}`,
        `Verses: ${versesCount.rows[0]?.count ?? 0}`,
        `VersesFts present: ${versesFtsCount.rows[0]?.count ?? 0}`,
        `Hymns: ${hymnsCount.rows[0]?.count ?? 0}`,
        `HymnVerses: ${hymnVersesCount.rows[0]?.count ?? 0}`,
        `HymnsFts present: ${hymnsFtsCount.rows[0]?.count ?? 0}`,
        `HymnVersesFts present: ${hymnVersesFtsCount.rows[0]?.count ?? 0}`,
      ].join('\n');

      setDbDiagnostics(diagnostics);
      setStatus('Diagnostics completed');
    } catch (error) {
      setStatus(handleError(error, 'running diagnostics'));
    }
  };

  const fetchBooks = async () => {
    try {
      setStatus('Fetching books...');
      await bibleDatabaseService.initDatabase();
      const result = await bibleDatabaseService.executeQuery('SELECT * FROM Books LIMIT 10');
      setBooks(result.rows);
      setStatus(`Found ${result.rows.length} books`);
    } catch (error) {
      setStatus(handleError(error, 'fetching books'));
    }
  };

  const fetchHymns = async () => {
    try {
      setStatus('Fetching hymns...');
      await hymnsDatabaseService.initDatabase();
      const result = await hymnsDatabaseService.executeQuery('SELECT * FROM Hymns LIMIT 10');
      setHymns(result.rows);
      setStatus(`Found ${result.rows.length} hymns`);
    } catch (error) {
      setStatus(handleError(error, 'fetching hymns'));
    }
  };

  const searchVerses = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setStatus('Searching verses...');
      await bibleDatabaseService.initDatabase();
      const result = await bibleDatabaseService.executeQuery(
        `SELECT v.id, v.book_id, v.chapter, v.verse_number, v.text, b.name as book_name
         FROM VersesFts f
         JOIN Verses v ON v.id = f.rowid
         JOIN Books b ON b.id = v.book_id
         WHERE VersesFts MATCH ?
         ORDER BY bm25(VersesFts)
         LIMIT 10`,
        [searchQuery]
      );
      setVerses(result.rows);
      setStatus(`Found ${result.rows.length} matching verses`);
    } catch (error) {
      setStatus(handleError(error, 'searching verses'));
    }
  };

  const getVersesForBook = async (bookId: number) => {
    try {
      setStatus('Fetching verses...');
      await bibleDatabaseService.initDatabase();
      const result = await bibleDatabaseService.executeQuery(
        'SELECT * FROM Verses WHERE book_id = ? LIMIT 5',
        [bookId]
      );
      setVerses(result.rows);
      setStatus(`Found ${result.rows.length} verses`);
    } catch (error) {
      setStatus(handleError(error, 'fetching verses'));
    }
  };

  const getVersesForHymn = async (hymnId: string) => {
    try {
      setStatus('Fetching hymn verses...');
      await hymnsDatabaseService.initDatabase();
      const result = await hymnsDatabaseService.executeQuery(
        'SELECT * FROM HymnVerses WHERE hymn_id = ? ORDER BY verse_number',
        [hymnId]
      );
      setHymnVerses(result.rows);
      setStatus(`Found ${result.rows.length} verses for hymn ${hymnId}`);
    } catch (error) {
      setStatus(handleError(error, 'fetching hymn verses'));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.status}>Status: {status}</Text>
      
      <View style={styles.buttonContainer}>
        <Button title="Initialize DB" onPress={initializeDatabase} />
        <Button title="Run Diagnostics" onPress={runDiagnostics} />
        <Button title="Force Copy DB" onPress={forceCopyDatabase} />
      </View>

      {dbDiagnostics ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnostics</Text>
          <Text style={styles.diagnosticsText}>{dbDiagnostics}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Books (First 10)</Text>
        <Button title="Load Books" onPress={fetchBooks} />
        {books.map((book, index) => (
          <Text key={index} onPress={() => getVersesForBook(book.id)}>
            {book.name} ({book.testament})
          </Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hymns (First 10)</Text>
        <Button title="Load Hymns" onPress={fetchHymns} />
        {hymns.map((hymn, index) => (
          <Text key={index} onPress={() => getVersesForHymn(hymn.id)}>
            {hymn.number}. {hymn.title}
          </Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Search Verses</Text>
        <TextInput
          style={styles.input}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search verses..."
        />
        <Button title="Search" onPress={searchVerses} />
        {verses.map((verse, index) => (
          <Text key={index}>
            {verse.book_name} {verse.chapter}:{verse.verse_number} - {transformText(verse.text).substring(0, 50)}...
          </Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hymn Verses</Text>
        {hymnVerses.map((verse, index) => (
          <Text key={index}>
            <Text style={styles.verseNumber}>{verse.verse_number}.</Text> {verse.text}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 8,
    marginBottom: 10,
    borderRadius: 4,
  },
  diagnosticsText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
  },
  verseNumber: {
    fontWeight: 'bold',
    color: '#0066cc',
  },
});

export default DatabaseTestScreen;
