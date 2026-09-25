"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { addEmployeeAction } from "@/lib/actions/employees";
import { formatDate } from "@/lib/utils";
import { FormError, useCloseOnSuccess, useSavedToast, type ActionState } from "../_components/form";

type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  userId: string | null;
};

type Member = {
  id: string;
  userId: string;
  role: string;
  name: string | null;
  email: string;
  createdAt: Date;
};

type Props = {
  storeSlug: string;
  canManage: boolean;
  employees: Employee[];
  members: Member[];
};

const ROLES = ["admin", "manager", "staff", "viewer"] as const;

export function EmployeesClient({ storeSlug, canManage, employees, members }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addEmployeeAction, null);

  useSavedToast(state);
  useCloseOnSuccess(state, () => setOpen(false));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage ? (
          <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add employee
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store staff</CardTitle>
        </CardHeader>
        {employees.length === 0 ? (
          <EmptyState
            title="No staff yet"
            description="Employees granted access to this store appear here. Invites are not emailed yet."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Phone</TH>
                <TH>Role</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {employees.map((employee) => (
                <TR key={employee.id}>
                  <TD className="font-medium text-zinc-900">{employee.name}</TD>
                  <TD className="truncate">{employee.email}</TD>
                  <TD className="text-zinc-500">{employee.phone ?? "—"}</TD>
                  <TD className="capitalize">{employee.role}</TD>
                  <TD>
                    <Badge tone={employee.status === "active" ? "success" : "warning"}>
                      {employee.status}
                      {employee.userId ? "" : " (no account)"}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-zinc-500">
            Every member of your organization automatically sees the admin for this store. Manage access here;
            invitations are not emailed yet.
          </p>
          <Table>
            <THead>
              <TR>
                <TH>Member</TH>
                <TH>Role</TH>
                <TH>Joined</TH>
              </TR>
            </THead>
            <TBody>
              {members.map((member) => (
                <TR key={member.id}>
                  <TD>
                    <span className="font-medium text-zinc-900">{member.name ?? "Unnamed"}</span>
                    <span className="block text-xs text-zinc-500">{member.email}</span>
                  </TD>
                  <TD className="capitalize">{member.role}</TD>
                  <TD className="text-xs text-zinc-500">{formatDate(member.createdAt)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add employee"
        description="Linked accounts get access immediately. Unlinked ones become active when they sign up with this email."
      >
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <FormError state={state} />

          <div>
            <Label className="text-xs">Name</Label>
            <Input name="name" required minLength={2} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input name="email" type="email" required className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Phone (optional)</Label>
            <Input name="phone" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <Select name="role" defaultValue="staff" className="mt-1">
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={pending}>
              {pending ? "Adding…" : "Add employee"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
