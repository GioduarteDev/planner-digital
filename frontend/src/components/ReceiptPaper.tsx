import type { ReactNode } from 'react'
import './ReceiptPaper.css'

export default function ReceiptPaper({
  children,
  className = '',
  label,
}: {
  children: ReactNode
  className?: string
  label: string
}) {
  return (
    <div className={`receipt-paper ${className}`.trim()}>
      <div className="receipt-paper-heading" aria-hidden="true">
        <span className="receipt-paper-brand">MATCHA PLANNER</span>
        <span className="receipt-paper-label">{label}</span>
      </div>
      {children}
    </div>
  )
}
