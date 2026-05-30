import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, UserRound } from 'lucide-react'
import { clsx } from 'clsx'
import type { AssignableUser } from '../../../shared/api/users'

type AssigneeSelectProps = {
  value: string
  users: AssignableUser[]
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string // e.g., "미지정" or "전체 담당자"
  className?: string
}

export function AssigneeSelect({
  value,
  users,
  onChange,
  disabled,
  placeholder = '미지정',
  className,
}: AssigneeSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })

  const selectedUser = users.find((user) => user.id === value)

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }

  useEffect(() => {
    if (isOpen) {
      updateCoords()
      window.addEventListener('resize', updateCoords)
      window.addEventListener('scroll', updateCoords, true)
    }
    return () => {
      window.removeEventListener('resize', updateCoords)
      window.removeEventListener('scroll', updateCoords, true)
    }
  }, [isOpen])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const getInitials = (name: string) => {
    if (!name) return '?'
    return name.slice(0, 2)
  }

  return (
    <div className={clsx('relative inline-block w-full text-left', className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex h-9 min-h-9 w-full items-center justify-between gap-1.5 rounded-md border border-surface-border-soft bg-surface-raised pl-2.5 pr-2.5 text-xs font-semibold leading-none text-text-primary shadow-none outline-none transition-all hover:border-brand-border/70 focus:border-brand-border focus:ring-1 focus:ring-brand-border/15 disabled:cursor-not-allowed disabled:opacity-60',
          isOpen && 'border-brand-border ring-1 ring-brand-border/15',
        )}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {selectedUser ? (
            <>
              {selectedUser.profileImageUrl ? (
                <img
                  src={selectedUser.profileImageUrl}
                  alt={selectedUser.name}
                  className="size-4.5 shrink-0 rounded-full object-cover border border-surface-border-soft"
                />
              ) : (
                <div className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-brand-glass text-[9px] font-black text-brand-primary uppercase">
                  {getInitials(selectedUser.name)}
                </div>
              )}
              <span className="truncate text-[13px] font-medium">{selectedUser.name}</span>
            </>
          ) : (
            <>
              <div className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-muted">
                <UserRound className="size-2.5" />
              </div>
              <span className="truncate text-[13px] font-medium text-text-muted">{placeholder}</span>
            </>
          )}
        </div>
        <ChevronDown
          className={clsx(
            'size-3.5 shrink-0 text-text-muted transition-transform duration-200',
            isOpen && 'rotate-180 text-brand-primary',
          )}
        />
      </button>

      {/* Popover Dropdown List (Rendered via React Portal in document.body to avoid parent table clipping) */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: `${coords.top + 6}px`,
              left: `${coords.left}px`,
              width: `${Math.max(288, coords.width)}px`, // w-72 is 288px, or stretch to match button if button is wider
            }}
            className="z-[9999] max-h-60 origin-top-left overflow-y-auto rounded-lg border border-surface-border bg-surface-raised p-1 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <div className="grid gap-0.5">
              {/* Unassigned/All Option */}
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setIsOpen(false)
                }}
                className={clsx(
                  'flex w-full items-center justify-between gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-all duration-150',
                  !value
                    ? 'bg-brand-glass text-brand-primary font-bold'
                    : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary',
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={clsx(
                      'flex size-6 shrink-0 items-center justify-center rounded-full text-xs',
                      !value ? 'bg-brand-primary text-primary-foreground' : 'bg-surface-muted text-text-muted',
                    )}
                  >
                    <UserRound className="size-3" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold">{placeholder}</p>
                  </div>
                </div>
                {!value && <Check className="size-3.5 shrink-0 text-brand-primary" />}
              </button>

              {/* User Options */}
              {users.map((user) => {
                const isSelected = user.id === value
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      onChange(user.id)
                      setIsOpen(false)
                    }}
                    className={clsx(
                      'flex w-full items-center justify-between gap-2.5 rounded-md px-2.5 py-2 text-left transition-all duration-150',
                      isSelected
                        ? 'bg-brand-glass text-brand-primary font-bold'
                        : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {user.profileImageUrl ? (
                        <img
                          src={user.profileImageUrl}
                          alt={user.name}
                          className="size-6 shrink-0 rounded-full object-cover border border-surface-border-soft"
                        />
                      ) : (
                        <div
                          className={clsx(
                            'flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black uppercase',
                            isSelected ? 'bg-brand-primary text-primary-foreground' : 'bg-brand-glass text-brand-primary',
                          )}
                        >
                          {getInitials(user.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold leading-tight">{user.name}</p>
                        <p
                          className={clsx(
                            'truncate text-[11px] leading-tight mt-0.5',
                            isSelected ? 'text-brand-primary opacity-80' : 'text-text-muted',
                          )}
                        >
                          {user.email}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="size-3.5 shrink-0 text-brand-primary" />}
                  </button>
                )
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
