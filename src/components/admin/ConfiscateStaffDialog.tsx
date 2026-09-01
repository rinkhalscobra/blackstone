import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldAlert, Loader2, Download, AlertTriangle } from 'lucide-react';

interface ConfiscationResult {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  new_password: string;
  status: 'ok' | 'error';
  error?: string;
}

export default function ConfiscateStaffDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ConfiscationResult[] | null>(null);

  const reset = () => {
    setConfirmText('');
    setResults(null);
    setLoading(false);
  };

  const handleConfiscate = async () => {
    if (confirmText !== 'CONFISCATE') return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('confiscate-blackstone-staff', { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const list: ConfiscationResult[] = data?.results ?? [];
      setResults(list);
      // Auto-download CSV
      downloadCsv(list);
      const okCount = list.filter((r) => r.status === 'ok').length;
      toast({
        title: 'Regime change executed',
        description: `Reset ${okCount} of ${list.length} BlackStone Recovery staff passwords. CSV downloaded.`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast({ title: 'Confiscation failed', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = (list: ConfiscationResult[]) => {
    const escape = (v: unknown) => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = 'email,first_name,last_name,role,new_password,status,error';
    const rows = list.map((r) =>
      [r.email, r.first_name, r.last_name, r.role, r.new_password, r.status, r.error ?? '']
        .map(escape).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blackstone-staff-confiscated-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <ShieldAlert className="h-4 w-4 mr-2" />
          Confiscate BlackStone Recovery Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Regime Change — Confiscate BlackStone Recovery Staff
          </DialogTitle>
          <DialogDescription>
            This will immediately reset the passwords of every BlackStone Recovery staff member
            (group admins, supervisors, and agents) except you. New random passwords
            will be generated and downloaded as a CSV. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {!results && (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm">
              All existing BlackStone Recovery accounts (staff + clients) have already been hidden
              from dashboards via the archive flag — no data was deleted. This step
              additionally locks staff out of their accounts.
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Type <code className="font-mono font-bold">CONFISCATE</code> to proceed</Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="CONFISCATE"
                autoComplete="off"
              />
            </div>
          </div>
        )}

        {results && (
          <div className="space-y-3 max-h-[50vh] overflow-auto">
            <div className="text-sm">
              <span className="font-semibold">{results.filter((r) => r.status === 'ok').length}</span> of{' '}
              <span className="font-semibold">{results.length}</span> accounts reset successfully.
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>New Password</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.email}</TableCell>
                    <TableCell className="text-xs">{r.role}</TableCell>
                    <TableCell className="text-xs">
                      {r.status === 'ok' ? '✓' : `✗ ${r.error ?? ''}`}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{r.new_password}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          {!results ? (
            <>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleConfiscate}
                disabled={loading || confirmText !== 'CONFISCATE'}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confiscate Now
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => downloadCsv(results)}>
                <Download className="h-4 w-4 mr-2" />
                Download CSV again
              </Button>
              <Button onClick={() => setOpen(false)}>Close</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
