import { useState } from "react";
import { Users, Plus, Pencil, Trash2, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  PageHeader,
  DataTable,
  ResourceModal,
  ConfirmDialog,
  useCollection,
} from "@/features/admin";

/*
 * Users management
 * ----------------
 * Manage customer and admin accounts: edit details, change roles, toggle
 * verification and remove accounts.
 */

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
];

const FIELDS = [
  { name: "fullname", label: "Full name", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "phone", label: "Phone" },
  { name: "role", label: "Role", type: "select", options: ROLE_OPTIONS, required: true },
  { name: "isVerified", label: "Email verified", type: "switch" },
];

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function UsersPage() {
  const { items, create, update, remove } = useCollection("users");
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);

  const handleSubmit = (values) => {
    if (editing) update(editing._id, values);
    else create(values);
    setEditing(undefined);
  };

  const columns = [
    {
      key: "fullname",
      header: "User",
      render: (u) => (
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink-100 text-caption font-bold text-ink-600">
            {(u.fullname || "?").slice(0, 2).toUpperCase()}
          </span>
          <div>
            <p className="font-semibold text-ink-900">{u.fullname}</p>
            <p className="text-caption text-ink-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: "phone", header: "Phone", render: (u) => u.phone || "—" },
    {
      key: "role",
      header: "Role",
      render: (u) => (
        <Badge variant={u.role === "admin" ? "dark" : "neutral"} size="sm">
          {u.role}
        </Badge>
      ),
    },
    {
      key: "isVerified",
      header: "Verified",
      align: "center",
      render: (u) =>
        u.isVerified ? (
          <BadgeCheck className="mx-auto size-5 text-brand-600" />
        ) : (
          <span className="text-ink-300">—</span>
        ),
    },
    { key: "createdAt", header: "Joined", render: (u) => fmtDate(u.createdAt) },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Users}
        title="Users"
        description="Manage accounts, roles and verification status."
        actions={
          <Button size="sm" leftIcon={Plus} onClick={() => setEditing(null)}>
            Add user
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={items}
        searchKeys={["fullname", "email", "phone"]}
        searchPlaceholder="Search users…"
        emptyTitle="No users"
        emptyDescription="Add a user account to manage it here."
        actions={(u) => (
          <>
            <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing(u)}>
              <Pencil className="size-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete"
              className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300"
              onClick={() => setDeleting(u)}
            >
              <Trash2 className="size-4.5" />
            </Button>
          </>
        )}
      />

      <ResourceModal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        onSubmit={handleSubmit}
        title={editing ? "Edit user" : "Add user"}
        fields={FIELDS}
        initialValues={editing || { role: "user", isVerified: false }}
        submitLabel={editing ? "Save changes" : "Create user"}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          remove(deleting._id);
          setDeleting(null);
        }}
        title="Delete user"
        description={`Delete "${deleting?.fullname}"? This can't be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
