/**
 * Secure storage utilities for authentication tokens and session data
 * Implements security best practices for token storage
 */

export enum StorageType {
  SESSION = 'session',
  LOCAL = 'local',
  MEMORY = 'memory'
}

// In-memory storage for sensitive data that shouldn't persist
const memoryStorage: { [key: string]: string } = {};

/**
 * Stores data using the appropriate storage mechanism based on sensitivity
 * @param key Storage key
 * @param value Value to store
 * @param storageType Type of storage to use
 */
export const secureStore = (key: string, value: string, storageType: StorageType = StorageType.SESSION): void => {
  try {
    switch (storageType) {
      case StorageType.SESSION:
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem(key, value);
        } else {
          memoryStorage[key] = value;
        }
        break;
      
      case StorageType.LOCAL:
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        } else {
          memoryStorage[key] = value;
        }
        break;
      
      case StorageType.MEMORY:
        memoryStorage[key] = value;
        break;
      
      default:
        throw new Error(`Unsupported storage type: ${storageType}`);
    }
  } catch (error) {
    console.warn(`Failed to store data with key ${key}:`, error);
    // Fallback to memory storage
    memoryStorage[key] = value;
  }
};

/**
 * Retrieves data from storage
 * @param key Storage key
 * @param storageType Type of storage to check
 * @returns Stored value or null if not found
 */
export const secureRetrieve = (key: string, storageType: StorageType = StorageType.SESSION): string | null => {
  try {
    switch (storageType) {
      case StorageType.SESSION:
        if (typeof window !== 'undefined' && window.sessionStorage) {
          return window.sessionStorage.getItem(key);
        }
        return memoryStorage[key] || null;
      
      case StorageType.LOCAL:
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return memoryStorage[key] || null;
      
      case StorageType.MEMORY:
        return memoryStorage[key] || null;
      
      default:
        throw new Error(`Unsupported storage type: ${storageType}`);
    }
  } catch (error) {
    console.warn(`Failed to retrieve data with key ${key}:`, error);
    return memoryStorage[key] || null;
  }
};

/**
 * Removes data from storage
 * @param key Storage key
 * @param storageType Type of storage to clear from
 */
export const secureRemove = (key: string, storageType: StorageType = StorageType.SESSION): void => {
  try {
    switch (storageType) {
      case StorageType.SESSION:
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.removeItem(key);
        }
        delete memoryStorage[key];
        break;
      
      case StorageType.LOCAL:
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        delete memoryStorage[key];
        break;
      
      case StorageType.MEMORY:
        delete memoryStorage[key];
        break;
      
      default:
        throw new Error(`Unsupported storage type: ${storageType}`);
    }
  } catch (error) {
    console.warn(`Failed to remove data with key ${key}:`, error);
    delete memoryStorage[key];
  }
};

/**
 * Clears all authentication-related data from storage
 */
export const clearAllAuthData = (): void => {
  const authKeys = [
    'cognito_auth_tokens',
    'cognito_session',
    'oauth_state',
    'pkce_verifier'
  ];
  
  authKeys.forEach(key => {
    secureRemove(key, StorageType.SESSION);
    secureRemove(key, StorageType.LOCAL);
    secureRemove(key, StorageType.MEMORY);
  });
};

/**
 * Checks if storage is available
 * @param storageType Type of storage to check
 * @returns True if storage is available, false otherwise
 */
export const isStorageAvailable = (storageType: StorageType): boolean => {
  try {
    switch (storageType) {
      case StorageType.SESSION:
        return typeof window !== 'undefined' && !!window.sessionStorage;
      
      case StorageType.LOCAL:
        return typeof window !== 'undefined' && !!window.localStorage;
      
      case StorageType.MEMORY:
        return true;
      
      default:
        return false;
    }
  } catch {
    return false;
  }
};