export const SHOT_TYPES = [
    { id: 'catch_shoot', label: 'Catch & Shoot' },
    { id: 'off_dribble', label: 'Off-Dribble' },
    { id: 'layup', label: 'Layup'},
    { id: 'floater',  label: 'Floater' },
  ]
  
  // (NEW) Layup-specific subtypes used only when shot_type === 'Layup'
  
export const PICKUP_TYPES = [
  { value: "high_pickup", label: "High" },
  { value: "low_pickup", label: "Low" },
  { value: "two_hand_pickup", label: "Two-Hand" },
  { value: "football_pickup", label: "Football" },
  { value: "inside_hand_pickup", label: "Inside-Hand" },
  { value: "outside_hand_pickup", label: "Outside-Hand" },
]

export const FINISH_TYPES = [
  { value: "overhand", label: "Overhand" },
  { value: "underhand", label: "Underhand" },
  { value: "floater", label: "Floater" },
]
  