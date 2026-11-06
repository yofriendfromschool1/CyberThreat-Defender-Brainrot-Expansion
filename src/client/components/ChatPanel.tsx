import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { MessageSquare, Send } from "lucide-react";
import type { LogEntry } from "../../shared/types.js";

export function ChatPanel({
  messages,
  onSend,
  disabled = false,
  emptyHint = "Say hello to the table.",
  showHeader = true,
}: {
  messages: LogEntry[];
  onSend: (text: string) => void;
  disabled?: boolean;
  emptyHint?: string;
  showHeader?: boolean;
}): ReactNode {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  function submit(event: FormEvent): void {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSend(value.slice(0, 400));
    setText("");
  }

  return (
    <section className="chat-panel">
      {showHeader ? (
        <header className="chat-panel__header">
          <div>
            <span className="eyebrow">VOICE OF THE TABLE</span>
            <h3><MessageSquare size={15} /> Table chat</h3>
          </div>
          <span className="chat-panel__count">{messages.length}</span>
        </header>
      ) : null}
      <div className="chat-panel__messages" ref={scrollRef} aria-live="polite" aria-relevant="additions">
        {messages.length === 0 ? (
          <div className="chat-panel__empty">
            <MessageSquare size={18} />
            <span>{emptyHint}</span>
          </div>
        ) : (
          messages.map((message) => {
            const separator = message.text.indexOf(": ");
            const author = separator > 0 ? message.text.slice(0, separator) : "Table";
            const body = separator > 0 ? message.text.slice(separator + 2) : message.text;
            return (
              <div className="chat-message" key={message.id}>
                <span className="chat-message__author">{author}</span>
                <p>{body}</p>
              </div>
            );
          })
        )}
      </div>
      <form className="chat-panel__composer" onSubmit={submit}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={400}
          placeholder={disabled ? "Reconnecting…" : "Message the LAN…"}
          aria-label="Chat message"
          disabled={disabled}
        />
        <button className="icon-button icon-button--accent" type="submit" disabled={disabled || !text.trim()} aria-label="Send chat message">
          <Send size={16} />
        </button>
      </form>
    </section>
  );
}
