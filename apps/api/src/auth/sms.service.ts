import { Injectable, Logger } from '@nestjs/common';

export type SmsSendResult = { ok: boolean; error?: string };

/**
 * 台灣簡訊：優先三竹／Every8d，亦可 Twilio。
 *
 * SMS_PROVIDER = mitake | every8d | twilio（可省略，依已填環境變數自動判斷）
 *
 * 三竹：MITAKE_USERNAME、MITAKE_PASSWORD
 *       選填 MITAKE_API_BASE（預設 https://smsapi.mitake.com.tw/api/mtk）
 * Every8d：EVERY8D_UID、EVERY8D_PWD
 * Twilio：TWILIO_ACCOUNT_SID、TWILIO_AUTH_TOKEN、TWILIO_FROM
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  isConfigured(): boolean {
    return this.resolveProvider() !== null;
  }

  /** 正規化成 E.164；台灣回傳 +8869xxxxxxxx */
  normalizeTwPhone(raw: string): string | null {
    const digits = raw.replace(/[\s\-()]/g, '');
    if (/^\+8869\d{8}$/.test(digits)) return digits;
    if (/^8869\d{8}$/.test(digits)) return `+${digits}`;
    if (/^09\d{8}$/.test(digits)) return `+886${digits.slice(1)}`;
    if (/^9\d{8}$/.test(digits)) return `+886${digits}`;
    if (/^\+\d{8,15}$/.test(digits)) return digits;
    return null;
  }

  /** 台灣本地格式 09xxxxxxxx（三竹／Every8d 常用） */
  toLocalTwPhone(e164OrRaw: string): string | null {
    const e164 = this.normalizeTwPhone(e164OrRaw);
    if (!e164) return null;
    if (e164.startsWith('+886')) return `0${e164.slice(4)}`;
    if (/^09\d{8}$/.test(e164)) return e164;
    return null;
  }

  async send(toRaw: string, body: string): Promise<SmsSendResult> {
    const e164 = this.normalizeTwPhone(toRaw);
    if (!e164) {
      return { ok: false, error: '手機號碼格式無效' };
    }

    const provider = this.resolveProvider();
    if (!provider) {
      this.logger.warn(`SMS（未設定簡訊商）→ ${e164}: ${body}`);
      return {
        ok: false,
        error: '尚未設定簡訊（MITAKE／EVERY8D／TWILIO）',
      };
    }

    if (provider === 'mitake') return this.sendMitake(e164, body);
    if (provider === 'every8d') return this.sendEvery8d(e164, body);
    return this.sendTwilio(e164, body);
  }

  async sendPasswordResetCode(
    phone: string,
    code: string,
    brandName: string,
  ): Promise<SmsSendResult> {
    return this.send(
      phone,
      `【${brandName}】密碼重設驗證碼：${code}（15分鐘內有效）`,
    );
  }

  async sendAccountHint(
    phone: string,
    accountName: string,
    brandName: string,
  ): Promise<SmsSendResult> {
    return this.send(
      phone,
      `【${brandName}】您的登入帳號為：${accountName}`,
    );
  }

  private resolveProvider(): 'mitake' | 'every8d' | 'twilio' | null {
    const forced = (process.env.SMS_PROVIDER || '').trim().toLowerCase();
    if (forced === 'mitake' || forced === 'every8d' || forced === 'twilio') {
      return forced;
    }
    if (process.env.MITAKE_USERNAME?.trim() && process.env.MITAKE_PASSWORD?.trim()) {
      return 'mitake';
    }
    if (process.env.EVERY8D_UID?.trim() && process.env.EVERY8D_PWD?.trim()) {
      return 'every8d';
    }
    if (
      process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_FROM?.trim()
    ) {
      return 'twilio';
    }
    return null;
  }

  private async sendMitake(e164: string, body: string): Promise<SmsSendResult> {
    const username = process.env.MITAKE_USERNAME!.trim();
    const password = process.env.MITAKE_PASSWORD!.trim();
    const local = this.toLocalTwPhone(e164);
    if (!local) {
      return { ok: false, error: '三竹僅支援台灣手機門號' };
    }

    const base = (
      process.env.MITAKE_API_BASE ||
      'https://smsapi.mitake.com.tw/api/mtk'
    ).replace(/\/$/, '');

    try {
      const url = new URL(`${base}/SmSend`);
      url.searchParams.set('CharsetURL', 'UTF-8');
      const form = new URLSearchParams({
        username,
        password,
        dstaddr: local,
        smbody: body,
      });
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      const text = await res.text();
      // 成功常見含 statuscode=1 或 msgid=
      const ok =
        /statuscode\s*=\s*1/i.test(text) ||
        (/msgid\s*=/i.test(text) && !/statuscode\s*=\s*[eE]/i.test(text));
      if (!ok) {
        this.logger.error(`三竹失敗: ${text.slice(0, 200)}`);
        return { ok: false, error: '三竹簡訊發送失敗，請檢查帳密／點數／IP 白名單' };
      }
      return { ok: true };
    } catch (err) {
      this.logger.error(
        `三竹例外: ${err instanceof Error ? err.message : err}`,
      );
      return { ok: false, error: '三竹簡訊連線失敗' };
    }
  }

  private async sendEvery8d(e164: string, body: string): Promise<SmsSendResult> {
    const uid = process.env.EVERY8D_UID!.trim();
    const pwd = process.env.EVERY8D_PWD!.trim();
    const local = this.toLocalTwPhone(e164);
    if (!local) {
      return { ok: false, error: 'Every8d 僅支援台灣手機門號' };
    }

    const endpoint =
      process.env.EVERY8D_API_URL?.trim() ||
      'https://api.e8d.tw/API21/HTTP/sendSMS.ashx';

    try {
      const form = new URLSearchParams({
        UID: uid,
        PWD: pwd,
        MSG: body,
        DEST: local,
        SB: '',
      });
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
      });
      const text = (await res.text()).trim();
      // 成功通常回傳：剩餘點數,當批識別碼,...（以逗號分隔且開頭為數字）
      // 失敗常以負數代碼開頭，如 -99
      const first = text.split(',')[0]?.trim() ?? '';
      const credit = Number(first);
      if (!Number.isFinite(credit) || credit < 0) {
        this.logger.error(`Every8d 失敗: ${text.slice(0, 200)}`);
        return {
          ok: false,
          error: 'Every8d 簡訊發送失敗，請檢查帳密／點數',
        };
      }
      return { ok: true };
    } catch (err) {
      this.logger.error(
        `Every8d 例外: ${err instanceof Error ? err.message : err}`,
      );
      return { ok: false, error: 'Every8d 簡訊連線失敗' };
    }
  }

  private async sendTwilio(e164: string, body: string): Promise<SmsSendResult> {
    const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
    const token = process.env.TWILIO_AUTH_TOKEN!.trim();
    const from = process.env.TWILIO_FROM!.trim();

    try {
      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      const params = new URLSearchParams({ To: e164, From: from, Body: body });
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
        return { ok: false, error: `Twilio 發送失敗（${res.status}）` };
      }
      return { ok: true };
    } catch (err) {
      this.logger.error(
        `Twilio 例外: ${err instanceof Error ? err.message : err}`,
      );
      return { ok: false, error: 'Twilio 連線失敗' };
    }
  }
}
