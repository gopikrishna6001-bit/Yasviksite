import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, ShieldCheck, UserCheck, UserX, X } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { appClient } from '@/api/appClient';
import { useAuth } from '@/lib/AuthContext';
import { ADMIN_ROLES, roleLabel } from '@/lib/adminAccess';
import { requiresGoogleDailyAuth } from '@/lib/adminAuthPolicy';

const EMPTY_FORM = {
  display_name: '',
  email: '',
  role: 'cashier',
  password: '',
};

function generateTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
  const bytes = new Uint32Array(14);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
}

async function invoke(name, payload = {}) {
  const { data } = await appClient.functions.invoke(name, payload);
  return data;
}

export default function AdminStaff() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [notice, setNotice] = useState('');
  const googleOnlyRole = requiresGoogleDailyAuth(form.role);

  const staffQuery = useQuery({
    queryKey: ['admin-staff'],
    queryFn: () => invoke('listStaff').then((data) => data.staff || []),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => invoke('createStaff', payload),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-staff'] });
      const name = variables.display_name || variables.email;
      if (requiresGoogleDailyAuth(variables.role)) {
        setNotice(
          `${name} now has the ${roleLabel(variables.role)} role. They must sign in with Google each day (password login is blocked).`
        );
      } else {
        setNotice(
          data?.promoted
            ? `${name} already had a Yasvik account. It now has the ${roleLabel(variables.role)} role and the password you set here.`
            : `${name} can now sign in with the temporary password.`
        );
      }
      setForm(EMPTY_FORM);
      setDrawerOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => invoke('updateStaff', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-staff'] }),
  });

  const activeCount = useMemo(
    () => (staffQuery.data || []).filter((member) => member.is_active !== false).length,
    [staffQuery.data],
  );

  const openCreate = () => {
    setNotice('');
    setForm({ ...EMPTY_FORM, password: generateTemporaryPassword() });
    setDrawerOpen(true);
  };

  const createStaff = (event) => {
    event.preventDefault();
    setNotice('');
    const payload = { ...form };
    if (requiresGoogleDailyAuth(payload.role)) {
      delete payload.password;
    }
    createMutation.mutate(payload);
  };

  const changeRole = (member, role) => {
    setNotice('');
    updateMutation.mutate({ id: member.id, role });
  };

  const toggleActive = (member) => {
    setNotice('');
    updateMutation.mutate({ id: member.id, is_active: member.is_active === false });
  };

  return (
    <div className="min-h-full bg-rain-mist p-5 md:p-8">
      <div className="mx-auto max-w-5xl">
        <AdminPageHeader
          title="Staff & Access"
          description="Administrators and managers use Google each day. Cashiers use email and password."
          action={(
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-rain-cloud px-4 py-2.5 font-inter text-xs font-semibold text-white hover:bg-wet-earth"
            >
              <Plus className="h-4 w-4" />
              Add staff
            </button>
          )}
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {[
            ['Administrator', 'Google sign-in every day. Full access, settings, and staff management'],
            ['Manager', 'Google sign-in every day. Everything except Settings and Staff & Access'],
            ['Cashier', 'Email/password. Counter POS, Orders, and Inventory only'],
          ].map(([title, description]) => (
            <div key={title} className="rounded-2xl border border-border/60 bg-white p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-neon-paddy" />
                <p className="font-inter text-sm font-semibold text-rain-cloud">{title}</p>
              </div>
              <p className="mt-1.5 font-inter text-xs leading-5 text-rain-cloud/50">{description}</p>
            </div>
          ))}
        </div>

        {notice ? (
          <div className="mb-4 rounded-xl border border-neon-paddy/30 bg-neon-paddy/10 px-4 py-3 font-inter text-xs text-deep-forest">
            {notice}
          </div>
        ) : null}

        {(staffQuery.error || createMutation.error || updateMutation.error) ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-inter text-xs text-red-700">
            {(staffQuery.error || createMutation.error || updateMutation.error)?.message}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-white">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div>
              <h2 className="font-cormorant text-xl font-semibold text-rain-cloud">Team members</h2>
              <p className="font-inter text-xs text-rain-cloud/45">{activeCount} active</p>
            </div>
          </div>

          {staffQuery.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-rain-cloud/45" />
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {(staffQuery.data || []).map((member) => {
                const isSelf = member.id === user?.id;
                const isBusy = updateMutation.isPending && updateMutation.variables?.id === member.id;
                return (
                  <div key={member.id} className={`grid gap-4 px-5 py-4 md:grid-cols-[1fr_170px_130px] md:items-center ${member.is_active === false ? 'bg-rain-mist/60 opacity-65' : ''}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-inter text-sm font-semibold text-rain-cloud">
                          {member.display_name || member.email}
                        </p>
                        {isSelf ? (
                          <span className="rounded-full bg-neon-paddy/12 px-2 py-0.5 font-inter text-[9px] font-bold uppercase tracking-wider text-deep-forest">
                            You
                          </span>
                        ) : null}
                        {requiresGoogleDailyAuth(member.role) ? (
                          <span className="rounded-full bg-rain-cloud/8 px-2 py-0.5 font-inter text-[9px] font-bold uppercase tracking-wider text-rain-cloud/70">
                            Google daily
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate font-inter text-xs text-rain-cloud/45">{member.email}</p>
                    </div>

                    <label className="block">
                      <span className="sr-only">Role for {member.display_name || member.email}</span>
                      <select
                        value={member.role}
                        onChange={(event) => changeRole(member, event.target.value)}
                        disabled={isSelf || isBusy}
                        className="w-full rounded-xl border border-border bg-white px-3 py-2 font-inter text-xs text-rain-cloud outline-none focus:border-neon-paddy disabled:cursor-not-allowed disabled:bg-rain-mist"
                      >
                        {ADMIN_ROLES.map((role) => (
                          <option key={role} value={role}>{roleLabel(role)}</option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={() => toggleActive(member)}
                      disabled={isSelf || isBusy}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 font-inter text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                        member.is_active === false
                          ? 'border-neon-paddy/40 text-deep-forest'
                          : 'border-red-200 text-red-700 hover:bg-red-50'
                      }`}
                    >
                      {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : member.is_active === false ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                      {member.is_active === false ? 'Reactivate' : 'Deactivate'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-[80] flex justify-end bg-rain-cloud/45 backdrop-blur-sm">
          <button type="button" className="flex-1" onClick={() => setDrawerOpen(false)} aria-label="Close" />
          <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
            <div className="mb-7 flex items-start justify-between">
              <div>
                <h2 className="font-cormorant text-2xl font-semibold text-rain-cloud">Add staff member</h2>
                <p className="mt-1 font-inter text-xs text-rain-cloud/45">
                  {googleOnlyRole
                    ? 'They must Continue with Google on Admin Login once before you can grant this role.'
                    : 'Create their individual Yasvik cashier login.'}
                </p>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 text-rain-cloud/45 hover:bg-rain-mist">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={createStaff} className="space-y-5">
              <label className="block">
                <span className="mb-1.5 block font-inter text-xs font-semibold text-rain-cloud">Name</span>
                <input
                  value={form.display_name}
                  onChange={(event) => setForm((current) => ({ ...current, display_name: event.target.value }))}
                  className="w-full rounded-xl border border-border px-3.5 py-3 font-inter text-sm outline-none focus:border-neon-paddy"
                  placeholder="Staff member name"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-inter text-xs font-semibold text-rain-cloud">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-xl border border-border px-3.5 py-3 font-inter text-sm outline-none focus:border-neon-paddy"
                  placeholder="name@example.com"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-inter text-xs font-semibold text-rain-cloud">Role</span>
                <select
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                  className="w-full rounded-xl border border-border bg-white px-3.5 py-3 font-inter text-sm outline-none focus:border-neon-paddy"
                >
                  {ADMIN_ROLES.map((role) => (
                    <option key={role} value={role}>{roleLabel(role)}</option>
                  ))}
                </select>
              </label>
              {googleOnlyRole ? (
                <div className="rounded-xl border border-border/70 bg-rain-mist/70 px-3.5 py-3 font-inter text-xs leading-5 text-rain-cloud/70">
                  No password is created for administrators or managers. They sign in with Google every day.
                </div>
              ) : (
                <label className="block">
                  <span className="mb-1.5 block font-inter text-xs font-semibold text-rain-cloud">Temporary password</span>
                  <div className="flex gap-2">
                    <input
                      value={form.password}
                      onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                      className="min-w-0 flex-1 rounded-xl border border-border px-3.5 py-3 font-mono text-sm outline-none focus:border-neon-paddy"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, password: generateTemporaryPassword() }))}
                      className="rounded-xl border border-border px-3 font-inter text-xs font-semibold text-rain-cloud"
                    >
                      Generate
                    </button>
                  </div>
                  <p className="mt-1.5 font-inter text-[11px] leading-4 text-rain-cloud/45">
                    Copy this password before creating the account and share it privately.
                  </p>
                </label>
              )}

              <button
                type="submit"
                disabled={createMutation.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rain-cloud px-4 py-3 font-inter text-sm font-semibold text-white disabled:opacity-50"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {googleOnlyRole ? 'Grant Google access role' : 'Create staff login'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
