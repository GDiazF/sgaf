import { useEffect, useRef, useState } from 'react'
import { PAGE_GAP_PX, publishDefaultChrome, subscribePageChrome } from './layoutPageBreaks.js'
import { DocHfBands } from './DocHfBands.jsx'

/**
 * Marco de hoja(s) blanco(s). React posee los nodos .doc-sheet.
 * variant: body (paginado) | header | footer (banda compacta como en el PDF).
 */
export function DocPageFrame({
  className = '',
  style,
  hidden,
  children,
  variant = 'body',
  hfOverlay,
}) {
  const ref = useRef(null)
  const isBody = variant === 'body'
  const [chrome, setChrome] = useState({
    count: 1,
    pageH: null,
    gap: PAGE_GAP_PX,
    lastHeight: null,
  })

  useEffect(() => {
    const el = ref.current
    if (!el || !isBody) return undefined
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
  }, [style, isBody])

  const { count, pageH, gap, lastHeight } = chrome
  const gutters = isBody ? Math.max(0, count - 1) : 0
  const sheetCount = isBody ? count : 1

  return (
    <div
      ref={ref}
      className={`doc-page${className ? ` ${className}` : ''}${variant !== 'body' ? ` doc-page--${variant}` : ''}`}
      style={style}
      hidden={hidden}
    >
      <div className="doc-page__sheets" aria-hidden="true">
        {Array.from({ length: sheetCount }, (_, index) => {
          const isLast = index === sheetCount - 1
          let sheetStyle = { top: 0 }
          if (isBody && pageH != null) {
            sheetStyle = {
              top: index * (pageH + gap),
              height: isLast && lastHeight != null ? lastHeight : pageH,
            }
          } else if (!isBody) {
            sheetStyle = { top: 0, height: '100%' }
          }
          return <div key={index} className="doc-sheet" style={sheetStyle} />
        })}
      </div>
      {isBody ? (
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
      ) : null}
      {isBody && hfOverlay ? (
        <DocHfBands chrome={chrome} {...hfOverlay} />
      ) : null}
      {children}
    </div>
  )
}