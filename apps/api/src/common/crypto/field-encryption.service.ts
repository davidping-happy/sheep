import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'crypto';

/**
 * 應用層欄位加密 (§四.1 STORAGE)。
 * 用於晨禱筆記內容、代禱匿名↔真實身份對應等敏感欄位，
 * 使資料庫層即使外洩也無法直接讀取明文。
 *
 * 格式：base64(iv).base64(authTag).base64(ciphertext)
 * 演算法：AES-256-GCM（提供機密性 + 完整性）。
 */
@Injectable()
export class FieldEncryptionService {
  private readonly logger = new Logger(FieldEncryptionService.name);
  private readonly key: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(config: ConfigService) {
    const raw = config.get<string>('fieldEncryptionKey') ?? '';
    // 支援 hex(64) 或 base64；必須為 32 bytes
    this.key = /^[0-9a-fA-F]{64}$/.test(raw)
      ? Buffer.from(raw, 'hex')
      : Buffer.from(raw, 'base64');

    if (this.key.length !== 32) {
      this.logger.error(
        'FIELD_ENCRYPTION_KEY 必須為 32 bytes (64 hex 或 base64)。請執行: openssl rand -hex 32',
      );
    }
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      iv.toString('base64'),
      tag.toString('base64'),
      enc.toString('base64'),
    ].join('.');
  }

  decrypt(payload: string): string {
    const [ivB64, tagB64, dataB64] = payload.split('.');
    const decipher = createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]);
    return dec.toString('utf8');
  }
}
