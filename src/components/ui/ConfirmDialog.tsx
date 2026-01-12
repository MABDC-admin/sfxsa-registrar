import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { Modal } from './Modal'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger'
  icon?: ReactNode
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setIsOpen(true)
    return new Promise((resolve) => {
      setResolveRef(() => resolve)
    })
  }, [])

  const handleConfirm = () => {
    setIsOpen(false)
    resolveRef?.(true)
    setResolveRef(null)
  }

  const handleCancel = () => {
    setIsOpen(false)
    resolveRef?.(false)
    setResolveRef(null)
  }

  const isDanger = options?.variant === 'danger'

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      <Modal
        isOpen={isOpen}
        onClose={handleCancel}
        size="sm"
        showCloseButton={false}
      >
        <div className="text-center py-4">
          {/* Icon */}
          <div className={`
            w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl
            ${isDanger ? 'bg-red-100' : 'bg-primary-100'}
          `}>
            {options?.icon || (isDanger ? '⚠️' : 'ℹ️')}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {options?.title}
          </h3>

          {/* Message */}
          <p className="text-gray-500 mb-6">
            {options?.message}
          </p>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleCancel}
              className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors font-medium"
            >
              {options?.cancelText || 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              className={`
                px-6 py-2.5 rounded-xl text-white font-medium transition-colors
                ${isDanger 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-primary-500 hover:bg-primary-600'
                }
              `}
              style={!isDanger ? { backgroundColor: '#5B8C51' } : undefined}
            >
              {options?.confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context.confirm
}

// Standalone confirm dialog component for direct use
export interface ConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger'
  icon?: ReactNode
  loading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  icon,
  loading = false,
}: ConfirmDialogProps) {
  const isDanger = variant === 'danger'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="sm"
      showCloseButton={false}
    >
      <div className="text-center py-4">
        {/* Icon */}
        <div className={`
          w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl
          ${isDanger ? 'bg-red-100' : 'bg-green-100'}
        `}>
          {icon || (isDanger ? '🗑️' : 'ℹ️')}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-gray-500 mb-6">
          {message}
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`
              px-6 py-2.5 rounded-xl text-white font-medium transition-colors flex items-center gap-2
              disabled:opacity-50
              ${isDanger 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-primary-500 hover:bg-primary-600'
              }
            `}
            style={!isDanger ? { backgroundColor: '#5B8C51' } : undefined}
          >
            {loading && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}
