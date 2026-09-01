import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
import { Users, Shield, UserCog, Trash2, Ticket, Copy, Bell, Globe, Activity, LogOut, KeyRound, Key, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import PasswordResetRequests from '@/components/admin/PasswordResetRequests';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CreatePromocodeDialog } from '@/components/admin/CreatePromocodeDialog';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { CreateClientDialog } from '@/components/admin/CreateClientDialog';
import { CreateIPWhitelistDialog } from '@/components/admin/CreateIPWhitelistDialog';
import { EditIPWhitelistDialog } from '@/components/admin/EditIPWhitelistDialog';
import CreateNotificationDialog from '@/components/admin/CreateNotificationDialog';
import { EditStaffNameDialog } from '@/components/admin/EditStaffNameDialog';
import { MFASetupDialog } from '@/components/admin/MFASetupDialog';
import { BulkAssignAgentsDialog } from '@/components/admin/BulkAssignAgentsDialog';
import { AgentClientsDialog } from '@/components/admin/AgentClientsDialog';
import { DeleteUserDialog } from '@/components/admin/DeleteUserDialog';

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

interface StaffSession {
  id: string;
  user_id: string;
  login_time: string | null;
  is_active: boolean;
  login_ip: string | null;
  user_agent: string | null;
  user_name?: string;
  user_role?: string;
}

