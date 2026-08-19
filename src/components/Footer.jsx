import { BrandMark } from './Brand'
import { Facebook, Instagram, Telegram } from './icons'
import { useSession } from '../state/session'

/* ==========================================================================
   FOOTER
   ========================================================================== */

const PRODUCT = [
  ['#why', 'Benefits'],
  ['#tech', 'Features'],
  ['#servers', 'Global Coverage'],
  ['#apps', 'Download App'],
  ['#pricing', 'Pricing'],
]

export default function Footer() {
  const { openAuth } = useSession()

  return (
    <footer className="wrap">
      <div className="fgrid">
        <div className="about">
          <a href="#top" className="brand" aria-label="RusVPN, back to top">
            <BrandMark />
          </a>
          <p>
            A secure and independent VPN solution, fully controlled from Moscow. RusVPN is the best guaranteed
            no-log VPN built from ground up locally in Russia.
          </p>
        </div>

        <div className="fcol">
          <h4>Product</h4>
          {PRODUCT.map(([href, label]) => (
            <a key={href} href={href}>{label}</a>
          ))}
        </div>

        <div className="fcol">
          <h4>Customer service</h4>
          <a href="#faq">FAQ</a>
          <a href="#faq">Send a Message</a>
          <a href="#faq">WhatsApp</a>
          <a href="#faq">Telegram</a>
          <a
            href="#sign-in"
            onClick={(e) => {
              e.preventDefault()
              openAuth('in')
            }}
          >
            My Account
          </a>
        </div>

        <div className="fcol">
          <h4>Address</h4>
          <p style={{ fontSize: '14.5px', color: 'var(--body)', lineHeight: 1.6, maxWidth: 260 }}>
            Office Space in Presnenskaya emb., 12. MIBC Moscow City, Federation Tower East, 123112, Moscow,
            Russia
          </p>
        </div>
      </div>

      <div className="fbot">
        <p className="tiny">Copyright 2024 RusVPN</p>
        <div className="soc">
          <a href="https://facebook.com/rusvpn" target="_blank" rel="noopener noreferrer" aria-label="Visit RusVPN on Facebook">
            <Facebook />
          </a>
          <a href="https://instagram.com/rusvpn" target="_blank" rel="noopener noreferrer" aria-label="Follow RusVPN on Instagram">
            <Instagram />
          </a>
          <a href="#faq" aria-label="Chat on Telegram"><Telegram /></a>
        </div>
      </div>
    </footer>
  )
}
