import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/*
 * ConfirmDialog
 * -------------
 * A focused yes/no confirmation built on the design-system Modal. Used to guard
 * every destructive admin action (delete). `danger` styles the confirm button
 * red so irreversible actions read clearly.
 */

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className={
              danger ? "bg-red-600 text-white hover:bg-red-700" : undefined
            }
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-body-sm text-ink-600">
        {description || "This action cannot be undone."}
      </p>
    </Modal>
  );
}

export default ConfirmDialog;
