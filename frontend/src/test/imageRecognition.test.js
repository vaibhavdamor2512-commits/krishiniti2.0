import { describe, expect, it } from 'vitest'
import { MAX_IMAGE_BYTES, runDemoImageHeuristic, validateImageFile } from '../services/imageRecognition'

const base={mean_red:.3,mean_green:.5,mean_blue:.2,green_ratio:.65,yellow_ratio:.01,brown_ratio:.01,white_ratio:.01,dark_ratio:.01,contrast:.08,edge_strength:.03}

describe('crop image recognition safeguards',()=>{
  it('accepts supported image types and rejects invalid or oversized files',()=>{
    expect(()=>validateImageFile(new File(['leaf'],'leaf.webp',{type:'image/webp'}))).not.toThrow()
    expect(()=>validateImageFile(new File(['leaf'],'leaf.gif',{type:'image/gif'}))).toThrow(/JPG, PNG or WebP/)
    expect(()=>validateImageFile({type:'image/png',size:MAX_IMAGE_BYTES+1})).toThrow(/10 MB/)
  })

  it('labels heuristic results as demo advisory analysis',()=>{
    const result=runDemoImageHeuristic({...base,brown_ratio:.24,contrast:.18,edge_strength:.07},'Cotton')
    expect(result.possible_issue).toBe('Leaf spot pattern')
    expect(result.analysis_mode).toBe('demo-image-heuristic')
    expect(result.analysis_label).toMatch(/not a trained diagnostic model/i)
    expect(result.disclaimer).toMatch(/not a confirmed diagnosis/i)
  })

  it('returns a low-confidence result for an indistinct image',()=>{
    const result=runDemoImageHeuristic({...base,green_ratio:.9,contrast:.01,edge_strength:.005},'Wheat')
    expect(result.low_confidence).toBe(true)
    expect(result.possible_issue).toBe('No clear disease pattern')
  })
})
