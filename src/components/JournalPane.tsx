import { useEffect, useState } from "react";

type JournalEntry = {
  id: number;
  date: string;
  dream: string;
  lens: string;
  analysis: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

export default function JournalPane() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = () => {
    try {
      setEntries(JSON.parse(localStorage.getItem("ihtd_journal") || "[]"));
    } catch {
      setEntries([]);
    }
  };

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("ihtd_journal_updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("ihtd_journal_updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const remove = (id: number) => {
    const next = entries.filter((e) => e.id !== id);
    setEntries(next);
    localStorage.setItem("ihtd_journal", JSON.stringify(next));
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ihadthisdream-journal-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (entries.length === 0) {
    return (
      <div className="journal-empty" style={{ padding: "48px 28px", textAlign: "center" }}>
        Interpret a dream to begin your journal.
        <br />
        Everything you save stays on this device.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className="btn btn-ghost" onClick={exportJson} type="button">
          Export JSON
        </button>
      </div>
      <div>
        {entries.map((e) => {
          const open = expanded === e.id;
          return (
            <div
              key={e.id}
              className="journal-entry"
              style={{ borderBottom: "1px solid var(--line)", padding: "20px 0" }}
            >
              <button
                onClick={() => setExpanded(open ? null : e.id)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "inherit",
                  font: "inherit",
                }}
                aria-expanded={open}
              >
                <div className="journal-date">
                  {formatDate(e.date)} · {e.lens}
                </div>
                <div className="journal-preview">{e.dream}</div>
              </button>
              {open && (
                <div style={{ marginTop: 16 }}>
                  <div
                    className="analysis-body"
                    dangerouslySetInnerHTML={{ __html: e.analysis }}
                  />
                  <div style={{ marginTop: 16 }}>
                    <button
                      className="btn btn-ghost"
                      onClick={() => remove(e.id)}
                      type="button"
                      style={{ fontSize: 13 }}
                    >
                      Delete entry
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
