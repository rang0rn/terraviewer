export interface StorageAdapter {
  upload(key: string, data: Buffer, contentType: string): Promise<string>
}
