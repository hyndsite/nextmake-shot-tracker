import { describe, it, expect } from 'vitest'
import {
  LEVELS,
  LEVEL_CATEGORY_OPTIONS,
  K12_GRADE_OPTIONS,
  AAU_COMPETITION_LEVEL_OPTIONS,
  AAU_SEASON_OPTIONS,
  getCollegeSeasonOptions,
  formatGameLevelLabel,
} from '../programLevel.js'

describe('programLevel constants', () => {
  it('keeps the legacy LEVELS export for current callers', () => {
    expect(LEVELS).toEqual([
      { key: 'high_school', label: 'High School' },
      { key: 'middle_school', label: 'Middle School' },
      { key: 'elementary', label: 'Elementary' },
      { key: 'aau', label: 'AAU / Travel' },
      { key: 'other', label: 'Other' },
    ])
  })

  it('exports structured level categories and detail options', () => {
    expect(LEVEL_CATEGORY_OPTIONS).toEqual([
      { key: 'k_12', label: 'K-12' },
      { key: 'college', label: 'College' },
      { key: 'aau', label: 'AAU / Travel' },
      { key: 'other', label: 'Other' },
    ])

    expect(K12_GRADE_OPTIONS).toEqual([
      { key: 'kindergarten', label: 'Kindergarten' },
      { key: 'grade_1', label: '1st Grade' },
      { key: 'grade_2', label: '2nd Grade' },
      { key: 'grade_3', label: '3rd Grade' },
      { key: 'grade_4', label: '4th Grade' },
      { key: 'grade_5', label: '5th Grade' },
      { key: 'grade_6', label: '6th Grade' },
      { key: 'grade_7', label: '7th Grade' },
      { key: 'grade_8', label: '8th Grade' },
      { key: 'grade_9', label: '9th Grade' },
      { key: 'grade_10', label: '10th Grade' },
      { key: 'grade_11', label: '11th Grade' },
      { key: 'grade_12', label: '12th Grade' },
    ])

    expect(AAU_SEASON_OPTIONS).toEqual([
      { key: 'winter', label: 'Winter' },
      { key: 'spring', label: 'Spring' },
      { key: 'summer', label: 'Summer' },
      { key: 'fall', label: 'Fall' },
    ])

    expect(AAU_COMPETITION_LEVEL_OPTIONS).toEqual([
      { key: 'kindergarten', label: 'Kindergarten' },
      { key: 'grade_1', label: '1st Grade' },
      { key: 'grade_2', label: '2nd Grade' },
      { key: 'grade_3', label: '3rd Grade' },
      { key: 'grade_4', label: '4th Grade' },
      { key: 'grade_5', label: '5th Grade' },
      { key: 'grade_6', label: '6th Grade' },
      { key: 'grade_7', label: '7th Grade' },
      { key: 'grade_8', label: '8th Grade' },
      { key: 'grade_9', label: '9th Grade' },
      { key: 'grade_10', label: '10th Grade' },
      { key: 'grade_11', label: '11th Grade' },
      { key: 'grade_12', label: '12th Grade' },
      { key: 'college', label: 'College' },
      { key: 'adult', label: 'Adult' },
    ])
  })

  it('returns previous, current, and next college seasons for a supplied date', () => {
    expect(getCollegeSeasonOptions(new Date('2026-04-06T12:00:00Z'))).toEqual([
      { key: '2024-25', label: '2024-25' },
      { key: '2025-26', label: '2025-26' },
      { key: '2026-27', label: '2026-27' },
    ])
  })

  it('switches the college season set on July 1', () => {
    expect(getCollegeSeasonOptions(new Date('2026-06-30T12:00:00Z'))).toEqual([
      { key: '2024-25', label: '2024-25' },
      { key: '2025-26', label: '2025-26' },
      { key: '2026-27', label: '2026-27' },
    ])

    expect(getCollegeSeasonOptions(new Date('2026-07-01T12:00:00Z'))).toEqual([
      { key: '2025-26', label: '2025-26' },
      { key: '2026-27', label: '2026-27' },
      { key: '2027-28', label: '2027-28' },
    ])
  })

  it('formats the display label from structured values', () => {
    expect(
      formatGameLevelLabel({
        level_category: 'k_12',
        level_grade: '1st Grade',
      })
    ).toBe('K-12 · 1st Grade')

    expect(
      formatGameLevelLabel({
        level_category: 'college',
        college_season: '2025-26',
      })
    ).toBe('College · 2025-26')

    expect(
      formatGameLevelLabel({
        level_category: 'aau',
        aau_season: 'Summer',
        aau_competition_level: '7th Grade',
      })
    ).toBe('AAU / Travel · Summer · 7th Grade')

    expect(
      formatGameLevelLabel({
        level_category: 'other',
      })
    ).toBe('Other')

    expect(formatGameLevelLabel({ level: 'Legacy Level' })).toBe('Legacy Level')
    expect(formatGameLevelLabel({})).toBe('High School')
  })
})
