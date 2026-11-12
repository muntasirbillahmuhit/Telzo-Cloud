/**
 * TELZO CLOUD - Universal Device Storage Access Service
 * Provides unified device storage pick, stream upload, and download adapters for Web Preview & Native Android (SAF)
 */

export interface PickedFile {
  file: File;
  name: string;
  size: number;
  type: string;
  relativePath?: string;
}

export interface UploadProgressInfo {
  fileName: string;
  fileIndex: number;
  totalFiles: number;
  percent: number;
  uploadedBytes: number;
  totalBytes: number;
}

export interface StorageAdapter {
  isSupported(): boolean;
  pickFiles(options?: { multiple?: boolean; accept?: string }): Promise<PickedFile[]>;
  pickFolder(): Promise<PickedFile[]>;
  downloadFile(fileId: string, fileName: string, mimeType: string): Promise<boolean>;
}

declare global {
  interface Window {
    showOpenFilePicker?: (options?: any) => Promise<any[]>;
    showDirectoryPicker?: () => Promise<any>;
    showSaveFilePicker?: (options?: any) => Promise<any>;
    AndroidStorage?: {
      pickFiles?: (multiple: boolean, acceptTypes: string) => void;
      pickFolder?: () => void;
      saveFile?: (fileName: string, mimeType: string, base64Data: string) => void;
      isNativeSAF?: () => boolean;
    };
    AndroidBridge?: any;
  }
}

class WebStorageAdapterImpl implements StorageAdapter {
  isSupported(): boolean {
    return typeof window !== 'undefined';
  }

