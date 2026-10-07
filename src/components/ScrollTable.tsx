import {applyFreeze} from './tableFreeze'
import {useEffect,useRef,type ReactNode} from 'react'
export function ScrollTable({children}:{children:ReactNode}){
 const ref=useRef<HTMLDivElement>(null)
 useEffect(()=>{const root=ref.current;if(!root)return
  const apply=()=>root.querySelectorAll('table').forEach(applyFreeze)
  apply();const resize=new ResizeObserver(apply);resize.observe(root);return()=>resize.disconnect()
 },[children])
 return <div ref={ref} className="tableWrap dataTableViewport" tabIndex={0} aria-label="표 가로 스크롤">{children}</div>
}
