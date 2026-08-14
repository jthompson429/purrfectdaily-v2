import { ExternalLink, LifeBuoy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const HOW_TO_URL = "https://purrtaskdaily-how-to-kpyh.vercel.app";
const SUPPORT_EMAIL = "no-reply@purrtaskdaily.com";

export default function HowTo() {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="border-b border-border bg-card px-4 py-4">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-black font-heading">How To</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Guides for pets, neonatal care, medications, workspaces, and daily tasks.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={`mailto:${SUPPORT_EMAIL}?subject=PurrTaskDaily%20question`}>
                <Mail className="mr-1.5 h-4 w-4" /> Ask a question
              </a>
            </Button>
            <Button asChild size="sm">
              <a href={HOW_TO_URL} target="_blank" rel="noreferrer">
                Open in browser <ExternalLink className="ml-1.5 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-3 sm:p-4">
        <div className="min-h-[65vh] flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <iframe
            src={HOW_TO_URL}
            title="PurrTaskDaily how-to guide"
            className="h-full min-h-[65vh] w-full"
            loading="lazy"
          />
        </div>
        <p className="px-2 pt-2 text-center text-xs text-muted-foreground">
          If the guide does not appear here, use “Open in browser.” Some website security settings prevent embedded pages.
        </p>
      </div>
    </div>
  );
}
