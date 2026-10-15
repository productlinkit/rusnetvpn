import { useEffect, useRef, useState } from 'react'
import { BrandMark } from './Brand'
import { Arw } from './ui'
import { Back, Check, Eye, Google, Warn } from './icons'
import { googleSignInEnabled } from '../config/env'
import { resolveFieldMessage } from '../shared/api/messages'
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
    submit: 'Register',
    busy: 'Creating your account…',
    fields: { name: true, email: true, pass: true, confirm: true },
    social: true, tabs: true, terms: true,
    passLabel: 'Password', passHold: 'At least 8 characters, with a number', passAuto: 'new-password',
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
    passLabel: 'New password', passHold: 'At least 8 characters, with a number', passAuto: 'new-password',
    confirmLabel: 'Confirm new password', confirmHold: 'Type it once more',
    hint: 'Saving this signs out every device the account is currently logged in on.',
  },
}

/* The email pattern and the BR-09 password rule used to be re-implemented here
   and checked before submitting. They are gone: the server enforces both
   (`validate:"required,email"` and the `password` rule `validatorx.New`
   registers), and its answer now renders against the input, so a second copy
   here could only ever disagree with it.
   The password rule is still *stated* to the visitor — it is the placeholder on
   the register and new-password views — which is guidance, not a gate. */

/** Wire field name -> the input that shows the message. */
const FIELD_MAP = { name: 'name', email: 'email', password: 'pass', code: 'code' }

/* the line under the submit button that offers the other door */
function Fine({ view, go }) {
  const link = (to, label) => (
    <button type="button" className="lnk" onClick={() => go(to)}>{label}</button>
  )
  if (view === 'in') return <>Don&apos;t have an account? {link('up', 'Register')}</>
  if (view === 'up') return <>Already have an account? {link('in', 'Sign in to your account')}</>
  if (view === 'reset') return <>Remembered it? {link('in', 'Back to sign in')}</>
  if (view === 'otp') return <>Wrong address? {link('up', 'Start again')}</>
  return link('in', 'Back to sign in')
}

