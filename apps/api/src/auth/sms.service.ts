import { Injectable, Logger } from '@nestjs/common';

/**
 * 簡訊發送（Twilio 或本機 log）。
 * 環境變數：
 *  - TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM（例：+1681...）
 * 未設定時僅寫入 Logs，方便牧區測試。
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  isConfigured(): boolean {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID?.trim() &&
        process.env.TWILIO_AUTH_TOKEN?.trim() &&
        process.env.TWILIO_FROM?.trim(),
    );
  }

  /** 台灣手機正規化成 E.164（+8869xxxxxxxx） */
  normalizeTwPhone(raw: string): string | null {
    const digits = raw.replace(/[\s\-()]/g, '');
    if (/^\+8869\d{8}$/.test(digits)) return digits;
    if (/^8869\d{8}$/.test(digits)) return `+${digits}`;
    if (/^09\d{8}$/.test(digits)) return `+886${digits.slice(1)}`;
    if (/^9\d{8}$/.test(digits)) return `+886${digits}`;
    if (/^\+\d{8,15}$/.test(digits)) return digits;
    return null;
  }

  async send(toRaw: string, body: string): Promise<boolean> {
    const to = this.normalizeTwPhone(toRaw);
    if (!to) {
      this.logger.warn(`簡訊號碼格式無效: ${toRaw}`);
      return false;
    }

    const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const token = process.env.TWILIO_AUTH_TOKEN?.trim();
    const from = process.env.TWILIO_FROM?.trim();
    if (!sid || !token || !from) {
      this.logger.warn(`SMS（未設定 Twilio）→ ${to}: ${body}`);
      return false;
    }

    try {
      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      const params = new URLSearchParams({ To: to, From: from, Body: body });
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        this.logger.error(`Twilio 失敗 ${res.status}: ${text.slice(0, 200)}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(
        `Twilio 例外: ${err instanceof Error ? err.message : err}`,
      );
      return false;
    }
  }

  async sendPasswordResetCode(
    phone: string,
    code: string,
    brandName: string,
  ): Promise<boolean> {
    return this.send(
      phone,
      `【${brandName}】密碼重設驗證碼：${code}（15分鐘內有效）`,
    );
  }

  async sendAccountHint(
    phone: string,
    accountName: string,
    brandName: string,
  ): Promise<boolean> {
    return this.send(
      phone,
      `【${brandName}】您的登入帳號為：${accountName}`,
    );
  }
}
