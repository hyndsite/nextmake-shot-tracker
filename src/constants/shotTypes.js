export const SHOT_TYPES = [
    { id: 'catch_shoot', label: 'Catch & Shoot' },
    { id: 'off_dribble', label: 'Off-Dribble' },
    { id: 'layup', label: 'Layup'},
    { id: 'floater',  label: 'Floater' },
  ]
  
  // (NEW) Layup-specific subtypes used only when shot_type === 'Layup'
  
export const PICKUP_TYPES = [
  { value: "high_pickup", label: "High Pickup" },
  { value: "low_pickup", label: "Low Pickup" },
  { value: "two_hand_pickup", label: "Two-Hand Pickup" },
  { value: "football_pickup", label: "Football Wrap Pickup" },
  { value: "inside_hand_pickup", label: "Inside-Hand Pickup" },
  { value: "outside_hand_pickup", label: "Outside-Hand Pickup" },
]

export const FINISH_TYPES = [
  { value: "overhand", label: "Overhand Finish" },
  { value: "underhand", label: "Underhand Finish" },
  { value: "floater", label: "Floater" },
]
  