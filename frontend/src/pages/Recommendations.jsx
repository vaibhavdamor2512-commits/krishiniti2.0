import { ArrowRight, CheckCircle2, CircleDollarSign, Droplets, IndianRupee, Leaf, ShieldCheck, Sparkles, Sprout } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { Badge, Button, Loading, Money, PageHeader } from '../components/UI'
import { useApp } from '../context/AppContext'

export default function Recommendations(){
  const {t}=useApp();
  const [farms,setFarms]=useState(null);
  const [fields,setFields]=useState([]);
  const [farmId,setFarmId]=useState(null);
  const [fieldId,setFieldId]=useState(null);
  const [result,setResult]=useState(()=>JSON.parse(localStorage.getItem('krishiniti_recommendations')||'null'));
  const [busy,setBusy]=useState(false);
  const [loadingFields,setLoadingFields]=useState(false);
  
  useEffect(()=>{
    setLoadingFields(true);
    api.farms().then(async f=>{
      setFarms(f);
      if(f[0]){
        setFarmId(f[0].id);
        const list=await api.fields(f[0].id);
        setFields(list);
        if(list[0])setFieldId(list[0].id)
      }
      setLoadingFields(false)
    }).catch(err=>{
      console.error('Error loading farms:',err);
      setLoadingFields(false)
    })
  },[]);

  const handleFarmChange = async (e) => {
    const selectedFarmId = +e.target.value;
    setFarmId(selectedFarmId);
    setFieldId(null);
    setFields([]);
    setLoadingFields(true);
    try {
      const list = await api.fields(selectedFarmId);
      setFields(list);
      if(list[0]) setFieldId(list[0].id);
    } catch(err) {
      console.error('Error loading fields:',err);
    } finally {
      setLoadingFields(false);
    }
  };

  const run=async()=>{
    setBusy(true);
    const data=await api.recommendations(+fieldId);
    setResult(data);
    localStorage.setItem('krishiniti_recommendations',JSON.stringify(data));
    setBusy(false)
  };

  if(!farms)return <Loading/>;
  return <>
    <PageHeader eyebrow="CROP + PROFIT ENGINE" title="Find your strongest crop option" description="We score field fit first, then rank suitable crops by estimated profit after risk." action={<Badge tone="sand">Transparent baseline model</Badge>}/>
    {farms.length===0?
      <div className="recommendation-empty"><div><Sprout/></div><h2>No farms found</h2><p>Create a farm first to get crop recommendations.</p><Link className="button button-primary" to="/farms">Create Farm</Link></div>
    :<>
      <section className="panel recommendation-control">
        <div>
          <label>Choose farm
            <select value={farmId||''} onChange={handleFarmChange} disabled={farms.length===0}>
              {farms.length===0?<option value="">No farms available</option>:farms.map(f=><option value={f.id} key={f.id}>{f.name} · {f.total_area} acres</option>)}
            </select>
          </label>
          <label>Choose field
            {loadingFields?<span className="loading-indicator">Loading fields...</span>:
            <select value={fieldId||''} onChange={e=>setFieldId(e.target.value)} disabled={fields.length===0}>
              {fields.length===0?<option value="">No fields available</option>:fields.map(f=><option value={f.id} key={f.id}>{f.name} · {f.area} acres</option>)}
            </select>}
          </label>
          <p><ShieldCheck/> Uses soil, weather, season, water, yield, sample market price and risk.</p>
        </div>
        <Button loading={busy} disabled={!fieldId||fields.length===0} onClick={run}><Sparkles size={18}/> Find best crops</Button>
      </section>
      {fields.length===0?
        <div className="recommendation-empty"><div><Sprout/></div><h2>No fields in this farm</h2><p>Add a field to get crop recommendations.</p><Link className="button button-primary" to={`/fields/new?farm=${farmId}`}>Add Field</Link></div>
      :!result?
        <div className="recommendation-empty"><div><Sprout/></div><h2>Ready when your field is</h2><p>Run the recommendation to compare several crops. Results are calculated, not fixed cards.</p></div>
      :<>
        <div className="result-summary">
          <div><p className="eyebrow">BEST RISK-ADJUSTED OPTION</p><h2>{result.recommendations[0]?.crop_name}</h2><p>For {result.area_acres} acres, based on the available demo soil and weather context.</p></div>
          <div className="score-ring" style={{'--score':`${result.recommendations[0]?.suitability_score}%`}}><strong>{result.recommendations[0]?.suitability_score}%</strong><span>field fit</span></div>
        </div>
        <div className="crop-results">
          {result.recommendations.map((crop,index)=><article key={crop.crop_id} className={`crop-result ${index===0?'best':''}`}>
            <div className="rank">{index+1}</div>
            <div className="crop-main">
              <div className="crop-title"><div className="crop-icon"><Leaf/></div><div><h2>{crop.crop_name}</h2><p>{crop.suitability_score}% suitability</p></div>{index===0&&<Badge>Best match</Badge>}</div>
              <div className="crop-finance"><div><span>Expected yield</span><strong>{crop.expected_yield} q/acre</strong></div><div><span>Estimated cost</span><strong><Money value={crop.total_cost}/></strong></div><div><span>Expected revenue</span><strong><Money value={crop.expected_revenue}/></strong></div><div className="profit-cell"><span>Estimated profit</span><strong><Money value={crop.expected_profit}/></strong></div></div>
              <div className="reason-list">{crop.explanation.map(reason=><span key={reason}><CheckCircle2/>{reason}</span>)}</div>
            </div>
            <aside><div className={`risk risk-${crop.risk_label.toLowerCase()}`}><ShieldCheck/><span>Risk</span><strong>{crop.risk_label}</strong></div><div><span>Risk-adjusted score</span><strong><Money value={crop.risk_adjusted_score}/></strong></div></aside>
          </article>)}
        </div>
        <div className="disclaimer"><CircleDollarSign/><p><strong>{t('estimatedDisclaimer')}</strong><span>Demo prices and baseline yield estimates are for decision support, not financial promises.</span></p><Link to="/profit">Compare profit details <ArrowRight/></Link></div>
      </>}
    </>}
  </>
}

