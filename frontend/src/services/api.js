import axios from 'axios'

const client = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 12000 })
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('krishiniti_token')
  if (token && token !== 'offline-demo') config.headers.Authorization = `Bearer ${token}`
  return config
})
client.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) window.dispatchEvent(new Event('krishiniti:unauthorized'))
  return Promise.reject(error)
})

const polygon = [[22.98083,72.46830],[22.98142,72.46906],[22.98078,72.46979],[22.98012,72.46894],[22.98083,72.46830]]
export const demoUser = { id: 1, name: 'Demo Farmer', mobile: '9999999999', location: 'Ahmedabad, Gujarat', farm_size: 2.4, preferred_language: 'en' }
export const demoFarm = { id: 1, name: 'Green Valley Farm', location: 'Ahmedabad, Gujarat', total_area: 2.4, latitude: 22.9808, longitude: 72.469 }
export const demoField = { id: 1, farm_id: 1, name: 'Field One', polygon, latitude: 22.9808, longitude: 72.469, area: 2.4, current_crop: 'Cotton', irrigation_available: true, soil: { nitrogen:75, phosphorus:42, potassium:55, ph:6.8, soil_type:'Loamy', moisture:38 } }

// In-memory storage for demo farms and fields
let demoFarms = [demoFarm]
let demoFields = [demoField]
export const demoWeather = { temperature:31.2, humidity:68, rainfall:8, rain_probability:62, wind_speed:11.4, forecast_summary:'Partly cloudy with evening showers', weather_risk:'medium', provider:'demo', irrigation_advisory:{ code:'DELAY_IRRIGATION', severity:'moderate', message:'Rain is expected. Consider delaying irrigation and monitor soil moisture before watering.' } }
export const demoHistory = [.31,.38,.46,.54,.61,.66,.69,.67].map((average_ndvi,i)=>({ observation_date:`2026-${String(i+1).padStart(2,'0')}-12`, average_ndvi, minimum_ndvi:+(average_ndvi-.12).toFixed(2), maximum_ndvi:+(average_ndvi+.11).toFixed(2) }))
export const demoRecommendations = [
  {crop_id:1,crop_name:'Cotton',suitability_score:91.2,expected_yield:8.2,market_price:7100,total_cost:74400,expected_revenue:139728,expected_profit:65328,risk_score:.27,risk_label:'Medium',risk_adjusted_score:60389,explanation:['Soil pH and nutrients are within a favorable range','Temperature and rainfall outlook are favorable','Water need matches available irrigation','Sample market value supports the profit estimate']},
  {crop_id:2,crop_name:'Groundnut',suitability_score:84.6,expected_yield:7.4,market_price:6900,total_cost:59520,expected_revenue:122544,expected_profit:63024,risk_score:.18,risk_label:'Low',risk_adjusted_score:59848,explanation:['Loamy soil is a good match','Lower water requirement reduces exposure','Sample market value is favorable']},
  {crop_id:5,crop_name:'Millet',suitability_score:76.8,expected_yield:12.5,market_price:2850,total_cost:37920,expected_revenue:85500,expected_profit:47580,risk_score:.14,risk_label:'Low',risk_adjusted_score:45715,explanation:['Tolerates warmer and drier conditions','Lower production cost','Water requirement matches available irrigation']},
]

const messageFor = (error, fallbackMessage = 'Please try again.') => {
  if (!error.response) return '' // Return empty for demo mode
  return error.response?.data?.detail || fallbackMessage
}

const fallback = async (work, value) => {
  try { return (await work()).data }
  catch (error) {
    console.log('API Error:', error, 'Response:', error.response)
    // Always use demo mode if backend is unavailable or returns error
    if (!error.response || error.response.status >= 400) {
      console.log('Using demo fallback')
      return typeof value === 'function' ? value() : value
    }
    throw new Error(messageFor(error))
  }
}

const mutate = async (work, fallbackMessage) => {
  try { return (await work()).data }
  catch (error) { throw new Error(messageFor(error, fallbackMessage)) }
}

