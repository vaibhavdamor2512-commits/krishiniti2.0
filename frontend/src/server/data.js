export const cropCatalog = [
  { id: 1, name: 'Cotton', local_names: { hi: 'कपास', gu: 'કપાસ', pa: 'ਕਪਾਹ' } },
  { id: 2, name: 'Groundnut', local_names: { hi: 'मूंगफली', gu: 'મગફળી', pa: 'ਮੂੰਗਫਲੀ' } },
  { id: 3, name: 'Wheat', local_names: { hi: 'गेहूँ', gu: 'ઘઉં', pa: 'ਕਣਕ' } },
  { id: 5, name: 'Millet', local_names: { hi: 'बाजरा', gu: 'બાજરી', pa: 'ਬਾਜਰਾ' } },
  { id: 6, name: 'Tomato', local_names: { hi: 'टमाटर', gu: 'ટામેટું', pa: 'ਟਮਾਟਰ' } },
]

const symptomNames = ['Yellow leaves', 'Brown spots', 'Black spots', 'Leaf curling', 'White powder', 'Holes in leaves', 'Leaf drying', 'Visible insects', 'Wilting', 'Abnormal growth']
export const symptomsForCrop = (cropId) => symptomNames.map((name, index) => ({
  id: Number(cropId) * 100 + index,
  name,
  description: `Visible sign: ${name.toLowerCase()}.`,
}))

export const demoWeather = {
  temperature: 31.2,
  humidity: 68,
  rainfall: 8,
  rain_probability: 62,
  wind_speed: 11.4,
  forecast_summary: 'Partly cloudy with evening showers',
  weather_risk: 'medium',
  provider: 'demo',
  irrigation_advisory: {
    code: 'DELAY_IRRIGATION',
    severity: 'moderate',
    message: 'Rain is expected. Consider delaying irrigation and monitor soil moisture before watering.',
  },
}

export const demoHistory = [.31, .38, .46, .54, .61, .66, .69, .67].map((average_ndvi, index) => ({
  observation_date: `2026-${String(index + 1).padStart(2, '0')}-12`,
  average_ndvi,
  minimum_ndvi: +(average_ndvi - .12).toFixed(2),
  maximum_ndvi: +(average_ndvi + .11).toFixed(2),
}))

export function recommendationsFor(area = 2.4) {
  const scale = Number(area) || 1
  return [
    { crop_id: 1, crop_name: 'Cotton', suitability_score: 91.2, expected_yield: 8.2, market_price: 7100, cost_per_acre: 31000, risk_score: .27, risk_label: 'Medium', explanation: ['Soil pH and nutrients are within a favorable range', 'Temperature and rainfall outlook are favorable', 'Water need matches available irrigation', 'Sample market value supports the profit estimate'] },
    { crop_id: 2, crop_name: 'Groundnut', suitability_score: 84.6, expected_yield: 7.4, market_price: 6900, cost_per_acre: 24800, risk_score: .18, risk_label: 'Low', explanation: ['Loamy soil is a good match', 'Lower water requirement reduces exposure', 'Sample market value is favorable'] },
    { crop_id: 5, crop_name: 'Millet', suitability_score: 76.8, expected_yield: 12.5, market_price: 2850, cost_per_acre: 15800, risk_score: .14, risk_label: 'Low', explanation: ['Tolerates warmer and drier conditions', 'Lower production cost', 'Water requirement matches available irrigation'] },
  ].map((crop) => {
    const total_cost = Math.round(crop.cost_per_acre * scale)
    const expected_revenue = Math.round(crop.expected_yield * crop.market_price * scale)
    const expected_profit = expected_revenue - total_cost
    return {
      ...crop,
      total_cost,
      expected_revenue,
      expected_profit,
      risk_adjusted_score: Math.round(expected_profit * (1 - crop.risk_score * .28)),
      model: 'transparent-baseline-v1',
    }
  })
}

export function symptomAnalysis(cropId, symptomIds) {
  const selected = symptomsForCrop(cropId).filter((symptom) => symptomIds.includes(symptom.id))
  const names = selected.map((item) => item.name)
  const has = (name) => names.includes(name)
  let possible_issue = Number(cropId) === 6 ? 'Early blight' : 'Cotton leaf curl'
  let confidence = 38
  if (has('Brown spots') || has('Black spots')) {
    possible_issue = Number(cropId) === 6 ? 'Early blight' : 'Leaf spot'
    confidence = 72
  } else if (has('Leaf curling') && has('Yellow leaves')) {
    confidence = 78
  } else if (has('White powder')) {
    possible_issue = 'Powdery mildew'
    confidence = 68
  }
  const low = confidence < 45
  return {
    matches: selected.length ? [{
      possible_issue,
      match_confidence: confidence,
      severity: confidence > 70 ? 'medium' : 'low',
      observed_symptoms: names,
      recommended_action: 'Inspect affected plants and compare nearby leaves before taking action.',
      prevention: 'Use tolerant varieties, maintain field hygiene, and inspect plants regularly.',
      management: 'Use integrated pest management and locally approved controls after field confirmation.',
    }] : [],
    low_confidence: low,
    message: low ? 'The symptom analysis is inconclusive. Check additional symptoms or consult an agricultural expert.' : 'Possible issues ranked from the selected visible symptoms.',
    disclaimer: 'This is an advisory estimate, not a confirmed diagnosis.',
  }
}
