import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, User, Wallet, FileText, Bell, Key, Plus, Pencil, 
  RefreshCw, Loader2, Check, X, ChevronDown, ChevronUp, Euro, Clock, MessageCircle, Trash2,
  AlertCircle, CheckCircle, AlertTriangle, Info, TrendingUp, TrendingDown
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import AdjustBalanceDialog from '@/components/admin/AdjustBalanceDialog';
import CaseTimelineEditor from '@/components/admin/CaseTimelineEditor';
import { AgentChatWindow } from '@/components/chat/AgentChatWindow';
import CreateNotificationDialog from '@/components/admin/CreateNotificationDialog';
import AddPortfolioForClientDialog from '@/components/admin/AddPortfolioForClientDialog';
import EditPortfolioItemDialog from '@/components/admin/EditPortfolioItemDialog';
import { CasePhaseUpdater } from '@/components/admin/CasePhaseUpdater';
import ResetPasswordDialog from '@/components/admin/ResetPasswordDialog';
import DirectPasswordResetDialog from '@/components/admin/DirectPasswordResetDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { formatDistanceToNow } from 'date-fns';
import { getCryptoPrices, CryptoPrice } from '@/services/cryptoApi';
import { formatEuro } from '@/lib/utils';

interface CustomerProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  phone: string | null;
  birthdate: string | null;
  status: string | null;
  case_number: string | null;
  subscription: string | null;
  preferred_currency: string | null;
  created_at: string | null;
  assigned_to: string | null;
  case_phase: string | null;
}

interface AgentProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface Note {
  id: string;
  content: string;
  created_by: string | null;
  created_at: string | null;
}

interface TransactionRequest {
  id: string;
  type: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string | null;
}

interface UserSession {
  id: string;
  login_time: string | null;
  login_ip: string | null;
  access_token?: string | null;
}

interface PortfolioItem {
  id: string;
  crypto_id: string;
  crypto_name: string;
  crypto_symbol: string;
  quantity: number;
  purchase_price: number;
  wallet_address?: string | null;
}

interface CustomerBalance {
  id: string;
  balance: number;
  currency: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string | null;
}

