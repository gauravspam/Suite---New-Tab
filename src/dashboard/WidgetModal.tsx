import { useEffect } from "react";
import { X } from "lucide-react";

// ── Suite v2 standard widget modal ──
// Translucent (wallpaper glows through), chip-icon header, ESC/backdrop close.
// `bare` renders content only (for embedding in the console inspector panel).
export default function WidgetModal({
  title,
  icon,
  onClose,
  children,
  wide = false,
  bare = false,
}: {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  bare?: boolean;
}) {
  useEffect(() => {
    if (bare) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, bare]);

  if (bare) return <>{children}</>;

  return (
    <>
      <div
        className="fixed inset-0 z-40 animate-fade-in"
        style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
        <div
          className={`pointer-events-auto surface-translucent rounded-2xl p-5 overflow-y-auto animate-scale-in-bounce ${
            wide ? "w-full max-w-3xl max-h-[85vh]" : "w-[400px] max-h-[86vh]"
          }`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label={title}
        >
        <div className="flex items-center justify-between mb-4 animate-slide-in-down">
          <h2 className="text-[15px] text-white/90 font-semibold flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              {icon}
            </span>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-white/15 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white/90 tap-scale"
            aria-label="Close"
          >
            <X size={13} />
          </button>
        </div>
        <div className="text-white/65 text-sm">{children}</div>
        </div>
      </div>
    </>
  );
}