const GroupAdmin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [myGroup, setMyGroup] = useState<Group | null>(null);
  const [promocodes, setPromocodes] = useState<Promocode[]>([]);
  const [ipWhitelist, setIpWhitelist] = useState<IPWhitelistEntry[]>([]);
  const [staffSessions, setStaffSessions] = useState<StaffSession[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  useEffect(() => {
    const checkGroupAdminStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (roleError) throw roleError;

        const isGA = roleData?.role === 'group_admin';
        setIsGroupAdmin(isGA);

        if (!isGA) {
          toast({
            title: t('admin.accessDenied'),
            description: t('admin.noPermission'),
            variant: "destructive"
          });
          navigate('/');
        }
      } catch (error: any) {
        toast({ title: t('common.error'), description: error.message, variant: "destructive" });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      checkGroupAdminStatus();
    }
  }, [user, navigate, toast, t]);

  useEffect(() => {
    if (isGroupAdmin && user) {
      fetchData();
    }
  }, [isGroupAdmin, user]);

  const fetchData = async () => {
    if (!user) return;
    setLoadingData(true);
    
    try {
      // Get my profile to find my group
      const { data: myProfile, error: profileError } = await supabase
        .from('profiles')
        .select('group_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (!myProfile?.group_id) {
        toast({
          title: t('groupAdmin.noGroupAssigned'),
          description: t('groupAdmin.contactSuperAdmin'),
          variant: "destructive"
        });
        setLoadingData(false);
        return;
      }

      // Get group info
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('id, name, description, created_by, created_at')
        .eq('id', myProfile.group_id)
        .single();

      if (groupError) throw groupError;
      setMyGroup(groupData);

      // Get all users in my group
      const { data: groupUsers, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('group_id', myProfile.group_id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Get roles for these users
      const userIds = groupUsers?.map(u => u.id) || [];
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      // Get promocodes for this group
      const { data: promocodesData, error: promocodesError } = await supabase
        .from('promocodes')
        .select('*')
        .eq('group_id', myProfile.group_id)
        .order('created_at', { ascending: false });

      if (promocodesError) throw promocodesError;

      // Get IP whitelist for this group
      const { data: ipData, error: ipError } = await supabase
        .from('ip_whitelist')
        .select('*')
        .eq('group_id', myProfile.group_id)
        .order('created_at', { ascending: false });

      if (ipError) throw ipError;

      setUsers(groupUsers || []);
      setUserRoles(rolesData || []);
      setPromocodes(promocodesData || []);
      setIpWhitelist(ipData || []);
      
      // Fetch sessions for staff members
      await fetchStaffSessions(groupUsers || [], rolesData || []);
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  };

  const fetchStaffSessions = async (groupUsers: UserProfile[], roles: UserRole[]) => {
    setLoadingSessions(true);
    try {
      const staffRoles = ['admin', 'group_admin', 'supervisor', 'agent'];
      const staffUserIds = roles
        .filter(r => staffRoles.includes(r.role))
        .map(r => r.user_id);

      if (staffUserIds.length === 0) {
        setStaffSessions([]);
        return;
      }

      // Fetch sessions for all staff members
      const allSessions: StaffSession[] = [];
      
      for (const staffUserId of staffUserIds) {
        const { data: sessions, error } = await supabase
          .rpc('get_user_sessions_for_staff', { target_user_id: staffUserId });

        if (error) {
          console.error('Error fetching sessions for user:', staffUserId, error);
          continue;
        }

        if (sessions) {
          const staffUser = groupUsers.find(u => u.id === staffUserId);
          const staffRole = roles.find(r => r.user_id === staffUserId);
          
          const enrichedSessions = sessions.map((s: any) => ({
            ...s,
            user_name: staffUser ? `${staffUser.first_name || ''} ${staffUser.last_name || ''}`.trim() || staffUser.email || 'Unknown' : 'Unknown',
            user_role: staffRole?.role || 'user'
          }));
          
          allSessions.push(...enrichedSessions);
        }
      }

      // Sort by login_time desc
      allSessions.sort((a, b) => {
        if (!a.login_time) return 1;
        if (!b.login_time) return -1;
        return new Date(b.login_time).getTime() - new Date(a.login_time).getTime();
      });

      setStaffSessions(allSessions);
    } catch (error) {
      console.error('Error fetching staff sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    await fetchData();
  }, []);

  const getUserRole = (userId: string): string => {
    const role = userRoles.find(r => r.user_id === userId);
    return role?.role || 'user';
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    // Prevent promoting to admin or group_admin
    if (newRole === 'admin' || newRole === 'group_admin') {
      toast({ 
        title: t('common.error'), 
        description: t('groupAdmin.cannotPromoteToAdmin'),
        variant: "destructive" 
      });
      return;
    }

    setUpdatingRole(userId);
    try {
      const existingRole = userRoles.find(r => r.user_id === userId);
      
      if (newRole === 'user') {
        // Remove role entry for regular users
        if (existingRole) {
          const { error } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', userId);
          if (error) throw error;
        }
      } else if (existingRole) {
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

      toast({ title: t('admin.roleUpdated'), description: `${t('groupAdmin.roleUpdatedTo')} ${newRole}.` });
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

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);
      
      if (error) throw error;
      toast({ title: 'Session terminated', description: 'The session has been marked as inactive.' });
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
    let filtered = role === 'all' 
      ? users.filter(u => u.id !== user?.id) 
      : users.filter(u => getUserRole(u.id) === role && u.id !== user?.id);
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

  if (loading) return null;
  if (!isGroupAdmin) return null;

  const roleColors: Record<string, string> = {
    admin: 'bg-red-500/20 text-red-400 border-red-500/30',
    group_admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    supervisor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    agent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    user: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    invalid_language: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    suspended: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const groups = myGroup ? [myGroup] : [];

  return (
    <StaffDashboardLayout
      role="group_admin"
      title={t('groupAdmin.title')}
      subtitle={t('groupAdmin.subtitle')}
      groupName={myGroup?.name}
      onRefresh={handleRefresh}
      isLoading={loadingData}
      headerActions={
        <div className="flex items-center gap-2">
          <MFASetupDialog />
          {myGroup && (
            <CreateClientDialog
              defaultGroupId={myGroup.id}
              onSuccess={fetchData}
            />
          )}
        </div>
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
            <p className="text-muted-foreground">{t('groupAdmin.noGroupAssigned')}</p>
          </CardContent>
        </Card>
      ) : (
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
            <TabsTrigger value="promocodes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Ticket className="w-4 h-4 mr-2" /> {t('admin.promocodes')}
            </TabsTrigger>
            <TabsTrigger value="ip-whitelist" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Globe className="w-4 h-4 mr-2" /> {t('admin.ipWhitelist')}
            </TabsTrigger>
            <TabsTrigger value="sessions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Activity className="w-4 h-4 mr-2" /> Sessions
            </TabsTrigger>
            <TabsTrigger value="password-resets" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Key className="w-4 h-4 mr-2" /> {t('admin.passwordResets')}
            </TabsTrigger>
          </TabsList>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border flex-row items-center justify-between">
                <CardTitle className="text-foreground flex items-center gap-2">
                  {t('admin.customers')} <Badge variant="secondary">{filterUsersByRole('user', customerSearch).length}</Badge>
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
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>{t('admin.fullName')}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t('common.email')}</TableHead>
                        <TableHead className="hidden md:table-cell">{t('admin.lastLogin')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterUsersByRole('user', customerSearch).map((u) => (
                        <TableRow key={u.id} className="border-border">
                          <TableCell className="font-medium">
                            {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'N/A'}
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden sm:table-cell">{u.email || 'N/A'}</TableCell>
                          <TableCell className="text-muted-foreground hidden md:table-cell">
                            {u.last_login ? new Date(u.last_login).toLocaleString() : '-'}
                          </TableCell>
                          <TableCell>
                            <Select value={u.status || 'active'} onValueChange={(v) => handleStatusChange(u.id, v)}>
                              <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">{t('common.active')}</SelectItem>
                                <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                                <SelectItem value="suspended">{t('common.suspended')}</SelectItem>
                                <SelectItem value="invalid_language">{t('common.invalidLanguage')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <CreateNotificationDialog userId={u.id} userName={`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'User'}>
                                <Button size="sm" variant="outline"><Bell className="h-4 w-4" /></Button>
                              </CreateNotificationDialog>
                              <Button size="sm" variant="outline" onClick={() => navigate(`/customer/${u.id}`)}>{t('common.view')}</Button>
                              <Select value={getUserRole(u.id)} onValueChange={(v) => handleRoleChange(u.id, v)}>
                                <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">User</SelectItem>
                                  <SelectItem value="agent">Agent</SelectItem>
                                  <SelectItem value="supervisor">Supervisor</SelectItem>
                                </SelectContent>
                              </Select>
                              <DeleteUserDialog
                                userId={u.id}
                                userName={`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'User'}
                                onSuccess={fetchData}
                              />

                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filterUsersByRole('user', customerSearch).length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('admin.noCustomers')}</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
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
                  <BulkAssignAgentsDialog
                    agents={filterUsersByRole('agent').map(u => ({
                      id: u.id,
                      first_name: u.first_name,
                      last_name: u.last_name,
                      email: u.email,
                      username: u.username,
                    }))}
                    supervisors={filterUsersByRole('supervisor').map(u => ({
                      id: u.id,
                      first_name: u.first_name,
                      last_name: u.last_name,
                      email: u.email,
                    }))}
                    onSuccess={fetchData}
                  />
                  <CreateUserDialog groups={groups} roleType="agent" onSuccess={fetchData} />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>{t('admin.fullName')}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t('admin.username')}</TableHead>
                        <TableHead className="hidden md:table-cell">{t('admin.phone')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead>{t('admin.assignedClients')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterUsersByRole('agent').map((u) => (
                        <TableRow key={u.id} className="border-border">
                          <TableCell className="font-medium">{u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'N/A'}</TableCell>
                          <TableCell className="text-muted-foreground hidden sm:table-cell">{u.username || '-'}</TableCell>
                          <TableCell className="text-muted-foreground hidden md:table-cell">{u.phone || '-'}</TableCell>
                          <TableCell><Badge className={`${statusColors[u.status || 'active']} border`}>{(u.status || 'active').toUpperCase()}</Badge></TableCell>
                          <TableCell>
                            <AgentClientsDialog
                              agentId={u.id}
                              agentName={`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Agent'}
                              count={users.filter((c: any) => c.assigned_to === u.id).length}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <CreateNotificationDialog userId={u.id} userName={`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Agent'}>
                                <Button size="sm" variant="outline"><Bell className="h-4 w-4" /></Button>
                              </CreateNotificationDialog>
                              <EditStaffNameDialog
                                userId={u.id}
                                currentFirstName={u.first_name}
                                currentLastName={u.last_name}
                                currentUsername={u.username}
                                onSuccess={fetchData}
                              />
                              <Button size="sm" variant="outline" onClick={() => navigate(`/customer/${u.id}`)}>{t('common.view')}</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleRemoveRole(u.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filterUsersByRole('agent').length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('admin.noAgents')}</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
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
                <CreateUserDialog groups={groups} roleType="supervisor" onSuccess={fetchData} />
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>{t('admin.fullName')}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t('admin.username')}</TableHead>
                        <TableHead className="hidden md:table-cell">{t('admin.phone')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterUsersByRole('supervisor').map((u) => (
                        <TableRow key={u.id} className="border-border">
                          <TableCell className="font-medium">{u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'N/A'}</TableCell>
                          <TableCell className="text-muted-foreground hidden sm:table-cell">{u.username || '-'}</TableCell>
                          <TableCell className="text-muted-foreground hidden md:table-cell">{u.phone || '-'}</TableCell>
                          <TableCell><Badge className={`${statusColors[u.status || 'active']} border`}>{(u.status || 'active').toUpperCase()}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <CreateNotificationDialog userId={u.id} userName={`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Supervisor'}>
                                <Button size="sm" variant="outline"><Bell className="h-4 w-4" /></Button>
                              </CreateNotificationDialog>
                              <EditStaffNameDialog
                                userId={u.id}
                                currentFirstName={u.first_name}
                                currentLastName={u.last_name}
                                currentUsername={u.username}
                                onSuccess={fetchData}
                              />
                              <Button size="sm" variant="outline" onClick={() => navigate(`/customer/${u.id}`)}>{t('common.view')}</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleRemoveRole(u.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filterUsersByRole('supervisor').length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('admin.noSupervisors')}</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>{t('admin.code')}</TableHead>
                        <TableHead>{t('admin.roleType')}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t('admin.usage')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {promocodes.map((p) => (
                        <TableRow key={p.id} className="border-border">
                          <TableCell className="font-mono">
                            <div className="flex items-center gap-2">
                              {p.code}
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copyToClipboard(p.code)}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell><Badge className={`${roleColors[p.role_type]} border`}>{p.role_type.toUpperCase()}</Badge></TableCell>
                          <TableCell className="hidden sm:table-cell">{p.times_used}/{p.usage_limit || '∞'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Checkbox checked={p.is_active} onCheckedChange={() => handleTogglePromocode(p.id, p.is_active)} />
                              <span className={p.is_active ? 'text-green-400' : 'text-muted-foreground'}>
                                {p.is_active ? t('common.active') : t('common.inactive')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="destructive" onClick={() => handleDeletePromocode(p.id)}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {promocodes.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('admin.noPromocodes')}</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
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
                {myGroup && <CreateIPWhitelistDialog onSuccess={fetchData} groupId={myGroup.id} />}
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>{t('admin.ipAddress')}</TableHead>
                        <TableHead>{t('admin.ipVersion')}</TableHead>
                        <TableHead className="hidden sm:table-cell">{t('admin.subject')}</TableHead>
                        <TableHead>{t('admin.action')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ipWhitelist.map((ip) => (
                        <TableRow key={ip.id} className="border-border">
                          <TableCell className="font-mono">{ip.ip_address}</TableCell>
                          <TableCell><Badge variant="outline">{ip.ip_version}</Badge></TableCell>
                          <TableCell className="text-muted-foreground hidden sm:table-cell">{ip.subject}</TableCell>
                          <TableCell>
                            <Badge className={ip.action === 'ALLOW' ? 'bg-green-500/20 text-green-400 border-green-500/30 border' : 'bg-red-500/20 text-red-400 border-red-500/30 border'}>
                              {ip.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right flex gap-2 justify-end">
                            <EditIPWhitelistDialog entry={ip} onSuccess={fetchData} />
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteIPRule(ip.id)}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {ipWhitelist.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('admin.noIPRules')}</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Sessions Tab */}
          <TabsContent value="sessions">
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-foreground flex items-center gap-2">
                  Staff Sessions <Badge variant="secondary">{staffSessions.length}</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Monitor login activity for staff members in your group
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {loadingSessions ? (
                  <div className="py-8 text-center text-muted-foreground">Loading sessions...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead>Staff Member</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="hidden sm:table-cell">IP Address</TableHead>
                          <TableHead className="hidden md:table-cell">Login Time</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">{t('common.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {staffSessions.map((session) => (
                          <TableRow key={session.id} className="border-border">
                            <TableCell className="font-medium">{session.user_name}</TableCell>
                            <TableCell>
                              <Badge className={`${roleColors[session.user_role || 'user']} border`}>
                                {(session.user_role || 'user').toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-muted-foreground hidden sm:table-cell">
                              {session.login_ip || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground hidden md:table-cell">
                              {session.login_time ? new Date(session.login_time).toLocaleString() : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={session.is_active 
                                ? 'bg-green-500/20 text-green-400 border-green-500/30 border' 
                                : 'bg-gray-500/20 text-gray-400 border-gray-500/30 border'
                              }>
                                {session.is_active ? 'ACTIVE' : 'ENDED'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {session.is_active && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                      <LogOut className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Terminate Session</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to terminate {session.user_name}'s session? They will need to log in again.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleTerminateSession(session.id)}>
                                        Terminate
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {staffSessions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No staff sessions found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
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

export default GroupAdmin;
