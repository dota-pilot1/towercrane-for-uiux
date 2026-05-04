import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  async sendEmailVerificationCode(email: string, code: string) {
    await this.sendHtml({
      to: email,
      subject: '[Towercrane] 이메일 인증 코드',
      html: this.buildCodeHtml({
        title: '이메일 인증 코드',
        description:
          '아래 인증 코드를 회원가입 화면에 입력해 주세요. 코드는 5분간 유효합니다.',
        code,
      }),
    });
  }

  async sendPasswordResetCode(email: string, code: string) {
    await this.sendHtml({
      to: email,
      subject: '[Towercrane] 비밀번호 재설정 인증 코드',
      html: this.buildCodeHtml({
        title: '비밀번호 재설정 인증 코드',
        description:
          '아래 인증 코드를 비밀번호 찾기 화면에 입력해 주세요. 코드는 5분간 유효합니다.',
        code,
      }),
    });
  }

  async sendPasswordChanged(email: string, name: string) {
    await this.sendHtml({
      to: email,
      subject: '[Towercrane] 비밀번호가 변경되었습니다',
      html: this.buildBasicHtml({
        title: '비밀번호가 변경되었습니다',
        body: `안녕하세요, ${this.escapeHtml(name)}님.<br />방금 계정 비밀번호가 정상적으로 변경되었습니다.`,
      }),
    });
  }

  private async sendHtml(input: { to: string; subject: string; html: string }) {
    if (this.isDevMode()) {
      this.logger.log(
        `[MAIL_DEV_MODE] to=${input.to} subject=${input.subject}`,
      );
      this.logger.log(
        input.html
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      );
      return;
    }

    const username = this.configService.get<string>('MAIL_USERNAME');
    const password = this.configService.get<string>('MAIL_PASSWORD');

    if (!username || !password) {
      throw new InternalServerErrorException(
        'Mail credentials are not configured',
      );
    }

    const transporter = this.getTransporter();
    const fromName =
      this.configService.get<string>('MAIL_FROM_NAME') ??
      'Towercrane Prototype Console';
    const fromAddress =
      this.configService.get<string>('MAIL_FROM_ADDRESS') ?? username;

    await transporter.sendMail({
      to: input.to,
      from: `"${fromName}" <${fromAddress}>`,
      subject: input.subject,
      html: input.html,
    });
  }

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST') ?? 'smtp.gmail.com',
      port: Number(this.configService.get<string>('MAIL_PORT') ?? 587),
      secure: this.configService.get<string>('MAIL_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('MAIL_USERNAME'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
      authMethod:
        this.configService.get<string>('MAIL_AUTH_METHOD')?.trim() || 'LOGIN',
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    });

    return this.transporter;
  }

  private isDevMode() {
    return this.configService.get<string>('MAIL_DEV_MODE') === 'true';
  }

  private buildCodeHtml(input: {
    title: string;
    description: string;
    code: string;
  }) {
    return this.buildBasicHtml({
      title: input.title,
      body: `
        <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.7">${this.escapeHtml(input.description)}</p>
        <div style="background:#f3f4f6;border-radius:8px;padding:22px;text-align:center;margin-bottom:22px">
          <span style="font-size:34px;font-weight:700;letter-spacing:0.22em;color:#111827">${input.code}</span>
        </div>
        <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6">본인이 요청하지 않은 경우 이 메일을 무시해 주세요.</p>
      `,
    });
  }

  private buildBasicHtml(input: { title: string; body: string }) {
    return `
      <div style="font-family:Arial,'Apple SD Gothic Neo',sans-serif;max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
        <div style="background:#111827;padding:26px 30px">
          <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.08em">TOWERCRANE</p>
          <p style="margin:4px 0 0;font-size:11px;color:#d1d5db;letter-spacing:0.16em">PROTOTYPE CONSOLE</p>
        </div>
        <div style="padding:34px 30px">
          <h2 style="margin:0 0 10px;font-size:20px;color:#111827">${this.escapeHtml(input.title)}</h2>
          <div>${input.body}</div>
        </div>
        <div style="padding:18px 30px;background:#f9fafb;border-top:1px solid #e5e7eb">
          <p style="margin:0;font-size:12px;color:#6b7280">본 메일은 발신 전용입니다.</p>
        </div>
      </div>
    `;
  }

  private escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
