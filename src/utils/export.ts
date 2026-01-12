// Export Utilities for CSV/Excel Export

/**
 * Convert data array to CSV string
 */
export function toCSV<T extends Record<string, any>>(
  data: T[],
  columns?: { key: keyof T; header: string }[]
): string {
  if (data.length === 0) return ''

  // Use provided columns or derive from first item
  const cols = columns || Object.keys(data[0]).map(key => ({ key: key as keyof T, header: key }))
  
  // Header row
  const header = cols.map(col => escapeCSV(col.header)).join(',')
  
  // Data rows
  const rows = data.map(row =>
    cols.map(col => {
      const value = row[col.key]
      return escapeCSV(formatValue(value))
    }).join(',')
  )

  return [header, ...rows].join('\n')
}

/**
 * Escape CSV special characters
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Format value for CSV export
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value instanceof Date) return value.toLocaleDateString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * Download data as CSV file
 */
export function downloadCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header: string }[]
): void {
  const csv = toCSV(data, columns)
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`)
}

/**
 * Download data as JSON file
 */
export function downloadJSON<T>(data: T[], filename: string): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  downloadBlob(blob, filename.endsWith('.json') ? filename : `${filename}.json`)
}

/**
 * Download blob as file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export to Excel-compatible format (actually TSV with .xls extension)
 * For true Excel support, you'd need a library like xlsx
 */
export function downloadExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header: string }[]
): void {
  if (data.length === 0) return

  const cols = columns || Object.keys(data[0]).map(key => ({ key: key as keyof T, header: key }))
  
  // Create HTML table for Excel
  let html = '<html><head><meta charset="UTF-8"></head><body><table border="1">'
  
  // Header row
  html += '<tr>'
  cols.forEach(col => {
    html += `<th style="background-color:#f0f0f0;font-weight:bold;">${escapeHTML(col.header)}</th>`
  })
  html += '</tr>'
  
  // Data rows
  data.forEach(row => {
    html += '<tr>'
    cols.forEach(col => {
      const value = formatValue(row[col.key])
      html += `<td>${escapeHTML(value)}</td>`
    })
    html += '</tr>'
  })
  
  html += '</table></body></html>'
  
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  downloadBlob(blob, filename.endsWith('.xls') ? filename : `${filename}.xls`)
}

/**
 * Escape HTML special characters
 */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Print data as a table
 */
export function printTable<T extends Record<string, any>>(
  data: T[],
  title: string,
  columns?: { key: keyof T; header: string }[]
): void {
  if (data.length === 0) return

  const cols = columns || Object.keys(data[0]).map(key => ({ key: key as keyof T, header: key }))
  
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${escapeHTML(title)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { font-size: 18px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        tr:nth-child(even) { background-color: #fafafa; }
        @media print {
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>${escapeHTML(title)}</h1>
      <table>
        <thead>
          <tr>
            ${cols.map(col => `<th>${escapeHTML(col.header)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${cols.map(col => `<td>${escapeHTML(formatValue(row[col.key]))}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <br>
      <button onclick="window.print()">Print</button>
    </body>
    </html>
  `

  printWindow.document.write(html)
  printWindow.document.close()
}

/**
 * Copy data to clipboard as tab-separated values
 */
export async function copyToClipboard<T extends Record<string, any>>(
  data: T[],
  columns?: { key: keyof T; header: string }[]
): Promise<boolean> {
  if (data.length === 0) return false

  const cols = columns || Object.keys(data[0]).map(key => ({ key: key as keyof T, header: key }))
  
  const header = cols.map(col => col.header).join('\t')
  const rows = data.map(row =>
    cols.map(col => formatValue(row[col.key])).join('\t')
  )
  
  const text = [header, ...rows].join('\n')
  
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
