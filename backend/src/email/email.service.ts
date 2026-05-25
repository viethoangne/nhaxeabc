import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly senderEmail: string;
  private readonly senderName: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BREVO_API_KEY') || '';
    this.senderEmail = this.configService.get<string>('BREVO_SENDER_EMAIL') || 'hoanglop10237zz@gmail.com';
    this.senderName = this.configService.get<string>('BREVO_SENDER_NAME') || 'NHÀ XE ABC';

    if (!this.apiKey) {
      this.logger.error('BREVO_API_KEY is not defined in the environment variables.');
    }
  }

  /**
   * Sends a transactional email using Brevo's HTTPS API.
   */
  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      cid?: string;
      encoding?: string;
    }>;
  }) {
    if (!this.apiKey) {
      const errMsg = 'Brevo API Key is missing. Email could not be sent.';
      this.logger.error(errMsg);
      throw new Error(errMsg);
    }

    // Convert attachments to Brevo v3 format (name + content in base64)
    const formattedAttachments: any[] = [];
    if (options.attachments && options.attachments.length > 0) {
      for (const att of options.attachments) {
        let base64Content = '';
        if (Buffer.isBuffer(att.content)) {
          base64Content = att.content.toString('base64');
        } else if (typeof att.content === 'string') {
          base64Content = att.content;
        }

        formattedAttachments.push({
          name: att.filename,
          content: base64Content,
        });
      }
    }

    const payload = {
      sender: {
        name: this.senderName,
        email: this.senderEmail,
      },
      to: [
        {
          email: options.to,
        },
      ],
      subject: options.subject,
      htmlContent: options.html,
      ...(formattedAttachments.length > 0 && { attachment: formattedAttachments }),
    };

    try {
      this.logger.log(`Sending email to ${options.to} via Brevo HTTP API...`);
      const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
        headers: {
          'accept': 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json',
        },
      });

      this.logger.log(`Email sent successfully to ${options.to}. Message ID: ${response.data?.messageId}`);
      return response.data;
    } catch (error: any) {
      const responseError = error.response?.data || error.message;
      this.logger.error(`Failed to send email via Brevo to ${options.to}: ${JSON.stringify(responseError)}`, error.stack);
      throw new Error(`Brevo send failed: ${JSON.stringify(responseError)}`);
    }
  }
}
