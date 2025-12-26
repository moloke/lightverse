"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const childrenArray = React.Children.toArray(children)
  const trigger = childrenArray.find(child => React.isValidElement(child) && child.type === DropdownMenuTrigger)
  const content = childrenArray.find(child => React.isValidElement(child) && child.type === DropdownMenuContent)

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {React.isValidElement(trigger) && React.cloneElement(trigger as React.ReactElement<any>, {
        onClick: () => setIsOpen(!isOpen),
        isOpen
      })}
      {isOpen && content && (
        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
          {React.isValidElement(content) && React.cloneElement(content as React.ReactElement<any>, {
            onClose: () => setIsOpen(false)
          })}
        </div>
      )}
    </div>
  )
}

export function DropdownMenuTrigger({ 
  children, 
  onClick, 
  isOpen 
}: { 
  children: React.ReactNode
  onClick?: () => void
  isOpen?: boolean 
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors min-w-[140px]"
    >
      {children}
      <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  )
}

export function DropdownMenuContent({ 
  children, 
  onClose 
}: { 
  children: React.ReactNode
  onClose?: () => void 
}) {
  return (
    <div className="py-1" onClick={onClose}>
      {children}
    </div>
  )
}

export function DropdownMenuItem({ 
  children, 
  onClick 
}: { 
  children: React.ReactNode
  onClick?: () => void 
}) {
  return (
    <button
      onClick={onClick}
      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
    >
      {children}
    </button>
  )
}
