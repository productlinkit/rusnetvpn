import { useEffect, useRef, useState } from 'react'
import { BrandMark } from './Brand'
import { Arw } from './ui'
import { Back, Check, Eye, Google } from './icons'
import { Field, FormAlert, busyProps, fixLead, useFieldCheck } from './account/parts'
import { googleSignInEnabled } from '../config/env'
import { resolveFieldMessage } from '../shared/api/messages'
import { AUTH_FALLBACK, reducedMotion, restoreFocus, say, setPageInert, shout, tablistKeys, trapTab } from '../shared/a11y'
import * as authApi from '../features/auth/api'
import { requestGoogleIdToken } from '../features/auth/google'
import { useSession } from '../state/session'

/* ==========================================================================
   AUTH — a full page, not a modal, wired to the backend

   Five views share one form. Each declares which fields it wants rather than
   the form branching on "is this the register view" in five places.

   The shape of the flow is the backend's, not ours (backend/internal/modules/
   auth). Two things follow from that and are worth stating, because the design
   mock predates the API:

     · Registering does not sign you in. POST /auth/register answers with an
       OTP challenge, and the account stays unusable until a six-digit code
       from the email is verified. Hence the `otp` view.
     · Resetting a password is code-based too, not link-based: forgot-password
       emails a code, the code is checked, and only then does reset-password
       take the new one.
   ========================================================================== */

/* the rule as the server enforces it (BR-09, the `password` validator), so the
   hint, the placeholder and the check below all say the same thing it does */
const PW_RULE = 'At least 8 characters, with a letter and a number.'

const COPY = {
  in: {
    title: 'Sign in to your account',
    sub: 'High-speed and secure Russian VPN that protects your privacy.',
    google: 'Continue with Google',
    submit: 'Sign in',
    busy: 'Signing in…',
    fields: { email: true, pass: true },
    social: true, tabs: true, forgot: true,
    passLabel: 'Password', passHold: 'Enter your password', passAuto: 'current-password',
  },
  up: {
    title: 'Create your account',
    sub: 'Security. Privacy. Freedom. For everyone.',
    google: 'Sign up with Google',
    submit: 'Create Account',
    busy: 'Creating your account…',
    fields: { name: true, email: true, pass: true, confirm: true },
    social: true, tabs: true, terms: true,
    passLabel: 'Password', passHold: 'Password must be at least 8 characters', passAuto: 'new-password',
    passHint: `${PW_RULE} Longer beats complicated.`,
    confirmLabel: 'Confirm Password', confirmHold: 'Confirm your password',
  },
  otp: {
    title: 'Enter your verification code',
    sub: 'We emailed you a six-digit code. It is only good for a few minutes.',
    submit: 'Verify',
    busy: 'Checking the code…',
    fields: { code: true },
  },
  reset: {
    title: 'Forgot your password?',
    sub: 'Enter the email you signed up with and we will send you a code to set a new one.',
    submit: 'Send reset code',
    busy: 'Sending…',
    fields: { email: true },
    hint: <>The code is good for a few minutes. If it expires, just ask for another one.</>,
  },
  newpw: {
    title: 'Set a new password',
    sub: 'Almost done. Pick a password you have not used on RusVPN before.',
    submit: 'Save new password',
    busy: 'Saving…',
    fields: { pass: true, confirm: true },
    passLabel: 'New password', passHold: 'At least 8 characters', passAuto: 'new-password',
    passHint: `${PW_RULE} Not one you have used on RusVPN before.`,
    confirmLabel: 'Confirm new password', confirmHold: 'Type it once more',
    hint: 'Saving this signs out every device the account is currently logged in on.',
  },
}

/** Field key -> its input's id. The summary's jump links point here. */
const ID = { name: 'au-name', email: 'au-email', pass: 'au-pass', confirm: 'au-confirm', code: 'au-code' }
const ORDER = ['name', 'email', 'pass', 'confirm', 'code']

