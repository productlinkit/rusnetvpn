import { Suspense, lazy, useEffect, useRef } from 'react'
import { LogoSprite } from './components/Brand'
import Header from './components/Header'
import MobileSheet from './components/MobileSheet'
import Footer from './components/Footer'
import Fab from './components/Fab'
import Hero from './sections/Hero'
import Marquee from './sections/Marquee'
import Why from './sections/Why'
import Tech from './sections/Tech'
import Servers from './sections/Servers'
import Apps from './sections/Apps'
import Pricing from './sections/Pricing'
import Faq from './sections/Faq'
import Cta from './sections/Cta'
import Transparency from './sections/Transparency'
import { usePlaceholderRetire, useReveal } from './hooks'
import { SessionProvider, useSession } from './state/session'
import { FeedbackProvider } from './components/Feedback'

/* ==========================================================================
   APP

   The marketing page, plus two full-screen views that live on top of it: the
   auth page and the account page. Both stay mounted so they can fade rather
   than pop, and both are inert while closed.
   ========================================================================== */

/* The two signed-in surfaces are chunks of their own. Most visits read the
   pricing table and leave, and none of them should download a sign-in form's
   validation stack — let alone a billing table — to do it. */
const AuthPage = lazy(() => import('./components/AuthPage'))
const AccountPage = lazy(() => import('./components/AccountPage'))
const Checkout = lazy(() => import('./components/Checkout'))

/**
 * Fetch those chunks while the browser is idle, so the first click on "Login"
 * opens a form rather than starting a download. Deliberately after first paint
 * and after the phone screenshots — this is the least urgent of the three.
 *
 * The account page is only warmed for someone who is actually signed in;
 * fetching a billing table for a visitor who has never had an account is the
 * cost this split exists to avoid.
 */
function useWarmChunks(signedIn) {
  useEffect(() => {
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 2000))
    const cancel = window.cancelIdleCallback || clearTimeout
    const id = idle(() => {
      import('./components/AuthPage')
      import('./features/auth/api')
      if (signedIn) import('./components/AccountPage')
    })
    return () => cancel(id)
  }, [signedIn])
}

function Page() {
  useReveal()
  usePlaceholderRetire()
  const { user } = useSession()
  useWarmChunks(!!user)
  const fab = useRef(null)

  return (
    <>
      {/* first in the tab order, hidden until it has focus: 2.4.1 Bypass Blocks */}
      <a href="#top" className="skip">Skip to main content</a>
      <LogoSprite />
      <Header />
      <MobileSheet />

      {/* tabIndex -1 so the skip link can actually land here. Without it the
          fragment scrolled the page but focus fell back to <body>, so the next
          Tab returned to the header — the link announced itself, moved the
          view, and skipped nothing. It is also the last-resort target of
          restoreFocus when an overlay's opener has gone. */}
      <main id="top" tabIndex={-1}>
        <Hero />
        <Marquee />
        <Why />
        <Tech />
        <Servers />
        <Apps />
        <Pricing />
        <Faq />
        <Cta />
      </main>

      <Transparency />
      <Footer />
      <Fab ref={fab} />
      {/* no fallback: the overlay is invisible until it is opened, and a
          spinner for a same-origin chunk that is already warm would be a
          flash of nothing in particular */}
      <Suspense fallback={null}>
        <AuthPage />
        <AccountPage onChat={() => fab.current?.open()} />
        <Checkout />
      </Suspense>
    </>
  )
}

export default function App() {
  return (
    <FeedbackProvider>
      <SessionProvider>
        <Page />
      </SessionProvider>
    </FeedbackProvider>
  )
}
