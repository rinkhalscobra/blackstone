import { useState, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { CustomerPagination } from '@/components/CustomerPagination';
import { useClientPagination } from '@/hooks/useClientPagination';
import { useNavigate } from 'react-router-dom';
import { useRoleQuery } from '@/hooks/useRoleQuery';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { StaffDashboardLayout } from '@/components/dashboard/StaffDashboardLayout';
import { PendingTransactions } from '@/components/dashboard/PendingTransactions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Users, UserCog, Bell, Key, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import CreateNotificationDialog from '@/components/admin/CreateNotificationDialog';
import { CreateClientDialog } from '@/components/admin/CreateClientDialog';
import PasswordResetRequests from '@/components/admin/PasswordResetRequests';
import { AgentClientsDialog } from '@/components/admin/AgentClientsDialog';
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog';

interface UserProfile {
  id: string;
  assigned_to: string | null;
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
}

const Supervisor = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const { role, loading } = useRoleQuery();
  const isSupervisor = role === 'supervisor';
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [myGroup, setMyGroup] = useState<Group | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const deferredCustomerSearch = useDeferredValue(customerSearch);
  const roleByUserId = useMemo(() => new Map(userRoles.map(r => [r.user_id, r.role])), [userRoles]);
  const assignedCountByAgent = useMemo(() => {
    const counts = new Map<string, number>();
    users.forEach(u => { if (u.assigned_to) counts.set(u.assigned_to, (counts.get(u.assigned_to) || 0) + 1); });
    return counts;
  }, [users]);

  useEffect(() => {
    if (!loading && userId && !isSupervisor) {
      toast({ title: t('admin.accessDenied'), description: t('admin.noPermission'), variant: 'destructive' });
      navigate('/');
    }
  }, [loading, userId, isSupervisor, navigate, toast, t]);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoadingData(true);
    
    try {
      // Get my profile to find my group
      const { data: myProfile, error: profileError } = await supabase
        .from('profiles')
        .select('group_id')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      if (!myProfile?.group_id) {
        toast({
          title: t('supervisor.noGroupAssigned').split('.')[0],
          description: t('supervisor.noGroupAssigned'),
          variant: "destructive"
        });
        setLoadingData(false);
        return;
      }

      // These reads only depend on the current group, so start them together.
      const [groupRes, usersRes] = await Promise.all([
        supabase.from('groups').select('id, name').eq('id', myProfile.group_id).single(),
        supabase.from('profiles').select('id, email, first_name, last_name, username, phone, birthdate, status, group_id, assigned_to, created_by, last_login, is_super, created_at')
          .eq('group_id', myProfile.group_id).eq('is_archived', false).order('created_at', { ascending: false })
      ]);
      if (groupRes.error) throw groupRes.error;
      if (usersRes.error) throw usersRes.error;
      setMyGroup(groupRes.data);
      const groupUsers = usersRes.data || [];
      const userIds = groupUsers.map(u => u.id);
      const { data: rolesData, error: rolesError } = userIds.length
        ? await supabase.from('user_roles').select('id, user_id, role, created_at').in('user_id', userIds)
        : { data: [], error: null };
      if (rolesError) throw rolesError;

      setUsers(groupUsers || []);
      setUserRoles(rolesData || []);
    } catch (error: any) {
      toast({ title: t('deposit.error'), description: error.message, variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  }, [userId, toast, t]);

  useEffect(() => {
    if (userId && isSupervisor) void fetchData();
  }, [userId, isSupervisor, fetchData]);

  const getUserRole = (userId: string): string => {
    return roleByUserId.get(userId) || 'user';
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus as any })
        .eq('id', userId);
      
      if (error) throw error;
      toast({ title: t('admin.statusUpdated') });
      fetchData();
    } catch (error: any) {
      toast({ title: t('deposit.error'), description: error.message, variant: "destructive" });
    }
  };

  const handlePromoteToAgent = async (userId: string) => {
    try {
      const existingRole = userRoles.find(r => r.user_id === userId);
      
      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: 'agent' as any })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'agent' as any });
        if (error) throw error;
      }

      toast({ title: t('supervisor.userPromoted'), description: t('supervisor.promotedToAgent') });
      fetchData();
    } catch (error: any) {
      toast({ title: t('deposit.error'), description: error.message, variant: "destructive" });
    }
  };

  const handleDemoteToUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;
      toast({ title: t('supervisor.roleDemoted'), description: t('supervisor.demotedToUser') });
      fetchData();
    } catch (error: any) {
      toast({ title: t('deposit.error'), description: error.message, variant: "destructive" });
    }
  };

  const usersByRole = useMemo(() => {
    const grouped = new Map<string, UserProfile[]>();
    users.forEach(profile => {
      if (profile.id === user?.id) return;
      const role = roleByUserId.get(profile.id) || 'user';
      const list = grouped.get(role) || [];
      list.push(profile);
      grouped.set(role, list);
    });
    return grouped;
  }, [users, roleByUserId, user?.id]);
  const filterUsersByRole = (role: string) => usersByRole.get(role) || [];
  const visibleCustomers = useMemo(() => {
    const term = deferredCustomerSearch.toLowerCase();
    return (usersByRole.get('user') || []).filter(u => !term ||
      u.first_name?.toLowerCase().includes(term) || u.last_name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) || `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(term));
  }, [usersByRole, deferredCustomerSearch]);
  const customerPagination = useClientPagination(visibleCustomers, deferredCustomerSearch);

  const handleRefresh = async () => {
    await fetchData();
  };

  if (loading) return null;
  if (!isSupervisor) return null;

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    invalid_language: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    suspended: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  return (
    <StaffDashboardLayout
      role="supervisor"
      title={t('supervisor.title')}
      groupName={myGroup?.name}
      onRefresh={handleRefresh}
      isLoading={loadingData}
      headerActions={
        myGroup && (
          <CreateClientDialog
            defaultGroupId={myGroup.id}
            onSuccess={fetchData}
          />
        )
      }
    >
      {/* Pending Transactions Card - at the top */}
      {myGroup && (
        <div className="mb-6">
          <PendingTransactions groupId={myGroup.id} className="bg-card border-border" />
        </div>
      )}

      {!myGroup ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t('supervisor.noGroupAssigned')}</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="customers" className="w-full">
          <TabsList className="w-full justify-start bg-card border border-border rounded-lg p-1 mb-4 sm:mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="customers" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-1 sm:mr-2" /> {t('admin.customers')}
            </TabsTrigger>
            <TabsTrigger value="agents" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <UserCog className="w-4 h-4 mr-1 sm:mr-2" /> {t('admin.agents')}
            </TabsTrigger>
            <TabsTrigger value="password-resets" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Key className="w-4 h-4 mr-1 sm:mr-2" /> {t('admin.passwordResets')}
            </TabsTrigger>
          </TabsList>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    {t('supervisor.customersInGroup')} {myGroup.name}
                    <Badge variant="secondary">{visibleCustomers.length}</Badge>
                  </CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('common.search') || 'Search clients...'}
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="min-w-[140px]">{t('admin.fullName')}</TableHead>
                        <TableHead className="min-w-[180px] hidden sm:table-cell">{t('auth.email')}</TableHead>
                        <TableHead className="min-w-[140px] hidden md:table-cell">{t('admin.lastLogin')}</TableHead>
                        <TableHead className="min-w-[120px]">{t('transactions.status')}</TableHead>
                        <TableHead className="text-right min-w-[160px]">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerPagination.items.map((u) => (
                        <TableRow key={u.id} className="border-border">
                          <TableCell className="font-medium">
                            <div>
                              {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'N/A'}
                              <div className="text-xs text-muted-foreground sm:hidden">{u.email || 'N/A'}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden sm:table-cell">{u.email || 'N/A'}</TableCell>
                          <TableCell className="text-muted-foreground hidden md:table-cell">
                            {u.last_login ? new Date(u.last_login).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={u.status || 'active'} 
                              onValueChange={(v) => handleStatusChange(u.id, v)}
                            >
                              <SelectTrigger className="w-24 sm:w-28 h-8 text-xs sm:text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">{t('common.active')}</SelectItem>
                                <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                                <SelectItem value="suspended">{t('common.suspended')}</SelectItem>
                                <SelectItem value="invalid_language">{t('common.invalidLanguage')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 sm:gap-2 justify-end flex-wrap">
                              <CreateNotificationDialog
                                userId={u.id}
                                userName={`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User'}
                              >
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 sm:w-auto sm:px-2">
                                  <Bell className="h-4 w-4" />
                                </Button>
                              </CreateNotificationDialog>
                              <Button size="sm" variant="outline" className="h-8 px-2 text-xs sm:text-sm" onClick={() => navigate(`/customer/${u.id}`)}>{t('common.view')}</Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8 px-2 text-xs sm:text-sm hidden sm:inline-flex"
                                onClick={() => handlePromoteToAgent(u.id)}
                              >
                                {t('supervisor.promote')}
                              </Button>
                              <DeleteUserDialog
                                userId={u.id}
                                userName={`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'User'}
                                onSuccess={fetchData}
                              />

                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {visibleCustomers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            {t('supervisor.noCustomersInGroup')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <CustomerPagination {...customerPagination} />
            </Card>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents">
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-foreground flex items-center gap-2">
                  {t('supervisor.agentsInGroup')} {myGroup.name}
                  <Badge variant="secondary">{filterUsersByRole('agent').length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="min-w-[140px]">{t('admin.fullName')}</TableHead>
                        <TableHead className="min-w-[100px] hidden sm:table-cell">{t('admin.username')}</TableHead>
                        <TableHead className="min-w-[120px] hidden md:table-cell">{t('admin.phone')}</TableHead>
                        <TableHead className="min-w-[120px]">{t('transactions.status')}</TableHead>
                        <TableHead className="min-w-[100px] hidden lg:table-cell">{t('admin.created')}</TableHead>
                        <TableHead className="min-w-[100px]">{t('admin.assignedClients')}</TableHead>
                        <TableHead className="text-right min-w-[140px]">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterUsersByRole('agent').map((u) => (
                        <TableRow key={u.id} className="border-border">
                          <TableCell className="font-medium">
                            <div>
                              {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'N/A'}
                              <div className="text-xs text-muted-foreground sm:hidden">{u.username || '-'}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden sm:table-cell">{u.username || '-'}</TableCell>
                          <TableCell className="text-muted-foreground hidden md:table-cell">{u.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[u.status || 'active']} border`}>
                              {(u.status || 'active').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden lg:table-cell">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            <AgentClientsDialog
                              agentId={u.id}
                              agentName={`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Agent'}
                              count={assignedCountByAgent.get(u.id) || 0}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 sm:gap-2 justify-end flex-wrap">
                              <CreateNotificationDialog
                                userId={u.id}
                                userName={`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Agent'}
                              >
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0 sm:w-auto sm:px-2">
                                  <Bell className="h-4 w-4" />
                                </Button>
                              </CreateNotificationDialog>
                              <Button size="sm" variant="outline" className="h-8 px-2 text-xs sm:text-sm" onClick={() => navigate(`/customer/${u.id}`)}>{t('common.view')}</Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                className="h-8 px-2 text-xs sm:text-sm hidden sm:inline-flex"
                                onClick={() => handleDemoteToUser(u.id)}
                              >
                                {t('supervisor.demote')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filterUsersByRole('agent').length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {t('supervisor.noAgentsInGroup')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Password Resets Tab */}
          <TabsContent value="password-resets">
            <PasswordResetRequests />
          </TabsContent>
        </Tabs>
      )}
    </StaffDashboardLayout>
  );
};

export default Supervisor;
