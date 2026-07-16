import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, KeyRound, Lock, ShieldAlert, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/features/admin/context";
import { useTranslation } from "@/i18n";
import { ROUTES } from "@/constants/routes";
import { changePassword, deleteAccount } from "../api/authApi";
import { makeChangePasswordSchema } from "../validation/authSchema";

/*
 * AccountSecurity
 * ---------------
 * Profile widget for the account's security operations:
 *   - change password (requires the current one; the server signs every other
 *     device out and re-issues this session's cookie)
 *   - delete account (password-confirmed for local accounts; blocked by the
 *     server while upcoming bookings exist)
 * Google-only accounts have no local password, so the change-password action is
 * hidden and deletion needs no password confirmation.
 */

function ChangePasswordModal({ open, onClose }) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeChangePasswordSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const mutation = useMutation({ mutationFn: changePassword });

  const close = () => {
    if (mutation.isPending) return;
    reset();
    mutation.reset();
    onClose();
  };

  const onSubmit = ({ currentPassword, newPassword }) =>
    mutation.mutateAsync({ currentPassword, newPassword });

  return (
    <Modal open={open} onClose={close} title={t("profile.security.changeTitle")} size="md">
      {mutation.isSuccess ? (
        <div className="space-y-5">
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-body-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 size-4.5 shrink-0" />
            {t("profile.security.changed")}
          </div>
          <div className="flex justify-end">
            <Button onClick={close}>{t("common.close")}</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <Input
            label={t("profile.security.currentPassword")}
            type="password"
            leftIcon={Lock}
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
          <Input
            label={t("profile.security.newPassword")}
            type="password"
            leftIcon={KeyRound}
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <Input
            label={t("profile.security.confirmPassword")}
            type="password"
            leftIcon={KeyRound}
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          {mutation.isError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-body-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
              {mutation.error?.message || t("auth.errors.generic")}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={close} disabled={mutation.isPending}>
              {t("admin.form.cancel")}
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {t("profile.security.changePassword")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function DeleteAccountModal({ open, onClose, needsPassword }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => deleteAccount(needsPassword ? password : undefined),
    onSuccess: async () => {
      // The server already destroyed the account and cleared the cookie;
      // logout() tolerates the dead session and resets local auth state.
      await logout();
      navigate(ROUTES.home, { replace: true });
    },
  });

  const close = () => {
    if (mutation.isPending) return;
    setPassword("");
    mutation.reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={t("profile.security.deleteTitle")}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={mutation.isPending}>
            {t("admin.form.cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={needsPassword && !password}
            className="bg-red-600 hover:bg-red-700"
          >
            {t("profile.security.deleteConfirm")}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-body-sm text-red-700">
          <ShieldAlert className="mt-0.5 size-4.5 shrink-0" />
          {t("profile.security.deleteWarning")}
        </div>

        {needsPassword && (
          <Input
            label={t("profile.security.deletePassword")}
            type="password"
            leftIcon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}

        {mutation.isError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-body-sm text-red-700">
            <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
            {mutation.error?.message || t("auth.errors.generic")}
          </div>
        )}
      </div>
    </Modal>
  );
}

export function AccountSecurity() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [changing, setChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Google-only accounts carry no local password.
  const hasPassword = user?.provider !== "google";

  return (
    <Card className="p-6">
      <h2 className="text-heading-sm text-ink-900">{t("profile.security.title")}</h2>

      <div className="mt-5 space-y-3">
        {hasPassword && (
          <Button
            variant="outline"
            size="sm"
            fullWidth
            leftIcon={KeyRound}
            onClick={() => setChanging(true)}
          >
            {t("profile.security.changePassword")}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          leftIcon={Trash2}
          onClick={() => setDeleting(true)}
          className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300"
        >
          {t("profile.security.deleteAccount")}
        </Button>
      </div>

      <ChangePasswordModal open={changing} onClose={() => setChanging(false)} />
      <DeleteAccountModal
        open={deleting}
        onClose={() => setDeleting(false)}
        needsPassword={hasPassword}
      />
    </Card>
  );
}

export default AccountSecurity;
