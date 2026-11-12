import { useState, useMemo, useDeferredValue, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { adminTabs, useAdminData, type AdminTab } from '@/hooks/useAdminData';
import { useClientPagination } from '@/hooks/useClientPagination';
import { CustomerPagination } from '@/components/CustomerPagination';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { StaffDashboardLayout } from '@/components/dashboard/StaffDashboardLayout';
import { PendingTransactions } from '@/components/dashboard/PendingTransactions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, UserCog, Trash2, Building2, Ticket, Globe, Copy, FileText, Search, ArrowLeftRight, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MFASetupDialog } from '@/components/admin/MFASetupDialog';
import { CreateGroupDialog } from '@/components/admin/CreateGroupDialog';
import { CreatePromocodeDialog } from '@/components/admin/CreatePromocodeDialog';
import { CreateIPWhitelistDialog } from '@/components/admin/CreateIPWhitelistDialog';
import { EditIPWhitelistDialog } from '@/components/admin/EditIPWhitelistDialog';
import { IPWhitelistToggle } from '@/components/admin/IPWhitelistToggle';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { BulkCreateUsersDialog } from '@/components/admin/BulkCreateUsersDialog';
import ConfiscateStaffDialog from '@/components/admin/ConfiscateStaffDialog';
import { CreateClientDialog } from '@/components/admin/CreateClientDialog';
import { EditStaffNameDialog } from '@/components/admin/EditStaffNameDialog';
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog';
import { AgentClientsDialog } from '@/components/admin/AgentClientsDialog';

const errorMessage = (error: unknown) => error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error);