/** Wire field name -> the input that shows the message. */
const FIELD_MAP = { name: 'name', email: 'email', password: 'pass', code: 'code' }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/* ---------- validation — WCAG 3.3.1 Error Identification / 3.3.3 Error Suggestion ----------
   Every rule names what is wrong and what to do about it. "Invalid input" tells
   someone the form disagrees with them but not how to proceed.

   These are a first answer, not the last word. The server still rules on every
   field it receives and its sentence still lands on the input (see `handle`);
   checking here means the obvious slips — an empty box, a missing @ — are
   caught where you are standing rather than one round trip later. `confirm`
   has no server counterpart at all: no request carries it. */
function checkAuth(view, key, v) {
  const d = COPY[view]
  if (!d.fields[key]) return null // not on screen in this view
  const val = v[key] ?? ''
  if (key === 'name') {
    if (!val.trim()) return 'Enter the name you would like us to call you'
    if (val.trim().length < 2) return 'Use at least 2 characters'
  }
  if (key === 'email') {
    if (!val.trim()) return 'Enter the email address you use for RusVPN'
    if (!EMAIL_RE.test(val.trim())) return 'That is not a complete email address — check for a missing @ or a typo after the dot'
  }
  if (key === 'pass') {
    if (!val) return 'Enter your password'
    /* only enforce the rule where we are *setting* one. On sign-in the server
       decides, and "too short" would leak the rule to someone guessing. */
    if ((view === 'up' || view === 'newpw') && (val.length < 8 || !/[A-Za-z]/.test(val) || !/\d/.test(val))) {
      return 'Use at least 8 characters, with at least one letter and one number'
    }
  }
  if (key === 'confirm') {
    if (!val) return 'Type the password a second time to confirm it'
    if (val !== v.pass) return resolveFieldMessage('error.validation.confirmMismatch') || 'The two passwords do not match'
  }
  if (key === 'code') {
    if (!val.trim()) return 'Enter the six-digit code from the email'
    if (!/^\d{6}$/.test(val.trim())) return 'The code is six digits — check the email and type all of them'
  }
  return null
}

/* the line under the submit button that offers the other door */
function Fine({ view, go }) {
  const link = (to, label) => (
    <button type="button" className="lnk" onClick={() => go(to)}>{label}</button>
  )
  if (view === 'in') return <>Don&apos;t have an account? {link('up', 'Register')}</>
  if (view === 'up') return <>Already have an account? {link('in', 'Sign in')}</>
  if (view === 'reset') return <>Remembered it? {link('in', 'Back to sign in')}</>
  if (view === 'otp') return <>Wrong address? {link('up', 'Start again')}</>
  return link('in', 'Back to sign in')
}

/* ---------- review mode: ?demo=1 ----------
   An auditor cannot type an email or a password into a form that is not
   theirs, so signup stays "cannot assess" however well it is built — and 3.3.7
   Redundant Entry can only be judged by watching a value carry from one step
   to the next. ?demo=1 prefills visibly fake values and opens the signup view.

   It never fakes a session: submitting still goes to whatever backend this
   build talks to, and the banner says which. Absent the flag none of this
   runs. */
const DEMO =
  typeof window !== 'undefined' && (/[?&]demo=1(&|$)/.test(location.search) || location.hash === '#demo')
const DEMO_VALUES = { name: 'Audit Reviewer', email: 'auditor@example.org', pass: 'Demo-Passw0rd!' }
const DEMO_NOTE =
  import.meta.env.DEV && import.meta.env.VITE_MOCK_API === 'true'
    ? 'Review mode — fields are prefilled with dummy data. No real account is created.'
    : 'Review mode — fields are prefilled with dummy data. Submitting still reaches the real server.'

