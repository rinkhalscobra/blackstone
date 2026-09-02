import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
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
import { Users, Shield, UserCog, Trash2, Building2, Ticket, Globe, Copy, UserPlus, FileText, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MFASetupDialog } from '@/components/admin/MFASetupDialog';
import { CreateGroupDialog } from '@/components/admin/CreateGroupDialog';
import { CreatePromocodeDialog } from '@/components/admin/CreatePromocodeDialog';
import { CreateIPWhitelistDialog } from '@/components/admin/CreateIPWhitelistDialog';
import { EditIPWhitelistDialog } from '@/components/admin/EditIPWhitelistDialog';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { BulkCreateUsersDialog } from '@/components/admin/BulkCreateUsersDialog';
import ConfiscateStaffDialog from '@/components/admin/ConfiscateStaffDialog';
import { CreateClientDialog } from '@/components/admin/CreateClientDialog';
import { EditStaffNameDialog } from '@/components/admin/EditStaffNameDialog';
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog';
import { AgentClientsDialog } from '@/components/admin/AgentClientsDialog';

interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  phone: string | null;
  birthdate: string | null;
  status: 'active' | 'inactive' | 'suspended' | 'invalid_language' | null;
  group_id: string | null;
  created_by: string | null;
  last_login: string | null;
  is_super: boolean | null;
  created_at: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'group_admin' | 'supervisor' | 'agent' | 'user';
  created_at: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Promocode {
  id: string;
  code: string;
  group_id: string;
  role_type: 'admin' | 'group_admin' | 'supervisor' | 'agent' | 'user';
  is_active: boolean;
  usage_limit: number | null;
  times_used: number;
  expires_at: string | null;
  created_at: string | null;
}

interface IPWhitelistEntry {
  id: string;
  ip_address: string;
  ip_version: string;
  action: 'ALLOW' | 'DENY';
  subject: string;
  group_id: string | null;
  created_at: string | null;
}

