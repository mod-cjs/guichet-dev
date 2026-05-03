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
  if (loading) return <div className="text-center py-8 text-cjs-gris">Chargement…</div>
  if (data.length === 0) return <div className="text-center py-8 text-cjs-gris">{emptyMessage}</div>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {columns.map(col => (
              <th key={String(col.key)} className="px-4 py-3 text-left font-semibold text-cjs-noir">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              {columns.map(col => (
                <td key={String(col.key)} className="px-4 py-3 text-cjs-noir">
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
