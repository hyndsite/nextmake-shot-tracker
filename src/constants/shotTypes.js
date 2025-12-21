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
  { value: "two_hand_pickup", label: "2-Hand" },
  { value: "football_pickup", label: "Football" },
  { value: "inside_hand_pickup", label: "InHand" },
  { value: "outside_hand_pickup", label: "OutHand" },
]

export const FINISH_TYPES = [
  { value: "overhand", label: "Overhand" },
  { value: "underhand", label: "Underhand" },
  { value: "floater", label: "Floater" },
]
  