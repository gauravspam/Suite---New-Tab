import { useState } from "react";
import { StickyNote, Plus, Pin, Trash2, Search } from "lucide-react";
import WidgetModal from "@/dashboard/WidgetModal";
import { STORAGE_KEYS, useChromeStorage } from "@/shared/storage";
import type { DashboardNote } from "@/shared/types";

export default function NotesWidget({ onClose, bare }: { onClose: () => void; bare?: boolean }) {
  const [notes, setNotes] = useChromeStorage<DashboardNote[]>(STORAGE_KEYS.DASHBOARD_NOTES, []);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const list = (Array.isArray(notes) ? notes : [])
    .filter((n) => (n.title + n.body).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);

  function save() {
    if (!draft.trim() && editingId === null) return;
    const ts = Date.now();
    if (editingId) {
      setNotes((prev) => prev.map((n) => (n.id === editingId ? { ...n, body: draft, updatedAt: ts } : n)));
    } else {
      if (!draft.trim()) return;
      setNotes((prev) => [
        { id: String(ts), title: draft.split("\n")[0].slice(0, 40) || "Untitled", body: draft, pinned: false, createdAt: ts, updatedAt: ts },
        ...prev,
      ]);
    }
    setDraft("");
    setEditingId(null);
  }

  return (
    <WidgetModal title="My Notes" icon={<StickyNote size={15} className="text-white/85" />} onClose={onClose} bare={bare}>
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full surface-input pl-9 pr-3 py-2 text-[13px]"
            />
          </div>
          <span className="text-[10px] text-white/40 whitespace-nowrap">{list.length} note{list.length === 1 ? "" : "s"}</span>
        </div>

        <div className="rounded-xl bg-black/30 border border-white/10 p-3 mb-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save(); }}
            placeholder={editingId ? "Edit note… (⌘+Enter to save)" : "Quick note… (⌘+Enter to save)"}
            rows={3}
            className="w-full bg-transparent text-[13px] text-white/85 placeholder-white/25 outline-none resize-none"
          />
          <div className="flex justify-end gap-2 mt-2">
            {editingId && (
              <button onClick={() => { setEditingId(null); setDraft(""); }} className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:bg-white/10 tap-scale">
                Cancel
              </button>
            )}
            <button onClick={save} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-white/10 hover:bg-white/15 tap-scale flex items-center gap-1.5">
              <Plus size={12} /> {editingId ? "Save" : "Add"}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {list.map((n, idx) => (
            <div
              key={n.id}
              className="rounded-xl surface-chip p-3 animate-slide-in-left"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-[13px] text-white/85 font-medium truncate">{n.title}</div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => setNotes((prev) => prev.map((x) => (x.id === n.id ? { ...x, pinned: !x.pinned } : x)))}
                    className={`tap-scale ${n.pinned ? "text-amber-300" : "text-white/30 hover:text-white/60"}`}
                    title={n.pinned ? "Unpin" : "Pin"}
                  >
                    <Pin size={12} />
                  </button>
                  <button
                    onClick={() => setNotes((prev) => prev.filter((x) => x.id !== n.id))}
                    className="text-white/30 hover:text-red-400 tap-scale"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {n.body && n.body !== n.title && (
                <div className="text-xs text-white/55 mt-1 whitespace-pre-wrap line-clamp-3">{n.body}</div>
              )}
              <button
                onClick={() => { setEditingId(n.id); setDraft(n.body); }}
                className="text-[11px] text-white/35 hover:text-white/60 mt-1.5"
              >
                Edit
              </button>
            </div>
          ))}
          {list.length === 0 && (
            <div className="text-white/35 text-xs text-center py-4">No notes yet</div>
          )}
        </div>
      </div>
    </WidgetModal>
  );
}
