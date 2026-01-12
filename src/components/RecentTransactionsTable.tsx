import type { Transaction } from '../types'

type RecentTransactionsTableProps = {
  transactions: Transaction[]
  loading?: boolean
}

export function RecentTransactionsTable({ transactions, loading = false }: RecentTransactionsTableProps) {
  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Transactions</h3>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="animate-pulse h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Transactions</h3>
        <div className="text-center py-8 text-gray-400">
          <p className="text-2xl mb-2">💰</p>
          <p className="text-sm">No transactions yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-green-50">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Transactions</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 font-medium text-gray-600">Type</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Description</th>
              <th className="text-left py-3 px-2 font-medium text-gray-600">Date</th>
              <th className="text-right py-3 px-2 font-medium text-gray-600">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    transaction.type === 'payment' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {transaction.type === 'payment' ? '💵 Payment' : '💸 Expense'}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-800">{transaction.description}</span>
                    {transaction.student_name && (
                      <span className="text-xs text-gray-500">{transaction.student_name}</span>
                    )}
                    {transaction.category && (
                      <span className="text-xs text-gray-500">{transaction.category}</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-2 text-gray-600">
                  {new Date(transaction.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </td>
                <td className={`py-3 px-2 text-right font-semibold ${
                  transaction.type === 'payment' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.type === 'payment' ? '+' : '-'}AED {transaction.amount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
