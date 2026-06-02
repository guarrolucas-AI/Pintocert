'use client'

import * as React from 'react'
import { Button } from './button'

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function Tabs({ value, onValueChange, children, className = '' }: TabsProps) {
  return (
    <div className={className}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === TabsList) {
          return React.cloneElement(child, { value, onValueChange } as any)
        }
        if (React.isValidElement(child) && child.type === TabsContent) {
          return React.cloneElement(child, { activeValue: value } as any)
        }
        return child
      })}
    </div>
  )
}

export function TabsList({ children, className = '', value, onValueChange }: TabsListProps & { value?: string; onValueChange?: (v: string) => void }) {
  return (
    <div className={`flex gap-0 border-b ${className}`}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === TabsTrigger) {
          const props = child.props as any
          return React.cloneElement(child, { active: value === props.value, onClick: () => onValueChange?.(props.value) } as any)
        }
        return child
      })}
    </div>
  )
}

export function TabsTrigger({ value, children, className = '', active = false, onClick }: TabsTriggerProps & { active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
        active
          ? 'text-slate-900 border-b-2 border-slate-900'
          : 'text-slate-600 hover:text-slate-900 border-b-2 border-transparent'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, activeValue, className = '' }: TabsContentProps & { activeValue?: string }) {
  if (activeValue !== value) return null
  return <div className={`py-4 ${className}`}>{children}</div>
}
