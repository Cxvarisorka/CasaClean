import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/i18n";

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
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger = false,
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || t("admin.confirm.title")}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {cancelLabel || t("admin.confirm.cancel")}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className={
              danger ? "bg-red-600 text-white hover:bg-red-700" : undefined
            }
          >
            {confirmLabel || t("admin.confirm.confirm")}
          </Button>
        </>
      }
    >
      <p className="text-body-sm text-ink-600">
        {description || t("admin.confirm.body")}
      </p>
    </Modal>
  );
}

export default ConfirmDialog;
