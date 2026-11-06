import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, LoaderCircle, ShieldCheck, X, XCircle } from "lucide-react";

export type ToastTone = "info" | "success" | "warn" | "error";

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

export function Brand({ compact = false }: { compact?: boolean }): ReactNode {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`}>
      <span className="brand__mark" aria-hidden="true">
        <ShieldCheck size={compact ? 19 : 26} strokeWidth={1.8} />
      </span>
      <span className="brand__text">
        <span className="brand__eyebrow">CYBERTHREAT</span>
        <span className="brand__title">DEFENDER</span>
      </span>
      {!compact && <span className="brand__edition">LAN</span>}
    </div>
  );
}

export function Spinner({ size = 18 }: { size?: number }): ReactNode {
  return <LoaderCircle size={size} className="spin" aria-hidden="true" />;
}

export function StatusPill({
  status,
  latency,
}: {
  status: "idle" | "connecting" | "connected" | "reconnecting" | "disconnected" | "error";
  latency?: number | null;
}): ReactNode {
  const labels: Record<typeof status, string> = {
    idle: "Offline",
    connecting: "Connecting",
    connected: "Connected",
    reconnecting: "Reconnecting",
    disconnected: "Disconnected",
    error: "Connection lost",
  };
  return (
    <span className={`status-pill status-pill--${status}`}>
      <span className="status-pill__dot" aria-hidden="true" />
      {labels[status]}
      {status === "connected" && latency != null ? <span className="status-pill__latency">{latency}ms</span> : null}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide = false,
  full = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  full?: boolean;
}): ReactNode {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("button, input, select, textarea")?.focus();
    }, 20);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className={`modal-backdrop ${full ? "modal-backdrop--full" : ""}`} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        ref={panelRef}
        className={`modal ${wide ? "modal--wide" : ""} ${full ? "modal--full" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="modal__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog">
            <X size={19} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

export function Toasts({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }): ReactNode {
  return createPortal(
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const Icon =
          toast.tone === "success"
            ? CheckCircle2
            : toast.tone === "warn"
              ? AlertTriangle
              : toast.tone === "error"
                ? XCircle
                : Info;
        return (
          <div key={toast.id} className={`toast toast--${toast.tone}`} role="status">
            <Icon size={17} aria-hidden="true" />
            <span>{toast.message}</span>
            <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}): ReactNode {
  return (
    <div className="empty-state">
      {icon ? <div className="empty-state__icon">{icon}</div> : null}
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}): ReactNode {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="button button--ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`button ${danger ? "button--danger" : "button--primary"}`}
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="confirm-copy">{body}</p>
    </Modal>
  );
}
