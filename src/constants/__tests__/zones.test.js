// src/constants/__tests__/zones.test.js
import { describe, it, expect } from 'vitest'
import { ZONES } from '../zones.js'

describe('ZONES', () => {
  it('should export an array with correct length', () => {
    expect(Array.isArray(ZONES)).toBe(true)
    expect(ZONES).toHaveLength(24)
  })

  it('should have objects with id, label, and isThree properties', () => {
    ZONES.forEach(zone => {
      expect(zone).toHaveProperty('id')
      expect(zone).toHaveProperty('label')
      expect(zone).toHaveProperty('isThree')
      expect(typeof zone.id).toBe('string')
      expect(typeof zone.label).toBe('string')
      expect(typeof zone.isThree).toBe('boolean')
    })
  })

  describe('Three-point zones', () => {
    const threePointZones = ZONES.filter(z => z.isThree)

    it('should contain correct number of three-point zones', () => {
      expect(threePointZones).toHaveLength(10)
    })

    it('should contain left corner 3 zone', () => {
      const zone = ZONES.find(z => z.id === 'left_corner_3')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('L Corner 3')
      expect(zone.isThree).toBe(true)
    })

    it('should contain left wing 3 zone', () => {
      const zone = ZONES.find(z => z.id === 'left_wing_3')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('L Wing 3')
      expect(zone.isThree).toBe(true)
    })

    it('should contain left slot 3 zone', () => {
      const zone = ZONES.find(z => z.id === 'left_slot_3')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('L Slot 3')
      expect(zone.isThree).toBe(true)
    })

    it('should contain center 3 zone', () => {
      const zone = ZONES.find(z => z.id === 'center_3')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('Center 3')
      expect(zone.isThree).toBe(true)
    })

    it('should contain right wing 3 zone', () => {
      const zone = ZONES.find(z => z.id === 'right_wing_3')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('R Wing 3')
      expect(zone.isThree).toBe(true)
    })

    it('should contain right corner 3 zone', () => {
      const zone = ZONES.find(z => z.id === 'right_corner_3')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('R Corner 3')
      expect(zone.isThree).toBe(true)
    })

    it('should contain right slot 3 zone', () => {
      const zone = ZONES.find(z => z.id === 'right_slot_3')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('R Slot 3')
      expect(zone.isThree).toBe(true)
    })

    it('should contain left deep wing 3 zone', () => {
      const zone = ZONES.find(z => z.id === 'left_deep_wing_3')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('L Deep Wing 3')
      expect(zone.isThree).toBe(true)
    })

    it('should contain right deep wing 3 zone', () => {
      const zone = ZONES.find(z => z.id === 'right_deep_wing_3')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('R Deep Wing 3')
      expect(zone.isThree).toBe(true)
    })

    it('should contain center deep 3 zone', () => {
      const zone = ZONES.find(z => z.id === 'center_deep_3')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('Center Deep 3')
      expect(zone.isThree).toBe(true)
    })
  })

  describe('Two-point zones', () => {
    const twoPointZones = ZONES.filter(z => !z.isThree)

    it('should contain correct number of two-point zones', () => {
      expect(twoPointZones).toHaveLength(14)
    })

    it('should contain left high post zone', () => {
      const zone = ZONES.find(z => z.id === 'left_high_post')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('L High Post')
      expect(zone.isThree).toBe(false)
    })

    it('should contain left low post zone', () => {
      const zone = ZONES.find(z => z.id === 'left_low_post')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('L Low Post')
      expect(zone.isThree).toBe(false)
    })

    it('should contain left deep mid zone', () => {
      const zone = ZONES.find(z => z.id === 'left_deep_mid')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('L Deep Mid')
      expect(zone.isThree).toBe(false)
    })

    it('should contain left short corner zone', () => {
      const zone = ZONES.find(z => z.id === 'left_short_corner')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('L Short Corner')
      expect(zone.isThree).toBe(false)
    })

    it('should contain left wing mid zone', () => {
      const zone = ZONES.find(z => z.id === 'left_wing_mid')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('L Wing Mid')
      expect(zone.isThree).toBe(false)
    })

    it('should contain center mid zone', () => {
      const zone = ZONES.find(z => z.id === 'center_mid')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('Center Mid')
      expect(zone.isThree).toBe(false)
    })

    it('should contain right wing mid zone', () => {
      const zone = ZONES.find(z => z.id === 'right_wing_mid')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('R Wing Mid')
      expect(zone.isThree).toBe(false)
    })

    it('should contain right short corner zone', () => {
      const zone = ZONES.find(z => z.id === 'right_short_corner')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('R Short Corner')
      expect(zone.isThree).toBe(false)
    })

    it('should contain right deep mid zone', () => {
      const zone = ZONES.find(z => z.id === 'right_deep_mid')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('R Deep Mid')
      expect(zone.isThree).toBe(false)
    })

    it('should contain nail zone', () => {
      const zone = ZONES.find(z => z.id === 'nail')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('Nail')
      expect(zone.isThree).toBe(false)
    })

    it('should contain right low post zone', () => {
      const zone = ZONES.find(z => z.id === 'right_low_post')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('R Low Post')
      expect(zone.isThree).toBe(false)
    })

    it('should contain right high post zone', () => {
      const zone = ZONES.find(z => z.id === 'right_high_post')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('R High Post')
      expect(zone.isThree).toBe(false)
    })

    it('should contain runner/floater zone', () => {
      const zone = ZONES.find(z => z.id === 'runner_floater')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('Runner|Floater')
      expect(zone.isThree).toBe(false)
    })

    it('should contain free throw zone', () => {
      const zone = ZONES.find(z => z.id === 'free_throw')
      expect(zone).toBeDefined()
      expect(zone.label).toBe('Free Throw')
      expect(zone.isThree).toBe(false)
    })
  })

  describe('Zone uniqueness', () => {
    it('should have unique zone ids', () => {
      const ids = ZONES.map(z => z.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ZONES.length)
    })

    it('should have unique zone labels', () => {
      const labels = ZONES.map(z => z.label)
      const uniqueLabels = new Set(labels)
      expect(uniqueLabels.size).toBe(ZONES.length)
    })
  })

  describe('Zone coverage', () => {
    it('should have balanced left and right zones', () => {
      const leftZones = ZONES.filter(z => z.id.startsWith('left_'))
      const rightZones = ZONES.filter(z => z.id.startsWith('right_'))

      // Should have equal number of left and right zones
      expect(leftZones.length).toBe(rightZones.length)
      expect(leftZones.length).toBe(9)
    })

    it('should have center zones', () => {
      const centerZones = ZONES.filter(z => z.id.startsWith('center_'))
      expect(centerZones.length).toBeGreaterThan(0)
    })
  })
})
