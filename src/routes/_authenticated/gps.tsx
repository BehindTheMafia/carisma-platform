import { createFileRoute } from "@tanstack/react-router";
import { MapPin } from "lucide-react";

function Page() {
  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-80 min-w-0 flex-col">
      <div className="mb-4 flex items-center gap-2">
        <MapPin className="size-5 text-gold" />
        <h1 className="text-xl font-semibold tracking-tight">GPS</h1>
      </div>
      <div className="flex-1 overflow-hidden rounded-lg border bg-muted/30">
        <iframe
          src="https://gps.autonica.com/mobile/index.php"
          className="h-full w-full"
          title="GPS Autonica"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/gps")({
  head: () => ({ meta: [{ title: "GPS — TM RENT A CAR" }] }),
  component: Page,
});
