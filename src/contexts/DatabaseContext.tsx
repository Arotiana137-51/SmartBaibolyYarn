// src/contexts/DatabaseContext.tsx
import React, {createContext, useContext, useEffect, useState} from 'react';
import { bibleDatabaseService, hymnsDatabaseService } from '../services/database/DatabaseService';

type DatabaseContextType = {
  isInitialized: boolean;
  initializeDatabase: () => Promise<void>;
};

const DatabaseContext = createContext<DatabaseContextType>({
  isInitialized: false,
  initializeDatabase: async () => {},
});

export const DatabaseProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);

  const initializeDatabase = async () => {
    try {
      await Promise.all([
        bibleDatabaseService.initDatabase(),
        hymnsDatabaseService.initDatabase(),
      ]);
      setIsInitialized(true);
      if (__DEV__) {
        console.log('Database initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  };

  useEffect(() => {
    initializeDatabase();
  }, []);

  return (
    <DatabaseContext.Provider
      value={{
        isInitialized,
        initializeDatabase,
      }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => useContext(DatabaseContext);
