import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProvider, useApp } from '../context/AppContext'
import { api } from '../services/api'

vi.mock('../services/api',()=>({api:{me:vi.fn(),login:vi.fn(),register:vi.fn(),language:vi.fn()}}))

function Harness(){const {user,language,t,login,register,setLanguage}=useApp();return <div><span>{user?.name||'anonymous'}</span><span>{language}</span><span>{t('dashboard')}</span><button onClick={()=>register({name:'Test Farmer'})}>register</button><button onClick={()=>login('9876543210','secret1')}>login</button><button onClick={()=>setLanguage('hi')}>hindi</button></div>}

describe('single auth and language source',()=>{
  beforeEach(()=>{localStorage.clear();api.me.mockRejectedValue(new Error('no session'));api.register.mockResolvedValue({id:7});api.login.mockResolvedValue({access_token:'real-token',user:{id:7,name:'Test Farmer',preferred_language:'en'}})})

  it('does not authenticate during registration, then persists a real login',async()=>{
    render(<AppProvider><Harness/></AppProvider>)
    fireEvent.click(screen.getByText('register'))
    await waitFor(()=>expect(api.register).toHaveBeenCalled())
    expect(localStorage.getItem('krishiniti_token')).toBeNull()
    fireEvent.click(screen.getByText('login'))
    await screen.findByText('Test Farmer')
    expect(localStorage.getItem('krishiniti_token')).toBe('real-token')
  })

  it('switches the active language immediately and persists it',async()=>{
    render(<AppProvider><Harness/></AppProvider>)
    fireEvent.click(screen.getByText('hindi'))
    expect(await screen.findByText('डैशबोर्ड')).toBeInTheDocument()
    expect(localStorage.getItem('preferredLanguage')).toBe('hi')
  })
})
