import { Arrow, PhotoGlyph } from './icons'
import { useMagnetic } from '../hooks'

/* ==========================================================================
   UI PRIMITIVES
   ========================================================================== */

/* The round badge on the end of a button. It rotates 45° on hover, which is
   why it is a wrapper and not just an icon. */
export const Arw = () => (
  <span className="arw"><Arrow /></span>
)

/* A button or link with the badge. `magnetic` gives it the pointer pull the
   red / dark / white buttons have on the marketing page — the auth page opts
   out, because a form control that drifts under the cursor is a nuisance. */
export function Btn({ as = 'a', variant = 'primary', size, arrow = true, magnetic, className = '', children, ...rest }) {
  const Tag = as
  const ref = useMagnetic(!!magnetic)
  const cls = ['btn', `btn-${variant}`, size === 'sm' && 'btn-sm', className].filter(Boolean).join(' ')
  return (
    <Tag ref={ref} className={cls} {...rest}>
      <span>{children}</span>
      {arrow && <Arw />}
    </Tag>
  )
}

/* A photo frame that degrades to a labelled placeholder.

   The placeholder sits under the image rather than replacing it: if the file
   is missing the <img> paints nothing and the plate below shows through, so
   there is never a broken-image glyph and never a layout jump. */
export function Media({ className = '', src, alt = '', label, dim, imgProps = {}, children }) {
  return (
    <figure className={`media ${className}`.trim()}>
      {src && <img src={src} alt={alt} {...imgProps} />}
      {label && (
        <span className="ph">
          <PhotoGlyph />
          <b>{label}</b>
          {dim}
        </span>
      )}
      {children}
    </figure>
  )
}
