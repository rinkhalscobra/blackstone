import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Key, Check, X, Loader2, RefreshCw, Clock, Eye, EyeOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PasswordResetRequest {
  id: string;
  target_user_id: string;
  requested_by: string;
  status: string;
  new_password_hash?: string;
  reason: string | null;
  created_at: string;
  target_user?: {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  };
  requester?: {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  };
}

export default function PasswordResetRequests() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('password_reset_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user details for each request
      const requestsWithUsers = await Promise.all(
        (data || []).map(async (request) => {
          const [targetRes, requesterRes] = await Promise.all([
            supabase.from('profiles').select('email, first_name, last_name').eq('id', request.target_user_id).single(),
            supabase.from('profiles').select('email, first_name, last_name').eq('id', request.requested_by).single(),
          ]);
          return {
            ...request,
            target_user: targetRes.data,
            requester: requesterRes.data,
          };
        })
      );

      setRequests(requestsWithUsers);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    const channel = supabase
      .channel('password-reset-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'password_reset_requests' },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAction = async (requestId: string, action: 'approve' | 'reject', password?: string) => {
    setProcessingId(requestId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-password-reset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            requestId,
            action,
            newPassword: password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Failed to ${action} request`);
      }

      toast({
        title: t('common.success'),
        description: action === 'approve' 
          ? t('customerDetail.passwordResetApproved')
          : t('customerDetail.passwordResetRejected'),
      });

      setApproveDialogOpen(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openApproveDialog = (request: PasswordResetRequest) => {
    setSelectedRequest(request);
    setShowPassword(false);
    setApproveDialogOpen(true);
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    approved: 'bg-green-500/20 text-green-400',
    rejected: 'bg-red-500/20 text-red-400',
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="h-4 w-4" />
            {t('admin.passwordResetRequests')}
            {requests.length > 0 && (
              <Badge variant="destructive">{requests.length}</Badge>
            )}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchRequests}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.refresh')}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="py-12 text-center">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('admin.noPasswordResetRequests')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>{t('admin.targetUser')}</TableHead>
                  <TableHead>{t('admin.requestedBy')}</TableHead>
                  <TableHead>{t('dialogs.reason')}</TableHead>
                  <TableHead>{t('admin.timestamp')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id} className="border-border">
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {request.target_user?.first_name} {request.target_user?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{request.target_user?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {request.requester?.first_name} {request.requester?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{request.requester?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {request.reason || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">
                          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-400 hover:text-green-300"
                          onClick={() => openApproveDialog(request)}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          <span className="ml-1">{t('customerDetail.approve')}</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => handleAction(request.id, 'reject')}
                          disabled={processingId === request.id}
                        >
                          <X className="h-4 w-4" />
                          <span className="ml-1">{t('customerDetail.reject')}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-400" />
              {t('admin.approvePasswordReset')}
            </DialogTitle>
            <DialogDescription>
              {t('admin.approvePasswordResetFor')} {selectedRequest?.target_user?.email}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('customerDetail.newPassword')}</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={selectedRequest.new_password_hash}
                      readOnly
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {selectedRequest.reason && (
                <div className="space-y-2">
                  <Label>{t('dialogs.reason')}</Label>
                  <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
                    {selectedRequest.reason}
                  </p>
                </div>
              )}

              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                <p className="text-xs text-green-600 dark:text-green-400">
                  {t('admin.approvePasswordResetNote')}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)} disabled={!!processingId}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => selectedRequest && handleAction(selectedRequest.id, 'approve', selectedRequest.new_password_hash)}
              disabled={!!processingId}
              className="bg-green-600 hover:bg-green-700"
            >
              {processingId && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('admin.approveReset')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
