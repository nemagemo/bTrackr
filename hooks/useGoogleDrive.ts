
import { useState, useEffect, useCallback } from 'react';

// Scope for accessing only files created by this app
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const BACKUP_FILE_NAME = 'btrackr_db.json';

interface UseGoogleDriveReturn {
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  userEmail: string | null;
  initClient: (clientId: string) => Promise<void>;
  handleLogin: () => void;
  handleLogout: () => void;
  uploadBackup: (data: string) => Promise<void>;
  downloadBackup: () => Promise<string | null>;
  lastSyncTime: string | null;
  error: string | null;
}

export const useGoogleDrive = (): UseGoogleDriveReturn => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(
    localStorage.getItem('btrackr_last_sync')
  );

  // Initialize GAPI and Identity Services
  const initClient = useCallback(async (clientId: string) => {
    if (!clientId) {
        setError("Brak Client ID.");
        return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      // 1. Load GAPI client
      await new Promise<void>((resolve, reject) => {
        if ((window as any).gapi) resolve();
        else reject("GAPI not loaded");
      });

      await new Promise<void>((resolve) => {
        (window as any).gapi.load('client', resolve);
      });

      await (window as any).gapi.client.init({
        discoveryDocs: [DISCOVERY_DOC],
      });

      // 2. Initialize Token Client
      if ((window as any).google) {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              setIsAuthenticated(true);
              // Optimistically set email if available in response, usually needs separate call
              // We'll fetch user info later or rely on token validity
            }
          },
        });
        setTokenClient(client);
        setIsInitialized(true);
      }
    } catch (err: any) {
      console.error("Google Init Error:", err);
      setError("Nie udało się połączyć z usługami Google.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  };

  const handleLogout = () => {
    const token = (window as any).gapi.client.getToken();
    if (token !== null) {
      (window as any).google.accounts.oauth2.revoke(token.access_token, () => {
        (window as any).gapi.client.setToken('');
        setIsAuthenticated(false);
        setUserEmail(null);
      });
    }
  };

  const findFile = async (): Promise<string | null> => {
    try {
      const response = await (window as any).gapi.client.drive.files.list({
        q: `name = '${BACKUP_FILE_NAME}' and trashed = false`,
        fields: 'files(id, name)',
        spaces: 'drive',
      });
      const files = response.result.files;
      if (files && files.length > 0) {
        return files[0].id;
      }
      return null;
    } catch (err) {
      console.error("Search Error", err);
      throw err;
    }
  };

  const uploadBackup = async (data: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!isAuthenticated) throw new Error("Not logged in");

      const fileId = await findFile();
      const fileContent = new Blob([data], { type: 'application/json' });
      const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: 'application/json',
      };

      const accessToken = (window as any).gapi.client.getToken().access_token;
      
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', fileContent);

      let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      let method = 'POST';

      if (fileId) {
        // Update existing file
        url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
        method = 'PATCH';
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': 'Bearer ' + accessToken,
        },
        body: form,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const now = new Date().toLocaleString();
      setLastSyncTime(now);
      localStorage.setItem('btrackr_last_sync', now);

    } catch (err: any) {
      console.error("Upload Error:", err);
      setError("Błąd podczas wysyłania do chmury.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadBackup = async (): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      if (!isAuthenticated) throw new Error("Not logged in");

      const fileId = await findFile();
      if (!fileId) {
        setError("Nie znaleziono kopii zapasowej na Dysku Google.");
        return null;
      }

      const response = await (window as any).gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
      });

      // gapi returns body in result for 'media' download
      return JSON.stringify(response.result); 

    } catch (err: any) {
      console.error("Download Error:", err);
      setError("Błąd podczas pobierania z chmury.");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isAuthenticated,
    isInitialized,
    isLoading,
    userEmail,
    initClient,
    handleLogin,
    handleLogout,
    uploadBackup,
    downloadBackup,
    lastSyncTime,
    error
  };
};
