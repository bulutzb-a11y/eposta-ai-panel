export function renderHtmlEmail({
  title,
  content,
  buttonText,
  buttonUrl,
}: {
  title: string;
  content: string;
  buttonText?: string;
  buttonUrl?: string;
}) {
  // Paragrafları HTML kesmelerine dönüştür
  const formattedContent = content
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #374151;">${line}</p>`)
    .join('');

  const actionButton = buttonText && buttonUrl ? `
    <tr>
      <td align="center" style="padding: 24px 0 12px 0;">
        <a href="${buttonUrl}" target="_blank" style="background-color: #2563eb; color: #ffffff; display: inline-block; font-size: 14px; font-weight: 700; line-height: 1; padding: 14px 28px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
          ${buttonText} →
        </a>
      </td>
    </tr>
  ` : '';

  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 40px 16px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);">
              
              <!-- Üst Renk Çubuğu -->
              <tr>
                <td style="background: linear-gradient(90deg, #2563eb 0%, #7c3aed 100%); height: 6px;"></td>
              </tr>

              <!-- Mail Gövdesi -->
              <tr>
                <td style="padding: 36px 32px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td>
                        <h1 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.025em;">
                          ${title}
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        ${formattedContent}
                      </td>
                    </tr>
                    ${actionButton}
                  </table>
                </td>
              </tr>

              <!-- Alt Bilgi (Footer) -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px 32px; border-top: 1px solid #f3f4f6; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    Bu e-posta size özel olarak gönderilmiştir. Saygılarımızla.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}