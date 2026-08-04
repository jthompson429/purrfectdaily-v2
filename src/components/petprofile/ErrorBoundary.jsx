import { Component } from "react";
import { AlertCircle, RotateCw } from "lucide-react";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Pet profile section failed to render:", error, info);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback(this.reset);

      return (
        <div className="rounded-2xl p-4 bg-card border border-border">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{this.props.label || "Section unavailable"}</p>
                <p className="text-xs text-muted-foreground">Couldn't load this part. The rest of the profile is fine.</p>
              </div>
            </div>
            <button onClick={this.reset} className="flex items-center gap-1 text-xs font-bold text-foreground hover:text-primary px-2.5 py-1.5 rounded-lg flex-shrink-0 bg-muted border border-border">
              <RotateCw className="h-3 w-3" /> Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}