/**
 * Minimaler SMTP-Server für Tests ohne Mailpit: nimmt Nachrichten über echtes SMTP an (wie
 * Mailpit) und merkt sich Absender, Empfänger und Rohtext. Mit `failNext` lehnt er die nächsten
 * Nachrichten vorübergehend ab (451), um Wiederholungen zu prüfen.
 */
import net from "node:net";

export interface ReceivedMail {
  from: string;
  to: string[];
  raw: string;
  /** Kopfzeilen (Kleinbuchstaben), Folgezeilen zusammengeführt. */
  headers: Record<string, string>;
  /** Text nach den Kopfzeilen (quoted-printable dekodiert). */
  text: string;
}

export interface SmtpMock {
  port: number;
  received: ReceivedMail[];
  /** Die nächsten n Nachrichten mit „451“ ablehnen. */
  failNext(count: number): void;
  close(): Promise<void>;
}

function decodeQuotedPrintable(text: string): string {
  const bytes = text
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-F]{2})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
  return Buffer.from(bytes, "latin1").toString("utf8");
}

function decodeHeader(value: string): string {
  return value.replace(/=\?utf-8\?([BQ])\?([^?]*)\?=\s*/gi, (_, encoding: string, data: string) =>
    encoding.toUpperCase() === "B"
      ? Buffer.from(data, "base64").toString("utf8")
      : decodeQuotedPrintable(data.replace(/_/g, " ")),
  );
}

function parse(raw: string, from: string, to: string[]): ReceivedMail {
  const [head, ...rest] = raw.split("\r\n\r\n");
  const headers: Record<string, string> = {};
  for (const line of head.replace(/\r\n[ \t]+/g, " ").split("\r\n")) {
    const index = line.indexOf(":");
    if (index > 0) {
      headers[line.slice(0, index).toLowerCase()] = decodeHeader(line.slice(index + 1).trim());
    }
  }
  const body = rest.join("\r\n\r\n");
  const encoding = headers["content-transfer-encoding"]?.toLowerCase();
  const text =
    encoding === "quoted-printable"
      ? decodeQuotedPrintable(body)
      : encoding === "base64"
        ? Buffer.from(body, "base64").toString("utf8")
        : body;
  return { from, to, raw, headers, text: text.replace(/\r\n/g, "\n") };
}

export async function startSmtpMock(): Promise<SmtpMock> {
  const received: ReceivedMail[] = [];
  let failures = 0;
  const sockets = new Set<net.Socket>();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    let buffer = "";
    let inData = false;
    let from = "";
    let to: string[] = [];
    const reply = (line: string) => socket.write(`${line}\r\n`);
    reply("220 smtp-mock ESMTP");
    socket.on("data", (chunk) => {
      buffer += chunk.toString("latin1");
      while (true) {
        if (inData) {
          const end = buffer.indexOf("\r\n.\r\n");
          if (end < 0) return;
          const raw = Buffer.from(buffer.slice(0, end), "latin1").toString("latin1").replace(/^\.\./gm, ".");
          buffer = buffer.slice(end + 5);
          inData = false;
          if (failures > 0) {
            failures--;
            reply("451 4.3.0 vorübergehend nicht verfügbar");
          } else {
            received.push(parse(raw, from, to));
            reply("250 2.0.0 OK");
          }
          from = "";
          to = [];
          continue;
        }
        const newline = buffer.indexOf("\r\n");
        if (newline < 0) return;
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 2);
        const command = line.slice(0, 4).toUpperCase();
        if (command === "EHLO" || command === "HELO") {
          reply("250-smtp-mock");
          reply("250 8BITMIME");
        } else if (command === "MAIL") {
          from = /<([^>]*)>/.exec(line)?.[1] ?? "";
          reply("250 OK");
        } else if (command === "RCPT") {
          to.push(/<([^>]*)>/.exec(line)?.[1] ?? "");
          reply("250 OK");
        } else if (command === "DATA") {
          inData = true;
          reply("354 Ende mit <CRLF>.<CRLF>");
        } else if (command === "QUIT") {
          reply("221 Tschüss");
          socket.end();
        } else {
          reply("250 OK");
        }
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("SMTP-Mock ohne Port");
  }
  return {
    port: address.port,
    received,
    failNext(count) {
      failures = count;
    },
    close: () =>
      new Promise((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolve());
      }),
  };
}