  async pickFiles(options?: { multiple?: boolean; accept?: string }): Promise<PickedFile[]> {
    const multiple = options?.multiple !== false;
    const accept = options?.accept || '*/*';

    // Try modern File System Access API if available
    if (window.showOpenFilePicker) {
      try {
        const handles = await window.showOpenFilePicker({
          multiple,
          types: accept !== '*/*' ? [{ description: 'Files', accept: { [accept]: [] } }] : undefined,
        });

        const pickedFiles: PickedFile[] = [];
        for (const handle of handles) {
          const file = await handle.getFile();
          pickedFiles.push({
            file,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
          });
        }
        return pickedFiles;
      } catch (err: any) {
        if (err?.name === 'AbortError') return [];
        console.warn('[WebStorageAdapter] File System Access API error, falling back to input element:', err);
      }
    }

    // Standard HTML input file fallback (Android Chrome compatible)
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = multiple;
      input.accept = accept;

      input.onchange = () => {
        if (!input.files || input.files.length === 0) {
          resolve([]);
          return;
        }

        const list: PickedFile[] = Array.from(input.files).map((f) => ({
          file: f,
          name: f.name,
          size: f.size,
          type: f.type || 'application/octet-stream',
        }));

        resolve(list);
      };

      input.oncancel = () => resolve([]);
      input.click();
    });
  }

  async pickFolder(): Promise<PickedFile[]> {
    if (window.showDirectoryPicker) {
      try {
        const dirHandle = await window.showDirectoryPicker();
        const files: PickedFile[] = [];

        const readDirectory = async (handle: any, currentPath: string) => {
          for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
              const file = await entry.getFile();
              files.push({
                file,
                name: file.name,
                size: file.size,
                type: file.type || 'application/octet-stream',
                relativePath: `${currentPath}/${file.name}`,
              });
            } else if (entry.kind === 'directory') {
              await readDirectory(entry, `${currentPath}/${entry.name}`);
            }
          }
        };

        await readDirectory(dirHandle, dirHandle.name);
        return files;
      } catch (err: any) {
        if (err?.name === 'AbortError') return [];
        console.warn('[WebStorageAdapter] showDirectoryPicker error, falling back:', err);
      }
    }

    // Fallback using webkitdirectory HTML attribute
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      (input as any).webkitdirectory = true;
      (input as any).directory = true;

      input.onchange = () => {
        if (!input.files || input.files.length === 0) {
          resolve([]);
          return;
        }

        const list: PickedFile[] = Array.from(input.files).map((f) => ({
          file: f,
          name: f.name,
          size: f.size,
          type: f.type || 'application/octet-stream',
          relativePath: (f as any).webkitRelativePath || f.name,
        }));

        resolve(list);
      };

      input.oncancel = () => resolve([]);
      input.click();
    });
  }

  async downloadFile(fileId: string, fileName: string, mimeType: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/files/${fileId}/download`);
      if (!response.ok) {
        throw new Error(`Download request failed with HTTP ${response.status}`);
      }

      const blob = await response.blob();

      // Check if showSaveFilePicker is available
      if (window.showSaveFilePicker) {
        try {
          const saveHandle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: 'File',
                accept: { [mimeType || 'application/octet-stream']: [] },
              },
            ],
          });
          const writable = await saveHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          return true;
        } catch (err: any) {
          if (err?.name === 'AbortError') return false;
          console.warn('[WebStorageAdapter] showSaveFilePicker fallback:', err);
        }
      }

      // Standard anchor download fallback
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    } catch (err) {
      console.error('[WebStorageAdapter] Download error:', err);
      throw err;
    }
  }
}

class AndroidStorageAdapterImpl implements StorageAdapter {
  isSupported(): boolean {
    return Boolean(
      typeof window !== 'undefined' &&
        (window.AndroidStorage?.isNativeSAF?.() || window.AndroidBridge)
    );
  }

  async pickFiles(options?: { multiple?: boolean; accept?: string }): Promise<PickedFile[]> {
    if (!this.isSupported()) {
      return new WebStorageAdapterImpl().pickFiles(options);
    }

    return new Promise((resolve, reject) => {
      try {
        const multiple = options?.multiple !== false;
        const accept = options?.accept || '*/*';

        // Setup native callback on window
        (window as any).__onAndroidFilesPicked = (jsonResult: string) => {
          try {
            const results = JSON.parse(jsonResult);
            const picked: PickedFile[] = results.map((r: any) => ({
              file: new File([new Uint8Array(r.bytes || 0)], r.name, { type: r.type }),
              name: r.name,
              size: r.size,
              type: r.type,
            }));
            resolve(picked);
          } catch (e) {
            reject(e);
          }
        };

        window.AndroidStorage?.pickFiles?.(multiple, accept);
      } catch (err) {
        console.warn('[AndroidStorageAdapter] Native pick fallback:', err);
        new WebStorageAdapterImpl().pickFiles(options).then(resolve).catch(reject);
      }
    });
  }

  async pickFolder(): Promise<PickedFile[]> {
    if (!this.isSupported()) {
      return new WebStorageAdapterImpl().pickFolder();
    }

    return new Promise((resolve, reject) => {
      try {
        (window as any).__onAndroidFolderPicked = (jsonResult: string) => {
          try {
            const results = JSON.parse(jsonResult);
            const picked: PickedFile[] = results.map((r: any) => ({
              file: new File([new Uint8Array(r.bytes || 0)], r.name, { type: r.type }),
              name: r.name,
              size: r.size,
              type: r.type,
              relativePath: r.relativePath,
            }));
            resolve(picked);
          } catch (e) {
            reject(e);
          }
        };

        window.AndroidStorage?.pickFolder?.();
      } catch (err) {
        new WebStorageAdapterImpl().pickFolder().then(resolve).catch(reject);
      }
    });
  }

  async downloadFile(fileId: string, fileName: string, mimeType: string): Promise<boolean> {
    if (!this.isSupported()) {
      return new WebStorageAdapterImpl().downloadFile(fileId, fileName, mimeType);
    }

    return new WebStorageAdapterImpl().downloadFile(fileId, fileName, mimeType);
  }
}

export class DeviceStorageService {
  private static webAdapter = new WebStorageAdapterImpl();
  private static androidAdapter = new AndroidStorageAdapterImpl();

  public static getActiveAdapter(): StorageAdapter {
    if (this.androidAdapter.isSupported()) {
      return this.androidAdapter;
    }
    return this.webAdapter;
  }

  public static isAndroidNative(): boolean {
    return this.androidAdapter.isSupported();
  }

  public static async pickFiles(options?: { multiple?: boolean; accept?: string }): Promise<PickedFile[]> {
    return this.getActiveAdapter().pickFiles(options);
  }

  public static async pickFolder(): Promise<PickedFile[]> {
    return this.getActiveAdapter().pickFolder();
  }

  /**
   * Uploads files to TELZO CLOUD with XHR progress reporting
   */
  public static async uploadFiles(
    files: PickedFile[],
    folderId?: string,
    tag?: string,
    onProgress?: (progress: UploadProgressInfo) => void
  ): Promise<any[]> {
    if (!files || files.length === 0) return [];

    const results: any[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const pf = files[i];

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('files', pf.file, pf.name);
        if (folderId) formData.append('folderId', folderId);
        if (tag) formData.append('tag', tag);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && onProgress) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress({
              fileName: pf.name,
              fileIndex: i + 1,
              totalFiles,
              percent,
              uploadedBytes: event.loaded,
              totalBytes: event.total,
            });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText);
              if (json.data) {
                results.push(...(Array.isArray(json.data) ? json.data : [json.data]));
              }
              resolve();
            } catch (e) {
              reject(e);
            }
          } else {
            let errorMsg = `Upload failed with status ${xhr.status}`;
            try {
              const errJson = JSON.parse(xhr.responseText);
              if (errJson.error?.message) errorMsg = errJson.error.message;
            } catch (e) {}
            reject(new Error(errorMsg));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload to TELZO CLOUD.'));
        xhr.open('POST', '/api/files/upload', true);
        xhr.send(formData);
      });
    }

    return results;
  }

  public static async downloadFile(fileId: string, fileName: string, mimeType: string): Promise<boolean> {
    return this.getActiveAdapter().downloadFile(fileId, fileName, mimeType);
  }
}
