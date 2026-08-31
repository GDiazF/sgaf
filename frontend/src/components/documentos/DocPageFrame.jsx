import { useEffect, useRef, useState } from 'react'
import { PAGE_GAP_PX, publishDefaultChrome, subscribePageChrome } from './layoutPageBreaks.js'

/**
 * Marco de hoja(s) blanco(s). React posee los nodos .doc-sheet.
 */
export function DocPageFrame({ className = '', style, hidden, children }) {
  const ref = useRef(null)
  const [chrome, setChrome] = useState({
    count: 1,
    pageH: null,
    gap: PAGE_GAP_PX,
    lastHeight: null,
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const unsub = subscribePageChrome(el, (next) => {
      if (!next) return
      setChrome((prev) => {
        if (
          prev.count === next.count
          && prev.pageH === next.pageH
          && prev.gap === next.gap
          && prev.lastHeight === next.lastHeight
        ) {
          return prev
        }
        return next
      })
    })
    publishDefaultChrome(el)
    return unsub
  }, [])

  const { count, pageH, gap, lastHeight } = chrome
  const gutters = Math.max(0, count - 1)

  return (
    <div
      ref={ref}
      className={`doc-page${className ? ` ${className}` : ''}`}
      style={style}
      hidden={hidden}
    >
      <div className="doc-page__sheets" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => {
          const isLast = index === count - 1
          const sheetStyle = pageH == null
            ? { top: 0 }
            : {
                top: index * (pageH + gap),
                height: isLast && lastHeight != null ? lastHeight : pageH,
              }
          return <div key={index} className="doc-sheet" style={sheetStyle} />
        })}
      </div>
      <div className="doc-page__gutters" aria-hidden="true">
        {pageH != null
          && Array.from({ length: gutters }, (_, index) => (
            <div
              key={index}
              className="doc-page__gutter"
              style={{
                top: pageH + index * (pageH + gap),
                height: gap,
              }}
            />
          ))}
      </div>
      {children}
    </div>
  )
}
