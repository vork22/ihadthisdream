import { useEffect, useRef, useState } from "react";

/**
 * Multi-turn Dream Analysis chat — the interpreter asks follow-up questions,
 * then synthesizes when ready. Ports dream_pad.jsx to a proper React island.
 * Talks to /api/interpret (Vercel function) rather than window.claude.complete.
 */

const DEFAULT_CHIPS = [
  "I was being chased…",
  "I could fly over my city",
  "My teeth started falling out",
  "I was back in my childhood home",
  "I met someone who had died",
];

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
};

function parseModelResponse(raw: string): { message: string; suggestions: string[] } {
  if (!raw) return { message: "", suggestions: [] };
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const candidate = s.slice(first, last + 1);
    try {
      const obj = JSON.parse(candidate);
      return {
        message: typeof obj.message === "string" ? obj.message : "",
        suggestions: Array.isArray(obj.suggestions)
          ? obj.suggestions.filter((x: unknown) => typeof x === "string").slice(0, 4)
          : [],
      };
    } catch {
      /* fall through */
    }
  }
  return { message: raw, suggestions: [] };
}

export default function DreamChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  const handleChip = (dream: string) => {
    if (messages.length > 0) return;
    setInput(dream + " ");
    textareaRef.current?.focus();
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMsg = { role: "user", content: input.trim() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);
    setStreaming("");

    try {
      const apiMessages = newHistory.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { content?: string };
      const parsed = parseModelResponse(data.content || "");
      const full = parsed.message || "<p>…</p>";
      const suggestions = parsed.suggestions || [];

      let i = 0;
      const stream = () => {
        if (i >= full.length) {
          setMessages([...newHistory, { role: "assistant", content: full, suggestions }]);
          setStreaming("");
          setLoading(false);
          return;
        }
        const chunk = Math.min(6, full.length - i);
        i += chunk;
        setStreaming(full.slice(0, i));
        setTimeout(stream, 16);
      };
      stream();
    } catch {
      setMessages([
        ...newHistory,
        {
          role: "assistant",
          content: "<p>The dream library is quiet right now. Please try again in a moment.</p>",
        },
      ]);
      setStreaming("");
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    }
  };

  const saveToJournal = () => {
    const dreamText = messages.find((m) => m.role === "user")?.content || "";
    const analysis = messages
      .map((m) =>
        m.role === "user"
          ? `<p class="journal-you"><em>You:</em> ${m.content}</p>`
          : `<div class="journal-them">${m.content}</div>`,
      )
      .join("");
    const entry = {
      id: Date.now(),
      date: new Date().toISOString(),
      dream: dreamText,
      lens: "Conversational",
      analysis,
    };
    const existing = JSON.parse(localStorage.getItem("ihtd_journal") || "[]");
    existing.unshift(entry);
    localStorage.setItem("ihtd_journal", JSON.stringify(existing));
    window.dispatchEvent(new Event("ihtd_journal_updated"));
    const btn = document.getElementById("save-btn");
    if (btn) {
      btn.textContent = "✓ Saved to journal";
      setTimeout(() => (btn.textContent = "Save to journal"), 1800);
    }
  };

  const reset = () => {
    setMessages([]);
    setInput("");
    setStreaming("");
  };

  const hasStarted = messages.length > 0 || streaming;

  return (
    <div>
      {!hasStarted && (
        <div className="dream-pad">
          <div className="dream-pad-label">Tonight's dream</div>
          <textarea
            ref={textareaRef}
            className="dream-textarea"
            placeholder="I was walking through a house I'd never seen before, and every door opened into a garden…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="pad-row">
            <div className="pad-chips">
              {DEFAULT_CHIPS.map((c) => (
                <button key={c} className="chip" onClick={() => handleChip(c)} type="button">
                  {c}
                </button>
              ))}
            </div>
            <button
              className="btn"
              onClick={send}
              disabled={!input.trim() || loading}
              type="button"
            >
              Begin interpretation
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M1 7h12m0 0L8 2m5 5l-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {hasStarted && (
        <div className="dream-chat">
          <div className="chat-header">
            <div className="chat-title">A conversation about your dream</div>
            <button className="chat-reset" onClick={reset} type="button">
              New dream
            </button>
          </div>

          <div className="chat-scroll" ref={scrollRef}>
            {messages.map((m, i) => {
              const isLatestAssistant =
                m.role === "assistant" &&
                i === messages.length - 1 &&
                !loading &&
                !streaming;
              return (
                <div key={i} className={`chat-msg chat-${m.role}`}>
                  {m.role === "user" ? (
                    <div className="chat-bubble-user">{m.content}</div>
                  ) : (
                    <div style={{ maxWidth: "92%" }}>
                      <div
                        className="chat-bubble-interpreter"
                        dangerouslySetInnerHTML={{ __html: m.content }}
                      />
                      {isLatestAssistant && m.suggestions && m.suggestions.length > 0 && (
                        <div className="chat-suggestions">
                          {m.suggestions.map((s, si) => (
                            <button
                              key={si}
                              className="chat-suggestion"
                              onClick={() => {
                                setInput(s);
                                textareaRef.current?.focus();
                              }}
                              type="button"
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {streaming && (
              <div className="chat-msg chat-assistant">
                <div
                  className="chat-bubble-interpreter"
                  dangerouslySetInnerHTML={{
                    __html: streaming + '<span class="typing-cursor"></span>',
                  }}
                />
              </div>
            )}
            {loading && !streaming && (
              <div className="chat-msg chat-assistant">
                <div className="chat-bubble-interpreter chat-thinking">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
          </div>

          <div className="chat-input-row">
            <textarea
              ref={textareaRef}
              className="chat-input"
              placeholder={messages.length === 0 ? "Describe your dream…" : "Your reply…"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              disabled={loading}
            />
            <button
              className="btn chat-send"
              onClick={send}
              disabled={!input.trim() || loading}
              type="button"
            >
              Send
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M1 7h12m0 0L8 2m5 5l-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {messages.filter((m) => m.role === "assistant").length >= 1 && (
            <div className="chat-actions">
              <button
                className="btn btn-ghost"
                id="save-btn"
                onClick={saveToJournal}
                type="button"
              >
                Save to journal
              </button>
              <span className="chat-hint">⌘ + Enter to send</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
