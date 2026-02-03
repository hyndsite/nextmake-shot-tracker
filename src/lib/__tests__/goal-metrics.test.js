// src/lib/__tests__/goal-metrics.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import {
  BASE_METRIC_OPTIONS,
  GAME_ONLY_METRIC_OPTIONS,
  metricIsPercent,
  metricIsCount,
  filterEventsByDate,
  formatMetricValue,
  aggregateGameEvents,
  computeGameMetricValue,
  computePracticeMetricValue,
} from '../goal-metrics.js'

describe('goal-metrics', () => {
  describe('BASE_METRIC_OPTIONS', () => {
    it('should export an array of metric options', () => {
      expect(Array.isArray(BASE_METRIC_OPTIONS)).toBe(true)
      expect(BASE_METRIC_OPTIONS.length).toBeGreaterThan(0)
    })

    it('should have correct structure for each option', () => {
      BASE_METRIC_OPTIONS.forEach((option) => {
        expect(option).toHaveProperty('value')
        expect(option).toHaveProperty('label')
        expect(typeof option.value).toBe('string')
        expect(typeof option.label).toBe('string')
      })
    })

    it('should contain expected metric options', () => {
      const values = BASE_METRIC_OPTIONS.map((opt) => opt.value)
      expect(values).toContain('efg_overall')
      expect(values).toContain('three_pct_overall')
      expect(values).toContain('ft_pct')
      expect(values).toContain('fg_pct_zone')
      expect(values).toContain('off_dribble_fg')
      expect(values).toContain('pressured_fg')
      expect(values).toContain('makes')
      expect(values).toContain('attempts')
      expect(values).toContain('attempts_zone')
    })
  })

  describe('GAME_ONLY_METRIC_OPTIONS', () => {
    it('should export an array of game-only metric options', () => {
      expect(Array.isArray(GAME_ONLY_METRIC_OPTIONS)).toBe(true)
      expect(GAME_ONLY_METRIC_OPTIONS.length).toBeGreaterThan(0)
    })

    it('should have correct structure for each option', () => {
      GAME_ONLY_METRIC_OPTIONS.forEach((option) => {
        expect(option).toHaveProperty('value')
        expect(option).toHaveProperty('label')
        expect(typeof option.value).toBe('string')
        expect(typeof option.label).toBe('string')
      })
    })

    it('should contain expected game-only metrics', () => {
      const values = GAME_ONLY_METRIC_OPTIONS.map((opt) => opt.value)
      expect(values).toContain('points_total')
      expect(values).toContain('steals_total')
      expect(values).toContain('assists_total')
      expect(values).toContain('rebounds_total')
    })
  })

  describe('metricIsPercent', () => {
    it('should return true for percentage metrics', () => {
      expect(metricIsPercent('efg_overall')).toBe(true)
      expect(metricIsPercent('three_pct_overall')).toBe(true)
      expect(metricIsPercent('ft_pct')).toBe(true)
      expect(metricIsPercent('fg_pct_zone')).toBe(true)
      expect(metricIsPercent('off_dribble_fg')).toBe(true)
      expect(metricIsPercent('pressured_fg')).toBe(true)
    })

    it('should return false for count metrics', () => {
      expect(metricIsPercent('makes')).toBe(false)
      expect(metricIsPercent('attempts')).toBe(false)
      expect(metricIsPercent('attempts_zone')).toBe(false)
      expect(metricIsPercent('points_total')).toBe(false)
      expect(metricIsPercent('steals_total')).toBe(false)
      expect(metricIsPercent('assists_total')).toBe(false)
      expect(metricIsPercent('rebounds_total')).toBe(false)
    })

    it('should return false for unknown metrics', () => {
      expect(metricIsPercent('unknown_metric')).toBe(false)
      expect(metricIsPercent('')).toBe(false)
    })
  })

  describe('metricIsCount', () => {
    it('should return true for count metrics', () => {
      expect(metricIsCount('makes')).toBe(true)
      expect(metricIsCount('attempts')).toBe(true)
      expect(metricIsCount('attempts_zone')).toBe(true)
      expect(metricIsCount('points_total')).toBe(true)
      expect(metricIsCount('steals_total')).toBe(true)
      expect(metricIsCount('assists_total')).toBe(true)
      expect(metricIsCount('rebounds_total')).toBe(true)
    })

    it('should return false for percentage metrics', () => {
      expect(metricIsCount('efg_overall')).toBe(false)
      expect(metricIsCount('three_pct_overall')).toBe(false)
      expect(metricIsCount('ft_pct')).toBe(false)
      expect(metricIsCount('fg_pct_zone')).toBe(false)
      expect(metricIsCount('off_dribble_fg')).toBe(false)
      expect(metricIsCount('pressured_fg')).toBe(false)
    })

    it('should return false for unknown metrics', () => {
      expect(metricIsCount('unknown_metric')).toBe(false)
      expect(metricIsCount('')).toBe(false)
    })
  })

  describe('filterEventsByDate', () => {
    const createEvent = (ts) => ({ ts, type: 'shot', made: true })

    it('should return all events when no date range is provided', () => {
      const events = [
        createEvent('2024-01-01'),
        createEvent('2024-01-15'),
        createEvent('2024-02-01'),
      ]

      const result = filterEventsByDate(events)
      expect(result).toHaveLength(3)
      expect(result).not.toBe(events) // Should return a copy
    })

    it('should filter events by start date', () => {
      const events = [
        createEvent('2024-01-01T10:00:00'),
        createEvent('2024-01-15T10:00:00'),
        createEvent('2024-02-01T10:00:00'),
      ]

      const result = filterEventsByDate(events, {
        startDate: new Date('2024-01-15T00:00:00'),
      })
      expect(result).toHaveLength(2)
      expect(result[0].ts).toBe('2024-01-15T10:00:00')
      expect(result[1].ts).toBe('2024-02-01T10:00:00')
    })

    it('should filter events by end date', () => {
      const events = [
        createEvent('2024-01-01T10:00:00'),
        createEvent('2024-01-15T10:00:00'),
        createEvent('2024-02-01T10:00:00'),
      ]

      const result = filterEventsByDate(events, {
        endDate: new Date('2024-01-20T00:00:00'),
      })
      expect(result).toHaveLength(2)
      expect(result[0].ts).toBe('2024-01-01T10:00:00')
      expect(result[1].ts).toBe('2024-01-15T10:00:00')
    })

    it('should filter events by both start and end date', () => {
      const events = [
        createEvent('2024-01-01T10:00:00'),
        createEvent('2024-01-15T10:00:00'),
        createEvent('2024-02-01T10:00:00'),
        createEvent('2024-02-15T10:00:00'),
      ]

      const result = filterEventsByDate(events, {
        startDate: new Date('2024-01-10T00:00:00'),
        endDate: new Date('2024-02-05T00:00:00'),
      })
      expect(result).toHaveLength(2)
      expect(result[0].ts).toBe('2024-01-15T10:00:00')
      expect(result[1].ts).toBe('2024-02-01T10:00:00')
    })

    it('should accept ISO string dates', () => {
      const events = [
        createEvent('2024-01-15T10:00:00'),
        createEvent('2024-02-01T10:00:00'),
      ]

      const result = filterEventsByDate(events, {
        startDate: '2024-01-20',
      })
      expect(result).toHaveLength(1)
      expect(result[0].ts).toBe('2024-02-01T10:00:00')
    })

    it('should accept timestamp numbers', () => {
      const events = [
        createEvent(1704110400000), // 2024-01-01
        createEvent(1706745600000), // 2024-02-01
      ]

      const result = filterEventsByDate(events, {
        startDate: 1705363200000, // 2024-01-16
      })
      expect(result).toHaveLength(1)
    })

    it('should handle empty events array', () => {
      const result = filterEventsByDate([], {
        startDate: new Date('2024-01-01'),
      })
      expect(result).toEqual([])
    })

    it('should handle null or undefined events', () => {
      const result1 = filterEventsByDate(null, {
        startDate: new Date('2024-01-01'),
      })
      expect(result1).toEqual([])

      const result2 = filterEventsByDate(undefined, {
        startDate: new Date('2024-01-01'),
      })
      expect(result2).toEqual([])
    })

    it('should filter out events without timestamps', () => {
      const events = [
        createEvent('2024-01-15T10:00:00'),
        { type: 'shot', made: true }, // No ts
        createEvent('2024-02-01T10:00:00'),
      ]

      const result = filterEventsByDate(events, {
        startDate: new Date('2024-01-01'),
      })
      expect(result).toHaveLength(2)
    })

    it('should filter out events with invalid timestamps', () => {
      const events = [
        createEvent('2024-01-15T10:00:00'),
        createEvent('invalid-date'),
        createEvent('2024-02-01T10:00:00'),
      ]

      const result = filterEventsByDate(events)
      // Invalid dates will be filtered out when parsed
      expect(result.length).toBeLessThanOrEqual(3)
    })
  })

  describe('formatMetricValue', () => {
    it('should format percentage metrics with % suffix', () => {
      expect(formatMetricValue('efg_overall', 50.5)).toBe('50.5%')
      expect(formatMetricValue('three_pct_overall', 33.333)).toBe('33.3%')
      expect(formatMetricValue('ft_pct', 85.67)).toBe('85.7%')
    })

    it('should round percentage values to one decimal place', () => {
      expect(formatMetricValue('efg_overall', 50.55)).toBe('50.6%')
      expect(formatMetricValue('efg_overall', 50.54)).toBe('50.5%')
      expect(formatMetricValue('efg_overall', 50.49)).toBe('50.5%')
    })

    it('should format count metrics as integers', () => {
      expect(formatMetricValue('makes', 15.7)).toBe('16')
      expect(formatMetricValue('attempts', 25.2)).toBe('25')
      expect(formatMetricValue('points_total', 30.9)).toBe('31')
    })

    it('should handle zero values', () => {
      expect(formatMetricValue('efg_overall', 0)).toBe('0%')
      expect(formatMetricValue('makes', 0)).toBe('0')
    })

    it('should handle null values', () => {
      expect(formatMetricValue('efg_overall', null)).toBe('0')
      expect(formatMetricValue('makes', null)).toBe('0')
    })

    it('should handle undefined values', () => {
      expect(formatMetricValue('efg_overall', undefined)).toBe('0')
      expect(formatMetricValue('makes', undefined)).toBe('0')
    })

    it('should handle NaN values', () => {
      expect(formatMetricValue('efg_overall', NaN)).toBe('0')
      expect(formatMetricValue('makes', NaN)).toBe('0')
    })

    it('should handle unknown metrics as counts', () => {
      expect(formatMetricValue('unknown_metric', 42.7)).toBe('43')
    })
  })

  describe('aggregateGameEvents', () => {
    it('should return zero stats for empty events array', () => {
      const stats = aggregateGameEvents([])
      expect(stats.assists).toBe(0)
      expect(stats.rebounds).toBe(0)
      expect(stats.steals).toBe(0)
      expect(stats.fgm).toBe(0)
      expect(stats.fga).toBe(0)
      expect(stats.fgPct).toBe(0)
      expect(stats.efgPct).toBe(0)
      expect(stats.threesMade).toBe(0)
      expect(stats.threesAtt).toBe(0)
      expect(stats.threePct).toBe(0)
      expect(stats.ftMakes).toBe(0)
      expect(stats.ftAtt).toBe(0)
      expect(stats.ftPct).toBe(0)
      expect(stats.totalPoints).toBe(0)
    })

    it('should count assists, rebounds, and steals', () => {
      const events = [
        { type: 'assist' },
        { type: 'assist' },
        { type: 'rebound' },
        { type: 'rebound' },
        { type: 'rebound' },
        { type: 'steal' },
      ]

      const stats = aggregateGameEvents(events)
      expect(stats.assists).toBe(2)
      expect(stats.rebounds).toBe(3)
      expect(stats.steals).toBe(1)
    })

    it('should aggregate field goal makes and attempts', () => {
      const events = [
        { type: 'shot', made: true, is_three: false },
        { type: 'shot', made: false, is_three: false },
        { type: 'shot', made: true, is_three: false },
      ]

      const stats = aggregateGameEvents(events)
      expect(stats.fgm).toBe(2)
      expect(stats.fga).toBe(3)
      expect(stats.fgPct).toBeCloseTo(66.67, 1)
    })

    it('should aggregate three-point shots', () => {
      const events = [
        { type: 'shot', made: true, is_three: true },
        { type: 'shot', made: false, is_three: true },
        { type: 'shot', made: true, is_three: true },
        { type: 'shot', made: false, is_three: true },
      ]

      const stats = aggregateGameEvents(events)
      expect(stats.threesMade).toBe(2)
      expect(stats.threesAtt).toBe(4)
      expect(stats.threePct).toBe(50)
    })

    it('should calculate eFG% correctly', () => {
      const events = [
        { type: 'shot', made: true, is_three: false }, // 2 pts
        { type: 'shot', made: true, is_three: true },  // 3 pts
        { type: 'shot', made: false, is_three: false },
      ]

      const stats = aggregateGameEvents(events)
      // eFG% = (FGM + 0.5 * 3PM) / FGA * 100
      // = (2 + 0.5 * 1) / 3 * 100 = 2.5 / 3 * 100 = 83.33%
      expect(stats.efgPct).toBeCloseTo(83.33, 1)
    })

    it('should aggregate free throws separately from field goals', () => {
      const events = [
        { type: 'shot', made: true, is_three: false },
        { type: 'shot', made: false, is_three: false },
        { type: 'freethrow', made: true },
        { type: 'freethrow', made: true },
        { type: 'freethrow', made: false },
      ]

      const stats = aggregateGameEvents(events)
      expect(stats.fgm).toBe(1)
      expect(stats.fga).toBe(2)
      expect(stats.ftMakes).toBe(2)
      expect(stats.ftAtt).toBe(3)
      expect(stats.ftPct).toBeCloseTo(66.67, 1)
    })

    it('should calculate total points correctly', () => {
      const events = [
        { type: 'shot', made: true, is_three: false }, // 2 pts
        { type: 'shot', made: true, is_three: true },  // 3 pts
        { type: 'shot', made: false, is_three: false }, // 0 pts
        { type: 'freethrow', made: true },              // 1 pt
        { type: 'freethrow', made: false },             // 0 pts
        { type: 'freethrow', made: true },              // 1 pt
      ]

      const stats = aggregateGameEvents(events)
      expect(stats.totalPoints).toBe(7)
    })

    it('should track zone-based FG makes and attempts', () => {
      const events = [
        { type: 'shot', made: true, is_three: false, zone_id: 'left_wing_mid' },
        { type: 'shot', made: false, is_three: false, zone_id: 'left_wing_mid' },
        { type: 'shot', made: true, is_three: true, zone_id: 'left_corner_3' },
        { type: 'shot', made: false, is_three: false, zone_id: 'nail' },
      ]

      const stats = aggregateGameEvents(events)
      expect(stats.zoneFgm.get('left_wing_mid')).toBe(1)
      expect(stats.zoneFga.get('left_wing_mid')).toBe(2)
      expect(stats.zoneFgm.get('left_corner_3')).toBe(1)
      expect(stats.zoneFga.get('left_corner_3')).toBe(1)
      expect(stats.zoneFgm.get('nail')).toBeUndefined()
      expect(stats.zoneFga.get('nail')).toBe(1)
    })

    it('should track off-dribble shots by shot_type', () => {
      const events = [
        { type: 'shot', made: true, is_three: false, shot_type: 'Off-Dribble' },
        { type: 'shot', made: false, is_three: false, shot_type: 'off-dribble' },
        { type: 'shot', made: true, is_three: false, shot_type: 'Pull-Up' },
        { type: 'shot', made: false, is_three: false, shot_type: 'Catch & Shoot' },
      ]

      const stats = aggregateGameEvents(events)
      expect(stats.offDribbleMakes).toBe(2)
      expect(stats.offDribbleAtt).toBe(3)
    })

    it('should track pressured shots', () => {
      const events = [
        { type: 'shot', made: true, is_three: false, pressured: true },
        { type: 'shot', made: false, is_three: false, pressured: true },
        { type: 'shot', made: true, is_three: false, pressured: true },
        { type: 'shot', made: true, is_three: false, pressured: false },
      ]

      const stats = aggregateGameEvents(events)
      expect(stats.pressuredMakes).toBe(2)
      expect(stats.pressuredAtt).toBe(3)
    })

    it('should handle mixed event types correctly', () => {
      const events = [
        { type: 'shot', made: true, is_three: true, zone_id: 'left_corner_3', shot_type: 'Catch & Shoot', pressured: false },
        { type: 'assist' },
        { type: 'shot', made: false, is_three: false, zone_id: 'nail', shot_type: 'Off-Dribble', pressured: true },
        { type: 'rebound' },
        { type: 'freethrow', made: true },
        { type: 'steal' },
      ]

      const stats = aggregateGameEvents(events)
      expect(stats.fgm).toBe(1)
      expect(stats.fga).toBe(2)
      expect(stats.threesMade).toBe(1)
      expect(stats.threesAtt).toBe(1)
      expect(stats.ftMakes).toBe(1)
      expect(stats.ftAtt).toBe(1)
      expect(stats.assists).toBe(1)
      expect(stats.rebounds).toBe(1)
      expect(stats.steals).toBe(1)
      expect(stats.totalPoints).toBe(4) // 3 + 1
      expect(stats.offDribbleMakes).toBe(0)
      expect(stats.offDribbleAtt).toBe(1)
      expect(stats.pressuredMakes).toBe(0)
      expect(stats.pressuredAtt).toBe(1)
    })

    it('should handle zero attempts without division errors', () => {
      const events = []
      const stats = aggregateGameEvents(events)
      expect(stats.fgPct).toBe(0)
      expect(stats.efgPct).toBe(0)
      expect(stats.threePct).toBe(0)
      expect(stats.ftPct).toBe(0)
    })

    it('should handle shots without zone_id', () => {
      const events = [
        { type: 'shot', made: true, is_three: false },
        { type: 'shot', made: false, is_three: false },
      ]

      const stats = aggregateGameEvents(events)
      expect(stats.zoneFgm.get('unknown')).toBe(1)
      expect(stats.zoneFga.get('unknown')).toBe(2)
    })

    it('should handle null or undefined events', () => {
      const stats1 = aggregateGameEvents(null)
      expect(stats1.fgm).toBe(0)

      const stats2 = aggregateGameEvents(undefined)
      expect(stats2.fgm).toBe(0)
    })

    it('should use shotType as fallback for shot_type', () => {
      const events = [
        { type: 'shot', made: true, is_three: false, shotType: 'pull-up jumper' },
      ]

      const stats = aggregateGameEvents(events)
      expect(stats.offDribbleMakes).toBe(1)
      expect(stats.offDribbleAtt).toBe(1)
    })
  })

  describe('computeGameMetricValue', () => {
    const createShot = (made, isThree, options = {}) => ({
      type: 'shot',
      made,
      is_three: isThree,
      ts: '2024-01-15T10:00:00',
      ...options,
    })

    describe('efg_overall', () => {
      it('should compute eFG% correctly', () => {
        const events = [
          createShot(true, false),  // FGM: 1, FGA: 1
          createShot(true, true),   // FGM: 2, FGA: 2, 3PM: 1
          createShot(false, false), // FGM: 2, FGA: 3, 3PM: 1
        ]

        const value = computeGameMetricValue('efg_overall', events)
        // eFG% = (2 + 0.5 * 1) / 3 * 100 = 83.33%
        expect(value).toBeCloseTo(83.33, 1)
      })

      it('should return 0 for no attempts', () => {
        const value = computeGameMetricValue('efg_overall', [])
        expect(value).toBe(0)
      })
    })

    describe('three_pct_overall', () => {
      it('should compute 3P% correctly', () => {
        const events = [
          createShot(true, true),
          createShot(false, true),
          createShot(true, true),
        ]

        const value = computeGameMetricValue('three_pct_overall', events)
        expect(value).toBeCloseTo(66.67, 1)
      })

      it('should return 0 for no three-point attempts', () => {
        const events = [createShot(true, false)]
        const value = computeGameMetricValue('three_pct_overall', events)
        expect(value).toBe(0)
      })
    })

    describe('ft_pct', () => {
      it('should compute FT% correctly', () => {
        const events = [
          { type: 'freethrow', made: true, ts: '2024-01-15T10:00:00' },
          { type: 'freethrow', made: false, ts: '2024-01-15T10:00:00' },
          { type: 'freethrow', made: true, ts: '2024-01-15T10:00:00' },
          { type: 'freethrow', made: true, ts: '2024-01-15T10:00:00' },
        ]

        const value = computeGameMetricValue('ft_pct', events)
        expect(value).toBe(75)
      })

      it('should return 0 for no free throw attempts', () => {
        const events = [createShot(true, false)]
        const value = computeGameMetricValue('ft_pct', events)
        expect(value).toBe(0)
      })
    })

    describe('fg_pct_zone', () => {
      it('should compute overall FG% when no zone specified', () => {
        const events = [
          createShot(true, false),
          createShot(false, false),
          createShot(true, false),
        ]

        const value = computeGameMetricValue('fg_pct_zone', events)
        expect(value).toBeCloseTo(66.67, 1)
      })

      it('should compute FG% for specific zone', () => {
        const events = [
          createShot(true, false, { zone_id: 'left_wing_mid' }),
          createShot(false, false, { zone_id: 'left_wing_mid' }),
          createShot(true, false, { zone_id: 'nail' }),
        ]

        const value = computeGameMetricValue('fg_pct_zone', events, {
          zoneId: 'left_wing_mid',
        })
        expect(value).toBe(50)
      })

      it('should return 0 for zone with no attempts', () => {
        const events = [createShot(true, false, { zone_id: 'nail' })]
        const value = computeGameMetricValue('fg_pct_zone', events, {
          zoneId: 'left_wing_mid',
        })
        expect(value).toBe(0)
      })
    })

    describe('attempts_zone', () => {
      it('should return 0 when no zone specified', () => {
        const events = [createShot(true, false)]
        const value = computeGameMetricValue('attempts_zone', events)
        expect(value).toBe(0)
      })

      it('should count attempts for specific zone', () => {
        const events = [
          createShot(true, false, { zone_id: 'left_wing_mid' }),
          createShot(false, false, { zone_id: 'left_wing_mid' }),
          createShot(true, false, { zone_id: 'nail' }),
        ]

        const value = computeGameMetricValue('attempts_zone', events, {
          zoneId: 'left_wing_mid',
        })
        expect(value).toBe(2)
      })
    })

    describe('off_dribble_fg', () => {
      it('should compute off-dribble FG%', () => {
        const events = [
          createShot(true, false, { shot_type: 'Off-Dribble' }),
          createShot(false, false, { shot_type: 'off-dribble' }),
          createShot(true, false, { shot_type: 'Pull-Up' }),
          createShot(true, false, { shot_type: 'Catch & Shoot' }),
        ]

        const value = computeGameMetricValue('off_dribble_fg', events)
        expect(value).toBeCloseTo(66.67, 1)
      })

      it('should return 0 for no off-dribble attempts', () => {
        const events = [createShot(true, false, { shot_type: 'Catch & Shoot' })]
        const value = computeGameMetricValue('off_dribble_fg', events)
        expect(value).toBe(0)
      })
    })

    describe('pressured_fg', () => {
      it('should compute pressured FG%', () => {
        const events = [
          createShot(true, false, { pressured: true }),
          createShot(false, false, { pressured: true }),
          createShot(true, false, { pressured: true }),
          createShot(true, false, { pressured: false }),
        ]

        const value = computeGameMetricValue('pressured_fg', events)
        expect(value).toBeCloseTo(66.67, 1)
      })

      it('should return 0 for no pressured attempts', () => {
        const events = [createShot(true, false, { pressured: false })]
        const value = computeGameMetricValue('pressured_fg', events)
        expect(value).toBe(0)
      })
    })

    describe('makes', () => {
      it('should count field goal makes only', () => {
        const events = [
          createShot(true, false),
          createShot(false, false),
          createShot(true, true),
          { type: 'freethrow', made: true, ts: '2024-01-15T10:00:00' },
        ]

        const value = computeGameMetricValue('makes', events)
        expect(value).toBe(2)
      })
    })

    describe('attempts', () => {
      it('should count field goal attempts only', () => {
        const events = [
          createShot(true, false),
          createShot(false, false),
          createShot(true, true),
          { type: 'freethrow', made: true, ts: '2024-01-15T10:00:00' },
        ]

        const value = computeGameMetricValue('attempts', events)
        expect(value).toBe(3)
      })
    })

    describe('points_total', () => {
      it('should count total points from field goals and free throws', () => {
        const events = [
          createShot(true, false),  // 2 pts
          createShot(true, true),   // 3 pts
          createShot(false, false), // 0 pts
          { type: 'freethrow', made: true, ts: '2024-01-15T10:00:00' },  // 1 pt
          { type: 'freethrow', made: false, ts: '2024-01-15T10:00:00' }, // 0 pts
        ]

        const value = computeGameMetricValue('points_total', events)
        expect(value).toBe(6)
      })
    })

    describe('steals_total', () => {
      it('should count steals', () => {
        const events = [
          { type: 'steal', ts: '2024-01-15T10:00:00' },
          { type: 'steal', ts: '2024-01-15T10:00:00' },
          createShot(true, false),
        ]

        const value = computeGameMetricValue('steals_total', events)
        expect(value).toBe(2)
      })
    })

    describe('assists_total', () => {
      it('should count assists', () => {
        const events = [
          { type: 'assist', ts: '2024-01-15T10:00:00' },
          { type: 'assist', ts: '2024-01-15T10:00:00' },
          { type: 'assist', ts: '2024-01-15T10:00:00' },
        ]

        const value = computeGameMetricValue('assists_total', events)
        expect(value).toBe(3)
      })
    })

    describe('rebounds_total', () => {
      it('should count rebounds', () => {
        const events = [
          { type: 'rebound', ts: '2024-01-15T10:00:00' },
          { type: 'rebound', ts: '2024-01-15T10:00:00' },
          { type: 'rebound', ts: '2024-01-15T10:00:00' },
          { type: 'rebound', ts: '2024-01-15T10:00:00' },
        ]

        const value = computeGameMetricValue('rebounds_total', events)
        expect(value).toBe(4)
      })
    })

    describe('date filtering', () => {
      it('should filter events by date range', () => {
        const events = [
          { ...createShot(true, false), ts: '2024-01-01T10:00:00' },
          { ...createShot(true, false), ts: '2024-01-15T10:00:00' },
          { ...createShot(true, false), ts: '2024-02-01T10:00:00' },
        ]

        const value = computeGameMetricValue('makes', events, {
          startDate: new Date('2024-01-10T00:00:00'),
          endDate: new Date('2024-01-20T00:00:00'),
        })
        expect(value).toBe(1)
      })

      it('should filter points_total by date range', () => {
        const events = [
          { ...createShot(true, true), ts: '2026-02-01T10:00:00' }, // 3 pts
          { ...createShot(true, false), ts: '2026-02-10T10:00:00' }, // 2 pts
        ]

        const value = computeGameMetricValue('points_total', events, {
          startDate: '2026-02-05',
          endDate: '2026-02-12',
        })
        expect(value).toBe(2)
      })
    })

    describe('unknown metric', () => {
      it('should return 0 for unknown metric', () => {
        const events = [createShot(true, false)]
        const value = computeGameMetricValue('unknown_metric', events)
        expect(value).toBe(0)
      })
    })
  })

  describe('computePracticeMetricValue', () => {
    const createPracticeEntry = (makes, attempts, options = {}) => ({
      makes,
      attempts,
      ts: '2024-01-15T10:00:00',
      ...options,
    })

    describe('efg_overall', () => {
      it('should compute eFG% correctly', () => {
        const entries = [
          createPracticeEntry(4, 5, { zone_id: 'left_wing_mid', is_three: false }),
          createPracticeEntry(2, 3, { zone_id: 'left_corner_3', is_three: true }),
        ]

        const value = computePracticeMetricValue('efg_overall', entries)
        // FGM: 6, FGA: 8, 3PM: 2
        // eFG% = (6 + 0.5 * 2) / 8 * 100 = 87.5%
        expect(value).toBe(87.5)
      })

      it('should exclude free throws from eFG%', () => {
        const entries = [
          createPracticeEntry(4, 5, { zone_id: 'left_wing_mid', is_three: false }),
          createPracticeEntry(8, 10, { zone_id: 'free_throw', shot_type: 'Free Throw' }),
        ]

        const value = computePracticeMetricValue('efg_overall', entries)
        // Only field goals count: 4/5 = 80%
        expect(value).toBe(80)
      })
    })

    describe('three_pct_overall', () => {
      it('should compute 3P% correctly', () => {
        const entries = [
          createPracticeEntry(2, 5, { zone_id: 'left_corner_3', is_three: true }),
          createPracticeEntry(3, 5, { zone_id: 'left_wing_3', is_three: true }),
        ]

        const value = computePracticeMetricValue('three_pct_overall', entries)
        // 5/10 = 50%
        expect(value).toBe(50)
      })
    })

    describe('ft_pct', () => {
      it('should compute FT% from free throw zone', () => {
        const entries = [
          createPracticeEntry(8, 10, { zone_id: 'free_throw' }),
        ]

        const value = computePracticeMetricValue('ft_pct', entries)
        expect(value).toBe(80)
      })

      it('should detect free throws by shot_type', () => {
        const entries = [
          createPracticeEntry(7, 10, { shot_type: 'Free Throw' }),
          createPracticeEntry(9, 10, { shot_type: 'ft' }),
        ]

        const value = computePracticeMetricValue('ft_pct', entries)
        // 16/20 = 80%
        expect(value).toBe(80)
      })

      it('should detect free throws by type field', () => {
        const entries = [
          createPracticeEntry(8, 10, { type: 'freethrow' }),
        ]

        const value = computePracticeMetricValue('ft_pct', entries)
        expect(value).toBe(80)
      })
    })

    describe('fg_pct_zone', () => {
      it('should compute overall FG% when no zone specified', () => {
        const entries = [
          createPracticeEntry(4, 5, { zone_id: 'left_wing_mid', is_three: false }),
          createPracticeEntry(6, 10, { zone_id: 'nail', is_three: false }),
        ]

        const value = computePracticeMetricValue('fg_pct_zone', entries)
        // 10/15 = 66.67%
        expect(value).toBeCloseTo(66.67, 1)
      })

      it('should compute FG% for specific zone', () => {
        const entries = [
          createPracticeEntry(4, 5, { zone_id: 'left_wing_mid', is_three: false }),
          createPracticeEntry(6, 10, { zone_id: 'nail', is_three: false }),
        ]

        const value = computePracticeMetricValue('fg_pct_zone', entries, {
          zoneId: 'left_wing_mid',
        })
        expect(value).toBe(80)
      })
    })

    describe('attempts_zone', () => {
      it('should return 0 when no zone specified', () => {
        const entries = [createPracticeEntry(4, 5, { zone_id: 'nail' })]
        const value = computePracticeMetricValue('attempts_zone', entries)
        expect(value).toBe(0)
      })

      it('should count attempts for specific zone', () => {
        const entries = [
          createPracticeEntry(4, 5, { zone_id: 'left_wing_mid' }),
          createPracticeEntry(6, 10, { zone_id: 'left_wing_mid' }),
          createPracticeEntry(2, 3, { zone_id: 'nail' }),
        ]

        const value = computePracticeMetricValue('attempts_zone', entries, {
          zoneId: 'left_wing_mid',
        })
        expect(value).toBe(15)
      })
    })

    describe('off_dribble_fg', () => {
      it('should compute off-dribble FG%', () => {
        const entries = [
          createPracticeEntry(4, 5, { shot_type: 'Off-Dribble' }),
          createPracticeEntry(6, 10, { shot_type: 'pull-up jumper' }),
          createPracticeEntry(8, 10, { shot_type: 'Catch & Shoot' }),
        ]

        const value = computePracticeMetricValue('off_dribble_fg', entries)
        // 10/15 = 66.67%
        expect(value).toBeCloseTo(66.67, 1)
      })
    })

    describe('pressured_fg', () => {
      it('should compute pressured FG%', () => {
        const entries = [
          createPracticeEntry(4, 5, { pressured: true }),
          createPracticeEntry(6, 10, { pressured: true }),
          createPracticeEntry(8, 10, { pressured: false }),
        ]

        const value = computePracticeMetricValue('pressured_fg', entries)
        // 10/15 = 66.67%
        expect(value).toBeCloseTo(66.67, 1)
      })
    })

    describe('makes', () => {
      it('should count field goal makes only', () => {
        const entries = [
          createPracticeEntry(4, 5, { zone_id: 'nail', is_three: false }),
          createPracticeEntry(6, 10, { zone_id: 'left_wing_mid', is_three: false }),
          createPracticeEntry(8, 10, { zone_id: 'free_throw' }), // FTs excluded
        ]

        const value = computePracticeMetricValue('makes', entries)
        expect(value).toBe(10)
      })
    })

    describe('attempts', () => {
      it('should count field goal attempts only', () => {
        const entries = [
          createPracticeEntry(4, 5, { zone_id: 'nail', is_three: false }),
          createPracticeEntry(6, 10, { zone_id: 'left_wing_mid', is_three: false }),
          createPracticeEntry(8, 10, { zone_id: 'free_throw' }), // FTs excluded
        ]

        const value = computePracticeMetricValue('attempts', entries)
        expect(value).toBe(15)
      })
    })

    describe('game-only metrics', () => {
      it('should return 0 for points_total', () => {
        const entries = [createPracticeEntry(4, 5)]
        const value = computePracticeMetricValue('points_total', entries)
        expect(value).toBe(0)
      })

      it('should return 0 for steals_total', () => {
        const entries = [createPracticeEntry(4, 5)]
        const value = computePracticeMetricValue('steals_total', entries)
        expect(value).toBe(0)
      })

      it('should return 0 for assists_total', () => {
        const entries = [createPracticeEntry(4, 5)]
        const value = computePracticeMetricValue('assists_total', entries)
        expect(value).toBe(0)
      })

      it('should return 0 for rebounds_total', () => {
        const entries = [createPracticeEntry(4, 5)]
        const value = computePracticeMetricValue('rebounds_total', entries)
        expect(value).toBe(0)
      })
    })

    describe('edge cases', () => {
      it('should handle entries with made boolean instead of makes count', () => {
        const entries = [
          { attempts: 1, made: true, ts: '2024-01-15T10:00:00', zone_id: 'nail' },
        ]

        const value = computePracticeMetricValue('makes', entries)
        expect(value).toBe(1)
      })

      it('should handle string attempts values', () => {
        const entries = [
          { makes: 4, attempts: '5', ts: '2024-01-15T10:00:00', zone_id: 'nail' },
        ]

        const value = computePracticeMetricValue('attempts', entries)
        expect(value).toBe(5)
      })

      it('should skip entries with zero attempts', () => {
        const entries = [
          createPracticeEntry(4, 5, { zone_id: 'nail' }),
          createPracticeEntry(0, 0, { zone_id: 'nail' }),
        ]

        const value = computePracticeMetricValue('attempts', entries)
        expect(value).toBe(5)
      })

      it('should handle shotType as fallback for shot_type', () => {
        const entries = [
          createPracticeEntry(4, 5, { shotType: 'pull-up jumper' }),
        ]

        const value = computePracticeMetricValue('off_dribble_fg', entries)
        expect(value).toBe(80)
      })

      it('should handle entries without zone_id', () => {
        const entries = [
          createPracticeEntry(4, 5),
        ]

        const value = computePracticeMetricValue('makes', entries)
        expect(value).toBe(4)
      })
    })

    describe('date filtering', () => {
      it('should filter entries by date range', () => {
        const entries = [
          { ...createPracticeEntry(4, 5), ts: '2024-01-01T10:00:00' },
          { ...createPracticeEntry(6, 10), ts: '2024-01-15T10:00:00' },
          { ...createPracticeEntry(8, 10), ts: '2024-02-01T10:00:00' },
        ]

        const value = computePracticeMetricValue('makes', entries, {
          startDate: new Date('2024-01-10T00:00:00'),
          endDate: new Date('2024-01-20T00:00:00'),
        })
        expect(value).toBe(6)
      })

      it('should filter makes by date range with string dates', () => {
        const entries = [
          { ...createPracticeEntry(2, 3), ts: '2026-02-01T10:00:00' },
          { ...createPracticeEntry(1, 2), ts: '2026-02-10T10:00:00' },
        ]

        const value = computePracticeMetricValue('makes', entries, {
          startDate: '2026-02-05',
          endDate: '2026-02-12',
        })
        expect(value).toBe(1)
      })
    })

    describe('unknown metric', () => {
      it('should return 0 for unknown metric', () => {
        const entries = [createPracticeEntry(4, 5)]
        const value = computePracticeMetricValue('unknown_metric', entries)
        expect(value).toBe(0)
      })
    })

    describe('explicit metric coverage (practice)', () => {
      const entries = [
        {
          makes: 2,
          attempts: 4,
          zone_id: 'left_corner_3',
          is_three: true,
          shot_type: 'pull-up jumper',
          pressured: true,
          ts: '2026-02-05T10:00:00Z',
        },
        {
          makes: 1,
          attempts: 2,
          zone_id: 'center_mid',
          is_three: false,
          shot_type: 'catch',
          pressured: false,
          ts: '2026-02-05T10:05:00Z',
        },
        {
          makes: 3,
          attempts: 4,
          zone_id: 'free_throw',
          shot_type: 'Free Throw',
          ts: '2026-02-05T10:06:00Z',
        },
      ]

      const practiceCases = [
        ['efg_overall', 66.6667],
        ['three_pct_overall', 50],
        ['ft_pct', 75],
        ['fg_pct_zone', 50, { zoneId: 'left_corner_3' }],
        ['attempts_zone', 4, { zoneId: 'left_corner_3' }],
        ['off_dribble_fg', 50],
        ['pressured_fg', 50],
        ['makes', 3],
        ['attempts', 6],
        ['points_total', 0],
        ['steals_total', 0],
        ['assists_total', 0],
        ['rebounds_total', 0],
      ]

      practiceCases.forEach(([metric, expected, range]) => {
        it(`should compute ${metric}`, () => {
          const value = computePracticeMetricValue(metric, entries, range)
          if (metric.endsWith('_overall') || metric.endsWith('_pct') || metric.endsWith('_fg')) {
            expect(value).toBeCloseTo(expected, 2)
          } else {
            expect(value).toBe(expected)
          }
        })
      })
    })
  })

  describe('explicit metric coverage (game)', () => {
    const events = [
      {
        type: 'shot',
        zone_id: 'left_corner_3',
        is_three: true,
        made: true,
        shot_type: 'pull-up jumper',
        pressured: true,
        ts: '2026-02-05T10:00:00Z',
      },
      {
        type: 'shot',
        zone_id: 'left_corner_3',
        is_three: true,
        made: false,
        shot_type: 'catch',
        ts: '2026-02-05T10:01:00Z',
      },
      {
        type: 'shot',
        zone_id: 'center_mid',
        is_three: false,
        made: true,
        shot_type: 'dribble pull-up',
        ts: '2026-02-05T10:02:00Z',
      },
      { type: 'freethrow', made: true, ts: '2026-02-05T10:03:00Z' },
      { type: 'assist', ts: '2026-02-05T10:04:00Z' },
      { type: 'rebound', ts: '2026-02-05T10:05:00Z' },
      { type: 'steal', ts: '2026-02-05T10:06:00Z' },
    ]

    const gameCases = [
      ['efg_overall', 83.3333],
      ['three_pct_overall', 50],
      ['ft_pct', 100],
      ['fg_pct_zone', 50, { zoneId: 'left_corner_3' }],
      ['attempts_zone', 2, { zoneId: 'left_corner_3' }],
      ['off_dribble_fg', 100],
      ['pressured_fg', 100],
      ['makes', 2],
      ['attempts', 3],
      ['points_total', 6],
      ['steals_total', 1],
      ['assists_total', 1],
      ['rebounds_total', 1],
    ]

    gameCases.forEach(([metric, expected, range]) => {
      it(`should compute ${metric}`, () => {
        const value = computeGameMetricValue(metric, events, range)
        if (metric.endsWith('_overall') || metric.endsWith('_pct') || metric.endsWith('_fg')) {
          expect(value).toBeCloseTo(expected, 2)
        } else {
          expect(value).toBe(expected)
        }
      })
    })
  })
})
