import { NextResponse } from 'next/server';
import tls from 'tls';

function decodeMimeHeader(text: string): string {
  if (!text) return '';
  return text.replace(/=\?UTF-8\?([QB])\?([^?]+)\?=/gi, (_, type, encoded) => {
    try {
      if (type.toUpperCase() === 'B') {
        return Buffer.from(encoded, 'base64').toString('utf8');
      } else if (type.toUpperCase() === 'Q') {
        return encoded.replace(/=([0-9A-F]{2})/gi, (__: string, hex: string) => 
          String.fromCharCode(parseInt(hex, 16))
        );
      }
    } catch (e) {
      return text;
    }
    return text;
  });
}

export async function GET(): Promise<NextResponse> {
  return new Promise<NextResponse>((resolve) => {
    const host = 'mail.kurumsaleposta.com';
    const port = 993; // IMAP SSL Portu
    const user = 'tanitim@cumhuriyeticinkos.com';
    const pass = 'I:Iz-3.Bi9Gk:u65';

    let buffer = '';
    let step = 0;
    const fetchedEmails: any[] = [];

    const socket = tls.connect(port, host, { rejectUnauthorized: false }, () => {});

    socket.setEncoding('utf8');

    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(NextResponse.json({ success: true, emails: fetchedEmails }));
    }, 8000);

    socket.on('data', (chunk) => {
      buffer += chunk;

      if (step === 0 && buffer.includes('* OK')) {
        step = 1;
        buffer = '';
        socket.write(`A1 LOGIN "${user}" "${pass}"\r\n`);
      } else if (step === 1 && buffer.includes('A1 OK')) {
        step = 2;
        buffer = '';
        socket.write(`A2 SELECT INBOX\r\n`);
      } else if (step === 2 && buffer.includes('A2 OK')) {
        step = 3;
        buffer = '';
        socket.write(`A3 FETCH 1:30 (BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])\r\n`);
      } else if (step === 3 && buffer.includes('A3 OK')) {
        clearTimeout(timeout);

        const rawBlocks = buffer.split(/\* \d+ FETCH/g);
        rawBlocks.forEach((block, idx) => {
          if (!block.trim()) return;

          const fromMatch = block.match(/From:\s*(.*)/i);
          const subjectMatch = block.match(/Subject:\s*(.*)/i);
          const dateMatch = block.match(/Date:\s*(.*)/i);

          if (fromMatch || subjectMatch) {
            const rawFrom = decodeMimeHeader(fromMatch ? fromMatch[1].trim() : 'Bilinmeyen Gönderen');
            const rawSubject = decodeMimeHeader(subjectMatch ? subjectMatch[1].trim() : '(Konu Yok)');
            const rawDate = dateMatch ? dateMatch[1].trim() : new Date().toLocaleTimeString('tr-TR');

            let senderName = rawFrom;
            let senderEmail = rawFrom;

            if (rawFrom.includes('<')) {
              const parts = rawFrom.split('<');
              senderName = parts[0].replace(/"/g, '').trim();
              senderEmail = parts[1].replace('>', '').trim();
            }

            if (!senderName) senderName = senderEmail;

            fetchedEmails.push({
              id: `inbox-${idx}-${Date.now()}`,
              senderName,
              senderEmail,
              subject: rawSubject,
              date: rawDate,
              content: 'Gelen e-posta kurumsal e-posta sunucusundan başarıyla okundu.'
            });
          }
        });

        socket.write(`A4 LOGOUT\r\n`);
        socket.destroy();
        resolve(NextResponse.json({ success: true, emails: fetchedEmails.reverse() }));
      } else if (buffer.includes('A1 NO') || buffer.includes('A1 BAD')) {
        clearTimeout(timeout);
        socket.destroy();
        resolve(NextResponse.json({ success: false, error: 'IMAP Giriş Başarısız', emails: [] }));
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(NextResponse.json({ success: false, error: err.message, emails: [] }));
    });
  });
}