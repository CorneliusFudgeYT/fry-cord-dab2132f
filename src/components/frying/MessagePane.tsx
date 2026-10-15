import { useEffect, useRef, useState, type ReactNode } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Menu, SendHorizontal, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useApp } from "./app-context";
import { UserAvatar } from "./UserAvatar";

export type PaneMessage = { id: string; author_id: string; content: string; created_at: string };

function stamp(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return `Today at ${format(d, "h:mm a")}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, "h:mm a")}`;
  return format(d, "MMM d, yyyy h:mm a");
}

export function PaneHeader({ icon, title, subtitle, right }: { icon: ReactNode; title: string; subtitle?: string | null | undefined; right?: ReactNode }) {
  const { openNav } = useApp();
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
      <button onClick={openNav} aria-label="Open menu" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent md:hidden">
        <Menu className="h-5 w-5" />
      </button>
      <span className="text-muted-foreground">{icon}</span>
      <h2 className="truncate font-display text-base font-bold text-foreground">{title}</h2>
      {subtitle && <span className="hidden truncate border-l border-border pl-3 text-sm text-muted-foreground sm:block">{subtitle}</span>}
      <div className="ml-auto flex items-center gap-1">{right}</div>
    </header>
  );
}

export function MessagePane({
  messages,
  placeholder,
  onSend,
  onDelete,
  canDelete,
  emptyTitle,
}: {
  messages: PaneMessage[];
  placeholder: string;
  onSend: (text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  canDelete: (m: PaneMessage) => boolean;
  emptyTitle: string;
}) {
  const { profiles, online } = useApp();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send() {
    const content = text.trim();
    if (!content || sending) return;
    if (content.length > 2000) return;
    setSending(true);
    try {
      await onSend(content);
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scrollbar-thin flex-1 overflow-y-auto py-4">
        {messages.length === 0 && (
          <div className="px-4 pt-10">
            <h3 className="text-2xl font-bold text-foreground">{emptyTitle}</h3>
            <p className="mt-1 text-muted-foreground">This is the very beginning. Say something!</p>
          </div>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const grouped = prev && prev.author_id === m.author_id && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;
          const author = profiles.get(m.author_id);
          const name = author?.display_name ?? "Unknown";
          return (
            <div key={m.id} className={cn("group relative flex gap-3 px-4 hover:bg-card/60", grouped ? "py-0.5" : "mt-3 py-1")}>
              <div className="w-10 shrink-0">
                {!grouped && <UserAvatar name={name} src={author?.avatar_url} size="lg" online={online.has(m.author_id)} />}
              </div>
              <div className="min-w-0 flex-1">
                {!grouped && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-foreground">{name}</span>
                    <span className="text-xs text-muted-foreground">{stamp(m.created_at)}</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground/90">{m.content}</p>
              </div>
              {canDelete(m) && (
                <button
                  onClick={() => onDelete(m.id)}
                  aria-label="Delete message"
                  className="absolute right-3 top-1 hidden rounded-md border border-border bg-popover p-1.5 text-muted-foreground hover:text-destructive group-hover:block"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <form
        className="px-3 pb-4 pt-1"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="flex items-end gap-2 rounded-xl border border-border bg-card px-3 py-2 focus-within:border-primary">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={placeholder}
            className="max-h-40 min-h-[24px] flex-1 resize-none bg-transparent py-1 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button type="submit" disabled={!text.trim() || sending} aria-label="Send" className="grid h-8 w-8 place-items-center rounded-lg text-primary disabled:opacity-40">
            <SendHorizontal className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
