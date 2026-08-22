import { ArrowRight, CloudRain, CloudSun, Droplets, HeartPulse, IndianRupee, MapPin, Sprout, TrendingDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { useApp } from '../context/AppContext'
import { api, demoHistory } from '../services/api'
import { Badge, Loading, Metric } from '../components/UI'

const localeByLanguage={en:'en-IN',hi:'hi-IN',gu:'gu-IN',pa:'pa-IN'}

export default function Dashboard(){
  const {t,language}=useApp()
  const [data,setData]=useState(null)
  const [error,setError]=useState('')
  useEffect(()=>{let active=true;api.dashboard().then(value=>{if(active)setData(value)}).catch(err=>{if(active)setError(err.message||t('unableLoad'))});return()=>{active=false}},[t])
  if(error)return <div className="form-error" role="alert">{error}</div>
  if(!data)return <Loading/>
  if(data.empty)return <div className="empty-state-page"><Sprout/><h1>{t('farmJourneyTitle')}</h1><p>{t('farmJourneyText')}</p><Link className="button button-primary" to="/farms">{t('createFarm')}</Link></div>
  const d=data
  const cropName=d.field.current_crop||t('notSelected')
  return <>
    <div className="dashboard-head"><div><p className="eyebrow">{new Intl.DateTimeFormat(localeByLanguage[language]||'en-IN',{weekday:'long',day:'numeric',month:'long'}).format(new Date())}</p><h1>{t('goodAfternoon')}, {d.farmer?.split(' ')[0]}</h1><p>{t('attention')}</p></div><Badge tone="sand">{t('dataNote')}</Badge></div>
    <section className="priority-card"><div className="priority-copy"><div className="priority-label"><Droplets size={16}/>{t('todayPriority')}</div><h2>{d.today_advisory?.code==='DELAY_IRRIGATION'?t('waitBeforeIrrigating',{crop:cropName}):d.today_advisory?.message}</h2><p>{d.today_advisory?.message}</p><Link className="button button-light" to="/advisories">{t('viewAdvisory')} <ArrowRight size={17}/></Link></div><div className="rain-gauge"><CloudRain/><strong>{d.weather.rainfall} mm</strong><span>{t('rainChance',{value:d.weather.rain_probability})}</span><div><i style={{height:`${d.weather.rain_probability}%`}}/></div></div></section>
    <section className="metrics-grid"><Metric icon={HeartPulse} label={t('vegetationCondition')} value={d.ndvi.label?.replace(' vegetation','')} detail={`NDVI ${d.ndvi.current} · ${d.ndvi.trend>0?'+':''}${d.ndvi.trend}`} tone="green"/><Metric icon={Droplets} label={t('soilMoisture')} value={`${d.field.soil_moisture}%`} detail={t('monitorAfterRainfall')} tone="blue"/><Metric icon={CloudSun} label={t('weather')} value={`${d.weather.temperature}°C`} detail={d.weather.forecast_summary} tone="amber"/><Metric icon={IndianRupee} label={t('estimatedProfit')} value="₹65,328" detail={`${cropName} · ${d.field.area} ${t('acres')}`} tone="violet"/></section>
    <div className="dashboard-columns"><section className="panel field-panel"><div className="panel-head"><div><p className="eyebrow">{t('myField')}</p><h2>{d.field.name}</h2></div><Badge>{t('active')}</Badge></div><div className="field-visual"><div className="field-shape"><span>NDVI<br/><strong>{d.ndvi.current}</strong></span></div><span className="field-pin"><MapPin size={15}/>{d.field.location||'Ahmedabad'}</span></div><div className="field-meta"><div><span>{t('crop')}</span><strong>{cropName}</strong></div><div><span>{t('area')}</span><strong>{d.field.area} {t('acres')}</strong></div><div><span>{t('sown')}</span><strong>{t('daysAgo',{value:64})}</strong></div></div><Link className="panel-link" to={`/fields/${d.field.id}`}>{t('openField')} <ArrowRight size={16}/></Link></section>
    <section className="panel trend-panel"><div className="panel-head"><div><p className="eyebrow">{t('weeksView')}</p><h2>{t('vegetationTrend')}</h2></div><span className="trend-down"><TrendingDown size={15}/> -0.02</span></div><div className="mini-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={demoHistory}><defs><linearGradient id="ndviMini" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3d8b5d" stopOpacity=".32"/><stop offset="100%" stopColor="#3d8b5d" stopOpacity="0"/></linearGradient></defs><Area type="monotone" dataKey="average_ndvi" stroke="#2e7d50" strokeWidth={3} fill="url(#ndviMini)"/></AreaChart></ResponsiveContainer></div><div className="insight-row"><div className="insight-icon"><Sprout/></div><p><strong>{t('healthyVegetation')}</strong><span>{t('healthyTrendText')}</span></p></div><Link className="panel-link" to="/ndvi">{t('viewCropHealth')} <ArrowRight size={16}/></Link></section></div>
  </>
}
