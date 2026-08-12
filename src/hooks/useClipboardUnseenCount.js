import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/workspaceContext";

export function useClipboardUnseenCount() {
  const { activeWorkspaceId } = useWorkspace();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["clipboardEntries", activeWorkspaceId],
    queryFn: () => base44.entities.ClipboardEntry.filter(
      { workspace_id: activeWorkspaceId },
      "-occurred_at",
      250
    ),
    enabled: Boolean(activeWorkspaceId),
  });

  const { data: acknowledgements = [] } = useQuery({
    queryKey: ["clipboardAcknowledgements", activeWorkspaceId],
    queryFn: () => base44.entities.ClipboardAcknowledgement.filter(
      { workspace_id: activeWorkspaceId },
      "seen_at",
      500
    ),
    enabled: Boolean(activeWorkspaceId),
  });

  return useMemo(() => {
    if (!user?.id) return 0;

    const acknowledgedEntryIds = new Set(
      acknowledgements
        .filter((acknowledgement) => acknowledgement.user_id === user.id)
        .map((acknowledgement) => acknowledgement.entry_id)
    );

    return entries.filter(
      (entry) => entry.status === "open" && !acknowledgedEntryIds.has(entry.id)
    ).length;
  }, [acknowledgements, entries, user?.id]);
}
