// src/constants/timeRange.js

// Canonical time range options for Performance screen (and reusable elsewhere)
export const TIME_RANGES = [
    { id: "30d", label: "30D", days: 30 },
    { id: "60d", label: "60D", days: 60 },
    { id: "180d", label: "180D", days: 180 },
    // All-time: days = null → no lower bound filter
    { id: "all", label: "All", days: null },
  ]
  
  export function getRangeById(id) {
    return TIME_RANGES.find((r) => r.id === id) || TIME_RANGES[0]
  }
  