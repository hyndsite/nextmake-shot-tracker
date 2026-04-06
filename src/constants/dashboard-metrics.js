const DASHBOARD_METRIC_GROUPS = [
  {
    category: "Efficiency",
    subcategory: "Core Shooting",
    options: [
      { key: "efg_overall", label: "eFG% (overall)", format: "percent" },
      { key: "fg_overall", label: "FG% (overall)", format: "percent" },
    ],
  },
  {
    category: "Volume",
    subcategory: "Shot Volume",
    options: [
      { key: "total_attempts", label: "Total Attempts", format: "number" },
      { key: "total_makes", label: "Total Makes", format: "number" },
    ],
  },
  {
    category: "Shot Profile Composition",
    subcategory: "Shot Selection Distribution",
    options: [
      { key: "shot_share_3pa", label: "% of Total Shots from 3", format: "percent" },
      { key: "shot_share_rim", label: "% at Rim", format: "percent" },
    ],
  },
]

const DASHBOARD_METRIC_OPTIONS = DASHBOARD_METRIC_GROUPS.map((group) => ({
  category: group.category,
  subcategory: group.subcategory,
  options: [...group.options],
}))

const DASHBOARD_METRIC_KEYS = DASHBOARD_METRIC_GROUPS.flatMap((group) =>
  group.options.map((option) => option.key),
)

const DASHBOARD_METRIC_BY_KEY = Object.fromEntries(
  DASHBOARD_METRIC_GROUPS.flatMap((group) =>
    group.options.map((option) => [
      option.key,
      {
        ...option,
        category: group.category,
        subcategory: group.subcategory,
      },
    ]),
  ),
)

function getDashboardMetricLabel(metricKey) {
  return DASHBOARD_METRIC_BY_KEY[metricKey]?.label || "Unknown metric"
}

export {
  DASHBOARD_METRIC_GROUPS,
  DASHBOARD_METRIC_OPTIONS,
  DASHBOARD_METRIC_KEYS,
  DASHBOARD_METRIC_BY_KEY,
  getDashboardMetricLabel,
}
