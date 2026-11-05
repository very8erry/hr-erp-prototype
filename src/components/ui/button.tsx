import * as React from "react"
import { Modal } from "./modal"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    variant ??= className?.split(/\s+/).includes("primary") ? "default" : className?.includes("danger") ? "destructive" : "outline"
    const [pending,setPending]=React.useState<{context:string;proceed:()=>void}|null>(null)
    const Comp = asChild ? Slot : "button"
    return (
      <> <Comp
        data-slot="button"
        data-variant={variant}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
        onClick={(event:React.MouseEvent<HTMLButtonElement>)=>{
          const button=event.currentTarget,title=button.getAttribute('aria-label')||button.textContent||'';
          if((/삭제|제거/.test(title)||!!button.querySelector('[class*=trash]'))&&!String(props.onClick).includes('confirm(')){
            event.preventDefault();event.stopPropagation();
            const row=button.closest('tr,article,.manualDayRow,.policyAttachmentRow');
            const context=(button.getAttribute('aria-label')||row?.querySelector('td,strong,h3,h4')?.textContent||title).trim().slice(0,120);
            const replay={...event,currentTarget:button,target:event.target,preventDefault:()=>event.preventDefault(),stopPropagation:()=>event.stopPropagation()} as React.MouseEvent<HTMLButtonElement>;
            setPending({context,proceed:()=>{if(props.onClick)props.onClick(replay);else if(button.type==='submit')button.form?.requestSubmit(button)}});return;
          }
          props.onClick?.(event)
        }}
      />{pending&&<Modal onClose={()=>setPending(null)}><div className="modal deleteConfirm" role="alertdialog" aria-label="삭제 확인"><h3>삭제 확인</h3><p>진짜 [{pending.context}] 삭제하시겠습니까?</p><div className="modalActions"><button type="button" onClick={()=>setPending(null)}>취소</button><button type="button" className="danger" onClick={()=>{const proceed=pending.proceed;setPending(null);proceed()}}>삭제</button></div></div></Modal>}</>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