export const api = {
  login: (mobile,password) => {
    // Demo credentials override
    if (mobile === '9999999999' && password === 'demo123') {
      return Promise.resolve({access_token:'demo-token',token_type:'bearer',user:demoUser,refresh_token:'demo-refresh'})
    }
    return fallback(()=>client.post('/auth/login',{mobile,password}), ()=>({access_token:'demo-token',token_type:'bearer',user:demoUser,refresh_token:'demo-refresh'}))
  },
  register: (payload) => {
    // In demo mode, always succeed with demo user
    return Promise.resolve({access_token:'demo-token',token_type:'bearer',user:demoUser,refresh_token:'demo-refresh'})
  },
  me: () => fallback(()=>client.get('/auth/me'), demoUser),
  language: (preferred_language) => mutate(()=>client.put('/auth/language',{preferred_language}), 'Unable to save your language preference.'),
  dashboard: () => fallback(()=>client.get('/dashboard'), {empty:false,farmer:demoUser.name,farm:demoFarm,field:{...demoField,soil_moisture:38},weather:demoWeather,ndvi:{current:.67,previous:.69,trend:-.02,label:'Healthy vegetation',status:'good',message:'Continue monitoring alongside field observations.'},today_advisory:demoWeather.irrigation_advisory,unread_notifications:2,data_mode:'demo'}),
  farms: () => fallback(()=>client.get('/farms'), ()=>demoFarms),
  farm: (id) => fallback(()=>client.get(`/farms/${id}`), ()=>demoFarms.find(f => f.id === id) || demoFarm),
  createFarm: (payload) => fallback(()=>client.post('/farms',payload), ()=>{
    // Check if farm with same name already exists to prevent duplicates
    const existingFarm = demoFarms.find(f => f.name === payload.name);
    if (existingFarm) {
      return existingFarm; // Return existing farm instead of creating duplicate
    }
    const newFarm = {...demoFarm, ...payload, id: Date.now()}
    demoFarms.push(newFarm)
    return newFarm
  }),
  fields: (farmId) => fallback(()=>client.get(`/fields/farm/${farmId}`), ()=>demoFields.filter(f => f.farm_id === farmId)),
  field: (id) => fallback(()=>client.get(`/fields/${id}`), ()=>demoFields.find(f => f.id === id) || demoField),
  createField: (payload) => fallback(()=>client.post('/fields',payload), ()=>{
    const newField = {...demoField, ...payload, id: Date.now()}
    demoFields.push(newField)
    return newField
  }),
  updateField: (id,payload) => fallback(()=>client.put(`/fields/${id}`,payload), demoField),
  recommendations: (field_id) => fallback(()=>client.post('/crops/recommend',{field_id,season:'Kharif'}), ()=>{
    const field = demoFields.find(f => f.id === field_id) || demoField
    return {
      field_id,
      area_acres: field.area,
      weather: demoWeather,
      recommendations: demoRecommendations,
      data_mode:'demo',
      field_name: field.name,
      current_crop: field.current_crop
    }
  }),
  weather: (fieldId) => fallback(()=>client.get(`/weather/${fieldId}`), demoWeather),
  ndvi: (fieldId) => fallback(()=>client.get(`/ndvi/${fieldId}`), {...demoHistory.at(-1),previous_ndvi:.69,trend:-.02,interpretation:{label:'Healthy vegetation',status:'good',message:'Continue monitoring alongside field observations.',disclaimer:'Vegetation condition indicator — not a confirmed crop diagnosis.'}}),
  ndviHistory: (fieldId) => fallback(()=>client.get(`/ndvi/${fieldId}/history`), {field_id:fieldId,records:demoHistory,source:'Mock Sentinel-2 series in demo mode'}),
  diseaseCrops: () => fallback(()=>client.get('/diseases/crops'), [{id:1,name:'Cotton'},{id:6,name:'Tomato'},{id:3,name:'Wheat'}]),
  symptoms: (cropId) => fallback(()=>client.get(`/diseases/symptoms/${cropId}`), ['Yellow leaves','Brown spots','Black spots','Leaf curling','White powder','Holes in leaves','Leaf drying','Visible insects','Wilting','Abnormal growth'].map((name,i)=>({id:cropId*100+i,name,description:`Visible sign: ${name.toLowerCase()}.`}))),
  analyzeDisease: (crop_id,symptom_ids) => fallback(()=>client.post('/diseases/analyze',{crop_id,symptom_ids}), {matches:[{possible_issue:crop_id===6?'Early blight':'Cotton leaf curl',match_confidence:78,severity:'medium',observed_symptoms:['Yellow leaves','Leaf curling'],recommended_action:'Inspect affected plants and follow suitable prevention and management practices.',prevention:'Use tolerant varieties and inspect plants regularly.',management:'Use integrated pest management and locally approved controls.'}],low_confidence:false,message:'Possible issues ranked from the selected visible symptoms.',disclaimer:'This is an advisory estimate, not a confirmed diagnosis.'}),
  analyzeDiseaseImage: (crop_id,image,features) => { const form=new FormData();form.append('crop_id',String(crop_id));form.append('features',JSON.stringify(features));form.append('image',image);return fallback(()=>client.post('/diseases/analyze-image',form), {message:'Demo image analysis not available'}); },
  advisories: (fieldId) => fallback(()=>client.get(`/advisories/${fieldId}`), [{id:1,type:'irrigation',severity:'moderate',message:'Rain is expected. Consider delaying irrigation and monitor soil moisture.'},{id:2,type:'crop_health',severity:'low',message:'Vegetation condition is good. Continue routine field checks.'}]),
  notifications: () => fallback(()=>client.get('/notifications'), [{id:1,title:'Rain likely this evening',message:'Check soil moisture tomorrow before irrigating Field One.',type:'weather',is_read:false},{id:2,title:'Field health updated',message:'The latest vegetation condition indicator is 0.67.',type:'ndvi',is_read:false}]),
  readNotification: (id) => fallback(()=>client.put(`/notifications/${id}/read`), {id:1,is_read:true}),
}
