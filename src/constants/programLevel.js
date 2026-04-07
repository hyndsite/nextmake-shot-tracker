export const LEVELS = [
  { key: "high_school", label: "High School" },
  { key: "middle_school", label: "Middle School" },
  { key: "elementary", label: "Elementary" },
  { key: "aau", label: "AAU / Travel" },
  { key: "other", label: "Other" },
]

export const LEVEL_CATEGORY_OPTIONS = [
  { key: "k_12", label: "K-12" },
  { key: "college", label: "College" },
  { key: "aau", label: "AAU / Travel" },
  { key: "other", label: "Other" },
]

export const K12_GRADE_OPTIONS = [
  { key: "kindergarten", label: "Kindergarten" },
  { key: "grade_1", label: "1st Grade" },
  { key: "grade_2", label: "2nd Grade" },
  { key: "grade_3", label: "3rd Grade" },
  { key: "grade_4", label: "4th Grade" },
  { key: "grade_5", label: "5th Grade" },
  { key: "grade_6", label: "6th Grade" },
  { key: "grade_7", label: "7th Grade" },
  { key: "grade_8", label: "8th Grade" },
  { key: "grade_9", label: "9th Grade" },
  { key: "grade_10", label: "10th Grade" },
  { key: "grade_11", label: "11th Grade" },
  { key: "grade_12", label: "12th Grade" },
]

export const AAU_SEASON_OPTIONS = [
  { key: "winter", label: "Winter" },
  { key: "spring", label: "Spring" },
  { key: "summer", label: "Summer" },
  { key: "fall", label: "Fall" },
]

export const AAU_COMPETITION_LEVEL_OPTIONS = [
  ...K12_GRADE_OPTIONS,
  { key: "college", label: "College" },
  { key: "adult", label: "Adult" },
]

function formatAcademicSeason(startYear) {
  const endYearSuffix = String((startYear + 1) % 100).padStart(2, "0")
  return `${startYear}-${endYearSuffix}`
}

function getCollegeSeasonStartYear(referenceDate) {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  // Academic seasons switch on July 1 so summer can be treated as the next season.
  return month >= 6 ? year : year - 1
}

export function getCollegeSeasonOptions(referenceDate = new Date()) {
  const currentStartYear = getCollegeSeasonStartYear(referenceDate)

  return [-1, 0, 1].map((offset) => {
    const startYear = currentStartYear + offset
    const label = formatAcademicSeason(startYear)
    return { key: label, label }
  })
}

export function formatGameLevelLabel(meta = {}) {
  const category = meta.level_category
  const level = meta.level

  if (category === "k_12") {
    return meta.level_grade ? `K-12 · ${meta.level_grade}` : "K-12"
  }

  if (category === "college") {
    return meta.college_season ? `College · ${meta.college_season}` : "College"
  }

  if (category === "aau") {
    if (meta.aau_season && meta.aau_competition_level) {
      return `AAU / Travel · ${meta.aau_season} · ${meta.aau_competition_level}`
    }
    if (meta.aau_season) return `AAU / Travel · ${meta.aau_season}`
    if (meta.aau_competition_level) {
      return `AAU / Travel · ${meta.aau_competition_level}`
    }
    return "AAU / Travel"
  }

  if (category === "other") {
    return "Other"
  }

  return level ?? "High School"
}
