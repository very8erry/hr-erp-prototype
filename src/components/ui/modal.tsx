import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'

/** Controlled adapter keeps existing form submit and close handlers intact. */
export function Modal({ children, onClose, onClick, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }) {
  const child = React.Children.only(children) as React.ReactElement<Record<string, unknown>>
  const childProps = child.props
  const label = typeof childProps['aria-label'] === 'string' ? childProps['aria-label'] : '업무 입력 및 상세'
  if (typeof document === 'undefined') return <div className={className} {...props}>{child}</div>
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose?.() }}>
    <Dialog.Portal>
      <Dialog.Overlay {...props} className={`ui-dialog-overlay ${className ?? ''}`} onClick={event => { onClick?.(event); if (!event.defaultPrevented) onClose?.() }} />
      <Dialog.Content asChild aria-describedby={undefined} onEscapeKeyDown={event => { if (!onClose) event.preventDefault() }} onPointerDownOutside={event => { if (!onClose && !onClick) event.preventDefault() }}>
        {React.cloneElement(child, { 'data-slot': 'dialog-content', 'aria-label': label, children: <><Dialog.Title className="sr-only">{label}</Dialog.Title>{childProps.children as React.ReactNode}</> })}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
