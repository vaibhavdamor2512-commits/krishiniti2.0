import { createContext, useContext, useMemo, useState } from 'react'
import { dictionaries } from '../i18n'
import { api } from '../services/api'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user,setUser] = useState(()=>JSON.parse(localStorage.getItem('krishiniti_user') || 'null'))
  const [language,setLanguageState] = useState(()=>localStorage.getItem('krishiniti_language') || user?.preferred_language || 'en')
  const [notice,setNotice] = useState(null)
  const t = (key) => dictionaries[language]?.[key] || dictionaries.en[key] || key
  const persistAuth = (data) => { localStorage.setItem('krishiniti_token',data.access_token); localStorage.setItem('krishiniti_user',JSON.stringify(data.user)); setUser(data.user) }
  const login = async (mobile,password) => { const data=await api.login(mobile,password); persistAuth(data); return data }
  const register = async (payload) => { const data=await api.register(payload); persistAuth(data); return data }
  const logout = () => { localStorage.removeItem('krishiniti_token'); localStorage.removeItem('krishiniti_user'); setUser(null) }
  const setLanguage = async (code) => { setLanguageState(code); localStorage.setItem('krishiniti_language',code); if(user){ const next={...user,preferred_language:code}; setUser(next); localStorage.setItem('krishiniti_user',JSON.stringify(next)); await api.language(code) } }
  const value=useMemo(()=>({user,language,t,login,register,logout,setLanguage,notice,setNotice}),[user,language,notice])
  return <AppContext.Provider value={value}>{children}{notice&&<div className="toast" role="status">{notice}<button onClick={()=>setNotice(null)}>×</button></div>}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)
