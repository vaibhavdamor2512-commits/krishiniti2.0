import { runDemoImageHeuristic } from '../services/imageRecognition'
import { cropCatalog, demoHistory, demoWeather, recommendationsFor, symptomAnalysis, symptomsForCrop } from './data'
import { createSession, hashPassword, requireUser, verifyPassword } from './security'

class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
})

const now = () => new Date().toISOString()
const text = (value) => String(value ?? '').trim()
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback
const safeJson = (value, fallback) => { try { return JSON.parse(value) } catch { return fallback } }

function userOut(row) {
  return { id: row.id, name: row.name, mobile: row.mobile, location: row.location, farm_size: row.farm_size, preferred_language: row.preferred_language }
}

function farmOut(row) {
  return { id: row.id, name: row.name, location: row.location, total_area: row.total_area, latitude: row.latitude, longitude: row.longitude, created_at: row.created_at }
}

function fieldOut(row) {
  return {
    id: row.id,
    farm_id: row.farm_id,
    name: row.name,
    polygon: safeJson(row.polygon, []),
    latitude: row.latitude,
    longitude: row.longitude,
    area: row.area,
    current_crop: row.current_crop,
    sowing_date: row.sowing_date,
    irrigation_available: Boolean(row.irrigation_available),
    soil: safeJson(row.soil, null),
  }
}

async function readJson(request) {
  try { return await request.json() }
  catch { throw new ApiError(400, 'The request body is not valid JSON.') }
}

function validateRegistration(payload) {
  const name = text(payload.name)
  const mobile = text(payload.mobile).replace(/\s+/g, '')
  const password = String(payload.password || '')
  const location = text(payload.location)
  const farmSize = number(payload.farm_size)
  const preferredLanguage = text(payload.preferred_language || 'en')
  if (name.length < 2) throw new ApiError(422, 'Please enter your full name.')
  if (!/^\d{8,15}$/.test(mobile)) throw new ApiError(422, 'Enter a valid mobile number using 8 to 15 digits.')
  if (password.length < 6) throw new ApiError(422, 'Password must contain at least 6 characters.')
  if (!location) throw new ApiError(422, 'Please enter your location.')
  if (!['en', 'hi', 'gu', 'pa'].includes(preferredLanguage)) throw new ApiError(422, 'Choose a supported language.')
  return { name, mobile, password, location, farmSize, preferredLanguage }
}

