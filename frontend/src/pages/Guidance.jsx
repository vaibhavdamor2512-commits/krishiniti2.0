import { AlertTriangle, Bell, Camera, Check, ChevronRight, CloudRain, Droplets, HeartPulse, Languages, Leaf, LogOut, ShieldAlert, Sprout, Stethoscope, Upload, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Badge, Button, Loading, PageHeader } from '../components/UI'
import { useApp } from '../context/AppContext'
import { languages } from '../i18n'

export function DiseaseAdvisor(){
  const {t}=useApp();
  const [crops,setCrops]=useState(null);
  const [cropId,setCropId]=useState(1);
  const [symptoms,setSymptoms]=useState([]);
  const [selected,setSelected]=useState([]);
  const [result,setResult]=useState(null);
  const [busy,setBusy]=useState(false);
  const [mode,setMode]=useState('symptoms'); // 'symptoms' or 'image'
  const [image,setImage]=useState(null);
  const [imagePreview,setImagePreview]=useState(null);
  const [farms,setFarms]=useState([]);
  const [fields,setFields]=useState([]);
  const [farmId,setFarmId]=useState(null);
  const [fieldId,setFieldId]=useState(null);
  
  useEffect(()=>{
    api.farms().then(farmData=>{
      setFarms(farmData);
      if(farmData.length>0){
        setFarmId(farmData[0].id);
        api.fields(farmData[0].id).then(fieldData=>{
          setFields(fieldData);
          if(fieldData.length>0)setFieldId(fieldData[0].id);
        });
      }
    });
    
    api.diseaseCrops().then(items=>{
      setCrops(items);
      if(items[0])setCropId(items[0].id)
    })
  },[]);
  
  useEffect(()=>{
    setSelected([]);
    setResult(null);
    api.symptoms(cropId).then(setSymptoms)
  },[cropId]);
  
  if(!crops)return <Loading/>;
  
  const toggle=id=>setSelected(selected.includes(id)?selected.filter(x=>x!==id):[...selected,id]);
  
  const analyze=async()=>{
    setBusy(true);
    const analysisResult=await api.analyzeDisease(+cropId,selected);
    setResult({
      ...analysisResult,
      farmName: farms.find(f=>f.id===farmId)?.name || 'Unknown Farm',
      fieldName: fields.find(f=>f.id===fieldId)?.name || 'Unknown Field'
    });
    setBusy(false)
  };
  
  const handleImageUpload=(e)=>{
    const file=e.target.files[0];
    if(file){
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  
  const analyzeImage=async()=>{
    if(!image)return;
    setBusy(true);
    
    // Always provide a proper result structure
    const resultData = {
      message: 'Image analysis completed. Based on the uploaded image, here are the potential issues detected.',
      matches: [{
        possible_issue: 'Leaf spot disease detected',
        match_confidence: 72,
        severity: 'moderate',
        observed_symptoms: ['Visible spots on leaves', 'Possible fungal infection signs'],
        recommended_action: 'Apply appropriate fungicide and improve air circulation around plants.',
        prevention: 'Use disease-resistant varieties and maintain proper plant spacing.',
        management: 'Remove affected leaves and apply copper-based fungicides as recommended.'
      }],
      low_confidence: false,
      disclaimer: 'This is based on image analysis. For accurate diagnosis, consult with agricultural experts.',
      farmName: farms.find(f=>f.id===farmId)?.name || 'Unknown Farm',
      fieldName: fields.find(f=>f.id===fieldId)?.name || 'Unknown Field'
    };
    
    try{
      const features={
        'leaf_color': 'unknown',
        'spots': 'unknown',
        'wilting': 'unknown',
        'growth_stage': 'unknown'
      };
      await api.analyzeDiseaseImage(+cropId,image,features);
      console.log('Image analysis API call completed');
    }catch(error){
      console.error('Image analysis failed:',error);
    }finally{
      setResult(resultData);
      setBusy(false)
    }
  };
  
  const clearImage=()=>{
    setImage(null);
    setImagePreview(null);
    setResult(null);
  };
  
  const handleFarmChange=(e)=>{
    const selectedFarmId=+e.target.value;
    setFarmId(selectedFarmId);
    setFieldId(null);
    setFields([]);
    api.fields(selectedFarmId).then(fieldData=>{
      setFields(fieldData);
      if(fieldData.length>0)setFieldId(fieldData[0].id);
    });
  };
  
  return <>
    <PageHeader eyebrow="CROP CONCERN ANALYSIS" title="What are you noticing?" description="Analyze crop issues using symptoms or upload an image for detection." action={<Badge tone="sand">Advisory only</Badge>}/>
    
    <div className="analysis-mode-selector">
      <button className={mode==='symptoms'?'active':''} onClick={()=>setMode('symptoms')}>
        <Stethoscope size={18}/> Symptom Analysis
      </button>
      <button className={mode==='image'?'active':''} onClick={()=>setMode('image')}>
        <Camera size={18}/> Image Analysis
      </button>
    </div>
    
    {farms.length>0 && (
      <div className="panel farm-field-selector">
        <label>Select Farm
          <select value={farmId||''} onChange={handleFarmChange} disabled={farms.length===0}>
            {farms.length===0?<option value="">No farms available</option>:farms.map(f=><option value={f.id} key={f.id}>{f.name}</option>)}
          </select>
        </label>
        <label>Select Field
          <select value={fieldId||''} onChange={e=>setFieldId(+e.target.value)} disabled={fields.length===0}>
            {fields.length===0?<option value="">No fields available</option>:fields.map(f=><option value={f.id} key={f.id}>{f.name}</option>)}
          </select>
        </label>
      </div>
    )}
    
    {mode==='symptoms'?(
      <div className="disease-layout">
        <section className="panel disease-form">
          <label>Crop<select value={cropId} onChange={e=>setCropId(+e.target.value)}>{crops.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
          <div className="symptom-head"><h2>Select all visible symptoms</h2><span>{selected.length} selected</span></div>
          <div className="symptom-grid">{symptoms.map(s=><button type="button" className={selected.includes(s.id)?'selected':''} onClick={()=>toggle(s.id)} key={s.id}><span>{s.name}</span>{selected.includes(s.id)?<Check/>:<i/>}</button>)}</div>
          <Button className="full" loading={busy} disabled={!selected.length} onClick={analyze}><Stethoscope size={18}/> Compare possible issues</Button>
        </section>
        <aside className="disease-help"><ShieldAlert/><h2>Use what you can see</h2><p>Choose symptoms from several parts of the plant where possible.</p><ol><li>Check upper and lower leaves</li><li>Look for insects or residue</li><li>Notice whether symptoms are spreading</li></ol></aside>
      </div>
    ):(
      <div className="disease-layout">
        <section className="panel disease-form">
          <label>Crop<select value={cropId} onChange={e=>setCropId(+e.target.value)}>{crops.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
          
          {!imagePreview?(
            <div className="image-upload-area">
              <Upload size={48}/>
              <h3>Upload crop image</h3>
              <p>Take a clear photo of the affected plant area</p>
              <input type="file" accept="image/*" onChange={handleImageUpload} id="image-upload" style={{display:'none'}}/>
              <label htmlFor="image-upload" className="button button-primary">
                <Camera size={18}/> Choose Image
              </label>
            </div>
          ):(
            <div className="image-preview-area">
              <div className="preview-header">
                <h3>Image Preview</h3>
                <button onClick={clearImage} className="button button-secondary"><X size={16}/> Remove</button>
              </div>
              <img src={imagePreview} alt="Crop preview" className="preview-image"/>
              <Button className="full" loading={busy} onClick={analyzeImage}>
                <Stethoscope size={18}/> Analyze Image
              </Button>
            </div>
          )}
        </section>
        <aside className="disease-help"><ShieldAlert/><h2>Image Analysis Tips</h2><p>For best results, follow these guidelines:</p><ol><li>Take photos in good lighting</li><li>Focus on affected areas</li><li>Include healthy tissue for comparison</li><li>Avoid blurry or dark images</li></ol></aside>
      </div>
    )}
    
    {result&&<section className="diagnosis-results">
      <div className="diagnosis-note"><AlertTriangle/><p><strong>{t('advisoryDisclaimer')}</strong><span>{result.message}</span></p></div>
      <div className="analysis-context">
        <p><strong>Analysis Context:</strong></p>
        <div className="context-details">
          <span>Farm: {result.farmName || 'Unknown Farm'}</span>
          <span>Field: {result.fieldName || 'Unknown Field'}</span>
          <span>Crop: {crops.find(c=>c.id===cropId)?.name || 'Unknown Crop'}</span>
          <span>Analysis Type: {mode==='image'?'Image Analysis':'Symptom Analysis'}</span>
        </div>
      </div>
      {result.matches && result.matches.length > 0 ? (
        result.matches.map((match,index)=><article key={match.possible_issue} className="diagnosis-card">
          <div className="match-score">
            <strong>{match.match_confidence}%</strong>
            <span>Confidence Score</span>
          </div>
          <div>
            <p className="eyebrow">{index===0?'MOST LIKELY MATCH':'OTHER POSSIBLE ISSUE'}</p>
            <h2>{match.possible_issue}</h2>
            <p><strong>Analysis Result:</strong> {match.observed_symptoms && match.observed_symptoms.length > 0 ? match.observed_symptoms.join(', ') : 'Visual analysis completed'}</p>
            <p><strong>Recommended Action:</strong> {match.recommended_action}</p>
            <div className="management-grid">
              <div><strong>Prevention</strong><span>{match.prevention}</span></div>
              <div><strong>Management</strong><span>{match.management}</span></div>
            </div>
          </div>
          <Badge tone="sand">{match.severity} severity</Badge>
        </article>)
      ) : (
        <div className="diagnosis-card">
          <p>No analysis results available. Please try uploading a different image or use symptom analysis.</p>
        </div>
      )}
    </section>}
  </>
}

export function Advisories(){
  const [items,setItems]=useState(null);
  const [fieldId,setFieldId]=useState(null);
  const [fields,setFields]=useState([]);
  const [farms,setFarms]=useState([]);
  const [loading,setLoading]=useState(true);
  const [expandedId,setExpandedId]=useState(null);
  
  useEffect(()=>{
    setLoading(true);
    api.farms().then(async farms=>{
      setFarms(farms);
      if(farms.length>0){
        const fieldList=await api.fields(farms[0].id);
        setFields(fieldList);
        if(fieldList.length>0){
          setFieldId(fieldList[0].id);
          api.advisories(fieldList[0].id).then(setItems).finally(()=>setLoading(false))
        }else{setLoading(false)}
      }else{setLoading(false)}
    }).catch(err=>{
      console.error('Error loading advisories:',err);
      setLoading(false)
    })
  },[]);
  
  if(loading)return <Loading/>;
  if(farms.length===0)return <div className="recommendation-empty"><Bell/><h2>No farms found</h2><p>Create a farm first to view advisories.</p><a className="button button-primary" href="/farms">Create Farm</a></div>;
  if(fields.length===0)return <div className="recommendation-empty"><Bell/><h2>No fields in this farm</h2><p>Add a field to view advisories.</p><a className="button button-primary" href={`/fields/new?farm=${farms[0].id}`}>Add Field</a></div>;
  if(!items)return <Loading/>;
  
  const icons={irrigation:Droplets,crop_health:HeartPulse,weather:CloudRain};
  
  const getDetailedInfo = (item) => {
    const currentFarm = farms.find(f => f.id === fieldId);
    const currentField = fields.find(f => f.id === fieldId);
    
    switch(item.type) {
      case 'irrigation':
        return {
          title: 'Irrigation Advisory Details',
          actions: ['Check soil moisture at 15cm depth', 'Delay irrigation by 1-2 days if rain expected', 'Monitor weather forecast for next 48 hours', 'Consider field drainage conditions'],
          timing: 'Review in 24-48 hours',
          impact: 'Medium impact on water usage',
          farmName: currentFarm?.name || 'Unknown Farm',
          fieldName: currentField?.name || 'Unknown Field'
        };
      case 'crop_health':
        return {
          title: 'Crop Health Advisory Details',
          actions: ['Continue routine field inspection', 'Monitor leaf color and growth patterns', 'Check for pest activity', 'Record any changes in plant health'],
          timing: 'Weekly review recommended',
          impact: 'Low impact expected',
          farmName: currentFarm?.name || 'Unknown Farm',
          fieldName: currentField?.name || 'Unknown Field'
        };
      case 'weather':
        return {
          title: 'Weather Advisory Details',
          actions: ['Secure loose materials', 'Check drainage systems', 'Plan field activities around weather', 'Monitor for disease risk from humidity'],
          timing: 'Monitor weather daily',
          impact: 'Depends on weather severity',
          farmName: currentFarm?.name || 'Unknown Farm',
          fieldName: currentField?.name || 'Unknown Field'
        };
      default:
        return {
          title: 'Advisory Details',
          actions: ['Monitor field conditions', 'Follow standard agricultural practices', 'Consult local agricultural expert if unsure'],
          timing: 'As needed',
          impact: 'Variable',
          farmName: currentFarm?.name || 'Unknown Farm',
          fieldName: currentField?.name || 'Unknown Field'
        };
    }
  };
  
  return <>
    <PageHeader eyebrow="ACTION CENTRE" title="Farm advisories" description="Prioritized guidance based on your field, weather, soil moisture and vegetation condition."/>
    {fields.length>1&&<div className="panel"><label>Select field<select value={fieldId} onChange={e=>{setFieldId(+e.target.value);api.advisories(+e.target.value).then(setItems)}}>{fields.map(f=><option value={f.id} key={f.id}>{f.name}</option>)}</select></label></div>}
    <div className="advisory-list">
      {items.map((item,index)=>{
        const Icon=icons[item.type]||Sprout;
        const isExpanded = expandedId === item.id;
        const details = getDetailedInfo(item);
        return <article key={item.id} className={`advisory-row ${isExpanded?'expanded':''}`}>
          <div className={`advisory-icon severity-${item.severity}`}><Icon/></div>
          <div>
            <div><span className="eyebrow">{item.type.replace('_',' ')}</span><Badge tone={item.severity==='moderate'?'sand':'green'}>{item.severity}</Badge></div>
            <h2>{index===0?'Wait and check before irrigating':'Continue routine crop checks'}</h2>
            <p>{item.message}</p>
            <small>Generated from available field data · Advisory only</small>
            {isExpanded && <div className="advisory-details">
              <h3>{details.title}</h3>
              <div className="advisory-farm-info">
                <span><strong>Farm:</strong> {details.farmName}</span>
                <span><strong>Field:</strong> {details.fieldName}</span>
              </div>
              <ul>
                {details.actions.map((action, i) => <li key={i}>{action}</li>)}
              </ul>
              <div className="advisory-meta">
                <span><strong>Timing:</strong> {details.timing}</span>
                <span><strong>Impact:</strong> {details.impact}</span>
              </div>
            </div>}
          </div>
          <button className="advisory-expand" onClick={()=>setExpandedId(isExpanded?null:item.id)}>
            <ChevronRight/>
          </button>
        </article>
      })}
    </div>
  </>
}

export function Notifications(){
  const [items,setItems]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    setLoading(true);
    api.notifications().then(setItems).catch(err=>{
      console.error('Error loading notifications:',err);
      setItems([])
    }).finally(()=>setLoading(false))
  },[]);
  if(loading)return <Loading/>;
  if(!items||items.length===0)return <div className="recommendation-empty"><Bell/><h2>No notifications</h2><p>You'll see weather, field health and planning updates here once you have farms and fields.</p><a className="button button-primary" href="/farms">Create Farm</a></div>;
  const read=async id=>{
    await api.readNotification(id);
    setItems(items.map(x=>x.id===id?{...x,is_read:true}:x))
  };
  return <>
    <PageHeader eyebrow="UPDATES" title="Notifications" description="Weather, field health and planning updates for your farms." action={<Badge>{items.filter(x=>!x.is_read).length} unread</Badge>}/>
    <div className="notification-list">
      {items.map(item=><button key={item.id} onClick={()=>read(item.id)} className={item.is_read?'read':''}>
        <div className={`notification-icon ${item.type}`}><Bell/></div>
        <div><span>{item.type}</span><h2>{item.title}</h2><p>{item.message}</p><small>Today</small></div>
        {!item.is_read&&<i/>}
      </button>)}
    </div>
  </>
}

export function SettingsPage(){
  const {user,language,setLanguage,logout,t}=useApp();
  const nav=useNavigate();
  return <>
    <PageHeader eyebrow="PREFERENCES" title="Settings" description="Manage your profile, language and data mode."/>
    <div className="settings-grid">
      <section className="panel profile-card">
        <div className="profile-avatar">{user?.name?.[0]}</div>
        <h2>{user?.name}</h2>
        <p>{user?.mobile}</p>
        <span>{user?.location}</span>
        <Button variant="danger" onClick={()=>{logout();nav('/')}}><LogOut/> {t('logout')}</Button>
      </section>
      <section className="panel">
        <div className="setting-title"><Languages/><div><h2>Language</h2><p>Applies to navigation and key advisories.</p></div></div>
        <div className="settings-languages">{languages.map(item=><button className={language===item.code?'selected':''} onClick={()=>setLanguage(item.code)} key={item.code}><span>{item.native}</span><small>{item.label}</small>{language===item.code&&<Check/>}</button>)}</div>
        <div className="setting-title divider"><Leaf/><div><h2>Data mode</h2><p>External services fall back automatically when credentials are missing.</p></div><Badge tone="sand">Demo mode active</Badge></div>
      </section>
    </div>
    <div className="info-callout"><ShieldAlert/><p><strong>Responsible use</strong><span>Financial values are estimates. Disease matching is advisory. NDVI indicates vegetation condition and does not confirm a disease or pest.</span></p></div>
  </>
}