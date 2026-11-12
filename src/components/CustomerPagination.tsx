import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface CustomerPaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  setPage: (page: number) => void;
}

export function CustomerPagination({ page, pageCount, pageSize, total, setPage }: CustomerPaginationProps) {
  const { t } = useLanguage();
  if (pageCount <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
      <span>{page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} / {total}</span>
      <div className="ml-auto flex gap-2">
        <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>{t('common.previous')}</Button>
        <Button size="sm" variant="outline" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>{t('common.next')}</Button>
      </div>
    </div>
  );
}
