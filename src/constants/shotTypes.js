export const SHOT_TYPES = [
  { id: "catch_shoot", label: "Catch & Shoot" },
  { id: "off_dribble", label: "Off-Dribble" },
  { id: "layup", label: "Layup" },
  { id: "floater", label: "Floater" },
]

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
  { value: "reverse", label: "Reverse" },
]

export const CATCH_SHOOT_MOVEMENT_LEVELS = [
  { value: "static", label: "Static" },
  { value: "relocation", label: "Relocation" },
  { value: "on_the_move", label: "On The Move" },
]

export const OFF_DRIBBLE_MOVEMENT_LEVELS = [
  { value: "controlled", label: "Controlled" },
  { value: "lateral", label: "Lateral" },
  { value: "downhill", label: "Downhill" },
]

export const MOVEMENT_LEVELS_BY_SHOT_TYPE = {
  catch_shoot: CATCH_SHOOT_MOVEMENT_LEVELS,
  off_dribble: OFF_DRIBBLE_MOVEMENT_LEVELS,
}

export const MOVEMENT_LEVELS = CATCH_SHOOT_MOVEMENT_LEVELS

export function getMovementLevelsForShotType(shotTypeId) {
  return MOVEMENT_LEVELS_BY_SHOT_TYPE[shotTypeId] || []
}

export function getDefaultMovementLevelForShotType(shotTypeId) {
  return getMovementLevelsForShotType(shotTypeId)[0]?.value || ""
}
