import { useAutoFormStore } from "./autoform-store";
import { navigate } from "./navigate";
import { toast, useUIStore } from "./stores";

export function confirmEditorSwitch(
  href: string,
  editor: string,
  { editingDocument = false, saving = false } = {},
) {
  const canLeave = () => {
    if (!editingDocument) return true;

    const { hasUnsavedChanges, autoSaveStatus } = useAutoFormStore.getState();
    if (saving || autoSaveStatus === "saving" || autoSaveStatus === "retrying") {
      toast.warning("Wait for the draft to finish saving before switching editors.");
      return false;
    }
    if (hasUnsavedChanges || autoSaveStatus === "conflict") {
      toast.warning("Save your draft or undo your unsaved changes before switching editors.");
      return false;
    }
    return true;
  };

  if (!canLeave()) return;

  useUIStore.getState().confirm({
    title: `Continue to ${editor}?`,
    message:
      "Both editors work with the same draft. Moving, removing, or nesting layout blocks can change how the page looks across screen sizes. Preview the layout in Studio before publishing.",
    confirmLabel: `Open ${editor}`,
    onConfirm: () => {
      if (canLeave()) navigate(href);
    },
  });
}
