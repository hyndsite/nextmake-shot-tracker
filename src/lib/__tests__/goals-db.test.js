// src/lib/__tests__/goals-db.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  listGoalSetsWithGoals,
  createGoalSet,
  updateGoalSet,
  deleteGoalSet,
  archiveGoalSet,
  createGoal,
  updateGoal,
  deleteGoal,
  deleteGoalsBySet,
} from '../goals-db.js'

// Mock supabase module
vi.mock('../supabase.js', () => ({
  supabase: {
    from: vi.fn(),
  },
  getUser: vi.fn(),
}))

describe('goals-db', () => {
  let mockSupabase
  let mockGetUser
  let mockFrom
  let mockSelect
  let mockEq
  let mockIn
  let mockOrder
  let mockInsert
  let mockUpdate
  let mockDelete
  let mockSingle

  beforeEach(async () => {
    const supabaseModule = await import('../supabase.js')
    mockSupabase = supabaseModule.supabase
    mockGetUser = supabaseModule.getUser

    // Reset all mocks
    mockGetUser.mockClear()
    mockSupabase.from.mockClear()

    // Setup chainable mock methods
    mockSelect = vi.fn()
    mockEq = vi.fn()
    mockIn = vi.fn()
    mockOrder = vi.fn()
    mockInsert = vi.fn()
    mockUpdate = vi.fn()
    mockDelete = vi.fn()
    mockSingle = vi.fn()

    // Default chainable setup
    mockSelect.mockReturnThis()
    mockEq.mockReturnThis()
    mockIn.mockReturnThis()
    mockOrder.mockReturnThis()
    mockInsert.mockReturnThis()
    mockUpdate.mockReturnThis()
    mockDelete.mockReturnThis()

    // Default authenticated user
    mockGetUser.mockResolvedValue({ id: 'user-123' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('listGoalSetsWithGoals', () => {
    it('should return empty array when no goal sets exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })
      mockSelect.mockReturnValue({
        eq: mockEq,
      })
      mockEq.mockReturnValue({
        order: mockOrder,
      })
      mockOrder.mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await listGoalSetsWithGoals()

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('goal_sets')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123')
      expect(mockOrder).toHaveBeenCalledWith('due_date', { ascending: true })
    })

    it('should return goal sets with empty goals arrays when no goals exist', async () => {
      const mockGoalSets = [
        { id: 'set-1', name: 'Weekly Goals', type: 'practice', due_date: '2024-01-20' },
        { id: 'set-2', name: 'Game Goals', type: 'game', due_date: '2024-01-25' },
      ]

      let callCount = 0
      mockSupabase.from.mockImplementation((table) => {
        callCount++
        if (callCount === 1) {
          // First call for goal_sets
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({
                  data: mockGoalSets,
                  error: null,
                }),
              }),
            }),
          }
        } else {
          // Second call for goals
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () => Promise.resolve({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
      })

      const result = await listGoalSetsWithGoals()

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ ...mockGoalSets[0], goals: [] })
      expect(result[1]).toEqual({ ...mockGoalSets[1], goals: [] })
    })

    it('should return goal sets with nested goals', async () => {
      const mockGoalSets = [
        { id: 'set-1', name: 'Weekly Goals', type: 'practice', due_date: '2024-01-20' },
        { id: 'set-2', name: 'Game Goals', type: 'game', due_date: '2024-01-25' },
      ]

      const mockGoals = [
        { id: 'goal-1', set_id: 'set-1', metric: 'fg_pct', target_value: 50, created_at: '2024-01-10T10:00:00Z' },
        { id: 'goal-2', set_id: 'set-1', metric: 'attempts', target_value: 100, created_at: '2024-01-10T10:05:00Z' },
        { id: 'goal-3', set_id: 'set-2', metric: 'fg_pct', target_value: 45, created_at: '2024-01-10T10:10:00Z' },
      ]

      let callCount = 0
      mockSupabase.from.mockImplementation((table) => {
        callCount++
        if (callCount === 1) {
          // First call for goal_sets
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({
                  data: mockGoalSets,
                  error: null,
                }),
              }),
            }),
          }
        } else {
          // Second call for goals
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () => Promise.resolve({
                    data: mockGoals,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
      })

      const result = await listGoalSetsWithGoals()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('set-1')
      expect(result[0].goals).toHaveLength(2)
      expect(result[0].goals[0].id).toBe('goal-1')
      expect(result[0].goals[1].id).toBe('goal-2')
      expect(result[1].id).toBe('set-2')
      expect(result[1].goals).toHaveLength(1)
      expect(result[1].goals[0].id).toBe('goal-3')
    })

    it('should throw error when unauthenticated', async () => {
      mockGetUser.mockResolvedValue(null)

      await expect(listGoalSetsWithGoals()).rejects.toThrow('No authenticated user')
    })

    it('should throw error on goal sets query failure', async () => {
      const mockError = { message: 'Database error' }
      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({
              data: null,
              error: mockError,
            }),
          }),
        }),
      })

      await expect(listGoalSetsWithGoals()).rejects.toEqual(mockError)
    })

    it('should throw error on goals query failure', async () => {
      const mockGoalSets = [
        { id: 'set-1', name: 'Weekly Goals', type: 'practice', due_date: '2024-01-20' },
      ]
      const mockError = { message: 'Goals query failed' }

      let callCount = 0
      mockSupabase.from.mockImplementation((table) => {
        callCount++
        if (callCount === 1) {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({
                  data: mockGoalSets,
                  error: null,
                }),
              }),
            }),
          }
        } else {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () => Promise.resolve({
                    data: null,
                    error: mockError,
                  }),
                }),
              }),
            }),
          }
        }
      })

      await expect(listGoalSetsWithGoals()).rejects.toEqual(mockError)
    })

    it('should handle null goals array gracefully', async () => {
      const mockGoalSets = [
        { id: 'set-1', name: 'Weekly Goals', type: 'practice', due_date: '2024-01-20' },
      ]

      let callCount = 0
      mockSupabase.from.mockImplementation((table) => {
        callCount++
        if (callCount === 1) {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({
                  data: mockGoalSets,
                  error: null,
                }),
              }),
            }),
          }
        } else {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () => Promise.resolve({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
      })

      const result = await listGoalSetsWithGoals()

      expect(result).toHaveLength(1)
      expect(result[0].goals).toEqual([])
    })
  })

  describe('createGoalSet', () => {
    it('should create a new goal set with required fields', async () => {
      const input = {
        name: 'Weekly Practice Goals',
        type: 'practice',
        dueDate: '2024-01-31',
      }

      const mockCreated = {
        id: 'set-123',
        user_id: 'user-123',
        name: 'Weekly Practice Goals',
        type: 'practice',
        due_date: '2024-01-31',
        created_at: '2024-01-15T12:00:00Z',
      }

      mockSupabase.from.mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: mockCreated,
              error: null,
            }),
          }),
        }),
      })

      const result = await createGoalSet(input)

      expect(result).toEqual(mockCreated)
      expect(mockSupabase.from).toHaveBeenCalledWith('goal_sets')
    })

    it('should create goal set with optional start date', async () => {
      const input = {
        name: 'Monthly Goals',
        type: 'game',
        dueDate: '2024-02-29',
        startDate: '2024-02-01',
      }

      const mockCreated = {
        id: 'set-456',
        user_id: 'user-123',
        name: 'Monthly Goals',
        type: 'game',
        due_date: '2024-02-29',
        start_date: '2024-02-01',
        created_at: '2024-01-15T12:00:00Z',
      }

      mockSupabase.from.mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: mockCreated,
              error: null,
            }),
          }),
        }),
      })

      const result = await createGoalSet(input)

      expect(result).toEqual(mockCreated)
      expect(result.start_date).toBe('2024-02-01')
    })

    it('should throw error when unauthenticated', async () => {
      mockGetUser.mockResolvedValue(null)

      const input = {
        name: 'Test Goals',
        type: 'practice',
        dueDate: '2024-01-31',
      }

      await expect(createGoalSet(input)).rejects.toThrow('No authenticated user')
    })

    it('should throw error on insert failure', async () => {
      const input = {
        name: 'Test Goals',
        type: 'practice',
        dueDate: '2024-01-31',
      }

      const mockError = { message: 'Insert failed' }

      mockSupabase.from.mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: null,
              error: mockError,
            }),
          }),
        }),
      })

      await expect(createGoalSet(input)).rejects.toEqual(mockError)
    })

    it('should handle practice type goal set', async () => {
      const input = {
        name: 'Practice Goals',
        type: 'practice',
        dueDate: '2024-01-31',
      }

      const mockCreated = {
        id: 'set-789',
        user_id: 'user-123',
        name: 'Practice Goals',
        type: 'practice',
        due_date: '2024-01-31',
      }

      mockSupabase.from.mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: mockCreated,
              error: null,
            }),
          }),
        }),
      })

      const result = await createGoalSet(input)

      expect(result.type).toBe('practice')
    })

    it('should handle game type goal set', async () => {
      const input = {
        name: 'Game Goals',
        type: 'game',
        dueDate: '2024-01-31',
      }

      const mockCreated = {
        id: 'set-999',
        user_id: 'user-123',
        name: 'Game Goals',
        type: 'game',
        due_date: '2024-01-31',
      }

      mockSupabase.from.mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: mockCreated,
              error: null,
            }),
          }),
        }),
      })

      const result = await createGoalSet(input)

      expect(result.type).toBe('game')
    })
  })

  describe('updateGoalSet', () => {
    it('should update an existing goal set', async () => {
      const patch = {
        name: 'Updated Goals',
        due_date: '2024-02-15',
      }

      const mockUpdated = {
        id: 'set-123',
        user_id: 'user-123',
        name: 'Updated Goals',
        type: 'practice',
        due_date: '2024-02-15',
      }

      mockSupabase.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: mockUpdated,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await updateGoalSet('set-123', patch)

      expect(result).toEqual(mockUpdated)
      expect(mockSupabase.from).toHaveBeenCalledWith('goal_sets')
    })

    it('should throw error on update failure', async () => {
      const patch = { name: 'Updated' }
      const mockError = { message: 'Update failed' }

      mockSupabase.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: null,
                error: mockError,
              }),
            }),
          }),
        }),
      })

      await expect(updateGoalSet('set-123', patch)).rejects.toEqual(mockError)
    })

    it('should update only provided fields', async () => {
      const patch = { archived: true }

      const mockUpdated = {
        id: 'set-123',
        user_id: 'user-123',
        name: 'Original Name',
        type: 'practice',
        due_date: '2024-01-31',
        archived: true,
      }

      mockSupabase.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: mockUpdated,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await updateGoalSet('set-123', patch)

      expect(result.archived).toBe(true)
      expect(result.name).toBe('Original Name')
    })
  })

  describe('archiveGoalSet', () => {
    it('should archive a goal set by setting archived to true', async () => {
      const mockArchived = {
        id: 'set-123',
        user_id: 'user-123',
        name: 'Archived Goals',
        type: 'practice',
        due_date: '2024-01-31',
        archived: true,
      }

      mockSupabase.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: mockArchived,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await archiveGoalSet('set-123')

      expect(result).toEqual(mockArchived)
      expect(result.archived).toBe(true)
    })

    it('should throw error on archive failure', async () => {
      const mockError = { message: 'Archive failed' }

      mockSupabase.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: null,
                error: mockError,
              }),
            }),
          }),
        }),
      })

      await expect(archiveGoalSet('set-123')).rejects.toEqual(mockError)
    })
  })

  describe('deleteGoalSet', () => {
    it('should delete a goal set for the current user', async () => {
      mockSupabase.from.mockReturnValue({
        delete: () => ({
          eq: (field, value) => {
            if (field === 'user_id') {
              return {
                eq: () => Promise.resolve({
                  error: null,
                }),
              }
            }
            return Promise.resolve({ error: null })
          },
        }),
      })

      await deleteGoalSet('set-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('goal_sets')
    })

    it('should throw error when unauthenticated', async () => {
      mockGetUser.mockResolvedValue(null)

      await expect(deleteGoalSet('set-123')).rejects.toThrow('No authenticated user')
    })

    it('should throw error on delete failure', async () => {
      const mockError = { message: 'Delete failed' }

      mockSupabase.from.mockReturnValue({
        delete: () => ({
          eq: () => ({
            eq: () => Promise.resolve({
              error: mockError,
            }),
          }),
        }),
      })

      await expect(deleteGoalSet('set-123')).rejects.toEqual(mockError)
    })

    it('should enforce user_id constraint when deleting', async () => {
      let userIdChecked = false
      let idChecked = false

      mockSupabase.from.mockReturnValue({
        delete: () => ({
          eq: (field, value) => {
            if (field === 'user_id' && value === 'user-123') {
              userIdChecked = true
            }
            if (field === 'id' && value === 'set-456') {
              idChecked = true
            }
            return {
              eq: (field2, value2) => {
                if (field2 === 'user_id' && value2 === 'user-123') {
                  userIdChecked = true
                }
                if (field2 === 'id' && value2 === 'set-456') {
                  idChecked = true
                }
                return Promise.resolve({ error: null })
              },
            }
          },
        }),
      })

      await deleteGoalSet('set-456')

      expect(userIdChecked).toBe(true)
      expect(idChecked).toBe(true)
    })
  })

  describe('deleteGoalsBySet', () => {
    it('should delete all goals belonging to a set', async () => {
      mockSupabase.from.mockReturnValue({
        delete: () => ({
          eq: () => ({
            eq: () => Promise.resolve({
              error: null,
            }),
          }),
        }),
      })

      await deleteGoalsBySet('set-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('goals')
    })

    it('should throw error when unauthenticated', async () => {
      mockGetUser.mockResolvedValue(null)

      await expect(deleteGoalsBySet('set-123')).rejects.toThrow('No authenticated user')
    })

    it('should throw error on delete failure', async () => {
      const mockError = { message: 'Delete goals failed' }

      mockSupabase.from.mockReturnValue({
        delete: () => ({
          eq: () => ({
            eq: () => Promise.resolve({
              error: mockError,
            }),
          }),
        }),
      })

      await expect(deleteGoalsBySet('set-123')).rejects.toEqual(mockError)
    })

    it('should enforce user_id and set_id constraints when deleting', async () => {
      let userIdChecked = false
      let setIdChecked = false

      mockSupabase.from.mockReturnValue({
        delete: () => ({
          eq: (field, value) => {
            if (field === 'user_id' && value === 'user-123') {
              userIdChecked = true
            }
            if (field === 'set_id' && value === 'set-789') {
              setIdChecked = true
            }
            return {
              eq: (field2, value2) => {
                if (field2 === 'user_id' && value2 === 'user-123') {
                  userIdChecked = true
                }
                if (field2 === 'set_id' && value2 === 'set-789') {
                  setIdChecked = true
                }
                return Promise.resolve({ error: null })
              },
            }
          },
        }),
      })

      await deleteGoalsBySet('set-789')

      expect(userIdChecked).toBe(true)
      expect(setIdChecked).toBe(true)
    })
  })

  describe('createGoal', () => {
    it('should create a new goal with required fields', async () => {
      const input = {
        setId: 'set-123',
        metric: 'fg_pct',
        targetValue: 50,
        targetEndDate: '2024-01-31',
      }

      const mockCreated = {
        id: 'goal-123',
        user_id: 'user-123',
        set_id: 'set-123',
        name: null,
        details: null,
        metric: 'fg_pct',
        target_value: 50,
        target_end_date: '2024-01-31',
        target_type: 'percent',
        zone_id: null,
        created_at: '2024-01-15T12:00:00Z',
      }

      mockSupabase.from.mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: mockCreated,
              error: null,
            }),
          }),
        }),
      })

      const result = await createGoal(input)

      expect(result).toEqual(mockCreated)
      expect(mockSupabase.from).toHaveBeenCalledWith('goals')
    })

    it('should create goal with optional fields', async () => {
      const input = {
        setId: 'set-123',
        name: 'Three Point Percentage',
        details: 'Improve corner three consistency',
        metric: '3pt_pct',
        targetValue: 40,
        targetEndDate: '2024-01-31',
        targetType: 'percent',
        zoneId: 'left_corner_3',
      }

      const mockCreated = {
        id: 'goal-456',
        user_id: 'user-123',
        set_id: 'set-123',
        name: 'Three Point Percentage',
        details: 'Improve corner three consistency',
        metric: '3pt_pct',
        target_value: 40,
        target_end_date: '2024-01-31',
        target_type: 'percent',
        zone_id: 'left_corner_3',
        created_at: '2024-01-15T12:00:00Z',
      }

      mockSupabase.from.mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: mockCreated,
              error: null,
            }),
          }),
        }),
      })

      const result = await createGoal(input)

      expect(result).toEqual(mockCreated)
      expect(result.name).toBe('Three Point Percentage')
      expect(result.details).toBe('Improve corner three consistency')
      expect(result.zone_id).toBe('left_corner_3')
    })

    it('should throw error when unauthenticated', async () => {
      mockGetUser.mockResolvedValue(null)

      const input = {
        setId: 'set-123',
        metric: 'fg_pct',
        targetValue: 50,
        targetEndDate: '2024-01-31',
      }

      await expect(createGoal(input)).rejects.toThrow('No authenticated user')
    })

    it('should throw error on insert failure', async () => {
      const input = {
        setId: 'set-123',
        metric: 'fg_pct',
        targetValue: 50,
        targetEndDate: '2024-01-31',
      }

      const mockError = { message: 'Insert failed' }

      mockSupabase.from.mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: null,
              error: mockError,
            }),
          }),
        }),
      })

      await expect(createGoal(input)).rejects.toEqual(mockError)
    })

    it('should default targetType to percent', async () => {
      const input = {
        setId: 'set-123',
        metric: 'fg_pct',
        targetValue: 50,
        targetEndDate: '2024-01-31',
      }

      const mockCreated = {
        id: 'goal-789',
        user_id: 'user-123',
        set_id: 'set-123',
        metric: 'fg_pct',
        target_value: 50,
        target_end_date: '2024-01-31',
        target_type: 'percent',
        zone_id: null,
      }

      mockSupabase.from.mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: mockCreated,
              error: null,
            }),
          }),
        }),
      })

      const result = await createGoal(input)

      expect(result.target_type).toBe('percent')
    })

    it('should accept custom targetType', async () => {
      const input = {
        setId: 'set-123',
        metric: 'attempts',
        targetValue: 100,
        targetEndDate: '2024-01-31',
        targetType: 'count',
      }

      const mockCreated = {
        id: 'goal-999',
        user_id: 'user-123',
        set_id: 'set-123',
        metric: 'attempts',
        target_value: 100,
        target_end_date: '2024-01-31',
        target_type: 'count',
        zone_id: null,
      }

      mockSupabase.from.mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: mockCreated,
              error: null,
            }),
          }),
        }),
      })

      const result = await createGoal(input)

      expect(result.target_type).toBe('count')
    })

    it('should set name and details to null when not provided', async () => {
      const input = {
        setId: 'set-123',
        metric: 'fg_pct',
        targetValue: 50,
        targetEndDate: '2024-01-31',
      }

      const mockCreated = {
        id: 'goal-111',
        user_id: 'user-123',
        set_id: 'set-123',
        name: null,
        details: null,
        metric: 'fg_pct',
        target_value: 50,
        target_end_date: '2024-01-31',
        target_type: 'percent',
        zone_id: null,
      }

      mockSupabase.from.mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: mockCreated,
              error: null,
            }),
          }),
        }),
      })

      const result = await createGoal(input)

      expect(result.name).toBeNull()
      expect(result.details).toBeNull()
    })
  })

  describe('updateGoal', () => {
    it('should update an existing goal', async () => {
      const patch = {
        target_value: 55,
        current_value: 48,
      }

      const mockUpdated = {
        id: 'goal-123',
        user_id: 'user-123',
        set_id: 'set-123',
        metric: 'fg_pct',
        target_value: 55,
        current_value: 48,
        target_end_date: '2024-01-31',
      }

      mockSupabase.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: mockUpdated,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await updateGoal('goal-123', patch)

      expect(result).toEqual(mockUpdated)
      expect(mockSupabase.from).toHaveBeenCalledWith('goals')
    })

    it('should throw error on update failure', async () => {
      const patch = { target_value: 55 }
      const mockError = { message: 'Update failed' }

      mockSupabase.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: null,
                error: mockError,
              }),
            }),
          }),
        }),
      })

      await expect(updateGoal('goal-123', patch)).rejects.toEqual(mockError)
    })

    it('should update multiple fields at once', async () => {
      const patch = {
        name: 'Updated Goal Name',
        details: 'New details',
        target_value: 60,
        target_end_date: '2024-02-15',
      }

      const mockUpdated = {
        id: 'goal-456',
        user_id: 'user-123',
        set_id: 'set-123',
        name: 'Updated Goal Name',
        details: 'New details',
        metric: 'fg_pct',
        target_value: 60,
        target_end_date: '2024-02-15',
      }

      mockSupabase.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: mockUpdated,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await updateGoal('goal-456', patch)

      expect(result.name).toBe('Updated Goal Name')
      expect(result.details).toBe('New details')
      expect(result.target_value).toBe(60)
      expect(result.target_end_date).toBe('2024-02-15')
    })

    it('should update current_value for tracking progress', async () => {
      const patch = { current_value: 52 }

      const mockUpdated = {
        id: 'goal-789',
        user_id: 'user-123',
        set_id: 'set-123',
        metric: 'fg_pct',
        target_value: 55,
        current_value: 52,
      }

      mockSupabase.from.mockReturnValue({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: mockUpdated,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await updateGoal('goal-789', patch)

      expect(result.current_value).toBe(52)
    })
  })

  describe('deleteGoal', () => {
    it('should delete a goal for the current user', async () => {
      mockSupabase.from.mockReturnValue({
        delete: () => ({
          eq: () => ({
            eq: () => Promise.resolve({
              error: null,
            }),
          }),
        }),
      })

      await deleteGoal('goal-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('goals')
    })

    it('should throw error when unauthenticated', async () => {
      mockGetUser.mockResolvedValue(null)

      await expect(deleteGoal('goal-123')).rejects.toThrow('No authenticated user')
    })

    it('should throw error on delete failure', async () => {
      const mockError = { message: 'Delete failed' }

      mockSupabase.from.mockReturnValue({
        delete: () => ({
          eq: () => ({
            eq: () => Promise.resolve({
              error: mockError,
            }),
          }),
        }),
      })

      await expect(deleteGoal('goal-123')).rejects.toEqual(mockError)
    })

    it('should enforce user_id constraint when deleting', async () => {
      let userIdChecked = false
      let idChecked = false

      mockSupabase.from.mockReturnValue({
        delete: () => ({
          eq: (field, value) => {
            if (field === 'user_id' && value === 'user-123') {
              userIdChecked = true
            }
            if (field === 'id' && value === 'goal-456') {
              idChecked = true
            }
            return {
              eq: (field2, value2) => {
                if (field2 === 'user_id' && value2 === 'user-123') {
                  userIdChecked = true
                }
                if (field2 === 'id' && value2 === 'goal-456') {
                  idChecked = true
                }
                return Promise.resolve({ error: null })
              },
            }
          },
        }),
      })

      await deleteGoal('goal-456')

      expect(userIdChecked).toBe(true)
      expect(idChecked).toBe(true)
    })
  })

  describe('user isolation', () => {
    it('should only list goal sets for the authenticated user', async () => {
      mockSupabase.from.mockReturnValue({
        select: () => ({
          eq: (field, value) => {
            expect(field).toBe('user_id')
            expect(value).toBe('user-123')
            return {
              order: () => Promise.resolve({
                data: [],
                error: null,
              }),
            }
          },
        }),
      })

      await listGoalSetsWithGoals()

      expect(mockGetUser).toHaveBeenCalled()
    })

    it('should create goal set with authenticated user id', async () => {
      let insertedData = null

      mockSupabase.from.mockReturnValue({
        insert: (data) => {
          insertedData = data[0]
          return {
            select: () => ({
              single: () => Promise.resolve({
                data: { id: 'set-123', ...insertedData },
                error: null,
              }),
            }),
          }
        },
      })

      const input = {
        name: 'Test Goals',
        type: 'practice',
        dueDate: '2024-01-31',
      }

      await createGoalSet(input)

      expect(insertedData.user_id).toBe('user-123')
    })

    it('should create goal with authenticated user id', async () => {
      let insertedData = null

      mockSupabase.from.mockReturnValue({
        insert: (data) => {
          insertedData = data[0]
          return {
            select: () => ({
              single: () => Promise.resolve({
                data: { id: 'goal-123', ...insertedData },
                error: null,
              }),
            }),
          }
        },
      })

      const input = {
        setId: 'set-123',
        metric: 'fg_pct',
        targetValue: 50,
        targetEndDate: '2024-01-31',
      }

      await createGoal(input)

      expect(insertedData.user_id).toBe('user-123')
    })
  })

  describe('edge cases', () => {
    it('should handle empty goal set name', async () => {
      const input = {
        name: '',
        type: 'practice',
        dueDate: '2024-01-31',
      }

      const mockCreated = {
        id: 'set-empty',
        user_id: 'user-123',
        name: '',
        type: 'practice',
        due_date: '2024-01-31',
      }

      mockSupabase.from.mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: mockCreated,
              error: null,
            }),
          }),
        }),
      })

      const result = await createGoalSet(input)

      expect(result.name).toBe('')
    })

    it('should handle very long goal names and details', async () => {
      const longName = 'A'.repeat(500)
      const longDetails = 'B'.repeat(1000)

      const input = {
        setId: 'set-123',
        name: longName,
        details: longDetails,
        metric: 'fg_pct',
        targetValue: 50,
        targetEndDate: '2024-01-31',
      }

      const mockCreated = {
        id: 'goal-long',
        user_id: 'user-123',
        set_id: 'set-123',
        name: longName,
        details: longDetails,
        metric: 'fg_pct',
        target_value: 50,
        target_end_date: '2024-01-31',
        target_type: 'percent',
        zone_id: null,
      }

      mockSupabase.from.mockReturnValue({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({
              data: mockCreated,
              error: null,
            }),
          }),
        }),
      })

      const result = await createGoal(input)

      expect(result.name).toBe(longName)
      expect(result.details).toBe(longDetails)
    })

    it('should handle numeric target values correctly', async () => {
      const testCases = [
        { value: 0, expected: 0 },
        { value: 100, expected: 100 },
        { value: 50.5, expected: 50.5 },
        { value: -10, expected: -10 },
      ]

      for (const { value, expected } of testCases) {
        const input = {
          setId: 'set-123',
          metric: 'fg_pct',
          targetValue: value,
          targetEndDate: '2024-01-31',
        }

        const mockCreated = {
          id: `goal-${value}`,
          user_id: 'user-123',
          set_id: 'set-123',
          metric: 'fg_pct',
          target_value: expected,
          target_end_date: '2024-01-31',
          target_type: 'percent',
          zone_id: null,
        }

        mockSupabase.from.mockReturnValue({
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: mockCreated,
                error: null,
              }),
            }),
          }),
        })

        const result = await createGoal(input)

        expect(result.target_value).toBe(expected)
      }
    })

    it('should handle goal sets with many goals efficiently', async () => {
      const mockGoalSets = [
        { id: 'set-1', name: 'Many Goals Set', type: 'practice', due_date: '2024-01-31' },
      ]

      const mockGoals = Array.from({ length: 50 }, (_, i) => ({
        id: `goal-${i}`,
        set_id: 'set-1',
        metric: 'fg_pct',
        target_value: 50 + i,
        created_at: `2024-01-10T10:${String(i).padStart(2, '0')}:00Z`,
      }))

      let callCount = 0
      mockSupabase.from.mockImplementation((table) => {
        callCount++
        if (callCount === 1) {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({
                  data: mockGoalSets,
                  error: null,
                }),
              }),
            }),
          }
        } else {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () => Promise.resolve({
                    data: mockGoals,
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
      })

      const result = await listGoalSetsWithGoals()

      expect(result).toHaveLength(1)
      expect(result[0].goals).toHaveLength(50)
    })
  })
})