async function ensureDemoAccount(db) {
  let user = await db.prepare('SELECT * FROM users WHERE mobile = ?').bind('9999999999').first()
  if (user) return user
  const passwordHash = await hashPassword('demo123')
  const createdAt = now()
  const insert = await db.prepare('INSERT INTO users (name, mobile, password_hash, location, farm_size, preferred_language, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind('Demo Farmer', '9999999999', passwordHash, 'Ahmedabad, Gujarat', 2.4, 'en', createdAt).run()
  const userId = insert.meta.last_row_id
  const farmInsert = await db.prepare('INSERT INTO farms (user_id, name, location, total_area, latitude, longitude, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(userId, 'Green Valley Farm', 'Ahmedabad, Gujarat', 2.4, 22.9808, 72.469, createdAt).run()
  const polygon = [[22.98083, 72.46830], [22.98142, 72.46906], [22.98078, 72.46979], [22.98012, 72.46894], [22.98083, 72.46830]]
  const soil = { nitrogen: 75, phosphorus: 42, potassium: 55, ph: 6.8, soil_type: 'Loamy', moisture: 38 }
  await db.prepare('INSERT INTO fields (farm_id, name, polygon, latitude, longitude, area, current_crop, sowing_date, irrigation_available, soil, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(farmInsert.meta.last_row_id, 'Field One', JSON.stringify(polygon), 22.9808, 72.469, 2.4, 'Cotton', null, 1, JSON.stringify(soil), createdAt).run()
  user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
  return user
}

async function ownedFarm(db, farmId, userId) {
  const row = await db.prepare('SELECT * FROM farms WHERE id = ? AND user_id = ?').bind(farmId, userId).first()
  if (!row) throw new ApiError(404, 'Farm not found.')
  return row
}

async function ownedField(db, fieldId, userId) {
  const row = await db.prepare('SELECT fields.* FROM fields JOIN farms ON farms.id = fields.farm_id WHERE fields.id = ? AND farms.user_id = ?').bind(fieldId, userId).first()
  if (!row) throw new ApiError(404, 'Field not found.')
  return row
}

function normalizePolygon(value) {
  if (!Array.isArray(value) || value.length < 3) throw new ApiError(422, 'Draw at least three field boundary points.')
  const points = value.map((point) => {
    if (!Array.isArray(point) || point.length !== 2 || !Number.isFinite(Number(point[0])) || !Number.isFinite(Number(point[1]))) throw new ApiError(422, 'The field boundary contains an invalid coordinate.')
    return [Number(point[0]), Number(point[1])]
  })
  const first = points[0]; const last = points.at(-1)
  if (first[0] !== last[0] || first[1] !== last[1]) points.push([...first])
  if (points.length < 4) throw new ApiError(422, 'Draw at least three field boundary points.')
  return points
}

function polygonStats(points) {
  const open = points.slice(0, -1)
  const latitude = open.reduce((sum, point) => sum + point[0], 0) / open.length
  const longitude = open.reduce((sum, point) => sum + point[1], 0) / open.length
  const latitudeRadians = latitude * Math.PI / 180
  const projected = points.map(([lat, lon]) => [lon * 111320 * Math.cos(latitudeRadians), lat * 110540])
  let squareMeters = 0
  for (let index = 0; index < projected.length - 1; index += 1) squareMeters += projected[index][0] * projected[index + 1][1] - projected[index + 1][0] * projected[index][1]
  return { latitude, longitude, area: Math.max(.01, Math.abs(squareMeters) / 2 / 4046.8564224) }
}

function validateSoil(value = {}) {
  const soil = {
    nitrogen: number(value.nitrogen, 75), phosphorus: number(value.phosphorus, 42), potassium: number(value.potassium, 55),
    ph: number(value.ph, 6.8), soil_type: text(value.soil_type || 'Loamy'), moisture: number(value.moisture, 38),
  }
  if (soil.nitrogen < 0 || soil.phosphorus < 0 || soil.potassium < 0 || soil.ph < 0 || soil.ph > 14 || soil.moisture < 0 || soil.moisture > 100) throw new ApiError(422, 'Please check the soil values and try again.')
  return soil
}

async function register(request, db) {
  const values = validateRegistration(await readJson(request))
  if (await db.prepare('SELECT id FROM users WHERE mobile = ?').bind(values.mobile).first()) throw new ApiError(409, 'An account with this mobile number already exists.')
  const result = await db.prepare('INSERT INTO users (name, mobile, password_hash, location, farm_size, preferred_language, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(values.name, values.mobile, await hashPassword(values.password), values.location, values.farmSize, values.preferredLanguage, now()).run()
  const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(result.meta.last_row_id).first()
  return json({ user: userOut(row), message: 'Account created successfully. Please sign in.' }, 201)
}

async function login(request, db) {
  const payload = await readJson(request)
  const mobile = text(payload.mobile).replace(/\s+/g, '')
  if (mobile === '9999999999') await ensureDemoAccount(db)
  const row = await db.prepare('SELECT * FROM users WHERE mobile = ?').bind(mobile).first()
  if (!row || !await verifyPassword(String(payload.password || ''), row.password_hash)) throw new ApiError(401, 'Mobile number or password is incorrect.')
  return json({ access_token: await createSession(db, row.id), token_type: 'bearer', user: userOut(row) })
}

async function createFarm(request, db, user) {
  const payload = await readJson(request)
  const name = text(payload.name); const location = text(payload.location)
  if (name.length < 2) throw new ApiError(422, 'Please enter your farm name.')
  if (location.length < 2) throw new ApiError(422, 'Please enter the farm location.')
  const latitude = number(payload.latitude, 22.9808); const longitude = number(payload.longitude, 72.469); const totalArea = number(payload.total_area)
  const result = await db.prepare('INSERT INTO farms (user_id, name, location, total_area, latitude, longitude, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(user.id, name, location, totalArea, latitude, longitude, now()).run()
  return json(farmOut(await db.prepare('SELECT * FROM farms WHERE id = ?').bind(result.meta.last_row_id).first()), 201)
}

async function saveField(request, db, user, existingId = null) {
  const payload = await readJson(request)
  const existing = existingId ? await ownedField(db, existingId, user.id) : null
  const farmId = existing ? existing.farm_id : number(payload.farm_id)
  await ownedFarm(db, farmId, user.id)
  const name = text(payload.name)
  if (name.length < 2) throw new ApiError(422, 'Please enter a field name.')
  const polygon = normalizePolygon(payload.polygon)
  const stats = polygonStats(polygon)
  const soil = validateSoil(payload.soil)
  if (existing) {
    await db.prepare('UPDATE fields SET name = ?, polygon = ?, latitude = ?, longitude = ?, area = ?, current_crop = ?, sowing_date = ?, irrigation_available = ?, soil = ? WHERE id = ?')
      .bind(name, JSON.stringify(polygon), stats.latitude, stats.longitude, stats.area, text(payload.current_crop) || null, payload.sowing_date || null, payload.irrigation_available === false ? 0 : 1, JSON.stringify(soil), existingId).run()
  } else {
    const result = await db.prepare('INSERT INTO fields (farm_id, name, polygon, latitude, longitude, area, current_crop, sowing_date, irrigation_available, soil, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(farmId, name, JSON.stringify(polygon), stats.latitude, stats.longitude, stats.area, text(payload.current_crop) || null, payload.sowing_date || null, payload.irrigation_available === false ? 0 : 1, JSON.stringify(soil), now()).run()
    existingId = result.meta.last_row_id
  }
  return json(fieldOut(await ownedField(db, existingId, user.id)), existing ? 200 : 201)
}

async function dashboard(db, user) {
  const row = await db.prepare('SELECT fields.*, farms.name AS farm_name, farms.id AS joined_farm_id FROM fields JOIN farms ON farms.id = fields.farm_id WHERE farms.user_id = ? ORDER BY fields.id LIMIT 1').bind(user.id).first()
  if (!row) return json({ empty: true, message: 'Create a farm and field to begin.' })
  const field = fieldOut(row); const latest = demoHistory.at(-1); const previous = demoHistory.at(-2)
  return json({
    empty: false, farmer: user.name, farm: { id: row.joined_farm_id, name: row.farm_name },
    field: { ...field, soil_moisture: field.soil?.moisture ?? 38 }, weather: demoWeather,
    ndvi: { current: latest.average_ndvi, previous: previous.average_ndvi, trend: +(latest.average_ndvi - previous.average_ndvi).toFixed(2), label: 'Healthy vegetation', status: 'good', message: 'Continue monitoring alongside field observations.' },
    today_advisory: demoWeather.irrigation_advisory, unread_notifications: 2, data_mode: 'demo',
  })
}

function validateFeatures(value) {
  const features = typeof value === 'string' ? safeJson(value, null) : value
  const keys = ['width', 'height', 'green_ratio', 'yellow_ratio', 'brown_ratio', 'white_ratio', 'dark_ratio', 'contrast', 'edge_strength']
  if (!features || keys.some((key) => !Number.isFinite(Number(features[key])))) throw new ApiError(422, 'The image could not be preprocessed. Please try another image.')
  if (features.width < 64 || features.height < 64) throw new ApiError(422, 'The image is too small. Use an image at least 64 × 64 pixels.')
  return Object.fromEntries(Object.entries(features).map(([key, value]) => [key, Number(value)]))
}

async function analyzeImage(request, env, db, user) {
  let form
  try { form = await request.formData() }
  catch { throw new ApiError(400, 'The image upload could not be read. Please choose the image again.') }
  const image = form.get('image'); const cropId = number(form.get('crop_id'), 1)
  if (!image || typeof image.arrayBuffer !== 'function' || typeof image.size !== 'number') throw new ApiError(422, 'Please choose a crop or leaf image.')
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) throw new ApiError(415, 'Upload a JPG, PNG or WebP crop image.')
  if (image.size > 10 * 1024 * 1024) throw new ApiError(413, 'The image must be 10 MB or smaller.')
  const crop = cropCatalog.find((item) => item.id === cropId) || cropCatalog[0]
  const features = validateFeatures(form.get('features'))
  let analysis
  if (env.DISEASE_MODEL_URL) {
    const outbound = new FormData(); outbound.append('image', image); outbound.append('crop_id', String(cropId)); outbound.append('features', JSON.stringify(features))
    const modelResponse = await fetch(env.DISEASE_MODEL_URL, { method: 'POST', body: outbound, headers: env.DISEASE_MODEL_API_KEY ? { authorization: `Bearer ${env.DISEASE_MODEL_API_KEY}` } : {} })
    if (!modelResponse.ok) throw new ApiError(502, 'The configured disease model is temporarily unavailable.')
    analysis = { ...(await modelResponse.json()), analysis_mode: 'configured-ml-model', analysis_label: 'Configured image classification model' }
  } else analysis = runDemoImageHeuristic(features, crop.name)
  if (!env.FILES) throw new ApiError(503, 'Image storage is not configured.')
  const safeName = image.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-80) || 'crop-image'
  const objectKey = `disease/${user.id}/${crypto.randomUUID()}-${safeName}`
  try { await env.FILES.put(objectKey, await image.arrayBuffer(), { httpMetadata: { contentType: image.type } }) }
  catch { throw new ApiError(503, 'Image file storage is temporarily unavailable.') }
  try {
    await db.prepare('INSERT INTO disease_analyses (user_id, crop_name, object_key, content_type, size_bytes, analysis_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(user.id, crop.name, objectKey, image.type, image.size, JSON.stringify({ ...analysis, features }), now()).run()
  } catch { throw new ApiError(503, 'Image analysis history is temporarily unavailable.') }
  return json({ ...analysis, features, filename: image.name, size_bytes: image.size })
}

async function routeAuthenticated(request, env, db, user, path, method) {
  if (path === '/api/auth/me' && method === 'GET') return json(userOut(user))
  if (path === '/api/auth/language' && method === 'PUT') {
    const language = text((await readJson(request)).preferred_language)
    if (!['en', 'hi', 'gu', 'pa'].includes(language)) throw new ApiError(422, 'Unsupported language.')
    await db.prepare('UPDATE users SET preferred_language = ? WHERE id = ?').bind(language, user.id).run()
    return json({ ...userOut(user), preferred_language: language })
  }
  if (path === '/api/farms' && method === 'GET') {
    const rows = await db.prepare('SELECT * FROM farms WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all()
    return json(rows.results.map(farmOut))
  }
  if (path === '/api/farms' && method === 'POST') return createFarm(request, db, user)
  const farmMatch = path.match(/^\/api\/farms\/(\d+)$/)
  if (farmMatch && method === 'GET') return json(farmOut(await ownedFarm(db, Number(farmMatch[1]), user.id)))
  const farmFieldsMatch = path.match(/^\/api\/fields\/farm\/(\d+)$/)
  if (farmFieldsMatch && method === 'GET') {
    const farm = await ownedFarm(db, Number(farmFieldsMatch[1]), user.id)
    const rows = await db.prepare('SELECT * FROM fields WHERE farm_id = ? ORDER BY id').bind(farm.id).all()
    return json(rows.results.map(fieldOut))
  }
  if (path === '/api/fields' && method === 'POST') return saveField(request, db, user)
  const fieldMatch = path.match(/^\/api\/fields\/(\d+)$/)
  if (fieldMatch && method === 'GET') return json(fieldOut(await ownedField(db, Number(fieldMatch[1]), user.id)))
  if (fieldMatch && method === 'PUT') return saveField(request, db, user, Number(fieldMatch[1]))
  if (path === '/api/dashboard' && method === 'GET') return dashboard(db, user)
  if (path === '/api/crops/recommend' && method === 'POST') {
    const payload = await readJson(request); const field = fieldOut(await ownedField(db, number(payload.field_id), user.id))
    const result = { field_id: field.id, area_acres: field.area, weather: demoWeather, recommendations: recommendationsFor(field.area), data_mode: 'demo' }
    await db.prepare('INSERT INTO recommendation_runs (user_id, field_id, result_json, created_at) VALUES (?, ?, ?, ?)').bind(user.id, field.id, JSON.stringify(result), now()).run()
    return json(result)
  }
  if (fieldMatch && method === 'DELETE') {
    await ownedField(db, Number(fieldMatch[1]), user.id); await db.prepare('DELETE FROM fields WHERE id = ?').bind(Number(fieldMatch[1])).run(); return new Response(null, { status: 204 })
  }
  const weatherMatch = path.match(/^\/api\/weather\/(\d+)$/)
  if (weatherMatch && method === 'GET') { await ownedField(db, Number(weatherMatch[1]), user.id); return json(demoWeather) }
  const ndviMatch = path.match(/^\/api\/ndvi\/(\d+)$/)
  if (ndviMatch && method === 'GET') {
    await ownedField(db, Number(ndviMatch[1]), user.id); const latest = demoHistory.at(-1)
    return json({ ...latest, previous_ndvi: .69, trend: -.02, interpretation: { label: 'Healthy vegetation', status: 'good', message: 'Continue monitoring alongside field observations.', disclaimer: 'Vegetation condition indicator — not a confirmed crop diagnosis.' } })
  }
  const ndviHistoryMatch = path.match(/^\/api\/ndvi\/(\d+)\/history$/)
  if (ndviHistoryMatch && method === 'GET') { await ownedField(db, Number(ndviHistoryMatch[1]), user.id); return json({ field_id: Number(ndviHistoryMatch[1]), records: demoHistory, source: 'Mock Sentinel-2 series in demo mode' }) }
  if (path === '/api/diseases/crops' && method === 'GET') return json(cropCatalog)
  const symptomsMatch = path.match(/^\/api\/diseases\/symptoms\/(\d+)$/)
  if (symptomsMatch && method === 'GET') return json(symptomsForCrop(Number(symptomsMatch[1])))
  if (path === '/api/diseases/analyze' && method === 'POST') { const payload = await readJson(request); return json(symptomAnalysis(number(payload.crop_id), Array.isArray(payload.symptom_ids) ? payload.symptom_ids.map(Number) : [])) }
  if (path === '/api/diseases/analyze-image' && method === 'POST') return analyzeImage(request, env, db, user)
  const advisoriesMatch = path.match(/^\/api\/advisories\/(\d+)$/)
  if (advisoriesMatch && method === 'GET') { await ownedField(db, Number(advisoriesMatch[1]), user.id); return json([{ id: 1, type: 'irrigation', severity: 'moderate', message: 'Rain is expected. Consider delaying irrigation and monitor soil moisture.' }, { id: 2, type: 'crop_health', severity: 'low', message: 'Vegetation condition is good. Continue routine field checks.' }]) }
  if (path === '/api/notifications' && method === 'GET') return json([{ id: 1, title: 'Rain likely this evening', message: 'Check soil moisture tomorrow before irrigating.', type: 'weather', is_read: false }, { id: 2, title: 'Field health updated', message: 'The latest vegetation condition indicator is 0.67.', type: 'ndvi', is_read: false }])
  if (/^\/api\/notifications\/\d+\/read$/.test(path) && method === 'PUT') return json({ id: Number(path.split('/')[3]), is_read: true })
  throw new ApiError(404, 'API route not found.')
}

export async function handleApi(request, env) {
  try {
    if (!env.DB) throw new ApiError(503, 'Database storage is not configured.')
    const path = new URL(request.url).pathname.replace(/\/$/, '') || '/'
    const method = request.method.toUpperCase()
    if (path === '/api/health' && method === 'GET') return json({ status: 'healthy', data_mode: 'hosted-d1' })
    if (path === '/api/auth/register' && method === 'POST') return register(request, env.DB)
    if (path === '/api/auth/login' && method === 'POST') return login(request, env.DB)
    const user = await requireUser(request, env.DB)
    if (!user) throw new ApiError(401, 'Your session has expired. Please sign in again.')
    return await routeAuthenticated(request, env, env.DB, user, path, method)
  } catch (error) {
    if (error instanceof ApiError) return json({ detail: error.message }, error.status)
    console.error('Krishiniti API error', error)
    return json({ detail: 'Something went wrong. Please try again.' }, 500)
  }
}
