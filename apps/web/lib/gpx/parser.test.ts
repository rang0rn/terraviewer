import { describe, it, expect } from 'vitest'
import { parseGpx } from './parser'

const VALID_GPX_WITH_ELE = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="48.1" lon="11.5"><ele>500</ele></trkpt>
    <trkpt lat="48.2" lon="11.7"><ele>520</ele></trkpt>
  </trkseg></trk>
</gpx>`

const VALID_GPX_NO_ELE = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk><trkseg>
    <trkpt lat="48.1" lon="11.5"></trkpt>
    <trkpt lat="48.2" lon="11.7"></trkpt>
  </trkseg></trk>
</gpx>`

const INVALID_XML = `not xml at all <<<`

describe('parseGpx', () => {
  it('parses valid GPX and returns correct bounds', () => {
    const result = parseGpx(VALID_GPX_WITH_ELE)
    expect(result.trackPoints).toHaveLength(2)
    expect(result.routeBounds.minLat).toBe(48.1)
    expect(result.routeBounds.maxLat).toBe(48.2)
    expect(result.routeBounds.minLng).toBe(11.5)
    expect(result.routeBounds.maxLng).toBe(11.7)
  })

  it('detects elevation when ele tags are present', () => {
    const result = parseGpx(VALID_GPX_WITH_ELE)
    expect(result.hasElevation).toBe(true)
  })

  it('detects missing elevation when ele tags are absent', () => {
    const result = parseGpx(VALID_GPX_NO_ELE)
    expect(result.hasElevation).toBe(false)
  })

  it('throws INVALID_GPX_FORMAT for malformed XML', () => {
    expect(() => parseGpx(INVALID_XML)).toThrow('INVALID_GPX_FORMAT')
  })

  it('throws INVALID_GPX_FORMAT for XML without trk element', () => {
    expect(() => parseGpx('<gpx><wpt lat="1" lon="2"/></gpx>')).toThrow('INVALID_GPX_FORMAT')
  })
})