interface IPValidationLog {
  id: string;
  user_id: string | null;
  email: string | null;
  ipv4_address: string | null;
  ipv6_address: string | null;
  user_agent: string | null;
  action: string;
  reason: string | null;
  matched_rule_id: string | null;
  created_at: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [ipWhitelist, setIpWhitelist] = useState<IPWhitelistEntry[]>([]);
  const [ipLogs, setIpLogs] = useState<IPValidationLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [profilesRes, rolesRes, groupsRes, promocodesRes, ipRes, ipLogsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('is_archived', false).neq('platform', 'chargeback').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('*'),
        supabase.from('groups').select('*').neq('platform', 'chargeback').order('name'),
        supabase.from('promocodes').select('*').order('created_at', { ascending: false }),
        supabase.from('ip_whitelist').select('*').order('created_at', { ascending: false }),
        supabase.from('ip_validation_logs').select('*').order('created_at', { ascending: false }).limit(100)
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (groupsRes.error) throw groupsRes.error;
      if (promocodesRes.error) throw promocodesRes.error;
      if (ipRes.error) throw ipRes.error;
      if (ipLogsRes.error) throw ipLogsRes.error;

      // Hide rows anchored to chargeback groups/users (data kept in DB, just not surfaced here)
      const visibleGroupIds = new Set((groupsRes.data || []).map((g: any) => g.id));
      const visibleUserIds = new Set((profilesRes.data || []).map((u: any) => u.id));

      setUsers(profilesRes.data || []);
      setUserRoles(rolesRes.data || []);
      setGroups(groupsRes.data || []);
      setPromocodes((promocodesRes.data || []).filter((r: any) => !r.group_id || visibleGroupIds.has(r.group_id)));
      setIpWhitelist((ipRes.data || []).filter((r: any) => !r.group_id || visibleGroupIds.has(r.group_id)));
      setIpLogs((ipLogsRes.data || []).filter((r: any) => !r.user_id || visibleUserIds.has(r.user_id)));
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    await fetchData();
  }, []);

  const getUserRole = (userId: string): string => {
    const role = userRoles.find(r => r.user_id === userId);
    return role?.role || 'user';
  };

  const getGroupName = (groupId: string | null): string => {
    if (!groupId) return '-';
    const group = groups.find(g => g.id === groupId);
    return group?.name || '-';
  };

  const getCreatorName = (creatorId: string | null): string => {
    if (!creatorId) return '-';
    const creator = users.find(u => u.id === creatorId);
    return creator ? `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || creator.email || '-' : '-';
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRole(userId);
    try {
      const existingRole = userRoles.find(r => r.user_id === userId);
      
      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole as any })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole as any });
        if (error) throw error;
      }

      toast({ title: t('admin.roleUpdated'), description: `User role has been updated to ${newRole}.` });
      fetchData();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
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
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase.from('groups').delete().eq('id', groupId);
      if (error) throw error;
      toast({ title: t('admin.groupDeleted') });
      fetchData();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    }
  };

  const handleTogglePromocode = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase.from('promocodes').update({ is_active: !isActive }).eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    }
  };

  const handleDeletePromocode = async (id: string) => {
    try {
      const { error } = await supabase.from('promocodes').delete().eq('id', id);
      if (error) throw error;
      toast({ title: t('admin.promocodeDeleted') });
      fetchData();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteIPRule = async (id: string) => {
    try {
      const { error } = await supabase.from('ip_whitelist').delete().eq('id', id);
      if (error) throw error;
      toast({ title: t('admin.ipRuleDeleted') });
      fetchData();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    }
  };

  const handleToggleSupervisorSuper = async (userId: string, isSuper: boolean) => {
    try {
      const { error } = await supabase.from('profiles').update({ is_super: !isSuper }).eq('id', userId);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t('common.copied'), description: `${text} ${t('common.copiedToClipboard')}` });
  };

  const filterUsersByRole = (role: string, search?: string) => {
    let filtered = role === 'all' ? users : users.filter(u => getUserRole(u.id) === role);
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(u => 
        (u.first_name?.toLowerCase().includes(term)) ||
        (u.last_name?.toLowerCase().includes(term)) ||
        (u.email?.toLowerCase().includes(term)) ||
        (`${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(term))
      );
    }
    return filtered;
  };

  const getAgentCount = (groupId: string) => {
    return users.filter(u => u.group_id === groupId && getUserRole(u.id) === 'agent').length;
  };

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
      onRefresh={handleRefresh}
      isLoading={loadingData}
      headerActions={<div className="flex gap-2"><ConfiscateStaffDialog /><MFASetupDialog /></div>}
    >
      {/* Pending Transactions Card - at the top */}
      <div className="mb-6">
        <PendingTransactions className="bg-card border-border" />
      </div>

      <Tabs defaultValue="customers" className="w-full">
        <TabsList className="w-full justify-start bg-card border border-border rounded-lg p-1 mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="customers" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="w-4 h-4 mr-2" /> {t('admin.customers')}
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

        {/* Customers Tab */}
        <TabsContent value="customers">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border flex-row items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-foreground flex items-center gap-2">
                {t('admin.customers')} <Badge variant="secondary">{filterUsersByRole('user', customerSearch).length}</Badge>
              </CardTitle>
              <div className="flex gap-2 items-center">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('common.search') || 'Search clients...'}
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
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
                  {filterUsersByRole('user', customerSearch).map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="font-medium">{u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email || 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">{getCreatorName(u.created_by)}</TableCell>
                      <TableCell>{getGroupName(u.group_id)}</TableCell>
                      <TableCell className="text-muted-foreground">{u.last_login ? new Date(u.last_login).toLocaleString() : '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/customer/${u.id}`)}>{t('common.view')}</Button>
                          <Select value={getUserRole(u.id)} onValueChange={(v) => handleRoleChange(u.id, v)}>
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
                  {filterUsersByRole('user', customerSearch).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('admin.noCustomers')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border flex-row items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                {t('admin.agents')} <Badge variant="secondary">{filterUsersByRole('agent').length}</Badge>
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
                  {filterUsersByRole('agent').map((u) => (
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
                          count={users.filter((c: any) => c.assigned_to === u.id).length}
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
                  {filterUsersByRole('agent').length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('admin.noAgents')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supervisors Tab */}
        <TabsContent value="supervisors">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border flex-row items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                {t('admin.supervisors')} <Badge variant="secondary">{filterUsersByRole('supervisor').length}</Badge>
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
                  {filterUsersByRole('supervisor').map((u) => (
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
                  {filterUsersByRole('supervisor').length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('admin.noSupervisors')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admins Tab */}
        <TabsContent value="admins">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-foreground flex items-center gap-2">
                {t('admin.admins')} <Badge variant="secondary">{filterUsersByRole('admin').length}</Badge>
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
                  {filterUsersByRole('admin').map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="font-medium">{u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email || 'N/A'}</TableCell>
                      <TableCell className="text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="destructive" onClick={() => handleRemoveRole(u.id)} disabled={u.id === user?.id}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filterUsersByRole('admin').length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t('admin.noAdmins')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border flex-row items-center justify-between">
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
                  {groups.map((g) => (
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
          </Card>
        </TabsContent>

        {/* Promocodes Tab */}
        <TabsContent value="promocodes">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border flex-row items-center justify-between">
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
                  {promocodes.map((p) => (
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
          </Card>
        </TabsContent>

        {/* IP Whitelist Tab */}
        <TabsContent value="ip-whitelist">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border flex-row items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                {t('admin.ipWhitelist')} <Badge variant="secondary">{ipWhitelist.length}</Badge>
              </CardTitle>
              <CreateIPWhitelistDialog onSuccess={fetchData} isAdmin={true} />
            </CardHeader>
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
                  {ipWhitelist.map((ip) => (
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
          </Card>
        </TabsContent>

        {/* IP Audit Logs Tab */}
        <TabsContent value="ip-audit">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border flex-row items-center justify-between">
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
                  {ipLogs.map((log) => (
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
          </Card>
        </TabsContent>
      </Tabs>
    </StaffDashboardLayout>
  );
};

export default Admin;