function AdminDataPanel({ value, active, loading, error, onRetry, children }: {
  value: string;
  active: boolean;
  loading: boolean;
  error: Error | null;
  onRetry: () => Promise<void>;
  children: () => ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <TabsContent value={value} aria-busy={loading}>
      {!active ? null : loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground" role="status">
          <Loader2 className="h-5 w-5 animate-spin" />{t('common.loading')}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-border p-6 text-center" role="alert">
          <p className="mb-3 text-muted-foreground">{t('common.error')}: {error.message}</p>
          <Button variant="outline" onClick={onRetry}>{t('common.retry')}</Button>
        </div>
      ) : children()}
    </TabsContent>
  );
}

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab: AdminTab = adminTabs.includes(requestedTab as AdminTab) ? requestedTab as AdminTab : 'customers';
  const { users, userRoles, groups, promocodes, ipWhitelist, ipLogs, loading: loadingData, error: dataError, refresh: fetchData } = useAdminData(user?.id, isAdmin, activeTab);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const deferredCustomerSearch = useDeferredValue(customerSearch);

  const roleByUserId = useMemo(() => new Map(userRoles.map((role) => [role.user_id, role.role])), [userRoles]);
  const groupNameById = useMemo(() => new Map(groups.map((group) => [group.id, group.name])), [groups]);
  const userById = useMemo(() => new Map(users.map((profile) => [profile.id, profile])), [users]);
  const agentCountByGroupId = useMemo(() => {
    const counts = new Map<string, number>();
    users.forEach((profile) => {
      if (profile.group_id && roleByUserId.get(profile.id) === 'agent') {
        counts.set(profile.group_id, (counts.get(profile.group_id) || 0) + 1);
      }
    });
    return counts;
  }, [users, roleByUserId]);

  const clientCountByAgentId = useMemo(() => {
    const counts = new Map<string, number>();
    users.forEach(profile => {
      if (profile.assigned_to) counts.set(profile.assigned_to, (counts.get(profile.assigned_to) || 0) + 1);
    });
    return counts;
  }, [users]);

  const getUserRole = (userId: string): string => roleByUserId.get(userId) || 'user';

  const getGroupName = (groupId: string | null): string => {
    if (!groupId) return '-';
    return groupNameById.get(groupId) || '-';
  };

  const getCreatorName = (creatorId: string | null): string => {
    if (!creatorId) return '-';
    const creator = userById.get(creatorId);
    return creator ? `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || creator.email || '-' : '-';
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRole(userId);
    try {
      const existingRole = userRoles.find(r => r.user_id === userId);
      
      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole as Database['public']['Enums']['app_role'] })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole as Database['public']['Enums']['app_role'] });
        if (error) throw error;
      }

      toast({ title: t('admin.roleUpdated'), description: `User role has been updated to ${newRole}.` });
      fetchData();
    } catch (error: unknown) {
      toast({ title: t('common.error'), description: errorMessage(error), variant: "destructive" });
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRemoveRole = async (userId: string) => {
    try {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (error) throw error;
      toast({ title: t('admin.roleRemoved') });
      fetchData();
    } catch (error: unknown) {
      toast({ title: t('common.error'), description: errorMessage(error), variant: "destructive" });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase.from('groups').delete().eq('id', groupId);
      if (error) throw error;
      toast({ title: t('admin.groupDeleted') });
      fetchData();
    } catch (error: unknown) {
      toast({ title: t('common.error'), description: errorMessage(error), variant: "destructive" });
    }
  };

  const handleTogglePromocode = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase.from('promocodes').update({ is_active: !isActive }).eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error: unknown) {
      toast({ title: t('common.error'), description: errorMessage(error), variant: "destructive" });
    }
  };

  const handleDeletePromocode = async (id: string) => {
    try {
      const { error } = await supabase.from('promocodes').delete().eq('id', id);
      if (error) throw error;
      toast({ title: t('admin.promocodeDeleted') });
      fetchData();
    } catch (error: unknown) {
      toast({ title: t('common.error'), description: errorMessage(error), variant: "destructive" });
    }
  };

  const handleDeleteIPRule = async (id: string) => {
    try {
      const { error } = await supabase.from('ip_whitelist').delete().eq('id', id);
      if (error) throw error;
      toast({ title: t('admin.ipRuleDeleted') });
      fetchData();
    } catch (error: unknown) {
      toast({ title: t('common.error'), description: errorMessage(error), variant: "destructive" });
    }
  };

  const handleToggleSupervisorSuper = async (userId: string, isSuper: boolean) => {
    try {
      const { error } = await supabase.from('profiles').update({ is_super: !isSuper }).eq('id', userId);
      if (error) throw error;
      fetchData();
    } catch (error: unknown) {
      toast({ title: t('common.error'), description: errorMessage(error), variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t('common.copied'), description: `${text} ${t('common.copiedToClipboard')}` });
  };

  const visibleCustomers = useMemo(() => {
    const term = deferredCustomerSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (roleByUserId.get(u.id) && roleByUserId.get(u.id) !== 'user') return false;
      return !term || u.first_name?.toLowerCase().includes(term) || u.last_name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) || `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(term);
    });
  }, [users, roleByUserId, deferredCustomerSearch]);
  const customersPagination = useClientPagination(visibleCustomers, deferredCustomerSearch, 25);
  const visibleAgents = useMemo(() => users.filter((u) => roleByUserId.get(u.id) === 'agent'), [users, roleByUserId]);
  const visibleSupervisors = useMemo(() => users.filter((u) => roleByUserId.get(u.id) === 'supervisor'), [users, roleByUserId]);
  const visibleAdmins = useMemo(() => users.filter((u) => roleByUserId.get(u.id) === 'admin'), [users, roleByUserId]);
  const agentsPagination = useClientPagination(visibleAgents, '', 25);
  const supervisorsPagination = useClientPagination(visibleSupervisors, '', 25);
  const adminsPagination = useClientPagination(visibleAdmins, '', 25);
  const groupsPagination = useClientPagination(groups, '', 25);
  const promocodesPagination = useClientPagination(promocodes, '', 25);
  const whitelistPagination = useClientPagination(ipWhitelist, '', 25);
  const logsPagination = useClientPagination(ipLogs, '', 25);
  const getAgentCount = (groupId: string) => agentCountByGroupId.get(groupId) || 0;

  if (!isAdmin) return null;

  const roleColors: Record<string, string> = {
    admin: 'bg-red-500/20 text-red-400 border-red-500/30',
    supervisor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    agent: 'bg-white/10 text-neutral-300 border-white/20',
    user: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    invalid_language: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    suspended: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  return (
    <StaffDashboardLayout
      role="admin"
      title={t('admin.title')}
      subtitle={t('admin.subtitle')}
      onRefresh={fetchData}
      headerActions={<div className="flex min-w-0 max-w-full flex-wrap gap-2 [&>button]:h-auto [&>button]:min-h-10 [&>button]:max-w-full [&>button]:whitespace-normal [&>button>svg]:shrink-0"><ConfiscateStaffDialog /><MFASetupDialog /></div>}
    >
      <Tabs value={activeTab} onValueChange={(value) => setSearchParams(params => {
        params.set('tab', value);
        return params;
      }, { preventScrollReset: true })} className="w-full min-w-0">
        <div className="mb-6 max-w-full overflow-x-auto rounded-lg border border-border bg-card">
          <TabsList aria-label={t('admin.title')} className="w-full min-w-max justify-start bg-transparent rounded-none p-1 h-auto gap-1">
            <TabsTrigger value="customers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2" /> {t('admin.customers')}
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ArrowLeftRight className="w-4 h-4 mr-2" /> {t('nav.transactions')}
            </TabsTrigger>
            <TabsTrigger value="agents" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2" /> {t('admin.agents')}
            </TabsTrigger>
            <TabsTrigger value="supervisors" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <UserCog className="w-4 h-4 mr-2" /> {t('admin.supervisors')}
            </TabsTrigger>
            <TabsTrigger value="admins" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="w-4 h-4 mr-2" /> {t('admin.admins')}
            </TabsTrigger>
            <TabsTrigger value="groups" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Building2 className="w-4 h-4 mr-2" /> {t('admin.groups')}
            </TabsTrigger>
            <TabsTrigger value="promocodes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Ticket className="w-4 h-4 mr-2" /> {t('admin.promocodes')}
            </TabsTrigger>
            <TabsTrigger value="ip-whitelist" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Globe className="w-4 h-4 mr-2" /> {t('admin.ipWhitelist')}
            </TabsTrigger>
            <TabsTrigger value="ip-audit" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="w-4 h-4 mr-2" /> {t('admin.ipAuditLogs')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="transactions">
          <PendingTransactions className="bg-card border-border" />
        </TabsContent>

        {/* Customers Tab */}
        <AdminDataPanel value="customers" active={activeTab === 'customers'} loading={loadingData} error={dataError} onRetry={fetchData}>
          {() => <Card className="bg-card border-border">
            <CardHeader className="border-b border-border flex-row items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-foreground flex items-center gap-2">
                {t('admin.customers')} <Badge variant="secondary">{visibleCustomers.length}</Badge>
              </CardTitle>
              <div className="flex w-full flex-wrap gap-2 items-center sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    aria-label={t('common.search')}
                    placeholder={t('common.search') || 'Search clients...'}
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                    }}
                    className="pl-9 h-9"
                  />
                </div>
                <CreateClientDialog groups={groups} onSuccess={fetchData} />
                <BulkCreateUsersDialog groups={groups} onSuccess={fetchData} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>{t('admin.fullName')}</TableHead>
                    <TableHead>{t('common.email')}</TableHead>
                    <TableHead>{t('admin.createdBy')}</TableHead>
                    <TableHead>{t('admin.group')}</TableHead>
                    <TableHead>{t('admin.lastLogin')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customersPagination.items.map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="font-medium">{u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email || 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">{getCreatorName(u.created_by)}</TableCell>
                      <TableCell>{getGroupName(u.group_id)}</TableCell>
                      <TableCell className="text-muted-foreground">{u.last_login ? new Date(u.last_login).toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/customer/${u.id}`)}>{t('common.view')}</Button>
                          <Select disabled={updatingRole === u.id} value={getUserRole(u.id)} onValueChange={(v) => handleRoleChange(u.id, v)}>
                            <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="agent">Agent</SelectItem>
                              <SelectItem value="supervisor">Supervisor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <DeleteUserDialog
                            userId={u.id}
                            userName={u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : u.email || 'User'}
                            onSuccess={fetchData}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visibleCustomers.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('admin.noCustomers')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CustomerPagination {...customersPagination} />
          </Card>}
        </AdminDataPanel>

        {/* Agents Tab */}
        <AdminDataPanel value="agents" active={activeTab === 'agents'} loading={loadingData} error={dataError} onRetry={fetchData}>
          {() => <Card className="bg-card border-border">
            <CardHeader className="border-b border-border flex-row flex-wrap gap-3 items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                {t('admin.agents')} <Badge variant="secondary">{visibleAgents.length}</Badge>
              </CardTitle>
              <div className="flex gap-2">
                <BulkCreateUsersDialog groups={groups} onSuccess={fetchData} />
                <CreateUserDialog groups={groups} roleType="agent" onSuccess={fetchData} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>{t('admin.fullName')}</TableHead>
                    <TableHead>{t('admin.username')}</TableHead>
                    <TableHead>{t('admin.phone')}</TableHead>
                    <TableHead>{t('admin.birthdate')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('admin.group')}</TableHead>
                    <TableHead>{t('admin.assignedClients')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentsPagination.items.map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="font-medium">{u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">{u.username || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{u.phone || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{u.birthdate || '-'}</TableCell>
                      <TableCell><Badge className={`${statusColors[u.status || 'active']} border`}>{(u.status || 'active').toUpperCase()}</Badge></TableCell>
                      <TableCell>{getGroupName(u.group_id)}</TableCell>
                      <TableCell>
                        <AgentClientsDialog
                          agentId={u.id}
                          agentName={`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Agent'}
                          count={clientCountByAgentId.get(u.id) || 0}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <EditStaffNameDialog
                            userId={u.id}
                            currentFirstName={u.first_name}
                            currentLastName={u.last_name}
                            currentUsername={u.username}
                            onSuccess={fetchData}
                          />
                          <Button size="sm" variant="destructive" onClick={() => handleRemoveRole(u.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visibleAgents.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('admin.noAgents')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CustomerPagination {...agentsPagination} />
          </Card>}
        </AdminDataPanel>

        {/* Supervisors Tab */}
        <AdminDataPanel value="supervisors" active={activeTab === 'supervisors'} loading={loadingData} error={dataError} onRetry={fetchData}>
          {() => <Card className="bg-card border-border">
            <CardHeader className="border-b border-border flex-row flex-wrap gap-3 items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                {t('admin.supervisors')} <Badge variant="secondary">{visibleSupervisors.length}</Badge>
              </CardTitle>
              <div className="flex gap-2">
                <BulkCreateUsersDialog groups={groups} onSuccess={fetchData} />
                <CreateUserDialog groups={groups} roleType="supervisor" onSuccess={fetchData} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>{t('admin.fullName')}</TableHead>
                    <TableHead>{t('admin.username')}</TableHead>
                    <TableHead>{t('admin.phone')}</TableHead>
                    <TableHead>{t('admin.birthdate')}</TableHead>
                    <TableHead>{t('admin.created')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('admin.isSuper')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supervisorsPagination.items.map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="font-medium">{u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">{u.username || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{u.phone || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{u.birthdate || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</TableCell>
                      <TableCell><Badge className={`${statusColors[u.status || 'active']} border`}>{(u.status || 'active').toUpperCase()}</Badge></TableCell>
                      <TableCell>
                        <Checkbox checked={u.is_super || false} onCheckedChange={() => handleToggleSupervisorSuper(u.id, u.is_super || false)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <EditStaffNameDialog
                            userId={u.id}
                            currentFirstName={u.first_name}
                            currentLastName={u.last_name}
                            currentUsername={u.username}
                            onSuccess={fetchData}
                          />
                          <Button size="sm" variant="destructive" onClick={() => handleRemoveRole(u.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visibleSupervisors.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('admin.noSupervisors')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CustomerPagination {...supervisorsPagination} />
          </Card>}
        </AdminDataPanel>

        {/* Admins Tab */}
        <AdminDataPanel value="admins" active={activeTab === 'admins'} loading={loadingData} error={dataError} onRetry={fetchData}>
          {() => <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-foreground flex items-center gap-2">
                {t('admin.admins')} <Badge variant="secondary">{visibleAdmins.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>{t('admin.fullName')}</TableHead>
                    <TableHead>{t('common.email')}</TableHead>
                    <TableHead>{t('admin.created')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminsPagination.items.map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="font-medium">{u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email || 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="destructive" onClick={() => handleRemoveRole(u.id)} disabled={u.id === user?.id}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visibleAdmins.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t('admin.noAdmins')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CustomerPagination {...adminsPagination} />
          </Card>}
        </AdminDataPanel>

        {/* Groups Tab */}
        <AdminDataPanel value="groups" active={activeTab === 'groups'} loading={loadingData} error={dataError} onRetry={fetchData}>
          {() => <Card className="bg-card border-border">
            <CardHeader className="border-b border-border flex-row flex-wrap gap-3 items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                {t('admin.groups')} <Badge variant="secondary">{groups.length}</Badge>
              </CardTitle>
              <CreateGroupDialog onSuccess={fetchData} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>{t('customerDetail.name')}</TableHead>
                    <TableHead>{t('admin.description')}</TableHead>
                    <TableHead>{t('admin.agentsCount')}</TableHead>
                    <TableHead>{t('common.update')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupsPagination.items.map((g) => (
                    <TableRow key={g.id} className="border-border">
                      <TableCell className="font-medium">{g.name}</TableCell>
                      <TableCell className="text-muted-foreground">{g.description || '-'}</TableCell>
                      <TableCell><Badge variant="secondary">{getAgentCount(g.id)}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{g.updated_at ? new Date(g.updated_at).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteGroup(g.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {groups.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('admin.noGroups')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CustomerPagination {...groupsPagination} />
          </Card>}
        </AdminDataPanel>

        {/* Promocodes Tab */}
        <AdminDataPanel value="promocodes" active={activeTab === 'promocodes'} loading={loadingData} error={dataError} onRetry={fetchData}>
          {() => <Card className="bg-card border-border">
            <CardHeader className="border-b border-border flex-row flex-wrap gap-3 items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                {t('admin.promocodes')} <Badge variant="secondary">{promocodes.length}</Badge>
              </CardTitle>
              <CreatePromocodeDialog groups={groups} onSuccess={fetchData} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>{t('admin.code')}</TableHead>
                    <TableHead>{t('admin.group')}</TableHead>
                    <TableHead>{t('admin.roleType')}</TableHead>
                    <TableHead>{t('admin.timesUsed')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead>{t('admin.expiresAt')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promocodesPagination.items.map((p) => (
                    <TableRow key={p.id} className="border-border">
                      <TableCell className="font-mono font-medium flex items-center gap-2">
                        {p.code}
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(p.code)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </TableCell>
                      <TableCell>{getGroupName(p.group_id)}</TableCell>
                      <TableCell><Badge className={`${roleColors[p.role_type]} border`}>{p.role_type.toUpperCase()}</Badge></TableCell>
                      <TableCell>{p.times_used}{p.usage_limit ? `/${p.usage_limit}` : ''}</TableCell>
                      <TableCell>
                        <Badge className={p.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30 border' : 'bg-gray-500/20 text-gray-400 border-gray-500/30 border'}>
                          {p.is_active ? t('common.active').toUpperCase() : t('common.inactive').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.expires_at ? new Date(p.expires_at).toLocaleDateString() : t('admin.never')}</TableCell>
                      <TableCell className="text-right flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => handleTogglePromocode(p.id, p.is_active)}>
                          {p.is_active ? t('common.inactive') : t('common.active')}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeletePromocode(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {promocodes.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('admin.noPromocodes')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CustomerPagination {...promocodesPagination} />
          </Card>}
        </AdminDataPanel>

        {/* IP Whitelist Tab */}
        <AdminDataPanel value="ip-whitelist" active={activeTab === 'ip-whitelist'} loading={loadingData} error={dataError} onRetry={fetchData}>
          {() => <Card className="bg-card border-border">
            <CardHeader className="border-b border-border flex-row flex-wrap gap-3 items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                {t('admin.ipWhitelist')} <Badge variant="secondary">{ipWhitelist.length}</Badge>
              </CardTitle>
              <CreateIPWhitelistDialog onSuccess={fetchData} isAdmin={true} />
            </CardHeader>
            <IPWhitelistToggle />
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>{t('admin.ipAddress')}</TableHead>
                    <TableHead>{t('admin.ipVersion')}</TableHead>
                    <TableHead>{t('admin.subject')}</TableHead>
                    <TableHead>{t('admin.action')}</TableHead>
                    <TableHead>{t('admin.created')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whitelistPagination.items.map((ip) => (
                    <TableRow key={ip.id} className="border-border">
                      <TableCell className="font-mono">{ip.ip_address}</TableCell>
                      <TableCell><Badge variant="outline">{ip.ip_version}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{ip.subject}</TableCell>
                      <TableCell>
                        <Badge className={ip.action === 'ALLOW' ? 'bg-green-500/20 text-green-400 border-green-500/30 border' : 'bg-red-500/20 text-red-400 border-red-500/30 border'}>
                          {ip.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{ip.created_at ? new Date(ip.created_at).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="text-right flex gap-2 justify-end">
                        <EditIPWhitelistDialog entry={ip} onSuccess={fetchData} isAdmin={true} />
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteIPRule(ip.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {ipWhitelist.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('admin.noIPRules')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CustomerPagination {...whitelistPagination} />
          </Card>}
        </AdminDataPanel>

        {/* IP Audit Logs Tab */}
        <AdminDataPanel value="ip-audit" active={activeTab === 'ip-audit'} loading={loadingData} error={dataError} onRetry={fetchData}>
          {() => <Card className="bg-card border-border">
            <CardHeader className="border-b border-border flex-row flex-wrap gap-3 items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                {t('admin.ipAuditLogs')} <Badge variant="secondary">{ipLogs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>{t('admin.timestamp')}</TableHead>
                    <TableHead>{t('common.email')}</TableHead>
                    <TableHead>IPv4</TableHead>
                    <TableHead>IPv6</TableHead>
                    <TableHead>{t('admin.result')}</TableHead>
                    <TableHead>{t('admin.reason')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsPagination.items.map((log) => (
                    <TableRow key={log.id} className="border-border">
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                      </TableCell>
                      <TableCell>{log.email || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{log.ipv4_address || '-'}</TableCell>
                      <TableCell className="font-mono text-sm max-w-[200px] truncate" title={log.ipv6_address || undefined}>
                        {log.ipv6_address || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          log.action === 'ALLOWED' 
                            ? 'bg-green-500/20 text-green-400 border-green-500/30 border' 
                            : log.action === 'DENIED'
                            ? 'bg-red-500/20 text-red-400 border-red-500/30 border'
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border'
                        }>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[300px] truncate" title={log.reason || undefined}>
                        {log.reason || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {ipLogs.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('admin.noAuditLogs')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CustomerPagination {...logsPagination} />
          </Card>}
        </AdminDataPanel>
      </Tabs>
    </StaffDashboardLayout>
  );
};

export default Admin;
