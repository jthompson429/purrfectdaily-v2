import { Component } from "react";
import { AlertCircle, RotateCw } from "lucide-react";

// Catches render errors in its children so a single failing section never
// blanks the whole page. Falls back to a small card that matches the existing
// profile card style, with a Retry that re-mounts the children.
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Swallow intentionally — the fallback UI is the desired behavior.
    console.error("Pet profile section failed to render:", error, info);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback(this.reset);

      return (
        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{this.props.label || "Section unavailable"}</p>
                <p className="text-xs text-white/40">Couldn't load this part. The rest of the profile is fine.</p>
              </div>
            </div>
            <button onClick={this.reset} className="flex items-center gap-1 text-xs font-bold text-white/70 hover:text-white px-2.5 py-1.5 rounded-lg flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
              <RotateCw className="h-3 w-3" /> Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}