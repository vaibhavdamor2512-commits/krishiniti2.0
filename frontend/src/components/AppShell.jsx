import { Bell, ChartNoAxesCombined, CloudSun, HeartPulse, House, Languages, Leaf, LogOut, Map, Menu, Settings, Sprout, Stethoscope, WalletCards, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { languages } from '../i18n'
import { useApp } from '../context/AppContext'

const nav = [
  ['/dashboard','dashboard',House],['/farms','farms',Map],['/recommendations','recommendations',Sprout],['/profit','profit',WalletCards],['/ndvi','ndvi',HeartPulse],['/weather','weather',CloudSun],['/disease-advisor','disease',Stethoscope],['/advisories','advisories',ChartNoAxesCombined],['/notifications','notifications',Bell],['/settings','settings',Settings],
]

export default function AppShell(){
  const {t,user,language,setLanguage,logout}=useApp(); const [open,setOpen]=useState(false); const navigate=useNavigate()
  const signOut=()=>{logout();navigate('/')}
  return <div className="app-shell">
    <aside className={`sidebar ${open?'open':''}`}>
      <div className="brand"><div className="brand-mark"><Leaf size={21}/></div><div><strong>Krishiniti</strong><span>{t('brandTagline')}</span></div><button className="sidebar-close" onClick={()=>setOpen(false)}><X/></button></div>
      <nav>{nav.map(([to,key,Icon])=><NavLink key={to} to={to} onClick={()=>setOpen(false)}><Icon size={19}/><span>{t(key)}</span></NavLink>)}</nav>
      <div className="sidebar-foot"><div className="avatar">{user?.name?.[0]||'F'}</div><div><strong>{user?.name}</strong><span>{user?.location}</span></div><button onClick={signOut} title={t('logout')}><LogOut size={18}/></button></div>
    </aside>
    <div className="app-main">
      <header className="topbar"><button className="menu-button" onClick={()=>setOpen(true)}><Menu/></button><div className="top-brand"><Leaf size={18}/> Krishiniti</div><div className="top-actions"><label><Languages size={16}/><select value={language} onChange={e=>setLanguage(e.target.value)}>{languages.map(item=><option key={item.code} value={item.code}>{item.native}</option>)}</select></label><NavLink to="/notifications" className="icon-button"><Bell size={19}/><span/></NavLink></div></header>
      <main className="page"><Outlet/></main>
      <nav className="mobile-nav">{nav.slice(0,5).map(([to,key,Icon])=><NavLink key={to} to={to}><Icon size={20}/><span>{t(key)}</span></NavLink>)}</nav>
    </div>{open&&<button className="scrim" onClick={()=>setOpen(false)} aria-label="Close menu"/>}
  </div>
}
