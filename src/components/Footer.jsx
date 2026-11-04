import { BrandMark } from './Brand'
import { Facebook, Instagram, Telegram } from './icons'
import { useSession } from '../state/session'

/* ==========================================================================
   FOOTER

   Column titles are <h3>, not <h4>: they sit under the page's h2 sections, and
   skipping a level made the outline read as if a heading were missing. The
   type and the measure for every column — the address included — come from
   the stylesheet, so no column is on its own set of numbers.
   ========================================================================== */

const PRODUCT = [
  ['#why', 'Benefits'],
  ['#tech', 'Features'],
  ['#servers', 'Global Coverage'],
  ['#apps', 'Download App'],
  ['#pricing', 'Pricing'],
]

export default function Footer() {
  const { user, openAuth, openAccount } = useSession()

  return (
    <footer className="wrap">
      <div className="fgrid">
        <div className="about">
          <a href="#top" className="brand" aria-label="RusVPN, back to top">
            <BrandMark />
          </a>
          <p>
            A secure and independent VPN solution, fully controlled from Moscow. RusVPN is a privacy-focused VPN
            with a strict no-logs policy, built from the ground up locally in Russia.
          </p>
        </div>

        <div className="fcol">
          <h3>Product</h3>
          {PRODUCT.map(([href, label]) => (
            <a key={href} href={href}>{label}</a>
          ))}
        </div>

        <div className="fcol">
          <h3>Customer service</h3>
          {/* The audit status, usability research and accessibility links are
              out while the transparency band is hidden: a footer link that
              scrolls to a display:none section just does nothing. Restore them
              here — #audit-status, #ux-research, #accessibility — when the band
              comes back. */}
          <a href="#faq">FAQ</a>
          <a href="#faq" data-fab-open="">Send a Message</a>
          <a href="#faq">WhatsApp</a>
          <a href="#faq">Telegram</a>
          <a
            href="#sign-in"
            data-auth="in"
            onClick={(e) => {
              e.preventDefault()
              /* this link stays visible once you are signed in, unlike the nav's
                 Login — and it used to open the login panel for someone who was
                 already logged in. Send them where they were asking to go. */
              if (user) openAccount('overview')
              else openAuth('in')
            }}
          >
            My Account
          </a>
        </div>

        <div className="fcol">
          <h3>Address</h3>
          <p>
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
