import React, { useState, useEffect } from "react";
import { Users } from "../ui/icons";

export interface Collaborator {
  id: string;
  name: string;
  email?: string;
  color: string;
  avatarUrl?: string;
  status: "active" | "idle";
  activeField?: string;
  lastSeen: number;
}

interface CollaboratorAvatarsProps {
  documentId?: string;
  collectionSlug?: string;
  maxDisplay?: number;
}

const COLLABORATOR_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
];

export function CollaboratorAvatars({
  documentId,
  collectionSlug,
  maxDisplay = 4,
}: CollaboratorAvatarsProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  useEffect(() => {
    if (!documentId) {
      setCollaborators([]);
      return;
    }

    // Set up presence listeners across tabs/windows or WebSockets
    const handlePresence = (event: CustomEvent<Collaborator[]>) => {
      if (Array.isArray(event.detail)) {
        setCollaborators(event.detail);
      }
    };

    window.addEventListener("kyro:presence-update" as any, handlePresence);

    return () => {
      window.removeEventListener("kyro:presence-update" as any, handlePresence);
    };
  }, [documentId, collectionSlug]);

  if (collaborators.length === 0) {
    return null;
  }

  const displayed = collaborators.slice(0, maxDisplay);
  const remaining = collaborators.length - maxDisplay;

  return (
    <div className="flex items-center gap-1.5 bg-[var(--kyro-surface-accent)]/60 px-2 py-1 rounded-full border border-[var(--kyro-border)]/50">
      <Users className="w-3.5 h-3.5 text-[var(--kyro-text-muted)] shrink-0 mr-0.5" />
      <div className="flex items-center -space-x-1.5 overflow-hidden">
        {displayed.map((c) => {
          const initials = c.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "U";

          return (
            <div
              key={c.id}
              className="relative group cursor-pointer"
              title={`${c.name}${c.activeField ? ` (editing ${c.activeField})` : " (viewing)"}`}
            >
              {c.avatarUrl ? (
                <img
                  src={c.avatarUrl}
                  alt={c.name}
                  className="w-5 h-5 rounded-full ring-2 ring-[var(--kyro-surface)] object-cover"
                />
              ) : (
                <div
                  className="w-5 h-5 rounded-full ring-2 ring-[var(--kyro-surface)] flex items-center justify-center text-[8px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: c.color || COLLABORATOR_COLORS[0] }}
                >
                  {initials}
                </div>
              )}
              {c.status === "active" && (
                <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-[var(--kyro-surface)]" />
              )}
            </div>
          );
        })}
      </div>

      {remaining > 0 && (
        <span className="text-[10px] font-bold text-[var(--kyro-text-secondary)] pl-0.5">
          +{remaining}
        </span>
      )}
    </div>
  );
}
