interface Column<T> { key: keyof T; label: string; render?: (value: T[keyof T], row: T) => React.ReactNode }

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  emptyMessage?: string
  loading?: boolean
}

export function DataTable<T extends { id: string }>({
  data, columns, emptyMessage = 'Aucune donnée', loading
}: DataTableProps<T>) {
  if (loading) return <div className="text-center py-space-5 text-color-text-muted text-fs-300">Chargement…</div>
  if (data.length === 0) return <div className="text-center py-space-5 text-color-text-muted text-fs-300">{emptyMessage}</div>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-fs-300">
        <thead>
          <tr className="border-b border-color-border-strong bg-gj-bg">
            {columns.map(col => (
              <th key={String(col.key)} className="px-space-4 py-space-3 text-left font-bold text-color-text-primary">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.id} className="border-b border-color-border-default hover:bg-gj-bg transition-colors">
              {columns.map(col => (
                <td key={String(col.key)} className="px-space-4 py-space-3 text-color-text-primary">
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
