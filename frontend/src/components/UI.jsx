import { AlertTriangle, ArrowLeft, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export const Badge = ({children,tone='green'}) => <span className={`badge badge-${tone}`}>{children}</span>
export const Button = ({children,variant='primary',loading=false,className='',...props}) => <button className={`button button-${variant} ${className}`} disabled={loading||props.disabled} {...props}>{loading?<LoaderCircle size={17} className="spin"/>:children}</button>
export const Empty = ({title,text,action}) => <div className="empty"><div className="empty-icon"><AlertTriangle size={24}/></div><h3>{title}</h3><p>{text}</p>{action}</div>
export const PageHeader = ({eyebrow,title,description,action,back}) => {const {t}=useApp();return <div className="page-header"><div>{back&&<Link className="back-link" to={back}><ArrowLeft size={16}/> {t('back')}</Link>}{eyebrow&&<p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description&&<p>{description}</p>}</div>{action}</div>}
export const Metric = ({icon:Icon,label,value,detail,tone='green'}) => <article className="metric-card"><div className={`metric-icon tone-${tone}`}><Icon size={20}/></div><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></article>
export const Loading = () => {const {t}=useApp();return <div className="loading"><LoaderCircle className="spin"/><span>{t('loadingInformation')}</span></div>}
export const Money = ({value}) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(value||0)
