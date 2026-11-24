import { Component, Suspense, useState, type ReactNode } from "react";
import { captureBrowserException } from "../lib/sentry";
import { PaperclipLoading } from "./AnimatedPaperclipIcon";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";

interface DeferredOverlayProps {
  requested: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

function OverlayNotice({ title, onClose, failed = false, message }: Pick<DeferredOverlayProps, "title" | "onClose"> & { failed?: boolean; message?: string }) {
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent showCloseButton={false} aria-describedby={undefined}>
      <DialogTitle>{failed ? `Couldn't open ${title.toLowerCase()}` : `Loading ${title.toLowerCase()}…`}</DialogTitle>
      {failed
        ? <p className="text-sm text-muted-foreground">{message ? `Error: ${message}` : "Close this window to keep working. Reload the page before trying again."}</p>
        : <PaperclipLoading className="min-h-0" />}
      <div className="flex justify-end"><Button variant="outline" onClick={onClose}>{failed ? "Close" : "Cancel"}</Button></div>
    </DialogContent>
  </Dialog>;
}

class OverlayErrorBoundary extends Component<DeferredOverlayProps, { failed: boolean; message?: string }> {
  state: { failed: boolean; message?: string } = { failed: false };
  static getDerivedStateFromError(error: Error) {
    return { failed: true, message: error?.message ? String(error.message) : undefined };
  }
  componentDidCatch(error: Error) { console.error("[DeferredOverlay] render error:", error, error?.stack); captureBrowserException(error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return this.props.requested ? <OverlayNotice title={this.props.title} onClose={this.props.onClose} failed message={this.state.message} /> : null;
  }
}

export function DeferredOverlay({ requested, title, onClose, children }: DeferredOverlayProps) {
  const [activated, setActivated] = useState(requested);
  if (requested && !activated) setActivated(true);
  if (!requested && !activated) return null;
  return <OverlayErrorBoundary requested={requested} title={title} onClose={onClose}>
    <Suspense fallback={requested ? <OverlayNotice title={title} onClose={onClose} /> : null}>{children}</Suspense>
  </OverlayErrorBoundary>;
}
