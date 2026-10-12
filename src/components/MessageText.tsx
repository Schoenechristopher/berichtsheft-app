/** Text einer Nachricht mit anklickbaren Adressen (Links auf Berichte). */
export function MessageText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <p className="text-fg text-sm break-words whitespace-pre-line">
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <a key={index} href={part} className="text-accent underline">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  );
}