export default function AuthPage() {
  const { authView, authEmail, closeAuth, switchAuthView, signedIn, signOut, suspended, openAccount } = useSession()
  const open = authView !== null

  /* the last view stays rendered while the page fades out, so the copy does
     not blink away a beat before the panel does */
  const [view, setView] = useState('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState({})
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
  const inputs = {
    name: useRef(null),
    email: useRef(null),
    pass: useRef(null),
    confirm: useRef(null),
    code: useRef(null),
  }

  const d = COPY[view]

  /* one interval for the whole page, and only while a cooldown is actually
     running — a countdown that keeps ticking after it hits zero is a timer
     nobody is reading */
  useEffect(() => {
    if (resendAt <= now) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [resendAt, now])

  const cooldown = Math.max(0, Math.ceil((resendAt - now) / 1000))

  const firstFieldOf = (v) => {
    const f = COPY[v].fields
    if (f.name) return inputs.name
    if (f.code) return inputs.code
    if (f.email) return inputs.email
    return inputs.pass
  }

  /* ---------- opening ---------- */
  useEffect(() => {
    if (!open) return
    setView(authView)
    setDone(null)
    setErr({})
    setAlert(null)
    if (authEmail) setEmail(authEmail)
    if (scroller.current) scroller.current.scrollTop = 0
    const t = setTimeout(() => firstFieldOf(authView).current?.focus(), 300)
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

  /* ---------- moving between views ---------- */
  const go = (v) => {
    setDone(null)
    setErr({})
    setAlert(null)
    /* a password typed on the sign-in screen must not follow you into the reset
       flow and sit there pre-filled as your "new" one */
    if (v === 'reset' || v === 'newpw' || v === 'up') {
      setPass('')
      setConfirm('')
    }
    if (v !== 'otp') setCode('')
    if (scroller.current) scroller.current.scrollTop = 0
    setView(v)
    switchAuthView(v)
    setTimeout(() => firstFieldOf(v).current?.focus(), 0)
  }

  /* ACC_001 can arrive from any call, so the interceptor parks it on the store
     and opens this page. Showing it here is the last step of that path. */
  useEffect(() => {
    if (suspended) setAlert('Your account has been suspended. Please contact support.')
  }, [suspended])

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
      if (target) mapped[target] = text
    }
    setErr(mapped)
    /* VALIDATION_001 already speaks through the fields; repeating "check the
       highlighted fields" above them says nothing the highlights do not */
    const quiet = Object.keys(mapped).length && error?.code === 'VALIDATION_001'
    setAlert(quiet ? null : error?.text || 'Something went wrong. Please try again.')
    const first = ['name', 'email', 'pass', 'confirm', 'code'].find((k) => mapped[k])
    if (first) inputs[first].current?.focus()
  }

  /* ---------- submit ----------

     What is left of local validation, and why each piece survived.

     Everything the server can rule on is now sent to the server and rendered
     from its answer: the name minimum, the email format, the password policy,
     the code length. They were duplicated here, and a duplicate rule is a rule
     that can disagree — a rejected field would go red with our wording while
     the server's own sentence said something else in the toast above it.

     Two checks stay, because for them there is no server answer to wait for:

       · `confirm` — no request carries it. RegisterRequest and
         ResetPasswordRequest have `password` and nothing else, so "the two
         boxes differ" is a question only this form can ask.
       · the code on the *forgot-password* path — that screen deliberately does
         not call /auth/otp/verify (see the note in submit: verifying consumes
         the code and breaks the reset), so no request is made and no answer
         comes back. On the register path the code does go to the server, and
         the server's answer is what shows. */
  const validate = () => {
    const next = {}
    if (d.fields.confirm && confirm !== pass) {
      next.confirm = resolveFieldMessage('error.validation.confirmMismatch')
    }
    if (d.fields.code && purpose !== 'register' && !/^\d{6}$/.test(code.trim())) {
      next.code = resolveFieldMessage('error.validation.otpLength')
    }
    return next
  }

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setAlert(null)

    const next = validate()
    setErr(next)
    if (Object.keys(next).length) {
      const first = ['name', 'email', 'pass', 'confirm', 'code'].find((k) => next[k])
      inputs[first].current?.focus()
      return
    }

    const mail = email.trim()
    setBusy(true)
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
        return
      }

      if (view === 'newpw') {
        await authApi.resetPassword({ email: mail, code: verifiedCode, password: pass })
        setPass('')
        setConfirm('')
        setVerifiedCode('')
        /* BR-11: the server revoked every session, ours included. Dropping the
           local one without calling logout keeps us from presenting a token
           that is already dead. */
        await signOut({ remote: false })
        setDone({
          title: 'Password updated',
          body: (
            <>
              Your password has been changed for <b>{mail}</b>. Every device has been signed out, this
              one included.
            </>
          ),
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
        setAlert(error.text)
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
        setAlert('Your email is not verified yet. Enter the code we sent you.')
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
      else if (error?.message === 'google-prompt-unavailable') {
        setAlert('Google could not open its sign-in prompt here. Use your email instead.')
      } else {
        setAlert('Could not reach Google. Please try again, or use your email.')
      }
    } finally {
      setBusy(false)
    }
  }

  const fld = (nameKey) => ['fld', err[nameKey] && 'bad'].filter(Boolean).join(' ')

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
      <div className="auth-card">
        <aside className="auth-side">
          {/* photo sits under a black wash: still reads as a photo, never
              fights the copy */}
          <img className="auth-bg" src="/images/auth-side.jpg" alt="" decoding="async" />
          <span className="auth-veil" />
          <span className="brand" aria-label="RusVPN"><BrandMark /></span>
          <p>Security. Privacy. Freedom. For everyone.</p>
          <ul>
            <li><i /><span><b>Russian Reliability</b> — owned and operated in-house</span></li>
            <li><i /><span><b>Global Coverage</b> — 700+ servers worldwide</span></li>
            <li><i /><span><b>Unmatched Privacy</b> — no third-party access, ever</span></li>
            <li><i /><span><b>Try at no cost</b> and keep the strict no-logs policy</span></li>
          </ul>
        </aside>

        <div className="auth-main">
          <div className="auth-top">
            <a href="#top" className="brand" aria-label="RusVPN, back to site" onClick={(e) => { e.preventDefault(); closeAuth() }}>
              <BrandMark />
            </a>
            <button type="button" className="auth-back" onClick={() => closeAuth()}>
              <Back />
              Back to site
            </button>
          </div>

          <div className="auth-inner">
            {d.tabs && (
              <div className="auth-tabs">
                <button type="button" className={view === 'in' ? 'on' : undefined} onClick={() => go('in')}>Login</button>
                <button type="button" className={view === 'up' ? 'on' : undefined} onClick={() => go('up')}>Register</button>
              </div>
            )}

            <form className="auth-form" noValidate onSubmit={submit} style={{ display: done ? 'none' : '' }}>
              <h3 id="auth-title">{d.title}</h3>
              <p className="auth-sub">
                {view === 'otp' ? <>We emailed a six-digit code to <b>{email.trim()}</b>. It is only good for a few minutes.</> : d.sub}
              </p>

              {d.social && googleSignInEnabled && (
                <>
                  <button type="button" className="auth-google" onClick={google} disabled={busy}>
                    <Google />
                    <span>{d.google}</span>
                  </button>
                  <div className="auth-or"><span>or use your email</span></div>
                </>
              )}

              {alert && (
                <div className="auth-alert" role="alert"><Warn /><span>{alert}</span></div>
              )}

              {d.fields.name && (
                <label className={fld('name')}>
                  <span>Name</span>
                  <input
                    ref={inputs.name}
                    type="text"
                    placeholder="What should we call you?"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <em className="err">{err.name}</em>
                </label>
              )}

              {d.fields.email && (
                <label className={fld('email')}>
                  <span>Email</span>
                  <input
                    ref={inputs.email}
                    type="email"
                    placeholder="you@email.com"
                    autoComplete="email"
                    spellCheck="false"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <em className="err">{err.email}</em>
                </label>
              )}

              {d.fields.code && (
                <label className={fld('code')}>
                  <span>Verification code</span>
                  <input
                    ref={inputs.code}
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
                  <em className="err">{err.code}</em>
                </label>
              )}

              {d.fields.pass && (
                <label className={fld('pass')}>
                  <span>{d.passLabel}</span>
                  <span className="pwwrap">
                    <input
                      ref={inputs.pass}
                      type={peek ? 'text' : 'password'}
                      placeholder={d.passHold}
                      autoComplete={d.passAuto}
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                    />
                    <button
                      type="button"
                      className="peek"
                      aria-label={peek ? 'Hide password' : 'Show password'}
                      onClick={() => setPeek((v) => !v)}
                    >
                      <Eye />
                    </button>
                  </span>
                  <em className="err">{err.pass}</em>
                </label>
              )}

              {d.fields.confirm && (
                <label className={fld('confirm')}>
                  <span>{d.confirmLabel}</span>
                  <input
                    ref={inputs.confirm}
                    type={peek ? 'text' : 'password'}
                    placeholder={d.confirmHold}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                  <em className="err">{err.confirm}</em>
                </label>
              )}

              {/* sits under the field: says what a valid answer looks like
                  before the field has a chance to reject it */}
              {d.hint && <p className="auth-hint">{d.hint}</p>}

              {d.forgot && (
                <div className="auth-row">
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

              <button className="btn btn-red auth-submit" type="submit" disabled={busy}>
                {/* on the reset path this screen only collects the code — the
                    server checks it one step later — so it does not claim to
                    verify anything */}
                <span>
                  {busy
                    ? d.busy
                    : view === 'otp' && purpose !== 'register'
                      ? 'Continue'
                      : d.submit}
                </span>
                <Arw />
              </button>

              <p className="auth-fine"><Fine view={view} go={go} /></p>
              {d.terms && (
                <p className="auth-terms">
                  Your information is safe with us. We will only contact you when it is required to deliver our
                  services.
                </p>
              )}
            </form>

            {done && (
              <div className="auth-done">
                <span className="tickbig"><Check /></span>
                <h3>{done.title}</h3>
                <p>{done.body}</p>
                <div className="done-actions">
                  {done.next && (
                    <button type="button" className="btn btn-red" onClick={() => go(done.next.view)}>
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
