import { CircleMarker, MapContainer, Polygon, TileLayer, useMapEvents } from 'react-leaflet'

function BoundaryCapture({points,onChange}){
  useMapEvents({click(event){const next=[...points,[+event.latlng.lat.toFixed(6),+event.latlng.lng.toFixed(6)]];onChange(next)}})
  return null
}

export default function FieldMap({polygon=[],onChange}){
  const points=polygon.length>2&&polygon[0][0]===polygon.at(-1)[0]&&polygon[0][1]===polygon.at(-1)[1]?polygon.slice(0,-1):polygon
  const center=points.length?points[0]:[22.9808,72.469]
  const emit=(next)=>onChange(next.length>=3?[...next,next[0]]:next)
  return <div className="map-wrap">
    <MapContainer center={center} zoom={15} scrollWheelZoom className="field-map">
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      <BoundaryCapture points={points} onChange={emit}/>
      {points.length>=3&&<Polygon positions={points} pathOptions={{color:'#1d6845',fillColor:'#7ba869',fillOpacity:.35,weight:3}}/>}
      {points.map((point,index)=><CircleMarker key={`${point[0]}-${point[1]}-${index}`} center={point} radius={5} pathOptions={{color:'#fff',fillColor:'#1d6845',fillOpacity:1,weight:2}}/>)}
    </MapContainer>
    <div className="map-tools"><button type="button" disabled={!points.length} onClick={()=>emit(points.slice(0,-1))}>Undo point</button><button type="button" disabled={!points.length} onClick={()=>onChange([])}>Clear</button></div>
    <span className="map-hint">Tap the map to add boundary points · {points.length} points</span>
  </div>
}
