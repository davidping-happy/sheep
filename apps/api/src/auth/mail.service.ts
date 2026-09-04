import { Injectable, Logger } from '@nestjs/common';

export type MailSendResult = {
  ok: boolean;
  /** 未設定／API 失敗時的簡短原因（可給使用者看） */
  error?: string;
};

/**
 * 輕量寄信：Resend HTTP API。
 * 環境變數：RESEND_API_KEY、MAIL_FROM
 * 注意：MAIL_FROM 用 onboarding@resend.dev 時，只能寄到 Resend 帳號自己的 Email。
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  isConfigured(): boolean {
    return Boolean(
      process.env.RESEND_API_KEY?.trim() && process.env.MAIL_FROM?.trim(),
    );
  }

  async sendPasswordResetCode(
    to: string,
    code: string,
    brandName: string,
  ): Promise<MailSendResult> {
    const subject = `【${brandName}】密碼重設驗證碼`;
    const html = `
      <p>您好，</p>
      <p>您申請重設「${brandName}」App 登入密碼。驗證碼為：</p>
      <p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p>
      <p>驗證碼 15 分鐘內有效。若非您本人操作，請忽略本信。</p>
    `;
    return this.send(to, subject, html);
  }

  async sendAccountHint(
    to: string,
    accountEmail: string,
    brandName: string,
  ): Promise<MailSendResult> {
    const subject = `【${brandName}】登入帳號提醒`;
    const html = `
      <p>您好，</p>
      <p>您申請查詢「${brandName}」App 登入帳號。</p>
      <p>您的登入帳號（Email）為：<strong>${accountEmail}</strong></p>
      <p>亦可使用註冊手機號碼登入。若非您本人操作，請忽略本信。</p>
    `;
    return this.send(to, subject, html);
  }

  private async send(
    to: string,
    subject: string,
    html: string,
  ): Promise<MailSendResult> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.MAIL_FROM?.trim();
    if (!apiKey || !from) {
      this.logger.warn(
        '未設定 RESEND_API_KEY／MAIL_FROM，無法寄送郵件',
      );
      return {
        ok: false,
        error: '伺服器尚未設定 RESEND_API_KEY／MAIL_FROM',
      };
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to, subject, html }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Resend 寄信失敗 ${res.status}: ${body.slice(0, 300)}`);
        const lower = body.toLowerCase();
        if (
          res.status === 403 ||
          lower.includes('only send testing emails') ||
          lower.includes('verify a domain')
        ) {
          return {
            ok: false,
            error:
              'Resend 測試寄件只能寄到「註冊 Resend 的那個 Email」。請改用該信箱測試，或到 Resend 驗證自己的網域後改 MAIL_FROM。',
          };
        }
        if (res.status === 401 || lower.includes('api key')) {
          return {
            ok: false,
            error: 'RESEND_API_KEY 無效，請到 Resend 重新建立並更新 Render。',
          };
        }
        return {
          ok: false,
          error: `寄信失敗（Resend ${res.status}）。請查看 Render Logs。`,
        };
      }
      return { ok: true };
    } catch (err) {
      this.logger.error(
        `Resend 寄信例外: ${err instanceof Error ? err.message : err}`,
      );
      return {
        ok: false,
        error: '寄信連線失敗，請稍後再試。',
      };
    }
  }
}
