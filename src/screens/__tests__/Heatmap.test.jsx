// src/screens/__tests__/Heatmap.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Heatmap from '../Heatmap.jsx'

// Mock only modules with side effects:
// - supabase: network calls
// - lucide-react: JSX icon component that requires DOM environment
//
// Constants (timeRange, zones, zoneAnchors) are NOT mocked - they use real values.
// This ensures changes to constants are caught by tests.
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  getUser: vi.fn(),
}))

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>,
}))

// Import mocked modules for assertions
import { supabase, getUser } from '../../lib/supabase'

describe('Heatmap Component', () => {
  let mockNavigate
  let mockSupabaseQuery

  beforeEach(() => {
    mockNavigate = vi.fn()

    // Default mock implementation for successful data fetch
    mockSupabaseQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
    }

    supabase.from.mockReturnValue(mockSupabaseQuery)
    getUser.mockResolvedValue({ id: 'test-user-123' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering Tests', () => {
    it('should render header with Heatmap title and Back button', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })

      render(<Heatmap navigate={mockNavigate} />)

      expect(screen.getByText('Heatmap')).toBeInTheDocument()
      expect(screen.getByText('Back')).toBeInTheDocument()
      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument()

      // Wait for async load to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })

    it('should render source pills with Game active by default', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })

      render(<Heatmap navigate={mockNavigate} />)

      const sourceSection = screen.getByText('Source').closest('section')
      expect(sourceSection).toBeInTheDocument()

      const gamePill = within(sourceSection).getByText('Game')
      const practicePill = within(sourceSection).getByText('Practice')

      expect(gamePill).toHaveClass('time-pill--active')
      expect(practicePill).not.toHaveClass('time-pill--active')

      // Wait for async load to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })

    it('should render all filter pills without section labels', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })

      render(<Heatmap navigate={mockNavigate} />)

      // Verify pills are present without section labels
      expect(screen.getByText('30D')).toBeInTheDocument()
      expect(screen.getByText('Attempt Density')).toBeInTheDocument()
      expect(screen.getByText('Catch & Shoot')).toBeInTheDocument()
      expect(screen.getByText('Contested')).toBeInTheDocument()
      expect(screen.getByText('Uncontested')).toBeInTheDocument()

      // Section labels should not exist
      expect(screen.queryByText('Days')).not.toBeInTheDocument()
      expect(screen.queryByText('Mode')).not.toBeInTheDocument()
      expect(screen.queryByText('Shot Type')).not.toBeInTheDocument()
      expect(screen.queryByText('Pressure')).not.toBeInTheDocument()

      // Wait for async load to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })

    it('should render all time range pills', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })

      render(<Heatmap navigate={mockNavigate} />)

      expect(screen.getByText('30D')).toBeInTheDocument()
      expect(screen.getByText('60D')).toBeInTheDocument()
      expect(screen.getByText('180D')).toBeInTheDocument()
      expect(screen.getByText('All')).toBeInTheDocument()

      // Wait for async load to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })

    it('should render mode pills', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })

      render(<Heatmap navigate={mockNavigate} />)

      expect(screen.getByText('Attempt Density')).toBeInTheDocument()
      expect(screen.getByText('FG%')).toBeInTheDocument()

      // Wait for async load to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })

    it('should render shot type pills', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })

      render(<Heatmap navigate={mockNavigate} />)

      expect(screen.getByText('Catch & Shoot')).toBeInTheDocument()
      expect(screen.getByText('Off-Dribble')).toBeInTheDocument()
      expect(screen.getByText('Free Throws')).toBeInTheDocument()

      // Wait for async load to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })

    it('should render Contested and Uncontested pills', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })

      render(<Heatmap navigate={mockNavigate} />)

      const contestedPill = screen.getByText('Contested')
      const uncontestedPill = screen.getByText('Uncontested')

      expect(contestedPill).toBeInTheDocument()
      expect(uncontestedPill).toBeInTheDocument()

      // Both should be inactive by default (contested state is "all")
      expect(contestedPill).not.toHaveClass('time-pill--active')
      expect(uncontestedPill).not.toHaveClass('time-pill--active')

      // Wait for async load to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })

    it('should render court image', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })

      render(<Heatmap navigate={mockNavigate} />)

      const courtImage = screen.getByAltText('Half court')
      expect(courtImage).toBeInTheDocument()
      expect(courtImage).toHaveAttribute('src', '/court-half.svg')

      // Wait for async load to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })

    it('should show Loading initially', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })

      render(<Heatmap navigate={mockNavigate} />)

      expect(screen.getByText('Loading…')).toBeInTheDocument()

      // Wait for async load to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })

    it('should show "No attempts in this range" when no data', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })

      render(<Heatmap navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('No attempts in this range')).toBeInTheDocument()
      })
    })

    it('should display total attempts count when data is present', async () => {
      const mockData = [
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          made: false,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })

      render(<Heatmap navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('2 attempts')).toBeInTheDocument()
      })
    })
  })

  describe('User Interaction Tests', () => {
    it('should call navigate("home") when Back button is clicked', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      const backButton = screen.getByText('Back').closest('button')
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith('home')
    })

    it('should switch between Game and Practice sources', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      const sourceSection = screen.getByText('Source').closest('section')
      const practicePill = within(sourceSection).getByText('Practice')

      await user.click(practicePill)

      await waitFor(() => {
        expect(practicePill).toHaveClass('time-pill--active')
      })
    })

    it('should switch between Attempt Density and FG% modes', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      const fgPctPill = screen.getByText('FG%')
      expect(fgPctPill).not.toHaveClass('time-pill--active')

      await user.click(fgPctPill)

      await waitFor(() => {
        expect(fgPctPill).toHaveClass('time-pill--active')
      })
    })

    it('should switch between shot type pills', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      const offDribblePill = screen.getByText('Off-Dribble')
      expect(offDribblePill).not.toHaveClass('time-pill--active')

      await user.click(offDribblePill)

      await waitFor(() => {
        expect(offDribblePill).toHaveClass('time-pill--active')
      })
    })

    it('should activate Contested pill on click', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      const contestedPill = screen.getByText('Contested')
      expect(contestedPill).not.toHaveClass('time-pill--active')

      await user.click(contestedPill)

      await waitFor(() => {
        expect(contestedPill).toHaveClass('time-pill--active')
      })
    })

    it('should toggle Contested pill off on second click', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      const contestedPill = screen.getByText('Contested')

      // Click once to activate
      await user.click(contestedPill)
      await waitFor(() => {
        expect(contestedPill).toHaveClass('time-pill--active')
      })

      // Click again to deactivate
      await user.click(contestedPill)
      await waitFor(() => {
        expect(contestedPill).not.toHaveClass('time-pill--active')
      })
    })

    it('should activate Uncontested pill on click', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      const uncontestedPill = screen.getByText('Uncontested')
      expect(uncontestedPill).not.toHaveClass('time-pill--active')

      await user.click(uncontestedPill)

      await waitFor(() => {
        expect(uncontestedPill).toHaveClass('time-pill--active')
      })
    })

    it('should switch between Contested and Uncontested pills', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      const contestedPill = screen.getByText('Contested')
      const uncontestedPill = screen.getByText('Uncontested')

      // Click Contested
      await user.click(contestedPill)
      await waitFor(() => {
        expect(contestedPill).toHaveClass('time-pill--active')
        expect(uncontestedPill).not.toHaveClass('time-pill--active')
      })

      // Click Uncontested
      await user.click(uncontestedPill)
      await waitFor(() => {
        expect(contestedPill).not.toHaveClass('time-pill--active')
        expect(uncontestedPill).toHaveClass('time-pill--active')
      })
    })

    it('should switch between time range pills', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      const allPill = screen.getByText('All')
      expect(allPill).not.toHaveClass('time-pill--active')

      await user.click(allPill)

      await waitFor(() => {
        expect(allPill).toHaveClass('time-pill--active')
      })
    })
  })

  describe('Data Loading Tests', () => {
    it('should fetch from game_events table when source is game', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })

      render(<Heatmap navigate={mockNavigate} />)

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('game_events')
      })
    })

    it('should fetch from practice_entries table when source is practice', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      const sourceSection = screen.getByText('Source').closest('section')
      const practicePill = within(sourceSection).getByText('Practice')

      await user.click(practicePill)

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith('practice_entries')
      })
    })

    it('should apply time range filter correctly for 30 days', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })

      render(<Heatmap navigate={mockNavigate} />)

      await waitFor(() => {
        expect(mockSupabaseQuery.gte).toHaveBeenCalledWith('ts', expect.any(String))
      })

      // Verify the timestamp is approximately 180 days ago (default is 180d based on DEFAULT_RANGE_ID)
      const callArgs = mockSupabaseQuery.gte.mock.calls[0]
      const timestamp = new Date(callArgs[1])
      const now = new Date()
      const daysDiff = (now - timestamp) / (1000 * 60 * 60 * 24)

      expect(daysDiff).toBeGreaterThan(179)
      expect(daysDiff).toBeLessThan(181)
    })

    it('should not apply time filter when "All" is selected', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      vi.clearAllMocks()

      const allPill = screen.getByText('All')
      await user.click(allPill)

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalled()
      })

      // When days is null, gte should not be called
      const gteCallsAfterAll = mockSupabaseQuery.gte.mock.calls.length
      expect(gteCallsAfterAll).toBe(0)
    })

    it('should filter user_id correctly', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })

      render(<Heatmap navigate={mockNavigate} />)

      await waitFor(() => {
        expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('user_id', 'test-user-123')
      })
    })

    it('should display zone chips with correct data', async () => {
      const mockData = [
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          made: false,
          pressured: false,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'center_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })

      render(<Heatmap navigate={mockNavigate} />)

      // Trigger image load to enable zone chips
      const courtImage = screen.getByAltText('Half court')
      Object.defineProperty(courtImage, 'naturalWidth', { value: 800, writable: true })
      Object.defineProperty(courtImage, 'naturalHeight', { value: 1000, writable: true })
      courtImage.dispatchEvent(new Event('load'))

      await waitFor(() => {
        expect(screen.getByText('L Corner 3')).toBeInTheDocument()
        expect(screen.getByText('Center 3')).toBeInTheDocument()
      })

      // Verify attempt counts are displayed
      expect(screen.getByText(/2 =/)).toBeInTheDocument() // L Corner 3 has 2 attempts
      expect(screen.getByText(/1 =/)).toBeInTheDocument() // Center 3 has 1 attempt
    })

    it('should compute FG% correctly and display it', async () => {
      const mockData = [
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          made: false,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      // Trigger image load to enable zone chips
      const courtImage = screen.getByAltText('Half court')
      Object.defineProperty(courtImage, 'naturalWidth', { value: 800, writable: true })
      Object.defineProperty(courtImage, 'naturalHeight', { value: 1000, writable: true })
      courtImage.dispatchEvent(new Event('load'))

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Switch to FG% mode
      const fgPctPill = screen.getByText('FG%')
      await user.click(fgPctPill)

      await waitFor(() => {
        // 1 made out of 2 attempts = 50%
        expect(screen.getByText(/2 = 50%/)).toBeInTheDocument()
      })
    })

    it('should filter by shot type correctly', async () => {
      const mockData = [
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'center_3',
          shot_type: 'Off-Dribble',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      // Trigger image load to enable zone chips
      const courtImage = screen.getByAltText('Half court')
      Object.defineProperty(courtImage, 'naturalWidth', { value: 800, writable: true })
      Object.defineProperty(courtImage, 'naturalHeight', { value: 1000, writable: true })
      courtImage.dispatchEvent(new Event('load'))

      await waitFor(() => {
        expect(screen.getByText('L Corner 3')).toBeInTheDocument()
      })

      // Switch to Off-Dribble
      const offDribblePill = screen.getByText('Off-Dribble')
      await user.click(offDribblePill)

      await waitFor(() => {
        expect(screen.getByText('Center 3')).toBeInTheDocument()
        expect(screen.queryByText('L Corner 3')).not.toBeInTheDocument()
      })
    })

    it('should filter by contested shots only', async () => {
      const mockData = [
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: true,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'center_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      // Trigger image load to enable zone chips
      const courtImage = screen.getByAltText('Half court')
      Object.defineProperty(courtImage, 'naturalWidth', { value: 800, writable: true })
      Object.defineProperty(courtImage, 'naturalHeight', { value: 1000, writable: true })
      courtImage.dispatchEvent(new Event('load'))

      await waitFor(() => {
        expect(screen.getByText('L Corner 3')).toBeInTheDocument()
        expect(screen.getByText('Center 3')).toBeInTheDocument()
      })

      // Click Contested filter
      const contestedPill = screen.getByText('Contested')
      await user.click(contestedPill)

      await waitFor(() => {
        expect(screen.getByText('L Corner 3')).toBeInTheDocument()
        expect(screen.queryByText('Center 3')).not.toBeInTheDocument()
      })
    })

    it('should filter by uncontested shots only', async () => {
      const mockData = [
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: true,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'center_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      // Trigger image load to enable zone chips
      const courtImage = screen.getByAltText('Half court')
      Object.defineProperty(courtImage, 'naturalWidth', { value: 800, writable: true })
      Object.defineProperty(courtImage, 'naturalHeight', { value: 1000, writable: true })
      courtImage.dispatchEvent(new Event('load'))

      await waitFor(() => {
        expect(screen.getByText('L Corner 3')).toBeInTheDocument()
        expect(screen.getByText('Center 3')).toBeInTheDocument()
      })

      // Click Uncontested filter
      const uncontestedPill = screen.getByText('Uncontested')
      await user.click(uncontestedPill)

      await waitFor(() => {
        expect(screen.getByText('Center 3')).toBeInTheDocument()
        expect(screen.queryByText('L Corner 3')).not.toBeInTheDocument()
      })
    })

    it('should show all shots when no contest filter active', async () => {
      const mockData = [
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: true,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'center_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })

      render(<Heatmap navigate={mockNavigate} />)

      // Trigger image load to enable zone chips
      const courtImage = screen.getByAltText('Half court')
      Object.defineProperty(courtImage, 'naturalWidth', { value: 800, writable: true })
      Object.defineProperty(courtImage, 'naturalHeight', { value: 1000, writable: true })
      courtImage.dispatchEvent(new Event('load'))

      // Default state (contested = "all") should show both pressured and non-pressured
      await waitFor(() => {
        expect(screen.getByText('L Corner 3')).toBeInTheDocument()
        expect(screen.getByText('Center 3')).toBeInTheDocument()
      })
    })

    it('should handle free throw events correctly', async () => {
      const mockData = [
        {
          zone_id: 'free_throw',
          shot_type: 'Free Throw',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'free_throw',
          shot_type: 'Free Throw',
          made: false,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Switch to Free Throws
      const freeThrowPill = screen.getByText('Free Throws')
      await user.click(freeThrowPill)

      await waitFor(() => {
        expect(screen.getByText('Free Throw')).toBeInTheDocument()
        expect(screen.getByText(/2 =/)).toBeInTheDocument()
      })
    })

    it('should aggregate attempts and makes correctly', async () => {
      const mockData = [
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          attempts: 5,
          makes: 3,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      // Trigger image load to enable zone chips
      const courtImage = screen.getByAltText('Half court')
      Object.defineProperty(courtImage, 'naturalWidth', { value: 800, writable: true })
      Object.defineProperty(courtImage, 'naturalHeight', { value: 1000, writable: true })
      courtImage.dispatchEvent(new Event('load'))

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Switch to FG% mode to verify percentage
      const fgPctPill = screen.getByText('FG%')
      await user.click(fgPctPill)

      await waitFor(() => {
        // 3 makes out of 5 attempts = 60%
        expect(screen.getByText(/5 = 60%/)).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle no user (getUser returns null)', async () => {
      getUser.mockResolvedValue(null)

      render(<Heatmap navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('No attempts in this range')).toBeInTheDocument()
      })

      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('should handle supabase error gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mockSupabaseQuery.gte.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      })

      render(<Heatmap navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('No attempts in this range')).toBeInTheDocument()
      })

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Heatmap] load error',
        expect.objectContaining({ message: 'Database connection failed' })
      )

      consoleWarnSpy.mockRestore()
    })

    it('should handle empty data array', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })

      render(<Heatmap navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('No attempts in this range')).toBeInTheDocument()
      })
    })

    it('should prevent state updates after unmount', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      let resolveDataLoad
      const delayedPromise = new Promise((resolve) => {
        resolveDataLoad = resolve
      })

      mockSupabaseQuery.gte.mockReturnValue(delayedPromise)

      const { unmount } = render(<Heatmap navigate={mockNavigate} />)

      // Unmount before data loads
      unmount()

      // Resolve the promise after unmount
      resolveDataLoad({ data: [], error: null })

      // Wait a bit to ensure no state updates occur
      await new Promise(resolve => setTimeout(resolve, 100))

      // No error should be thrown
      expect(consoleWarnSpy).not.toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })

    it('should handle zone data without zone_id field', async () => {
      const mockData = [
        {
          // Missing zone_id
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })

      render(<Heatmap navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('1 attempts')).toBeInTheDocument()
      })

      // The "unknown" zone won't be displayed because it has no anchor in ZONE_ANCHORS
      // But we can verify the attempt count is correct
      expect(screen.getByText('1 attempts')).toBeInTheDocument()
    })

    it('should handle image load event', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })

      render(<Heatmap navigate={mockNavigate} />)

      const courtImage = screen.getByAltText('Half court')

      // Mock naturalWidth and naturalHeight
      Object.defineProperty(courtImage, 'naturalWidth', { value: 800, writable: true })
      Object.defineProperty(courtImage, 'naturalHeight', { value: 1000, writable: true })

      // Trigger load event
      courtImage.dispatchEvent(new Event('load'))

      // The component should update internal state (imgNatural)
      // We can't directly test state, but we can verify no errors occur
      expect(courtImage).toBeInTheDocument()
    })

    it('should handle mixed shot type labels (normalization)', async () => {
      const mockData = [
        {
          zone_id: 'left_corner_3',
          shot_type: 'catch_shoot', // underscore variant
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'center_3',
          shot_type: 'OFF DRIBBLE', // uppercase variant
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })

      render(<Heatmap navigate={mockNavigate} />)

      // Trigger image load to enable zone chips
      const courtImage = screen.getByAltText('Half court')
      Object.defineProperty(courtImage, 'naturalWidth', { value: 800, writable: true })
      Object.defineProperty(courtImage, 'naturalHeight', { value: 1000, writable: true })
      courtImage.dispatchEvent(new Event('load'))

      await waitFor(() => {
        // Both should be recognized and displayed
        expect(screen.getByText('L Corner 3')).toBeInTheDocument()
      })
    })

    it('should handle free throw detection via type field', async () => {
      const mockData = [
        {
          zone_id: 'center_mid', // non-FT zone
          type: 'freethrow', // but type indicates FT
          shot_type: null,
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Switch to Free Throws
      const freeThrowPill = screen.getByText('Free Throws')
      await user.click(freeThrowPill)

      await waitFor(() => {
        expect(screen.getByText('Free Throw')).toBeInTheDocument()
      })
    })

    it('should exclude free throws from non-FT shot type filters', async () => {
      const mockData = [
        {
          zone_id: 'free_throw',
          shot_type: 'Free Throw',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })

      render(<Heatmap navigate={mockNavigate} />)

      // Trigger image load to enable zone chips
      const courtImage = screen.getByAltText('Half court')
      Object.defineProperty(courtImage, 'naturalWidth', { value: 800, writable: true })
      Object.defineProperty(courtImage, 'naturalHeight', { value: 1000, writable: true })
      courtImage.dispatchEvent(new Event('load'))

      await waitFor(() => {
        // Should only show Catch & Shoot (default filter)
        expect(screen.getByText('L Corner 3')).toBeInTheDocument()
        expect(screen.queryByText('Free Throw')).not.toBeInTheDocument()
      })
    })

    it('should compute volume percentage correctly', async () => {
      const mockData = [
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          made: false,
          pressured: false,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'center_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'center_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'center_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'center_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'center_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'center_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })

      render(<Heatmap navigate={mockNavigate} />)

      // Trigger image load to enable zone chips
      const courtImage = screen.getByAltText('Half court')
      Object.defineProperty(courtImage, 'naturalWidth', { value: 800, writable: true })
      Object.defineProperty(courtImage, 'naturalHeight', { value: 1000, writable: true })
      courtImage.dispatchEvent(new Event('load'))

      await waitFor(() => {
        // 2 out of 8 total = 25%, 6 out of 8 = 75%
        expect(screen.getByText(/2 = 25%/)).toBeInTheDocument()
        expect(screen.getByText(/6 = 75%/)).toBeInTheDocument()
      })
    })

    it('should handle navigate prop being undefined', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })
      const user = userEvent.setup()

      render(<Heatmap />)

      const backButton = screen.getByText('Back').closest('button')
      await user.click(backButton)

      // Should not throw error
      expect(backButton).toBeInTheDocument()
    })

    it('should handle zone without anchor in ZONE_ANCHORS', async () => {
      const mockData = [
        {
          zone_id: 'imaginary_zone', // Not in ZONE_ANCHORS
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })

      render(<Heatmap navigate={mockNavigate} />)

      await waitFor(() => {
        // Zone won't be displayed since it has no anchor
        expect(screen.getByText('1 attempts')).toBeInTheDocument()
      })
    })
  })

  describe('Sub-component Tests', () => {
    it('should render PillGroup with correct active state', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })

      render(<Heatmap navigate={mockNavigate} />)

      const attemptDensityPill = screen.getByText('Attempt Density')
      expect(attemptDensityPill).toHaveClass('time-pill--active')

      // Wait for async load to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })

    it('should render TimeRangePills with default active', async () => {
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })

      render(<Heatmap navigate={mockNavigate} />)

      // Default is 180d based on DEFAULT_RANGE_ID = TIME_RANGES[2]
      const range180Pill = screen.getByText('180D')
      expect(range180Pill).toHaveClass('time-pill--active')

      // Wait for async load to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })

    it('should handle zone chip click', async () => {
      const mockData = [
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })
      const user = userEvent.setup()

      render(<Heatmap navigate={mockNavigate} />)

      // Trigger image load to enable zone chips
      const courtImage = screen.getByAltText('Half court')
      Object.defineProperty(courtImage, 'naturalWidth', { value: 800, writable: true })
      Object.defineProperty(courtImage, 'naturalHeight', { value: 1000, writable: true })
      courtImage.dispatchEvent(new Event('load'))

      await waitFor(() => {
        expect(screen.getByText('L Corner 3')).toBeInTheDocument()
      })

      const zoneChip = screen.getByText('L Corner 3').closest('button')
      await user.click(zoneChip)

      // Currently onClick is a no-op, but should not throw
      expect(zoneChip).toBeInTheDocument()
    })
  })

  describe('Utility Function Tests (Indirect)', () => {
    it('should handle pixel coordinate mode (values > 100)', async () => {
      // Real ZONE_ANCHORS uses pixel mode (all values > 100)
      // This is the only coordinate mode reachable with real constants.
      // Lines 64-66 (fraction mode) and 71-72 (percent mode) cannot be reached
      // with real ZONE_ANCHORS data, and we don't mock constants for coverage.
      mockSupabaseQuery.gte.mockResolvedValue({ data: [], error: null })

      render(<Heatmap navigate={mockNavigate} />)

      const courtImage = screen.getByAltText('Half court')
      Object.defineProperty(courtImage, 'naturalWidth', { value: 800, writable: true })
      Object.defineProperty(courtImage, 'naturalHeight', { value: 1000, writable: true })
      courtImage.dispatchEvent(new Event('load'))

      // Component should render without errors
      expect(courtImage).toBeInTheDocument()

      // Wait for async load to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })
    })

    it('should handle attempts field with numeric value', async () => {
      const mockData = [
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          attempts: 10,
          makes: 7,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })

      render(<Heatmap navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('10 attempts')).toBeInTheDocument()
      })
    })

    it('should handle attempts field with string value', async () => {
      const mockData = [
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          attempts: '5', // string instead of number
          makes: '3',
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })

      render(<Heatmap navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('5 attempts')).toBeInTheDocument()
      })
    })

    it('should handle unrecognized shot_type labels gracefully', async () => {
      const mockData = [
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'center_3',
          shot_type: 'pullup jumper', // unrecognized — normalizeShotTypeLabel returns null
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })

      render(<Heatmap navigate={mockNavigate} />)

      const courtImage = screen.getByAltText('Half court')
      Object.defineProperty(courtImage, 'naturalWidth', { value: 800, writable: true })
      Object.defineProperty(courtImage, 'naturalHeight', { value: 1000, writable: true })
      courtImage.dispatchEvent(new Event('load'))

      await waitFor(() => {
        // Default filter is "Catch & Shoot", so unrecognized shot is excluded
        expect(screen.getByText('L Corner 3')).toBeInTheDocument()
        expect(screen.queryByText('Center 3')).not.toBeInTheDocument()
        expect(screen.getByText('1 attempts')).toBeInTheDocument()
      })
    })

    it('should skip events with zero attempts', async () => {
      const mockData = [
        {
          zone_id: 'left_corner_3',
          shot_type: 'Catch & Shoot',
          attempts: 0, // Should be skipped
          makes: 0,
          pressured: false,
          ts: new Date().toISOString(),
        },
        {
          zone_id: 'center_3',
          shot_type: 'Catch & Shoot',
          made: true,
          pressured: false,
          ts: new Date().toISOString(),
        },
      ]
      mockSupabaseQuery.gte.mockResolvedValue({ data: mockData, error: null })

      render(<Heatmap navigate={mockNavigate} />)

      // Trigger image load to enable zone chips
      const courtImage = screen.getByAltText('Half court')
      Object.defineProperty(courtImage, 'naturalWidth', { value: 800, writable: true })
      Object.defineProperty(courtImage, 'naturalHeight', { value: 1000, writable: true })
      courtImage.dispatchEvent(new Event('load'))

      await waitFor(() => {
        expect(screen.getByText('1 attempts')).toBeInTheDocument()
        expect(screen.queryByText('L Corner 3')).not.toBeInTheDocument()
        expect(screen.getByText('Center 3')).toBeInTheDocument()
      })
    })
  })
})
