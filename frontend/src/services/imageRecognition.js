export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export function validateImageFile(file) {
  if (!file) throw new Error('Please choose a crop or leaf image.')
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) throw new Error('Upload a JPG, PNG or WebP crop image.')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('The image must be 10 MB or smaller.')
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => { URL.revokeObjectURL(url); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('The selected file is not a readable crop image.')) }
    image.src = url
  })
}

export async function extractImageFeatures(file) {
  validateImageFile(file)
  const image = await loadImage(file)
  if (image.naturalWidth < 64 || image.naturalHeight < 64) throw new Error('The image is too small. Use an image at least 64 × 64 pixels.')
  const canvas = document.createElement('canvas')
  canvas.width = 224
  canvas.height = 224
  const context = canvas.getContext('2d', { willReadFrequently: true })
  context.drawImage(image, 0, 0, 224, 224)
  const { data } = context.getImageData(0, 0, 224, 224)
  let red = 0; let green = 0; let blue = 0; let greenPixels = 0; let yellow = 0; let brown = 0; let white = 0; let dark = 0
  const gray = new Float32Array(224 * 224)
  for (let offset = 0, pixel = 0; offset < data.length; offset += 4, pixel += 1) {
    const r = data[offset] / 255; const g = data[offset + 1] / 255; const b = data[offset + 2] / 255
    red += r; green += g; blue += b
    if (g > r * 1.08 && g > b * 1.08 && g > .2) greenPixels += 1
    if (r > .42 && g > .38 && b < .38 && Math.abs(r - g) < .25) yellow += 1
    if (r > .22 && g > .1 && g < r * .88 && b < g * .88) brown += 1
    if (r > .72 && g > .72 && b > .72) white += 1
    if ((r + g + b) / 3 < .22) dark += 1
    gray[pixel] = r * .299 + g * .587 + b * .114
  }
  const count = gray.length
  const meanGray = gray.reduce((sum, value) => sum + value, 0) / count
  const contrast = Math.sqrt(gray.reduce((sum, value) => sum + (value - meanGray) ** 2, 0) / count)
  let edges = 0; let edgeCount = 0
  for (let y = 0; y < 223; y += 1) for (let x = 0; x < 223; x += 1) {
    const index = y * 224 + x
    edges += Math.abs(gray[index] - gray[index + 1]) + Math.abs(gray[index] - gray[index + 224])
    edgeCount += 2
  }
  const round = (value) => +value.toFixed(4)
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    mean_red: round(red / count),
    mean_green: round(green / count),
    mean_blue: round(blue / count),
    green_ratio: round(greenPixels / count),
    yellow_ratio: round(yellow / count),
    brown_ratio: round(brown / count),
    white_ratio: round(white / count),
    dark_ratio: round(dark / count),
    contrast: round(contrast),
    edge_strength: round(edges / edgeCount),
  }
}

const advisory = {
  'Leaf spot pattern': ['Brown or dark spot-like regions are prominent in the image.', 'Inspect both sides of affected leaves and nearby plants for spreading spots.', 'Improve airflow, avoid prolonged leaf wetness, and remove heavily affected debris.', 'Use locally recommended integrated disease management after field confirmation.'],
  'Possible chlorosis or nutrient stress': ['Yellow regions are prominent compared with healthy green tissue.', 'Check whether yellowing follows leaf veins or affects older leaves first.', 'Use soil-test-guided nutrition and avoid waterlogging or prolonged moisture stress.', 'Correct confirmed nutrient or irrigation problems and seek local advice if it spreads.'],
  'Powdery surface pattern': ['Light surface regions may resemble powdery residue.', 'Inspect the leaf surface in natural light and check whether residue can be disturbed.', 'Maintain spacing and airflow and avoid unnecessary late overhead irrigation.', 'Confirm locally before using any crop-protection product.'],
  'Possible blight or tissue stress': ['Dark tissue regions are prominent in the image.', 'Check stems and nearby leaves for expanding dark or water-soaked areas.', 'Remove severely affected debris and avoid moving through wet plants.', 'Seek crop-specific field confirmation if dark areas expand rapidly.'],
  'No clear disease pattern': ['No strong lesion pattern could be separated reliably.', 'Upload a closer, well-lit image or use symptom-based guidance.', 'Continue routine scouting and record changes over several days.', 'Consult a local agricultural expert if symptoms persist or spread.'],
}

export function runDemoImageHeuristic(features, crop = 'Selected crop') {
  const candidates = [
    [features.brown_ratio, 'Leaf spot pattern'],
    [features.yellow_ratio, 'Possible chlorosis or nutrient stress'],
    [features.white_ratio * .8, 'Powdery surface pattern'],
    [features.dark_ratio * .75, 'Possible blight or tissue stress'],
  ]
  let [signal, issue] = candidates.sort((a, b) => b[0] - a[0])[0]
  let confidence = Math.min(88, 34 + signal * 210 + features.contrast * 34)
  if (signal < .055 || (features.edge_strength < .006 && features.contrast < .03)) {
    issue = 'No clear disease pattern'
    confidence = Math.min(confidence, 42)
  }
  const [observation, recommended_action, prevention, management] = advisory[issue]
  return {
    crop,
    possible_issue: issue,
    confidence: +confidence.toFixed(1),
    low_confidence: confidence < 45,
    observation,
    recommended_action,
    prevention,
    management,
    analysis_mode: 'demo-image-heuristic',
    analysis_label: 'Demo image analysis — color and texture heuristic, not a trained diagnostic model',
    disclaimer: 'This is an advisory estimate, not a confirmed diagnosis. Confirm important decisions with a qualified agricultural expert.',
  }
}