export default function AuthPage() {
  const { authView, authEmail, closeAuth, openAuth, switchAuthView, signedIn, signOut, suspended } = useSession()
  const open = authView !== null

  /* the last view stays rendered while the page fades out, so the copy does
     not blink away a beat before the panel does */
  const [view, setView] = useState('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [alert, setAlert] = useState(null)
  const [busy, setBusy] = useState(false)
  const [peek, setPeek] = useState(false)
  const [done, setDone] = useState(null)

  /* which flow the code screen is serving, and the code once the server has
     accepted it — reset-password needs to present it a second time */
  const [purpose, setPurpose] = useState('register')
  const [verifiedCode, setVerifiedCode] = useState('')
  /** Epoch ms before which "Resend code" is refused by the server (BR-10). */
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  const scroller = useRef(null)
  const doneTitle = useRef(null)
  const opener = useRef(null)
  const inputs = {
    name: useRef(null),
    email: useRef(null),
    pass: useRef(null),
    confirm: useRef(null),
    code: useRef(null),
  }

  const d = COPY[view]
  const values = { name, email, pass, confirm, code }
  const fields = useFieldCheck(values, (key, v) => checkAuth(view, key, v))
  const LABEL = { name: 'Name', email: 'Email address', pass: d.passLabel, confirm: d.confirmLabel, code: 'Verification code' }

  /* one interval for the whole page, and only while a cooldown is actually
     running — a countdown that keeps ticking after it hits zero is a timer
     nobody is reading */
  useEffect(() => {
    if (resendAt <= now) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [resendAt, now])

  const cooldown = Math.max(0, Math.ceil((resendAt - now) / 1000))

  /* the first field still waiting for an answer — with the address carried in
     from the CTA strip, that is the password, not the email you already gave */
  const firstFieldOf = (v, vals = values) => {
    const keys = ORDER.filter((k) => COPY[v].fields[k])
    const k = keys.find((x) => !vals[x]) ?? keys[0]
    return inputs[k]
  }

  /* ---------- opening and closing ----------
     aria-modal="true" promises a screen reader that nothing else exists while
     this is up. Inerting every sibling is what makes that true, and the Tab
     trap keeps the keyboard on the same page as the screen reader. */
  useEffect(() => {
    if (!open) return
    const page = scroller.current
    opener.current = document.activeElement
    setPageInert(page, true)
    const trap = trapTab(page)
    document.addEventListener('keydown', trap)
    return () => {
      document.removeEventListener('keydown', trap)
      /* Signing in closes this page and opens My Account in the same commit.
         Clearing inert here would wake the page behind the account view, and
         handing focus back to the opener would drop it behind it too — so when
         another overlay is taking over, it is left the page instead. */
      const next = document.querySelector('.account.is-open, .co.is-open')
      setPageInert(next, !!next)
      /* setPageInert clears every sibling, closed overlays included — and a
         closed one that is still fading out is visible, so focusable */
      for (const el of document.querySelectorAll('#auth:not(.is-open), #account:not(.is-open)')) el.inert = true
      /* 2.4.3 — back to whatever opened this, not the top of the page. Via
         restoreFocus because the opener is often gone: the Login link that
         raised this page is hidden once a sign-in succeeds, and the sheet's
         copy of it is hidden the moment the sheet shuts. */
      /* a tick later, so the signed-in / signed-out header has painted: the
         fallback has to be picked from the nav as it now is, not as it was */
      const target = opener.current
      if (!next) setTimeout(() => restoreFocus(target, AUTH_FALLBACK), 0)
      opener.current = null
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setView(authView)
    setDone(null)
    setAlert(null)
    fields.reset()
    /* 3.3.7 Redundant Entry: the address survives a view switch and a close
       and reopen, because the field is never reset — and whatever was typed
       into the CTA strip is carried in rather than asked for again */
    const vals = { ...values, email: authEmail || email }
    if (authEmail) setEmail(authEmail)
    if (DEMO && authView === 'up' && !pass) {
      setName((n) => n || DEMO_VALUES.name)
      setEmail(DEMO_VALUES.email)
      setPass(DEMO_VALUES.pass)
      setConfirm(DEMO_VALUES.pass)
      Object.assign(vals, DEMO_VALUES, { confirm: DEMO_VALUES.pass })
    }
    if (scroller.current) scroller.current.scrollTop = 0
    const t = setTimeout(() => firstFieldOf(authView, vals).current?.focus(), reducedMotion() ? 0 : 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, authView, authEmail])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeAuth()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, closeAuth])

  /* review mode opens the signup view once, on a cold load */
  useEffect(() => {
    if (!DEMO) return
    const t = setTimeout(() => openAuth('up', DEMO_VALUES.email), reducedMotion() ? 0 : 450)
    return () => clearTimeout(t)
  }, [openAuth])

  /* ---------- moving between views ---------- */
  const go = (v, { focus = true } = {}) => {
    setDone(null)
    setAlert(null)
    fields.reset()
    /* a password typed on the sign-in screen must not follow you into the reset
       flow and sit there pre-filled as your "new" one */
    let vals = values
    if (v === 'reset' || v === 'newpw' || v === 'up') {
      setPass('')
      setConfirm('')
      vals = { ...vals, pass: '', confirm: '' }
    }
    if (v !== 'otp') setCode('')
    if (scroller.current) scroller.current.scrollTop = 0
    setView(v)
    switchAuthView(v)
    if (focus) setTimeout(() => firstFieldOf(v, vals).current?.focus(), 0)
  }

  /* ACC_001 can arrive from any call, so the interceptor parks it on the store
     and opens this page. Showing it here is the last step of that path. */
  useEffect(() => {
    if (suspended) setAlert({ kind: 'bad', body: 'Your account has been suspended. Please contact support.' })
  }, [suspended])

  /* the summary: how many, which, a jump link to each — then focus on the first */
  const summarise = (bad, extra) => {
    const lead = fixLead(bad.length)
    setAlert({
      kind: 'bad',
      lead,
      items: bad.map((b) => ({ id: ID[b.key], label: LABEL[b.key], msg: b.msg })),
      body: extra,
    })
    shout(`${lead}. ${bad.map((b) => `${LABEL[b.key]}, ${b.msg}`).join('. ')}`)
    inputs[bad[0].key].current?.focus()
  }

  /** Hand a rejected submission to the fields the server named, or to the strip. */
  const handle = (error) => {
    /* `fieldErrors` already holds sentences, in the visitor's language:
       shared/api/errors.js resolves each entry against the server's own
       `msg_localized` and only falls back to the local table when the server
       did not send one. All that is left here is deciding which input on
       *this* form the wire name belongs to. */
    const mapped = {}
    for (const [wire, text] of Object.entries(error?.fieldErrors ?? {})) {
      const target = FIELD_MAP[wire]
      if (target && d.fields[target]) mapped[target] = text
    }
    const bad = ORDER.filter((k) => mapped[k]).map((k) => ({ key: k, msg: mapped[k] }))
    if (bad.length) {
      fields.show(mapped)
      /* VALIDATION_001 already speaks through the fields; anything else keeps
         its own sentence under the list */
      summarise(bad, error?.code === 'VALIDATION_001' ? null : <p>{error.text}</p>)
      return
    }

    /* the attempt failed as a whole — distinct from a field being wrong, and
       announced without moving you away from where you can fix it */
    const text = error?.text || 'Something went wrong. Please try again.'
    if (view === 'in' && error?.code === 'AUTH_002') {
      setAlert({
        kind: 'bad',
        body: (
          <>
            <b>We could not sign you in.</b><br />
            {text} Check the address, or{' '}
            <button type="button" className="lnk" onClick={() => go('reset')}>reset your password</button>.
          </>
        ),
      })
      shout(`Sign in failed. ${text}`)
      inputs.pass.current?.focus()
      return
    }
    setAlert({ kind: 'bad', body: text })
    shout(text)
  }

  /* the done screen replaces the form, so whatever had focus went with it.
     Land on the heading of what replaced it (2.4.3) and read the outcome out. */
  const showDone = (next) => {
    setDone(next)
    if (scroller.current) scroller.current.scrollTop = 0
    setTimeout(() => doneTitle.current?.focus(), 0)
    say(`${next.title}. ${next.spoken}`)
  }

  /* ---------- submit ---------- */
  const submit = async (e) => {
    e.preventDefault()
    if (busy) return // already in flight
    setAlert(null)

    const bad = fields.validate(ORDER.filter((k) => d.fields[k]))
    if (bad.length) {
      summarise(bad)
      return
    }

    const mail = email.trim()
    /* ---------- pending ----------
       The button holds a spinner, the form is aria-busy, and a second press
       does nothing. */
    setBusy(true)
    say(d.busy)
    try {
      if (view === 'in') {
        const user = await authApi.login({ email: mail, password: pass })
        signedIn(user)
        return
      }

      if (view === 'up') {
        const challenge = await authApi.register({
          name: name.trim(),
          email: mail,
          password: pass,
          language: document.documentElement.lang || 'en',
        })
        setPurpose('register')
        setResendAt(Date.now() + challenge.resendAfterMs)
        setCode('')
        go('otp')
        say(`We emailed a six-digit code to ${mail}.`)
        return
      }

      if (view === 'otp') {
        /* A forgot-password code is NOT checked here, on purpose.
           /auth/otp/verify consumes the code — `consumeOTP` stamps
           consumed_at, and `LatestOTP` only ever returns rows where that is
           null — so verifying first leaves /auth/reset-password with no code
           to find, and the reset fails with AUTH_003 every time. The reset
           endpoint checks the code itself, so it is the only one that should.

           The cost is that a wrong code surfaces one screen later than it
           could; the submit below sends you back here when that happens. */
        if (purpose !== 'register') {
          setVerifiedCode(code.trim())
          go('newpw')
          return
        }

        // A `register` code is also the sign-in: the server issues the session
        // in the same answer.
        const user = await authApi.verifyOtp({ email: mail, code: code.trim(), purpose })
        signedIn(user)
        return
      }

      if (view === 'reset') {
        const challenge = await authApi.requestPasswordReset(mail)
        setPurpose('forgot_password')
        setResendAt(Date.now() + challenge.resendAfterMs)
        setCode('')
        go('otp')
        say(`We emailed a reset code to ${mail}.`)
        return
      }

      if (view === 'newpw') {
        await authApi.resetPassword({ email: mail, code: verifiedCode, password: pass })
        setPass('')
        setConfirm('')
        setVerifiedCode('')
        fields.reset()
        /* BR-11: the server revoked every session, ours included. Dropping the
           local one without calling logout keeps us from presenting a token
           that is already dead. */
        await signOut({ remote: false })
        showDone({
          title: 'Password updated',
          body: (
            <>
              Your password has been changed for <b>{mail}</b>. Every device has been signed out, this
              one included.
            </>
          ),
          spoken: `Your password has been changed for ${mail}. Every device has been signed out, this one included.`,
          next: { label: 'Sign in', view: 'in' },
        })
      }
    } catch (error) {
      // The code was only checked once the new password was in hand, so a bad
      // one lands here. Send it back to the screen that can fix it rather than
      // asking someone to re-read a six-digit number under a password field.
      if (view === 'newpw' && error.code === 'AUTH_003') {
        setVerifiedCode('')
        setCode('')
        go('otp')
        setAlert({ kind: 'bad', body: error.text })
        shout(error.text)
        return
      }

      // An unverified account trying to sign in is not a failure, it is the
      // next step: the server already knows who they are, so send them to the
      // code screen with a fresh code rather than showing an error.
      if (error.needsEmailVerification) {
        setPurpose('register')
        setCode('')
        try {
          const challenge = await authApi.resendOtp({ email: mail, purpose: 'register' })
          setResendAt(Date.now() + challenge.resendAfterMs)
        } catch {
          // Usually the 60-second cooldown from a code we already sent. The
          // screen is still the right place to be; the old code still works.
          setResendAt(0)
        }
        go('otp')
        const text = 'Your email is not verified yet. Enter the code we sent you.'
        setAlert({ kind: 'info', body: text })
        say(text)
        return
      }
      handle(error)
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    if (cooldown > 0 || busy) return
    setBusy(true)
    setAlert(null)
    try {
      const challenge = await authApi.resendOtp({ email: email.trim(), purpose })
      setResendAt(Date.now() + challenge.resendAfterMs)
      setCode('')
      fields.reset()
      setAlert({ kind: 'ok', body: <>A new code is on its way to <b>{email.trim()}</b>.</> })
      inputs.code.current?.focus()
    } catch (error) {
      handle(error)
    } finally {
      setBusy(false)
    }
  }

  const google = async () => {
    if (busy) return
    setAlert(null)
    setBusy(true)
    try {
      const idToken = await requestGoogleIdToken()
      const user = await authApi.googleSignIn(idToken)
      signedIn(user)
    } catch (error) {
      if (error?.code) handle(error)
      else {
        const text = error?.message === 'google-prompt-unavailable'
          ? 'Google could not open its sign-in prompt here. Use your email instead.'
          : 'Could not reach Google. Please try again, or use your email.'
        setAlert({ kind: 'bad', body: text })
        shout(text)
      }
    } finally {
      setBusy(false)
    }
  }

  /* the reveal button's job never changes, only whether it is pressed — so the
     state is aria-pressed and the name stays put (4.1.2). A label that renames
     itself mid-press reads as a different button each time. */
  const togglePeek = () => {
    say(peek ? 'Password hidden' : 'Password shown')
    setPeek(!peek)
  }

  const field = (key) => ({
    id: ID[key],
    slot: key,
    label: LABEL[key],
    inputRef: inputs[key],
    ...fields.props(key),
  })

  /* A click on a tab moves you on to the first field; an arrow key does not.
     tablistKeys activates with a synthetic click (detail 0), and pulling focus
     out of the tablist mid-arrow would land the next press in a text box. */
  const tab = (v) => (e) => {
    if (v === view) return
    go(v, { focus: e.detail !== 0 })
  }

  return (
    <div
      className={`auth${open ? ' is-open' : ''}`}
      id="auth"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
      ref={scroller}
      /* nothing to read behind a closed overlay, and nothing to tab into */
      aria-hidden={!open}
      inert={!open}
    >
      {/* prefilled credentials with no explanation would be more alarming than
          helpful, so review mode announces itself */}
      {DEMO && (
        <p
          id="demo-note"
          role="status"
          style={{
            position: 'fixed', left: '50%', transform: 'translateX(-50%)', top: 10, zIndex: 500,
            margin: 0, padding: '10px 18px', borderRadius: 999, background: 'var(--ink)', color: '#fff',
            fontSize: 'var(--fs-200)', fontWeight: 600, boxShadow: 'var(--shadow-md)',
            maxWidth: 'calc(100vw - 28px)', textAlign: 'center',
          }}
        >
          {DEMO_NOTE}
        </p>
      )}

      <div className="auth-card">
        <aside className="auth-side">
          {/* photo sits under a black wash: still reads as a photo, never
              fights the copy */}
          <img className="auth-bg" src="/images/auth-side.jpg" alt="" decoding="async" />
          <span className="auth-veil" />
          {/* role="img" is what licenses the aria-label. A bare <span> has no
              role, and aria-label on a roleless generic is discarded — the
              wordmark would go unnamed here, where it is the only branding */}
          <span className="brand" role="img" aria-label="RusVPN"><BrandMark /></span>
          <p>Security. Privacy. Freedom. For everyone.</p>
          <ul>
            <li><i /><span><b>Russian Reliability</b> — owned and operated in-house</span></li>
            <li><i /><span><b>Global Coverage</b> — 700+ servers worldwide</span></li>
            <li><i /><span><b>Unmatched Privacy</b> — no third-party access to your VPN traffic</span></li>
            <li><i /><span><b>Protect your privacy</b> with a strict no-logs policy</span></li>
          </ul>
        </aside>

        <div className="auth-main">
          <div className="auth-top">
            <a href="#top" className="brand" aria-label="RusVPN, back to site" onClick={(e) => { e.preventDefault(); closeAuth() }}>
              <BrandMark />
            </a>
            <button type="button" className="auth-back" onClick={() => closeAuth()}>
              <Back aria-hidden="true" focusable="false" />
              Back to site
            </button>
          </div>

          <div className="auth-inner">
            {d.tabs && !done && (
              <div className="auth-tabs" id="auth-tabs" role="tablist" aria-label="Sign in or register" onKeyDown={tablistKeys}>
                {[['in', 'Login'], ['up', 'Register']].map(([v, text]) => (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    id={`authtab-${v}`}
                    className={view === v ? 'on' : undefined}
                    aria-selected={view === v}
                    aria-controls="auth-form"
                    tabIndex={view === v ? 0 : -1}
                    onClick={tab(v)}
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}

            <form
              className="auth-form"
              id="auth-form"
              noValidate
              onSubmit={submit}
              aria-busy={busy}
              /* under the tabs this is their panel, and the selected tab names it */
              role={d.tabs ? 'tabpanel' : undefined}
              aria-labelledby={d.tabs ? `authtab-${view}` : undefined}
              style={{ display: done ? 'none' : '' }}
            >
              <h3 id="auth-title">{d.title}</h3>
              <p className="auth-sub" id="auth-sub">
                {view === 'otp' ? <>We emailed a six-digit code to <b>{email.trim()}</b>. It is only good for a few minutes.</> : d.sub}
              </p>

              {d.social && googleSignInEnabled && (
                <>
                  <button type="button" className="auth-google" id="auth-google" onClick={google} aria-disabled={busy || undefined}>
                    <Google aria-hidden="true" focusable="false" />
                    <span id="auth-google-label">{d.google}</span>
                  </button>
                  <div className="auth-or" id="auth-or"><span>or use your email</span></div>
                </>
              )}

              {/* the attempt failed as a whole (wrong password, network, server),
                  or the summary of what needs fixing — empty at rest */}
              <FormAlert alert={alert} id="auth-alert" />

              {d.fields.name && (
                <Field
                  {...field('name')}
                  type="text"
                  placeholder="What should we call you?"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              )}

              {d.fields.email && (
                <Field
                  {...field('email')}
                  hint="Your download link and every receipt go here."
                  type="email"
                  inputMode="email"
                  placeholder="you@email.com"
                  autoComplete="email"
                  spellCheck="false"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}

              {d.fields.code && (
                <Field
                  {...field('code')}
                  hint="Six digits, from the email we just sent."
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  maxLength={6}
                  /* a pasted code often arrives with spaces around it, and a
                     six-digit field has no room to be forgiving later */
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              )}

              {d.fields.pass && (
                <Field
                  {...field('pass')}
                  pw
                  hint={d.passHint}
                  type={peek ? 'text' : 'password'}
                  placeholder={d.passHold}
                  autoComplete={d.passAuto}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  after={
                    <button
                      type="button"
                      className="peek"
                      id="au-peek"
                      aria-label="Show password"
                      aria-pressed={peek}
                      onClick={togglePeek}
                    >
                      <Eye aria-hidden="true" focusable="false" />
                    </button>
                  }
                />
              )}

              {d.fields.confirm && (
                <Field
                  {...field('confirm')}
                  hint="Type the same password once more."
                  type={peek ? 'text' : 'password'}
                  placeholder={d.confirmHold}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              )}

              {/* sits under the field: says what a valid answer looks like
                  before the field has a chance to reject it */}
              {d.hint && <p className="auth-hint" id="auth-hint">{d.hint}</p>}

              {d.forgot && (
                <div className="auth-row" id="auth-forgot">
                  <a href="#forgot-password" onClick={(e) => { e.preventDefault(); go('reset') }}>Forgot Password?</a>
                </div>
              )}

              {view === 'otp' && (
                <div className="auth-row">
                  <a
                    href="#verify-email"
                    onClick={(e) => { e.preventDefault(); resend() }}
                    aria-disabled={cooldown > 0}
                    style={cooldown > 0 ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                  </a>
                </div>
              )}

              <button {...busyProps(busy, 'btn btn-red auth-submit')} type="submit" id="au-submit">
                <span className="spin" aria-hidden="true" />
                {/* on the reset path this screen only collects the code — the
                    server checks it one step later — so it does not claim to
                    verify anything */}
                <span id="au-submit-label">{view === 'otp' && purpose !== 'register' ? 'Continue' : d.submit}</span>
                <Arw />
              </button>

              <p className="auth-fine" id="auth-fine"><Fine view={view} go={go} /></p>
              {d.terms && (
                <p className="auth-terms" id="auth-terms">
                  Your information is safe with us. We will only contact you when it is required to deliver our
                  services.
                </p>
              )}
            </form>

            {done && (
              <div className="auth-done" id="auth-done">
                <span className="tickbig"><Check aria-hidden="true" focusable="false" /></span>
                <h3 id="done-title" tabIndex={-1} ref={doneTitle}>{done.title}</h3>
                <p id="done-sub">{done.body}</p>
                <div className="done-actions">
                  {done.next && (
                    <button type="button" className="btn btn-red" id="done-next" onClick={() => go(done.next.view)}>
                      <span>{done.next.label}</span>
                      <Arw />
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost" onClick={() => closeAuth()}>Back to site</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