export function Profit(){
  const {t}=useApp();
  const data=JSON.parse(localStorage.getItem('krishiniti_recommendations')||'null');
  const crops=data?.recommendations||[];
  return <>
    <PageHeader eyebrow="FINANCIAL COMPARISON" title="Profit, with risk in view" description="Revenue minus production cost, then adjusted for weather, water, market and yield uncertainty."/>
    <div className="formula-bar"><span>Expected yield × sample market price</span><b>−</b><span>Seed + inputs + irrigation + labour</span><b>−</b><span>Risk penalty</span><b>=</b><strong>Risk-adjusted score</strong></div>
    {crops.length===0?
      <div className="recommendation-empty"><CircleDollarSign/><h2>No crop plan yet</h2><p>Run a crop recommendation first to see the financial comparison.</p><Link className="button button-primary" to="/recommendations">Find best crops</Link></div>
    :<div className="profit-layout">
      <div className="profit-table">
        <div className="profit-table-head"><span>Crop</span><span>Revenue</span><span>Cost</span><span>Profit</span><span>Risk-adjusted</span></div>
        {crops.map((crop,index)=><div className={index===0?'winner':''} key={crop.crop_id}>
          <span><i>{index+1}</i><strong>{crop.crop_name}</strong><small>{crop.expected_yield} q/acre</small></span>
          <span><Money value={crop.expected_revenue}/></span>
          <span><Money value={crop.total_cost}/></span>
          <span><Money value={crop.expected_profit}/></span>
          <span><strong><Money value={crop.risk_adjusted_score}/></strong><Badge tone={crop.risk_label==='Low'?'green':'sand'}>{crop.risk_label} risk</Badge></span>
        </div>)}
      </div>
      <aside className="panel profit-note">
        <div className="metric-icon tone-violet"><IndianRupee/></div>
        <h2>What the score means</h2>
        <p>A high theoretical profit can fall in ranking when water need, uncertain yield or market exposure increases.</p>
        <ul><li><Droplets/> Water requirement</li><li><ShieldCheck/> Weather and crop risk</li><li><CircleDollarSign/> Sample market price</li></ul>
        <small>{t('estimatedDisclaimer')}</small>
      </aside>
    </div>}
  </>
}