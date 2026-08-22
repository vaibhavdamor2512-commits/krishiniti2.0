import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import { AppProvider, useApp } from './context/AppContext'
import { Language, Login, Register } from './pages/AuthPages'
import Dashboard from './pages/Dashboard'
import FieldEditor from './pages/FieldEditor'
import { FarmDetail, Farms } from './pages/Farms'
import { Advisories, Notifications, SettingsPage } from './pages/Guidance'
import DiseaseAdvisor from './pages/DiseaseAdvisor'
import { NDVI, Weather } from './pages/Monitoring'
import Recommendations, { Profit } from './pages/Recommendations'
import Welcome from './pages/Welcome'
import { Loading } from './components/UI'

function Protected(){const {user,authReady}=useApp();if(!authReady)return <Loading/>;return user?<AppShell/>:<Navigate to="/login" replace/>}

function AppRoutes(){return <Routes>
  <Route path="/" element={<Welcome/>}/><Route path="/login" element={<Login/>}/><Route path="/register" element={<Register/>}/>
  <Route element={<Protected/>}><Route path="/language" element={<Language/>}/><Route path="/dashboard" element={<Dashboard/>}/><Route path="/farms" element={<Farms/>}/><Route path="/farms/:id" element={<FarmDetail/>}/><Route path="/fields/new" element={<FieldEditor/>}/><Route path="/fields/:id" element={<FieldEditor/>}/><Route path="/recommendations" element={<Recommendations/>}/><Route path="/profit" element={<Profit/>}/><Route path="/ndvi" element={<NDVI/>}/><Route path="/weather" element={<Weather/>}/><Route path="/disease-advisor" element={<DiseaseAdvisor/>}/><Route path="/advisories" element={<Advisories/>}/><Route path="/notifications" element={<Notifications/>}/><Route path="/settings" element={<SettingsPage/>}/></Route>
  <Route path="*" element={<Navigate to="/" replace/>}/>
</Routes>}

export default function App(){return <AppProvider><AppRoutes/></AppProvider>}
