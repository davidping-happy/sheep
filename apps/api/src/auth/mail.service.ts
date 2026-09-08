import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export type MailSendResult = {
  ok: boolean;
  /** 未設定／API 失敗時的簡短原因（可給使用者看） */
  error?: string;
};

/**
 * 輕量寄信服務，依序嘗試三種後端（有設定就用）：
 *
 * 1) Brevo Email API（推薦，走 HTTPS/443，Render 免費機可用、免網域）
 *    環境變數：BREVO_API_KEY、MAIL_FROM（已在 Brevo 驗證的寄件信箱）
 *    選填：MAIL_FROM_NAME（寄件顯示名稱，例如「成二牧區」）
 *
 * 2) Gmail／一般 SMTP（本機或 Render 付費機可用；免費機封鎖 25/465/587）
 *    環境變數：SMTP_USER、SMTP_PASS（Gmail 用「應用程式密碼」）
 *    選填：SMTP_HOST（預設 smtp.gmail.com）、SMTP_PORT（預設 465）
 *
 * 3) Resend HTTP API（備援）
 *    環境變數：RESEND_API_KEY、MAIL_FROM
 *    注意：MAIL_FROM 用 onboarding@resend.dev 時，只能寄到 Resend 帳號自己的 Email。
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private smtpUser(): string | undefined {
    return process.env.SMTP_USER?.trim();
  }
  private smtpPass(): string | undefined {
    return process.env.SMTP_PASS?.trim();
  }

  private useSmtp(): boolean {
    return Boolean(this.smtpUser() && this.smtpPass());
  }

  private useBrevo(): boolean {
    return Boolean(process.env.BREVO_API_KEY?.trim());
  }

  isConfigured(): boolean {
    if (this.useBrevo()) return true;
    if (this.useSmtp()) return true;
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
    accountLabel: string,
    brandName: string,
  ): Promise<MailSendResult> {
    const subject = `【${brandName}】登入帳號提醒`;
    const html = `
      <p>您好，</p>
      <p>您申請查詢「${brandName}」App 登入帳號。</p>
      <p>您的登入帳號為：<strong>${accountLabel}</strong></p>
      <p>若非您本人操作，請忽略本信。</p>
    `;
    return this.send(to, subject, html);
  }

  private async send(
    to: string,
    subject: string,
    html: string,
  ): Promise<MailSendResult> {
    if (this.useBrevo()) {
      return this.sendViaBrevo(to, subject, html);
    }
    if (this.useSmtp()) {
      return this.sendViaSmtp(to, subject, html);
    }
    return this.sendViaResend(to, subject, html);
  }

  // ---------- Brevo Email API（HTTPS，Render 免費機可用） ----------

  private senderEmail(): string {
    return (
      process.env.MAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || ''
    );
  }

  private async sendViaBrevo(
    to: string,
    subject: string,
    html: string,
  ): Promise<MailSendResult> {
    const apiKey = process.env.BREVO_API_KEY?.trim();
    const email = this.senderEmail();
    const name = process.env.MAIL_FROM_NAME?.trim();
    if (!apiKey || !email) {
      return {
        ok: false,
        error: '伺服器尚未設定 BREVO_API_KEY／MAIL_FROM（寄件信箱）。',
      };
    }
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: name ? { name, email } : { email },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Brevo 寄信失敗 ${res.status}: ${body.slice(0, 300)}`);
        const lower = body.toLowerCase();
        if (res.status === 401 || lower.includes('key not found') || lower.includes('unauthorized')) {
          return {
            ok: false,
            error: 'BREVO_API_KEY 無效，請到 Brevo 重新建立並更新 Render。',
          };
        }
        if (
          lower.includes('sender') &&
          (lower.includes('not valid') ||
            lower.includes('not verified') ||
            lower.includes('does not exist'))
        ) {
          return {
            ok: false,
            error:
              '寄件信箱尚未在 Brevo 驗證。請到 Brevo → Senders 驗證 MAIL_FROM 的信箱後再試。',
          };
        }
        return {
          ok: false,
          error: `寄信失敗（Brevo ${res.status}）。請查看 Render Logs。`,
        };
      }
      return { ok: true };
    } catch (err) {
      this.logger.error(
        `Brevo 寄信例外: ${err instanceof Error ? err.message : err}`,
      );
      return { ok: false, error: '寄信連線失敗，請稍後再試。' };
    }
  }

  // ---------- Gmail / SMTP ----------

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;
    const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT?.trim() || '465');
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: this.smtpUser(),
        pass: this.smtpPass(),
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    return this.transporter;
  }

  private fromAddress(): string {
    const user = this.smtpUser()!;
    const name = process.env.MAIL_FROM_NAME?.trim();
    return name ? `${name} <${user}>` : user;
  }

  private async sendViaSmtp(
    to: string,
    subject: string,
    html: string,
  ): Promise<MailSendResult> {
    try {
      await this.getTransporter().sendMail({
        from: this.fromAddress(),
        to,
        subject,
        html,
      });
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`SMTP 寄信失敗: ${msg}`);
      const lower = msg.toLowerCase();
      if (
        lower.includes('invalid login') ||
        lower.includes('username and password not accepted') ||
        lower.includes('535')
      ) {
        return {
          ok: false,
          error:
            'Gmail 帳密不正確。請確認 SMTP_USER 為完整 Gmail，SMTP_PASS 為 Google「應用程式密碼」（16 碼、非登入密碼）。',
        };
      }
      return {
        ok: false,
        error: '寄信失敗（SMTP）。請稍後再試或查看 Render Logs。',
      };
    }
  }

  // ---------- Resend（備援） ----------

  private async sendViaResend(
    to: string,
    subject: string,
    html: string,
  ): Promise<MailSendResult> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.MAIL_FROM?.trim();
    if (!apiKey || !from) {
      this.logger.warn(
        '未設定 SMTP_USER／SMTP_PASS 或 RESEND_API_KEY／MAIL_FROM，無法寄送郵件',
      );
      return {
        ok: false,
        error: '伺服器尚未設定寄信服務（SMTP 或 Resend）',
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
