import { ArrowRight, Check, Languages, Leaf, LockKeyhole, MapPin, Smartphone, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/UI'
import { useApp } from '../context/AppContext'
import { languages } from '../i18n'

function AuthFrame({ children, title, subtitle }) {
  const { t } = useApp()
  return <main className="auth-page">
    <aside className="auth-story">
      <Link to="/" className="brand"><div className="brand-mark"><Leaf/></div><div><strong>Krishiniti</strong><span>{t('smartCropAdvisory')}</span></div></Link>
      <div><p className="eyebrow">{t('fieldToFuture')}</p><h1>{t('betterFarmDecisions')}</h1><p>{t('combineFarmContext')}</p></div>
      <small>{t('responsibleGuidance')}</small>
    </aside>
    <section className="auth-panel"><div className="auth-card"><h2>{title}</h2><p>{subtitle}</p>{children}</div></section>
  </main>
}

export function Login() {
  const { login, t } = useApp()
  const nav = useNavigate()
  const location = useLocation()
  const registered = Boolean(location.state?.registered)
  const [form, setForm] = useState({ mobile: location.state?.mobile || '9999999999', password: registered ? '' : 'demo123' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault(); setError('')
    if (!/^\d{8,15}$/.test(form.mobile.trim())) { setError(t('validMobile')); return }
    if (!form.password) { setError(t('enterPassword')); return }
    setBusy(true)
    try { await login(form.mobile.trim(), form.password); nav('/dashboard', { replace: true }) }
    catch (problem) { setError(problem.message) }
    finally { setBusy(false) }
  }
  return <AuthFrame title={t('welcomeBack')} subtitle={t('signInSubtitle')}>
    {registered && <div className="success-banner" role="status"><Check size={18}/><span><strong>{t('accountCreated')}</strong>{t('signInToContinue')}</span></div>}
    <form onSubmit={submit} className="form-stack">
      <label>{t('mobileNumber')}<div className="input-wrap"><Smartphone/><input aria-label={t('mobileNumber')} value={form.mobile} onChange={(event)=>setForm({...form,mobile:event.target.value})} inputMode="numeric" autoComplete="tel" required/></div></label>
      <label>{t('password')}<div className="input-wrap"><LockKeyhole/><input aria-label={t('password')} value={form.password} onChange={(event)=>setForm({...form,password:event.target.value})} type="password" autoComplete="current-password" required/></div></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <Button loading={busy} className="full">{busy ? t('signingIn') : t('signIn')} {!busy && <ArrowRight size={17}/>}</Button>
    </form>
    <div className="demo-box"><span>{t('demoAccount')}</span><p>{t('demoCredentials')}</p><button type="button" onClick={()=>setForm({mobile:'9999999999',password:'demo123'})}>{t('useDemoCredentials')}</button></div>
    <p className="auth-switch">{t('newToKrishiniti')} <Link to="/register">{t('createAccount')}</Link></p>
  </AuthFrame>
}

export function Register() {
  const { register, setLanguage, t } = useApp()
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name:'', mobile:'', password:'', location:'Ahmedabad, Gujarat', farm_size:2, preferred_language:'en' })
  const change = (event) => setForm({...form,[event.target.name]:event.target.value})
  const submit = async (event) => {
    event.preventDefault(); setError('')
    if (form.name.trim().length < 2) { setError(t('enterFullName')); return }
    if (!/^\d{8,15}$/.test(form.mobile.trim())) { setError(t('validMobile')); return }
    if (form.password.length < 6) { setError(t('passwordLength')); return }
    setBusy(true)
    try {
      await register({...form,name:form.name.trim(),mobile:form.mobile.trim(),farm_size:+form.farm_size})
      await setLanguage(form.preferred_language)
      nav('/login',{replace:true,state:{registered:true,mobile:form.mobile.trim()}})
    } catch (problem) { setError(problem.message) }
    finally { setBusy(false) }
  }
  return <AuthFrame title={t('createFarmerProfile')} subtitle={t('registerSubtitle')}>
    <form onSubmit={submit} className="form-grid">
      <label>{t('fullName')}<div className="input-wrap"><UserRound/><input aria-label={t('fullName')} name="name" value={form.name} onChange={change} required placeholder="Ramesh Patel" autoComplete="name"/></div></label>
      <label>{t('mobileNumber')}<div className="input-wrap"><Smartphone/><input aria-label={t('mobileNumber')} name="mobile" value={form.mobile} onChange={change} required inputMode="numeric" autoComplete="tel"/></div></label>
      <label>{t('location')}<div className="input-wrap"><MapPin/><input aria-label={t('location')} name="location" value={form.location} onChange={change} required/></div></label>
      <label>{t('farmSize')}<input aria-label={t('farmSize')} name="farm_size" value={form.farm_size} onChange={change} min="0" step="0.1" type="number"/></label>
      <label>{t('preferredLanguage')}<select name="preferred_language" value={form.preferred_language} onChange={change}>{languages.map((item)=><option value={item.code} key={item.code}>{item.native}</option>)}</select></label>
      <label>{t('createPassword')}<div className="input-wrap"><LockKeyhole/><input aria-label={t('createPassword')} name="password" value={form.password} onChange={change} minLength="6" required type="password" autoComplete="new-password"/></div></label>
      {error && <p className="form-error span-two" role="alert">{error}</p>}
      <Button loading={busy} className="full span-two">{busy ? t('creatingAccount') : t('createAccount')} {!busy && <ArrowRight size={17}/>}</Button>
    </form>
    <p className="auth-switch">{t('alreadyRegistered')} <Link to="/login">{t('signIn')}</Link></p>
  </AuthFrame>
}

export function Language() {
  const { language, setLanguage, t } = useApp(); const nav = useNavigate()
  return <main className="language-page"><div className="language-card"><div className="language-icon"><Languages/></div><p className="eyebrow">{t('yourLanguage')}</p><h1>{t('chooseLanguage')}</h1><p>{t('languageDescription')}</p><div className="language-grid">{languages.map((item)=><button type="button" key={item.code} className={language===item.code?'selected':''} onClick={()=>setLanguage(item.code)}><span>{item.native}</span><small>{item.label}</small>{language===item.code&&<Check/>}</button>)}</div><Button className="full" onClick={()=>nav('/dashboard')}>{t('continue')} <ArrowRight size={17}/></Button></div></main>
}
