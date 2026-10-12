import * as React from 'react'
import { cn } from '../../lib/utils'

/** Native semantics preserve existing option, form and change-event contracts. */
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(
  ({ className, ...props }, ref) => <select ref={ref} data-slot="native-select" className={cn('ui-native-select', className)} {...props} />
)
NativeSelect.displayName = 'NativeSelect'
