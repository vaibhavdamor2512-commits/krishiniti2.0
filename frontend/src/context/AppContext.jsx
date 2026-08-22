import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { dictionaries } from '../i18n'
import { api } from '../services/api'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user,setUser] = useState(()=>localStorage.getItem('krishiniti_token') ? JSON.parse(localStorage.getItem('krishiniti_user') || 'null') : null)
  const [authReady,setAuthReady] = useState(false)
  const [language,setLanguageState] = useState(()=>localStorage.getItem('preferredLanguage') || localStorage.getItem('krishiniti_language') || 'en')
  const [notice,setNotice] = useState(null)
  const t = useCallback((key,variables={}) => {
    const template=dictionaries[language]?.[key] || dictionaries.en[key] || key
    return Object.entries(variables).reduce((value,[name,replacement])=>value.replaceAll(`{${name}}`,String(replacement)),template)
  },[language])
  const clearAuth = useCallback(() => { localStorage.removeItem('krishiniti_token'); localStorage.removeItem('krishiniti_user'); setUser(null) },[])
  useEffect(()=>{
    let active=true
    const validate=async()=>{
      const token=localStorage.getItem('krishiniti_token')
      if(!token){if(active)setAuthReady(true);return}
      try{const current=await api.me();if(active){setUser(current);localStorage.setItem('krishiniti_user',JSON.stringify(current));if(!localStorage.getItem('preferredLanguage'))setLanguageState(current.preferred_language||'en')}}
      catch{if(active)clearAuth()}
      finally{if(active)setAuthReady(true)}
    }
    const unauthorized=()=>{clearAuth();setNotice('Your session expired. Please sign in again.')}
    window.addEventListener('krishiniti:unauthorized',unauthorized);validate()
    return()=>{active=false;window.removeEventListener('krishiniti:unauthorized',unauthorized)}
  },[clearAuth])
  const persistAuth = (data) => { localStorage.setItem('krishiniti_token',data.access_token); localStorage.setItem('krishiniti_user',JSON.stringify(data.user)); setUser(data.user) }
  const login = async (mobile,password) => { const data=await api.login(mobile,password); persistAuth(data); return data }
  const register = (payload) => api.register(payload)
  const logout = clearAuth
  const setLanguage = async (code) => { setLanguageState(code); localStorage.setItem('preferredLanguage',code); localStorage.setItem('krishiniti_language',code); if(user){ const next={...user,preferred_language:code}; setUser(next); localStorage.setItem('krishiniti_user',JSON.stringify(next)); try{await api.language(code)}catch(error){setNotice(error.message)} } }
  const value=useMemo(()=>({user,authReady,language,t,login,register,logout,setLanguage,notice,setNotice}),[user,authReady,language,t,notice])
  return <AppContext.Provider value={value}>{children}{notice&&<div className="toast" role="status">{notice}<button onClick={()=>setNotice(null)}>×</button></div>}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)
