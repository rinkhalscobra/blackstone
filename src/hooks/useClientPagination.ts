import { useState } from 'react';

export const useClientPagination = <T,>(items: T[], filterKey: string, pageSize = 50) => {
  const [selection, setSelection] = useState({ filterKey, page: 0 });
  if (selection.filterKey !== filterKey) setSelection({ filterKey, page: 0 });
  const pageCount = Math.ceil(items.length / pageSize);
  const page = selection.filterKey === filterKey ? Math.min(selection.page, Math.max(0, pageCount - 1)) : 0;
  return {
    items: items.slice(page * pageSize, (page + 1) * pageSize),
    page,
    pageCount,
    pageSize,
    total: items.length,
    setPage: (next: number) => setSelection({ filterKey, page: Math.max(0, Math.min(next, pageCount - 1)) }),
  };
};