const CustomerDetail = (): JSX.Element => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { isAdmin, isGroupAdmin, isSupervisor } = useUserRole();

  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [transactions, setTransactions] = useState<TransactionRequest[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [customerBalance, setCustomerBalance] = useState<CustomerBalance | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [userInfoOpen, setUserInfoOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, CryptoPrice>>({});
  
  // Edit form state
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthdate, setEditBirthdate] = useState('');
  const [editCaseNumber, setEditCaseNumber] = useState('');
  const [editCurrency, setEditCurrency] = useState('');
  const [editSubscription, setEditSubscription] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (customerId && user) {
      fetchCustomerData();

      // Set up real-time subscriptions
      const profileChannel = supabase
        .channel(`profile-${customerId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${customerId}` },
          (payload) => {
            if (payload.new) {
              setCustomer(payload.new as CustomerProfile);
            }
          }
        )
        .subscribe();

      const transactionsChannel = supabase
        .channel(`transactions-${customerId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transaction_requests', filter: `customer_id=eq.${customerId}` },
          () => {
            // Refetch transactions on any change
            supabase
              .from('transaction_requests')
              .select('*')
              .eq('customer_id', customerId)
              .order('created_at', { ascending: false })
              .then(({ data }) => {
                if (data) setTransactions(data);
              });
          }
        )
        .subscribe();

      const balanceChannel = supabase
        .channel(`balance-${customerId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'customer_balances', filter: `customer_id=eq.${customerId}` },
          (payload) => {
            if (payload.new) {
              setCustomerBalance(payload.new as CustomerBalance);
            }
          }
        )
        .subscribe();

      const notificationsChannel = supabase
        .channel(`notifications-${customerId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${customerId}` },
          () => {
            supabase
              .from('notifications')
              .select('*')
              .eq('user_id', customerId)
              .order('created_at', { ascending: false })
              .then(({ data }) => {
                if (data) setNotifications(data);
              });
          }
        )
        .subscribe();

      const portfolioChannel = supabase
        .channel(`portfolio-${customerId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'portfolio_items', filter: `user_id=eq.${customerId}` },
          () => {
            supabase
              .from('portfolio_items')
              .select('*')
              .eq('user_id', customerId)
              .then(async ({ data }) => {
                if (data) {
                  setPortfolio(data);
                  // Refresh prices
                  if (data.length > 0) {
                    const cryptoIds = [...new Set(data.map((item: PortfolioItem) => item.crypto_id))];
                    const prices = await getCryptoPrices(cryptoIds);
                    setCryptoPrices(prices);
                  }
                }
              });
          }
        )
        .subscribe();

      const notesChannel = supabase
        .channel(`notes-${customerId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'customer_notes', filter: `customer_id=eq.${customerId}` },
          () => {
            supabase
              .from('customer_notes')
              .select('*')
              .eq('customer_id', customerId)
              .order('created_at', { ascending: false })
              .then(({ data }) => {
                if (data) setNotes(data);
              });
          }
        )
        .subscribe();

      const timelineChannel = supabase
        .channel(`timeline-${customerId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'case_timeline', filter: `customer_id=eq.${customerId}` },
          () => {
            // Timeline updates are handled by CaseTimelineEditor component
            // But we trigger a refetch for any dependent data
            fetchCustomerData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(profileChannel);
        supabase.removeChannel(transactionsChannel);
        supabase.removeChannel(balanceChannel);
        supabase.removeChannel(notificationsChannel);
        supabase.removeChannel(portfolioChannel);
        supabase.removeChannel(notesChannel);
        supabase.removeChannel(timelineChannel);
      };
    }
  }, [customerId, user]);

  const fetchCustomerData = async () => {
    if (!customerId) return;
    setLoading(true);

    try {
      // Fetch agents (users with agent role)
      const { data: agentRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'agent');
      
      const agentIds = agentRoles?.map(r => r.user_id) || [];
      
      const [profileRes, notesRes, transactionsRes, sessionsRes, portfolioRes, agentsRes, balanceRes, notificationsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', customerId).single(),
        supabase.from('customer_notes').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
        supabase.from('transaction_requests').select('*').eq('customer_id', customerId).order('created_at', { ascending: false }),
        supabase.from('user_sessions').select('*').eq('user_id', customerId).order('login_time', { ascending: false }),
        supabase.from('portfolio_items').select('*').eq('user_id', customerId),
        agentIds.length > 0 
          ? supabase.from('profiles').select('id, email, first_name, last_name').in('id', agentIds)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('customer_balances').select('*').eq('customer_id', customerId).single(),
        supabase.from('notifications').select('*').eq('user_id', customerId).order('created_at', { ascending: false })
      ]);

      if (profileRes.error) throw profileRes.error;
      setCustomer(profileRes.data);
      setNotes(notesRes.data || []);
      setTransactions(transactionsRes.data || []);
      setSessions(sessionsRes.data || []);
      setPortfolio(portfolioRes.data || []);
      setAgents(agentsRes.data || []);
      setCustomerBalance(balanceRes.data || null);
      setNotifications(notificationsRes.data || []);

      // Fetch live crypto prices for portfolio items
      const portfolioData = portfolioRes.data || [];
      if (portfolioData.length > 0) {
        const cryptoIds = [...new Set(portfolioData.map((item: PortfolioItem) => item.crypto_id))];
        const prices = await getCryptoPrices(cryptoIds);
        setCryptoPrices(prices);
      }
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !customerId) return;
    setAddingNote(true);

    try {
      const { error } = await supabase.from('customer_notes').insert({
        customer_id: customerId,
        content: newNote.trim(),
        created_by: user?.id
      });
      if (error) throw error;
      toast({ title: t('customerDetail.noteAdded') });
      setNewNote('');
      fetchCustomerData();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    } finally {
      setAddingNote(false);
    }
  };

  const handleTransactionAction = async (transactionId: string, action: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('transaction_requests')
        .update({ 
          status: action, 
          processed_by: user?.id, 
          processed_at: new Date().toISOString() 
        })
        .eq('id', transactionId);
      
      if (error) throw error;
      toast({ title: action === 'approved' ? t('customerDetail.transactionApproved') : t('customerDetail.transactionRejected') });
      fetchCustomerData();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!customerId) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus as any })
        .eq('id', customerId);
      if (error) throw error;
      toast({ title: t('admin.statusUpdated') });
      fetchCustomerData();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    }
  };

  const handleAgentAssign = async (agentId: string) => {
    if (!customerId) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ assigned_to: agentId === 'unassigned' ? null : agentId })
        .eq('id', customerId);
      if (error) throw error;
      toast({ title: t('customerDetail.agentAssigned') });
      fetchCustomerData();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    }
  };

  const startEditingProfile = () => {
    if (customer) {
      setEditFirstName(customer.first_name || '');
      setEditLastName(customer.last_name || '');
      setEditPhone(customer.phone || '');
      setEditBirthdate(customer.birthdate || '');
      setEditCaseNumber(customer.case_number || '');
      setEditCurrency(customer.preferred_currency || 'EUR');
      setEditSubscription(customer.subscription || 'BASIC');
    }
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!customerId) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editFirstName.trim() || null,
          last_name: editLastName.trim() || null,
          phone: editPhone.trim() || null,
          birthdate: editBirthdate || null,
          case_number: editCaseNumber.trim() || null,
          preferred_currency: editCurrency,
          subscription: editSubscription,
        })
        .eq('id', customerId);
      if (error) throw error;
      toast({ title: t('common.success'), description: t('customerDetail.profileUpdated') });
      setEditingProfile(false);
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      if (error) throw error;
      toast({ title: t('notification.deleted') });
      fetchCustomerData();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    }
  };

  const handleDeletePortfolioItem = async (portfolioId: string) => {
    try {
      const { error } = await supabase
        .from('portfolio_items')
        .delete()
        .eq('id', portfolioId);
      if (error) throw error;
      toast({ title: t('customerDetail.portfolioDeleted') });
      fetchCustomerData();
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-400" />;
      default: return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground text-center">{t('customerDetail.customerNotFound')}</p>
        </main>
        <Footer />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    inactive: 'bg-gray-500/20 text-gray-400',
    invalid_language: 'bg-amber-500/20 text-amber-400',
    suspended: 'bg-red-500/20 text-red-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
    processing: 'bg-blue-500/20 text-blue-400'
  };

  // Calculate portfolio totals with live prices
  const calculatePortfolioTotals = () => {
    let totalLiveValue = 0;
    let totalInvested = 0;
    portfolio.forEach((item) => {
      const livePrice = cryptoPrices[item.crypto_id];
      if (livePrice) {
        totalLiveValue += livePrice.current_price * item.quantity;
      }
      totalInvested += item.purchase_price * item.quantity;
    });
    const profitLoss = totalLiveValue - totalInvested;
    const profitLossPercentage = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
    return { totalLiveValue, totalInvested, profitLoss, profitLossPercentage };
  };

  const { totalLiveValue, totalInvested, profitLoss, profitLossPercentage } = calculatePortfolioTotals();
  const totalPortfolioValue = Object.keys(cryptoPrices).length > 0 ? totalLiveValue : portfolio.reduce((sum, item) => sum + (item.quantity * item.purchase_price), 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('customerDetail.backToDashboard')}
        </Button>

        {/* Header */}
        <h1 className="text-2xl font-bold text-center mb-6">{t('customerDetail.title')}</h1>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full justify-start bg-card border border-border rounded-lg p-1 mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <User className="w-4 h-4 mr-2" /> {t('customerDetail.profile')}
            </TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MessageCircle className="w-4 h-4 mr-2" /> {t('nav.messages')}
            </TabsTrigger>
            <TabsTrigger value="portfolios" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Wallet className="w-4 h-4 mr-2" /> {t('customerDetail.portfolios')}
            </TabsTrigger>
            <TabsTrigger value="transactions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="w-4 h-4 mr-2" /> {t('customerDetail.transactionRequests')}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bell className="w-4 h-4 mr-2" /> {t('common.notifications')}
            </TabsTrigger>
            <TabsTrigger value="access" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Key className="w-4 h-4 mr-2" /> {t('customerDetail.userAccess')}
            </TabsTrigger>
          </TabsList>

          {/* Customer Info Bar with Balance */}
          <div className="bg-card border border-border rounded-lg p-3 mb-6 flex flex-wrap items-center justify-between gap-4 text-sm">
            <div><span className="text-muted-foreground">{t('customerDetail.name')}:</span> <span className="font-medium">{customer.first_name} {customer.last_name}</span></div>
            <div><span className="text-muted-foreground">{t('common.email')}:</span> <span className="text-primary">{customer.email}</span></div>
            <div><span className="text-muted-foreground">{t('admin.caseNumber')}:</span> <span className="font-medium">{customer.case_number || '-'}</span></div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t('customerDetail.balance')}:</span> 
              <span className="font-bold text-primary">
                {formatEuro(customerBalance?.balance || 0)}
              </span>
              <AdjustBalanceDialog 
                customerId={customerId!} 
                currentBalance={customerBalance?.balance || 0}
                currency={customerBalance?.currency || 'EUR'}
                onSuccess={fetchCustomerData}
              >
                <Button size="sm" variant="outline" className="h-6 px-2">
                  <Euro className="h-3 w-3 mr-1" /> {t('customerDetail.adjust')}
                </Button>
              </AdjustBalanceDialog>
            </div>
            <div><span className="text-muted-foreground">{t('admin.subscription')}:</span> <Badge variant="outline" className="ml-1">{customer.subscription || 'BASIC'}</Badge></div>
          </div>

          {/* Case Phase Updater */}
          <div className="mb-6">
            <CasePhaseUpdater 
              customerId={customerId!} 
              currentPhase={customer.case_phase} 
              onUpdate={fetchCustomerData} 
            />
          </div>

          {/* Case Timeline Section */}
          <div className="mb-6">
            <CaseTimelineEditor customerId={customerId!} caseNumber={customer.case_number} />
          </div>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <AgentChatWindow 
              customerId={customerId!}
              customerName={`${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer'}
              className="max-w-2xl"
            />
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="grid md:grid-cols-2 gap-6">
              {/* User Information */}
              <Collapsible open={userInfoOpen} onOpenChange={setUserInfoOpen}>
                <Card className="bg-card border-border">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="border-b border-border cursor-pointer flex-row items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${userInfoOpen ? '' : '-rotate-90'}`} />
                        {t('customerDetail.userInformation')}
                      </CardTitle>
                      {!editingProfile ? (
                        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); startEditingProfile(); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingProfile(false); }} disabled={savingProfile}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-primary" onClick={(e) => { e.stopPropagation(); handleSaveProfile(); }} disabled={savingProfile}>
                            {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                        </div>
                      )}
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-4 space-y-3">
                      {editingProfile ? (
                        <>
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t('customerDetail.firstName')}:</span>
                            <Input 
                              value={editFirstName} 
                              onChange={(e) => setEditFirstName(e.target.value)}
                              className="w-40 h-8 text-sm"
                            />
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t('customerDetail.lastName')}:</span>
                            <Input 
                              value={editLastName} 
                              onChange={(e) => setEditLastName(e.target.value)}
                              className="w-40 h-8 text-sm"
                            />
                          </div>
                          <div className="flex justify-between py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t('common.email')}:</span>
                            <span className="text-muted-foreground text-sm">{customer.email || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t('admin.phone')}:</span>
                            <Input 
                              value={editPhone} 
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="w-40 h-8 text-sm"
                            />
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t('admin.birthdate')}:</span>
                            <Input 
                              type="date"
                              value={editBirthdate} 
                              onChange={(e) => setEditBirthdate(e.target.value)}
                              className="w-40 h-8 text-sm"
                            />
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t('admin.caseNumber')}:</span>
                            <Input 
                              value={editCaseNumber} 
                              onChange={(e) => setEditCaseNumber(e.target.value)}
                              className="w-40 h-8 text-sm"
                            />
                          </div>
                          <div className="flex justify-between py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t('common.status')}:</span>
                            <Select value={customer.status || 'active'} onValueChange={(v) => handleStatusChange(v)}>
                              <SelectTrigger className="w-32 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">{t('common.active')}</SelectItem>
                                <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                                <SelectItem value="suspended">{t('common.suspended')}</SelectItem>
                                <SelectItem value="invalid_language">{t('common.invalidLanguage')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t('customerDetail.currency')}:</span>
                            <Select value={editCurrency} onValueChange={setEditCurrency}>
                              <SelectTrigger className="w-32 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t('admin.subscription')}:</span>
                            <Select value={editSubscription} onValueChange={setEditSubscription}>
                              <SelectTrigger className="w-32 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="BASIC">BASIC</SelectItem>
                                <SelectItem value="PRO">PRO</SelectItem>
                                <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-muted-foreground">{t('customerDetail.assignedAgent')}:</span>
                            <Select 
                              value={customer.assigned_to || 'unassigned'} 
                              onValueChange={(v) => handleAgentAssign(v)}
                            >
                              <SelectTrigger className="w-40 h-7 text-xs">
                                <SelectValue placeholder={t('customerDetail.unassigned')} />
                              </SelectTrigger>
                              <SelectContent className="bg-popover">
                                <SelectItem value="unassigned">{t('customerDetail.unassigned')}</SelectItem>
                                {agents.map((agent) => (
                                  <SelectItem key={agent.id} value={agent.id}>
                                    {agent.first_name} {agent.last_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t('customerDetail.firstName')}:</span>
                            <span>{customer.first_name || '-'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t('customerDetail.lastName')}:</span>
                            <span>{customer.last_name || '-'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t('common.email')}:</span>
                            <span>{customer.email || '-'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t('admin.phone')}:</span>
                            <span>{customer.phone || '-'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t('admin.birthdate')}:</span>
                            <span>{customer.birthdate || '-'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t('admin.caseNumber')}:</span>
                            <span>{customer.case_number || '-'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t('common.status')}:</span>
                            <Select value={customer.status || 'active'} onValueChange={(v) => handleStatusChange(v)}>
                              <SelectTrigger className="w-32 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">{t('common.active')}</SelectItem>
                                <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
                                <SelectItem value="suspended">{t('common.suspended')}</SelectItem>
                                <SelectItem value="invalid_language">{t('common.invalidLanguage')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex justify-between py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t('customerDetail.currency')}:</span>
                            <span>{customer.preferred_currency || 'EUR'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-border/50">
                            <span className="text-muted-foreground">{t('admin.subscription')}:</span>
                            <span>{customer.subscription || 'BASIC'}</span>
                          </div>
                          <div className="flex justify-between py-2">
                            <span className="text-muted-foreground">{t('customerDetail.assignedAgent')}:</span>
                            <Select 
                              value={customer.assigned_to || 'unassigned'} 
                              onValueChange={(v) => handleAgentAssign(v)}
                            >
                              <SelectTrigger className="w-40 h-7 text-xs">
                                <SelectValue placeholder={t('customerDetail.unassigned')} />
                              </SelectTrigger>
                              <SelectContent className="bg-popover">
                                <SelectItem value="unassigned">{t('customerDetail.unassigned')}</SelectItem>
                                {agents.map((agent) => (
                                  <SelectItem key={agent.id} value={agent.id}>
                                    {agent.first_name} {agent.last_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Notes */}
              <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
                <Card className="bg-card border-border">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="border-b border-border cursor-pointer flex-row items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ChevronDown className={`h-4 w-4 transition-transform ${notesOpen ? '' : '-rotate-90'}`} />
                        {t('customerDetail.notes').toUpperCase()}: <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">{notes.length}</Badge>
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); fetchCustomerData(); }}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-primary" onClick={(e) => e.stopPropagation()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="p-4">
                      <div className="flex gap-2 mb-4">
                        <Textarea 
                          value={newNote} 
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder={t('customerDetail.addNoteText')}
                          className="min-h-[80px]"
                        />
                      </div>
                      <Button 
                        size="sm" 
                        onClick={handleAddNote} 
                        disabled={addingNote || !newNote.trim()}
                        className="mb-4"
                      >
                        {addingNote ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                        {t('customerDetail.addNote')}
                      </Button>
                      {notes.length === 0 ? (
                        <p className="text-muted-foreground text-sm">{t('customerDetail.noNotes')}</p>
                      ) : (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {notes.map((note) => (
                            <div key={note.id} className="p-2 bg-secondary rounded text-sm">
                              <p>{note.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {note.created_at ? new Date(note.created_at).toLocaleString() : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>

            {/* KYC Section */}
            <Card className="bg-card border-border mt-6">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ChevronDown className="h-4 w-4" /> KYC:
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <Button variant="default" size="sm" className="bg-blue-500 hover:bg-blue-600">
                  <Plus className="h-4 w-4 mr-2" /> {t('common.add').toUpperCase()} / {t('common.update').toUpperCase()}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Portfolios Tab */}
          <TabsContent value="portfolios">
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 p-3 bg-primary/20 rounded-lg mb-4">
                    <div className="w-10 h-10 bg-primary/30 rounded-lg flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{t('nav.overview')}</p>
                      <p className="text-sm text-muted-foreground">€{totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{t('customerDetail.portfolios')} ({portfolio.length})</p>
                  {Object.keys(cryptoPrices).length > 0 && (
                    <div className={`text-sm flex items-center gap-1 ${profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {profitLoss >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      {profitLoss >= 0 ? '+' : ''}{profitLossPercentage.toFixed(2)}%
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="md:col-span-3">
                <Card className="bg-card border-border">
                  <CardHeader className="border-b border-border flex-row items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-primary" /> {t('customerDetail.totalValue')}
                      </p>
                      <p className="text-3xl font-bold text-primary">€{totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      {Object.keys(cryptoPrices).length > 0 && (
                        <p className={`text-sm flex items-center gap-1 ${profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {profitLoss >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {profitLoss >= 0 ? '+' : ''}€{Math.abs(profitLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({profitLossPercentage >= 0 ? '+' : ''}{profitLossPercentage.toFixed(2)}%)
                        </p>
                      )}
                    </div>
                    <AddPortfolioForClientDialog customerId={customerId!} onSuccess={fetchCustomerData}>
                      <Button size="sm" className="bg-primary">
                        <Plus className="h-4 w-4 mr-2" /> {t('customerDetail.addPortfolio')}
                      </Button>
                    </AddPortfolioForClientDialog>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead>Asset</TableHead>
                          <TableHead>{t('portfolio.walletAddress')}</TableHead>
                          <TableHead>{t('crypto.currentPrice')}</TableHead>
                          <TableHead>Avg. Cost</TableHead>
                          <TableHead>{t('customerDetail.balance')}</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>{t('crypto.profitLoss')}</TableHead>
                          <TableHead className="text-right">{t('common.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {portfolio.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">{t('customerDetail.noPortfolio')}</TableCell>
                          </TableRow>
                        ) : (
                          portfolio.map((item) => {
                            const livePrice = cryptoPrices[item.crypto_id];
                            const currentValue = livePrice ? livePrice.current_price * item.quantity : item.purchase_price * item.quantity;
                            const invested = item.purchase_price * item.quantity;
                            const itemProfitLoss = currentValue - invested;
                            const itemProfitLossPercentage = invested > 0 ? (itemProfitLoss / invested) * 100 : 0;

                            return (
                              <TableRow key={item.id} className="border-border">
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {livePrice?.image ? (
                                      <img src={livePrice.image} alt={item.crypto_name} className="w-8 h-8 rounded-full" />
                                    ) : (
                                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-xs font-bold">
                                        {item.crypto_symbol.substring(0, 2)}
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-medium">{item.crypto_name}</p>
                                      <p className="text-xs text-muted-foreground">{item.crypto_symbol.toUpperCase()}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {item.wallet_address ? (
                                    <span title={item.wallet_address} className="cursor-help">
                                      {item.wallet_address.substring(0, 6)}...{item.wallet_address.slice(-4)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {livePrice ? (
                                    <div>
                                      <p className="font-medium">€{livePrice.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                      <p className={`text-xs ${livePrice.price_change_percentage_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {livePrice.price_change_percentage_24h >= 0 ? '+' : ''}{livePrice.price_change_percentage_24h.toFixed(2)}%
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">---</span>
                                  )}
                                </TableCell>
                                <TableCell>€{item.purchase_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                <TableCell>{item.quantity.toFixed(6)} {item.crypto_symbol.toUpperCase()}</TableCell>
                                <TableCell>€{currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                <TableCell>
                                  {livePrice ? (
                                    <div className={itemProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                                      <p className="font-medium">{itemProfitLoss >= 0 ? '+' : ''}€{itemProfitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                      <p className="text-xs">{itemProfitLossPercentage >= 0 ? '+' : ''}{itemProfitLossPercentage.toFixed(2)}%</p>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">---</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <EditPortfolioItemDialog portfolioItem={item} onSuccess={fetchCustomerData}>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="text-muted-foreground hover:text-foreground"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </EditPortfolioItemDialog>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => handleDeletePortfolioItem(item.id)}
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Transaction Requests Tab */}
          <TabsContent value="transactions">
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border">
                <CardTitle className="text-sm">{t('transactions.allTypes').toUpperCase()}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Id</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                      <TableHead>Processed by</TableHead>
                      <TableHead>Processed time</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t('customerDetail.noTransactions')}</TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((tx, idx) => (
                        <TableRow key={tx.id} className="border-border">
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="capitalize">{tx.type}</TableCell>
                          <TableCell>€{tx.amount.toLocaleString()}</TableCell>
                          <TableCell className="capitalize">{tx.method.replace('_', ' ')}</TableCell>
                          <TableCell>{tx.created_at ? new Date(tx.created_at).toLocaleString() : '-'}</TableCell>
                          <TableCell>
                            <Badge className={`${statusColors[tx.status]} border-0`}>
                              {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{tx.processed_by || '-'}</TableCell>
                          <TableCell>{tx.processed_at ? new Date(tx.processed_at).toLocaleString() : '-'}</TableCell>
                          <TableCell className="text-right">
                            {tx.status === 'pending' && (
                              <div className="flex gap-1 justify-end">
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-green-400" onClick={() => handleTransactionAction(tx.id, 'approved')}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400" onClick={() => handleTransactionAction(tx.id, 'rejected')}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4" /> {t('common.notifications')}
                  <Badge variant="secondary">{notifications.length}</Badge>
                </CardTitle>
                <CreateNotificationDialog 
                  userId={customerId!}
                  userName={`${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Customer'}
                  onSuccess={fetchCustomerData}
                />
              </CardHeader>
              <CardContent className="p-0">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('customerDetail.noNotifications')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {notifications.map((notif) => (
                      <div key={notif.id} className="p-4 flex items-start gap-3 hover:bg-secondary/50 transition-colors">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{notif.title}</p>
                            {!notif.is_read && (
                              <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
                                {t('notifications.unread')}
                              </Badge>
                            )}
                          </div>
                          {notif.message && (
                            <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {notif.created_at ? formatDistanceToNow(new Date(notif.created_at), { addSuffix: true }) : ''}
                          </p>
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="flex-shrink-0 h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteNotification(notif.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access">
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Key className="h-4 w-4" /> {t('customerDetail.userAccess')}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {(isAdmin || isGroupAdmin || isSupervisor) && (
                    <DirectPasswordResetDialog
                      userId={customerId!}
                      userEmail={customer.email}
                      onSuccess={fetchCustomerData}
                    />
                  )}
                  <ResetPasswordDialog
                    userId={customerId!}
                    userEmail={customer.email}
                    onSuccess={fetchCustomerData}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>{t('customerDetail.loginTime')}</TableHead>
                      <TableHead>{t('customerDetail.ip')}</TableHead>
                      <TableHead>Access token</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t('customerDetail.noSessions')}</TableCell>
                      </TableRow>
                    ) : (
                      sessions.map((session) => (
                        <TableRow key={session.id} className="border-border">
                          <TableCell>{session.login_time ? new Date(session.login_time).toLocaleString() : '-'}</TableCell>
                          <TableCell className="font-mono text-sm">{session.login_ip || '-'}</TableCell>
                          <TableCell className="font-mono text-xs max-w-[300px] truncate">{session.access_token || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="destructive">{t('common.remove')}</Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default CustomerDetail;
