// src/screens/__tests__/Performance.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Performance from '../Performance.jsx'

// Mock performance-db module
vi.mock('../../lib/performance-db', () => ({
  getGamePerformance: vi.fn(),
  getPracticePerformance: vi.fn(),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>,
  ChevronDown: () => <div data-testid="chevron-down-icon">ChevronDown</div>,
  ChevronUp: () => <div data-testid="chevron-up-icon">ChevronUp</div>,
  Filter: () => <div data-testid="filter-icon">Filter</div>,
}))

// Mock recharts components
vi.mock('recharts', () => ({
  LineChart: ({ children, data, onClick }) => (
    <div data-testid="line-chart" onClick={onClick}>
      {children}
    </div>
  ),
  Line: ({ dataKey, name }) => <div data-testid={`line-${dataKey}`}>{name}</div>,
  XAxis: ({ dataKey }) => <div data-testid="x-axis">{dataKey}</div>,
  YAxis: () => <div data-testid="y-axis">YAxis</div>,
  Tooltip: () => <div data-testid="tooltip">Tooltip</div>,
  Legend: () => <div data-testid="legend">Legend</div>,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid">CartesianGrid</div>,
}))

import { getGamePerformance, getPracticePerformance } from '../../lib/performance-db'

describe('Performance Component', () => {
  let mockNavigate
  const mockPerformanceData = {
    metrics: [
      { id: 'left_corner_3', label: 'L Corner 3', makes: 5, attempts: 10, fgPct: 50, attemptsLabel: '5/10', goalPct: 40, isThree: true },
      { id: 'center_3', label: 'Center 3', makes: 3, attempts: 6, fgPct: 50, attemptsLabel: '3/6', goalPct: 35, isThree: true },
    ],
    trend: [
      { date: '2025-01-15', fgPct: 50, efgPct: 55, attempts: 10, makes: 5, fga: 10 },
      { date: '2025-01-16', fgPct: 60, efgPct: 65, attempts: 12, makes: 7, fga: 12 },
    ],
    overallFgPct: 50,
    overallEfgPct: 55,
    totalAttempts: 100,
    trendBuckets: {
      daily: [
        { label: 'Jan 15', fgPct: 50, efgPct: 55, fga: 10 },
        { label: 'Jan 16', fgPct: 60, efgPct: 65, fga: 12 },
      ],
      weekly: [
        { label: 'Week 1', fgPct: 55, efgPct: 60, fga: 22 },
      ],
      monthly: [
        { label: 'January', fgPct: 55, efgPct: 60, fga: 22 },
      ],
    },
  }

  beforeEach(() => {
    mockNavigate = vi.fn()
    getGamePerformance.mockResolvedValue(mockPerformanceData)
    getPracticePerformance.mockResolvedValue(mockPerformanceData)

    // Mock localStorage
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering Tests', () => {
    it('should render header with Player Performance title', async () => {
      render(<Performance navigate={mockNavigate} />)

      expect(screen.getByText('Player Performance')).toBeInTheDocument()

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })
    })

    it('should render Game and Practice section headers', async () => {
      render(<Performance navigate={mockNavigate} />)

      expect(screen.getByText('Game')).toBeInTheDocument()
      expect(screen.getByText('Practice')).toBeInTheDocument()

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })
    })

    it('should render both sections expanded by default', async () => {
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      // Check for filter pills which only appear when expanded
      const modePills = screen.getAllByText('Attempts')
      expect(modePills.length).toBeGreaterThan(0)
    })

    it('should render time range filter pills without section labels', async () => {
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      expect(screen.getAllByText('30D').length).toBeGreaterThan(0)
      expect(screen.getAllByText('60D').length).toBeGreaterThan(0)
      expect(screen.getAllByText('180D').length).toBeGreaterThan(0)
      expect(screen.getAllByText('All').length).toBeGreaterThan(0)

      // Section labels should not exist
      expect(screen.queryByText('Days')).not.toBeInTheDocument()
      expect(screen.queryByText('Time Range')).not.toBeInTheDocument()
    })

    it('should render mode filter pills (Attempts/FG%)', async () => {
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      const attemptsPills = screen.getAllByText('Attempts')
      const fgPctPills = screen.getAllByText('FG%')

      expect(attemptsPills.length).toBeGreaterThan(0)
      expect(fgPctPills.length).toBeGreaterThan(0)
    })

    it('should render shot type filter pills', async () => {
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      expect(screen.getAllByText('All').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Catch & Shoot').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Off-dribble').length).toBeGreaterThan(0)
    })

    it('should render contested filter pills', async () => {
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      const contestedPills = screen.getAllByText('Contested')
      const uncontestedPills = screen.getAllByText('Uncontested')

      expect(contestedPills.length).toBeGreaterThan(0)
      expect(uncontestedPills.length).toBeGreaterThan(0)

      // Both should be inactive by default (contested state is "all")
      contestedPills.forEach(pill => {
        expect(pill).not.toHaveClass('time-pill--active')
      })
      uncontestedPills.forEach(pill => {
        expect(pill).not.toHaveClass('time-pill--active')
      })
    })

    it('should display MetricCard zones with data', async () => {
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getAllByText('L Corner 3').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Center 3').length).toBeGreaterThan(0)
      })
    })

    it('should display attempt count for each section', async () => {
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        const attemptCounts = screen.getAllByText('100 FG attempts')
        expect(attemptCounts.length).toBeGreaterThan(0)
      })
    })

    it('should show loading state initially', async () => {
      getGamePerformance.mockImplementation(() => new Promise(() => {}))

      render(<Performance navigate={mockNavigate} />)

      expect(screen.getByText('Loading game performance…')).toBeInTheDocument()
    })

    it('should show empty state when no data', async () => {
      getGamePerformance.mockResolvedValue({
        metrics: [],
        trend: [],
        overallFgPct: 0,
        overallEfgPct: 0,
        totalAttempts: 0,
        trendBuckets: { daily: [], weekly: [], monthly: [] },
      })

      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('No game shots logged in this range yet.')).toBeInTheDocument()
      })
    })

    it('should render TrendChart component', async () => {
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getAllByTestId('line-chart').length).toBeGreaterThan(0)
      })
    })

    it('should show "No shots yet" when totalAttempts is 0', async () => {
      getGamePerformance.mockResolvedValue({
        metrics: [],
        trend: [],
        overallFgPct: 0,
        overallEfgPct: 0,
        totalAttempts: 0,
        trendBuckets: { daily: [], weekly: [], monthly: [] },
      })

      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        const noShotsText = screen.getAllByText('No shots yet')
        expect(noShotsText.length).toBeGreaterThan(0)
      })
    })
  })

  describe('User Interaction Tests - Accordion', () => {
    it('should collapse Game section when header is clicked', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      const gameHeader = screen.getByText('Game').closest('button')
      await user.click(gameHeader)

      await waitFor(() => {
        // When collapsed, filter pills should not be visible
        const gameSection = gameHeader.closest('section')
        const modePillsInSection = within(gameSection).queryByText('Attempts')
        expect(modePillsInSection).not.toBeInTheDocument()
      })
    })

    it('should collapse Practice section when header is clicked', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      const practiceHeader = screen.getByText('Practice').closest('button')
      await user.click(practiceHeader)

      await waitFor(() => {
        // When collapsed, filter pills should not be visible
        const practiceSection = practiceHeader.closest('section')
        const pills = within(practiceSection).queryAllByText('Attempts')
        expect(pills.length).toBe(0)
      })
    })

    it('should toggle Game section back to expanded', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      const gameHeader = screen.getByText('Game').closest('button')

      // Collapse
      await user.click(gameHeader)
      await waitFor(() => {
        const gameSection = gameHeader.closest('section')
        expect(within(gameSection).queryByText('30D')).not.toBeInTheDocument()
      })

      // Expand
      await user.click(gameHeader)
      await waitFor(() => {
        const gameSection = gameHeader.closest('section')
        expect(within(gameSection).getByText('30D')).toBeInTheDocument()
      })
    })

    it('should persist Game accordion state to localStorage', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      const gameHeader = screen.getByText('Game').closest('button')
      await user.click(gameHeader)

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('nm_perf_game_expanded', 'false')
      })
    })

    it('should persist Practice accordion state to localStorage', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      const practiceHeader = screen.getByText('Practice').closest('button')
      await user.click(practiceHeader)

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('nm_perf_practice_expanded', 'false')
      })
    })

    it('should restore accordion state from localStorage', () => {
      Storage.prototype.getItem.mockImplementation((key) => {
        if (key === 'nm_perf_game_expanded') return 'false'
        if (key === 'nm_perf_practice_expanded') return 'false'
        return null
      })

      render(<Performance navigate={mockNavigate} />)

      // Both sections should be collapsed initially
      const gameSection = screen.getByText('Game').closest('section')
      const practiceSection = screen.getByText('Practice').closest('section')

      expect(within(gameSection).queryByText('30D')).not.toBeInTheDocument()
      expect(within(practiceSection).queryByText('30D')).not.toBeInTheDocument()
    })
  })

  describe('User Interaction Tests - Time Range Filter', () => {
    it('should switch Game time range to 60D', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      vi.clearAllMocks()

      const gameSection = screen.getByText('Game').closest('section')
      const sixtyDayPill = within(gameSection).getAllByText('60D')[0]
      await user.click(sixtyDayPill)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalledWith({
          days: 60,
          shotType: 'all',
          contested: 'all'
        })
      })
    })

    it('should switch Game time range to All', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      vi.clearAllMocks()

      const gameSection = screen.getByText('Game').closest('section')
      const allPill = within(gameSection).getAllByText('All')[0]
      await user.click(allPill)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalledWith({
          days: null,
          shotType: 'all',
          contested: 'all'
        })
      })
    })

    it('should switch Practice time range independently from Game', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      vi.clearAllMocks()

      const practiceSection = screen.getByText('Practice').closest('section')
      const sixtyDayPill = within(practiceSection).getAllByText('60D')[0]
      await user.click(sixtyDayPill)

      await waitFor(() => {
        expect(getPracticePerformance).toHaveBeenCalledWith({
          days: 60,
          shotType: 'all',
          contested: 'all'
        })
      })

      // Game should not be affected
      expect(getGamePerformance).not.toHaveBeenCalled()
    })
  })

  describe('User Interaction Tests - Mode Filter', () => {
    it('should switch Game mode to Attempts', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      const gameSection = screen.getByText('Game').closest('section')
      const attemptsPill = within(gameSection).getByText('Attempts')

      // Should not be active initially (default is fgpct)
      expect(attemptsPill).not.toHaveClass('time-pill--active')

      await user.click(attemptsPill)

      await waitFor(() => {
        expect(attemptsPill).toHaveClass('time-pill--active')
      })
    })

    it('should switch Practice mode to Attempts', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      const practiceSection = screen.getByText('Practice').closest('section')
      const attemptsPill = within(practiceSection).getByText('Attempts')

      await user.click(attemptsPill)

      await waitFor(() => {
        expect(attemptsPill).toHaveClass('time-pill--active')
      })
    })

    it('should update MetricCard display when switching modes', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getAllByText('L Corner 3').length).toBeGreaterThan(0)
      })

      const gameSection = screen.getByText('Game').closest('section')
      const attemptsPill = within(gameSection).getByText('Attempts')

      await user.click(attemptsPill)

      await waitFor(() => {
        // In attempts mode, should show volume percentage
        expect(screen.getAllByText(/% of total volume/).length).toBeGreaterThan(0)
      })
    })
  })

  describe('User Interaction Tests - Shot Type Filter', () => {
    it('should switch Game shot type to Catch & Shoot', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      vi.clearAllMocks()

      const gameSection = screen.getByText('Game').closest('section')
      const catchShootPill = within(gameSection).getByText('Catch & Shoot')
      await user.click(catchShootPill)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalledWith({
          days: 30,
          shotType: 'catch_shoot',
          contested: 'all'
        })
      })
    })

    it('should switch Game shot type to Off-dribble', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      vi.clearAllMocks()

      const gameSection = screen.getByText('Game').closest('section')
      const offDribblePill = within(gameSection).getByText('Off-dribble')
      await user.click(offDribblePill)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalledWith({
          days: 30,
          shotType: 'off_dribble',
          contested: 'all'
        })
      })
    })

    it('should switch Practice shot type independently', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      vi.clearAllMocks()

      const practiceSection = screen.getByText('Practice').closest('section')
      const catchShootPill = within(practiceSection).getByText('Catch & Shoot')
      await user.click(catchShootPill)

      await waitFor(() => {
        expect(getPracticePerformance).toHaveBeenCalledWith({
          days: 30,
          shotType: 'catch_shoot',
          contested: 'all'
        })
      })

      expect(getGamePerformance).not.toHaveBeenCalled()
    })
  })

  describe('User Interaction Tests - Contested Filter', () => {
    it('should activate Game Contested filter on click', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      vi.clearAllMocks()

      const gameSection = screen.getByText('Game').closest('section')
      const contestedPill = within(gameSection).getByText('Contested')

      expect(contestedPill).not.toHaveClass('time-pill--active')

      await user.click(contestedPill)

      await waitFor(() => {
        expect(contestedPill).toHaveClass('time-pill--active')
        expect(getGamePerformance).toHaveBeenCalledWith({
          days: 30,
          shotType: 'all',
          contested: 'contested'
        })
      })
    })

    it('should toggle Game Contested filter off on second click', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      const gameSection = screen.getByText('Game').closest('section')
      const contestedPill = within(gameSection).getByText('Contested')

      // Click once to activate
      await user.click(contestedPill)
      await waitFor(() => {
        expect(contestedPill).toHaveClass('time-pill--active')
      })

      vi.clearAllMocks()

      // Click again to deactivate (returns to "all")
      await user.click(contestedPill)

      await waitFor(() => {
        expect(contestedPill).not.toHaveClass('time-pill--active')
        expect(getGamePerformance).toHaveBeenCalledWith({
          days: 30,
          shotType: 'all',
          contested: 'all'
        })
      })
    })

    it('should activate Game Uncontested filter on click', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      vi.clearAllMocks()

      const gameSection = screen.getByText('Game').closest('section')
      const uncontestedPill = within(gameSection).getByText('Uncontested')

      await user.click(uncontestedPill)

      await waitFor(() => {
        expect(uncontestedPill).toHaveClass('time-pill--active')
        expect(getGamePerformance).toHaveBeenCalledWith({
          days: 30,
          shotType: 'all',
          contested: 'uncontested'
        })
      })
    })

    it('should switch between Contested and Uncontested filters', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      const gameSection = screen.getByText('Game').closest('section')
      const contestedPill = within(gameSection).getByText('Contested')
      const uncontestedPill = within(gameSection).getByText('Uncontested')

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

    it('should handle Practice contested filter independently', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      vi.clearAllMocks()

      const practiceSection = screen.getByText('Practice').closest('section')
      const contestedPill = within(practiceSection).getByText('Contested')

      await user.click(contestedPill)

      await waitFor(() => {
        expect(getPracticePerformance).toHaveBeenCalledWith({
          days: 30,
          shotType: 'all',
          contested: 'contested'
        })
      })

      expect(getGamePerformance).not.toHaveBeenCalled()
    })
  })

  describe('User Interaction Tests - TrendChart', () => {
    it('should cycle trend mode from daily to weekly', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Game eFG% vs FG% Trend')).toBeInTheDocument()
      })

      // Find the parent div that contains the trend chart
      const gameTrendChartParent = screen.getByText('Game eFG% vs FG% Trend').closest('.rounded-xl')
      const filterButton = within(gameTrendChartParent).getByText('Daily').closest('div[role="button"]')

      expect(within(filterButton).getByText('Daily')).toBeInTheDocument()

      await user.click(filterButton)

      await waitFor(() => {
        expect(within(gameTrendChartParent).getByText('Weekly')).toBeInTheDocument()
      })
    })

    it('should cycle trend mode from weekly to monthly', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Game eFG% vs FG% Trend')).toBeInTheDocument()
      })

      const gameTrendChartParent = screen.getByText('Game eFG% vs FG% Trend').closest('.rounded-xl')

      // Click once to get to weekly
      const dailyButton = within(gameTrendChartParent).getByText('Daily').closest('div[role="button"]')
      await user.click(dailyButton)

      await waitFor(() => {
        expect(within(gameTrendChartParent).getByText('Weekly')).toBeInTheDocument()
      })

      // Click again to get to monthly
      const weeklyButton = within(gameTrendChartParent).getByText('Weekly').closest('div[role="button"]')
      await user.click(weeklyButton)

      await waitFor(() => {
        expect(within(gameTrendChartParent).getByText('Monthly')).toBeInTheDocument()
      })
    })

    it('should cycle trend mode from monthly back to daily', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Game eFG% vs FG% Trend')).toBeInTheDocument()
      })

      const gameTrendChartParent = screen.getByText('Game eFG% vs FG% Trend').closest('.rounded-xl')

      // Cycle through: daily -> weekly -> monthly -> daily
      let filterButton = within(gameTrendChartParent).getByText('Daily').closest('div[role="button"]')
      await user.click(filterButton) // to weekly

      await waitFor(() => {
        expect(within(gameTrendChartParent).getByText('Weekly')).toBeInTheDocument()
      })

      filterButton = within(gameTrendChartParent).getByText('Weekly').closest('div[role="button"]')
      await user.click(filterButton) // to monthly

      await waitFor(() => {
        expect(within(gameTrendChartParent).getByText('Monthly')).toBeInTheDocument()
      })

      filterButton = within(gameTrendChartParent).getByText('Monthly').closest('div[role="button"]')
      await user.click(filterButton) // back to daily

      await waitFor(() => {
        expect(within(gameTrendChartParent).getByText('Daily')).toBeInTheDocument()
      })
    })

    it('should change trend chart title when mode is Attempts', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      const gameSection = screen.getByText('Game').closest('section')
      const attemptsPill = within(gameSection).getByText('Attempts')

      await user.click(attemptsPill)

      await waitFor(() => {
        expect(screen.getByText('Game Attempts Trend')).toBeInTheDocument()
      })
    })

    it('should handle keyboard navigation on trend mode button', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Game eFG% vs FG% Trend')).toBeInTheDocument()
      })

      const gameTrendChartParent = screen.getByText('Game eFG% vs FG% Trend').closest('.rounded-xl')
      const filterButton = within(gameTrendChartParent).getByText('Daily').closest('div[role="button"]')

      filterButton.focus()
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(within(gameTrendChartParent).getByText('Weekly')).toBeInTheDocument()
      })
    })

    it('should handle space key on trend mode button', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Game eFG% vs FG% Trend')).toBeInTheDocument()
      })

      const gameTrendChartParent = screen.getByText('Game eFG% vs FG% Trend').closest('.rounded-xl')
      const filterButton = within(gameTrendChartParent).getByText('Daily').closest('div[role="button"]')

      filterButton.focus()
      await user.keyboard(' ')

      await waitFor(() => {
        expect(within(gameTrendChartParent).getByText('Weekly')).toBeInTheDocument()
      })
    })
  })

  describe('Data Loading Tests', () => {
    it('should call getGamePerformance on mount with default filters', async () => {
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalledWith({
          days: 30,
          shotType: 'all',
          contested: 'all'
        })
      })
    })

    it('should call getPracticePerformance on mount with default filters', async () => {
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getPracticePerformance).toHaveBeenCalledWith({
          days: 30,
          shotType: 'all',
          contested: 'all'
        })
      })
    })

    it('should re-fetch Game data when time range changes', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalledTimes(1)
      })

      vi.clearAllMocks()

      const gameSection = screen.getByText('Game').closest('section')
      const sixtyDayPill = within(gameSection).getAllByText('60D')[0]
      await user.click(sixtyDayPill)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalledTimes(1)
        expect(getGamePerformance).toHaveBeenCalledWith({
          days: 60,
          shotType: 'all',
          contested: 'all'
        })
      })
    })

    it('should re-fetch Game data when shot type changes', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalledTimes(1)
      })

      vi.clearAllMocks()

      const gameSection = screen.getByText('Game').closest('section')
      const catchShootPill = within(gameSection).getByText('Catch & Shoot')
      await user.click(catchShootPill)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalledTimes(1)
      })
    })

    it('should re-fetch Game data when contested filter changes', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalledTimes(1)
      })

      vi.clearAllMocks()

      const gameSection = screen.getByText('Game').closest('section')
      const contestedPill = within(gameSection).getByText('Contested')
      await user.click(contestedPill)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalledTimes(1)
      })
    })

    it('should not re-fetch when mode changes (client-side only)', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalledTimes(1)
      })

      vi.clearAllMocks()

      const gameSection = screen.getByText('Game').closest('section')
      const attemptsPill = within(gameSection).getByText('Attempts')
      await user.click(attemptsPill)

      // Wait a bit to ensure no additional calls
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(getGamePerformance).not.toHaveBeenCalled()
    })

    it('should not re-fetch when trend mode changes (client-side only)', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalledTimes(1)
      })

      vi.clearAllMocks()

      const gameTrendChartParent = screen.getByText('Game eFG% vs FG% Trend').closest('.rounded-xl')
      const filterButton = within(gameTrendChartParent).getByText('Daily').closest('div[role="button"]')
      await user.click(filterButton)

      // Wait a bit to ensure no additional calls
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(getGamePerformance).not.toHaveBeenCalled()
    })

    it('should handle multiple simultaneous filter changes correctly', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalledTimes(1)
      })

      vi.clearAllMocks()

      const gameSection = screen.getByText('Game').closest('section')

      // Change multiple filters in quick succession
      const sixtyDayPill = within(gameSection).getAllByText('60D')[0]
      const catchShootPill = within(gameSection).getByText('Catch & Shoot')
      const contestedPill = within(gameSection).getByText('Contested')

      await user.click(sixtyDayPill)
      await user.click(catchShootPill)
      await user.click(contestedPill)

      await waitFor(() => {
        // Should be called with the final state
        expect(getGamePerformance).toHaveBeenCalledWith({
          days: 60,
          shotType: 'catch_shoot',
          contested: 'contested'
        })
      })
    })

    it('should reset selected point when data changes', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      const gameSection = screen.getByText('Game').closest('section')
      const sixtyDayPill = within(gameSection).getAllByText('60D')[0]
      await user.click(sixtyDayPill)

      await waitFor(() => {
        // Component should re-render with new data and reset selected point
        expect(getGamePerformance).toHaveBeenCalledWith({
          days: 60,
          shotType: 'all',
          contested: 'all'
        })
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle getGamePerformance throwing error', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      getGamePerformance.mockRejectedValue(new Error('Database error'))

      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[Performance] getGamePerformance error:',
          expect.any(Error)
        )
      })

      // Should show empty state
      expect(screen.getByText('No game shots logged in this range yet.')).toBeInTheDocument()

      consoleWarnSpy.mockRestore()
    })

    it('should handle getPracticePerformance throwing error', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      getPracticePerformance.mockRejectedValue(new Error('Database error'))

      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[Performance] getPracticePerformance error:',
          expect.any(Error)
        )
      })

      // Should show empty state for practice
      expect(screen.getByText('No practice entries logged in this range yet.')).toBeInTheDocument()

      consoleWarnSpy.mockRestore()
    })

    it('should handle navigate prop being undefined', async () => {
      render(<Performance />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      // Should render without crashing
      expect(screen.getByText('Player Performance')).toBeInTheDocument()
    })

    it('should handle localStorage being unavailable', () => {
      Storage.prototype.getItem.mockImplementation(() => {
        throw new Error('localStorage not available')
      })

      render(<Performance navigate={mockNavigate} />)

      // Should render with default expanded state
      expect(screen.getByText('Game')).toBeInTheDocument()
      expect(screen.getByText('Practice')).toBeInTheDocument()
    })

    it('should prevent state updates after unmount', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      let resolveGameData
      const delayedPromise = new Promise((resolve) => {
        resolveGameData = resolve
      })

      getGamePerformance.mockReturnValue(delayedPromise)

      const { unmount } = render(<Performance navigate={mockNavigate} />)

      // Unmount before data loads
      unmount()

      // Resolve the promise after unmount
      resolveGameData(mockPerformanceData)

      // Wait a bit to ensure no state updates occur
      await new Promise(resolve => setTimeout(resolve, 100))

      // No error should be thrown
      expect(consoleWarnSpy).not.toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })

    it('should handle missing trendBuckets gracefully', async () => {
      getGamePerformance.mockResolvedValue({
        metrics: [],
        trend: [{ label: 'Jan 15', fgPct: 50, efgPct: 55, fga: 10 }],
        overallFgPct: 50,
        overallEfgPct: 55,
        totalAttempts: 0,
        trendBuckets: null, // Missing trendBuckets
      })

      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        // Should render without crashing
        expect(screen.getAllByText('Game').length).toBeGreaterThan(0)
      })
    })

    it('should handle empty metrics array', async () => {
      getGamePerformance.mockResolvedValue({
        metrics: [],
        trend: [],
        overallFgPct: 0,
        overallEfgPct: 0,
        totalAttempts: 0,
        trendBuckets: { daily: [], weekly: [], monthly: [] },
      })

      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getAllByText('No game shots logged in this range yet.').length).toBeGreaterThan(0)
      })
    })

    it('should handle empty trend array', async () => {
      getGamePerformance.mockResolvedValue({
        metrics: mockPerformanceData.metrics,
        trend: [],
        overallFgPct: 50,
        overallEfgPct: 55,
        totalAttempts: 100,
        trendBuckets: { daily: [], weekly: [], monthly: [] },
      })

      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getAllByText('L Corner 3').length).toBeGreaterThan(0)
      })

      // Should show "Not enough shot data yet to show a trend."
      expect(screen.getAllByText('Not enough shot data yet to show a trend.').length).toBeGreaterThan(0)
    })

    it('should handle totalAttempts being undefined', async () => {
      getGamePerformance.mockResolvedValue({
        metrics: mockPerformanceData.metrics,
        trend: mockPerformanceData.trend,
        overallFgPct: 50,
        overallEfgPct: 55,
        totalAttempts: undefined,
        trendBuckets: mockPerformanceData.trendBuckets,
      })

      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('No shots yet')).toBeInTheDocument()
      })
    })

    it('should handle metrics with missing fields', async () => {
      getGamePerformance.mockResolvedValue({
        metrics: [
          { id: 'zone1', label: 'Zone 1' }, // Missing makes, attempts, fgPct
        ],
        trend: [],
        overallFgPct: 0,
        overallEfgPct: 0,
        totalAttempts: 10,
        trendBuckets: { daily: [], weekly: [], monthly: [] },
      })

      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getAllByText('Zone 1').length).toBeGreaterThan(0)
      })

      // Should render without crashing
      expect(screen.getAllByText('10 FG attempts').length).toBeGreaterThan(0)
    })

    it('should handle NaN and Infinity in fgPct', async () => {
      getGamePerformance.mockResolvedValue({
        metrics: [
          { id: 'zone1', label: 'Zone 1', makes: 0, attempts: 0, fgPct: NaN, attemptsLabel: '0/0' },
          { id: 'zone2', label: 'Zone 2', makes: 5, attempts: 0, fgPct: Infinity, attemptsLabel: '5/0' },
        ],
        trend: [],
        overallFgPct: 0,
        overallEfgPct: 0,
        totalAttempts: 0,
        trendBuckets: { daily: [], weekly: [], monthly: [] },
      })

      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getAllByText('Zone 1').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Zone 2').length).toBeGreaterThan(0)
      })

      // Should render 0 for NaN and Infinity
      // Check that no "NaN%" or "Infinity%" text is rendered
      expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Infinity/)).not.toBeInTheDocument()
    })
  })

  describe('MetricCard Tests', () => {
    it('should display FG% by default', async () => {
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getAllByText('L Corner 3').length).toBeGreaterThan(0)
      })

      // Should show percentage and attempts label
      expect(screen.getAllByText('5/10').length).toBeGreaterThan(0)
    })

    it('should show volume percentage in Attempts mode', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getAllByText('L Corner 3').length).toBeGreaterThan(0)
      })

      const gameSection = screen.getByText('Game').closest('section')
      const attemptsPill = within(gameSection).getByText('Attempts')
      await user.click(attemptsPill)

      await waitFor(() => {
        expect(screen.getAllByText(/% of total volume/).length).toBeGreaterThan(0)
      })
    })

    it('should display goal percentage when available', async () => {
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getAllByText('L Corner 3').length).toBeGreaterThan(0)
      })

      // Goal: 40% from mock data
      const goalTexts = screen.getAllByText(/Goal: \d+%/)
      expect(goalTexts.length).toBeGreaterThan(0)
    })

    it('should not show goal in Attempts mode', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getAllByText('L Corner 3').length).toBeGreaterThan(0)
      })

      // First verify goals are visible in FG% mode
      const goalsInFgMode = screen.queryAllByText(/Goal:/)
      expect(goalsInFgMode.length).toBeGreaterThan(0)

      const gameSection = screen.getByText('Game').closest('section')
      const attemptsPill = within(gameSection).getByText('Attempts')
      await user.click(attemptsPill)

      await waitFor(() => {
        // In attempts mode, should show volume percentage
        expect(screen.getAllByText(/% of total volume/).length).toBeGreaterThan(0)
      })

      // Goal should have fewer instances now (only practice section has goals in FG% mode)
      const goalsInAttemptsMode = screen.queryAllByText(/Goal:/)
      expect(goalsInAttemptsMode.length).toBeLessThan(goalsInFgMode.length)
    })

    it('should handle zero totalAttempts in volume calculation', async () => {
      getGamePerformance.mockResolvedValue({
        metrics: mockPerformanceData.metrics,
        trend: [],
        overallFgPct: 0,
        overallEfgPct: 0,
        totalAttempts: 0,
        trendBuckets: { daily: [], weekly: [], monthly: [] },
      })

      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getAllByText('L Corner 3').length).toBeGreaterThan(0)
      })

      const gameSection = screen.getByText('Game').closest('section')
      const attemptsPill = within(gameSection).getByText('Attempts')
      await user.click(attemptsPill)

      await waitFor(() => {
        // Should show 0% of total volume
        expect(screen.getAllByText('0% of total volume').length).toBeGreaterThan(0)
      })
    })
  })

  describe('TrendChart Tests', () => {
    it('should render with daily trend data by default', async () => {
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Game eFG% vs FG% Trend')).toBeInTheDocument()
      })

      expect(screen.getAllByTestId('line-chart').length).toBeGreaterThan(0)
    })

    it('should switch to weekly trend data', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Game eFG% vs FG% Trend')).toBeInTheDocument()
      })

      const gameTrendChartParent = screen.getByText('Game eFG% vs FG% Trend').closest('.rounded-xl')
      const filterButton = within(gameTrendChartParent).getByText('Daily').closest('div[role="button"]')

      await user.click(filterButton)

      await waitFor(() => {
        expect(within(gameTrendChartParent).getByText('Weekly')).toBeInTheDocument()
      })
    })

    it('should render attempts line in Attempts mode', async () => {
      const user = userEvent.setup()
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(getGamePerformance).toHaveBeenCalled()
      })

      const gameSection = screen.getByText('Game').closest('section')
      const attemptsPill = within(gameSection).getByText('Attempts')
      await user.click(attemptsPill)

      await waitFor(() => {
        expect(screen.getByText('Game Attempts Trend')).toBeInTheDocument()
        expect(screen.getAllByTestId('line-fga').length).toBeGreaterThan(0)
      })
    })

    it('should render FG% and eFG% lines in FG% mode', async () => {
      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Game eFG% vs FG% Trend')).toBeInTheDocument()
      })

      expect(screen.getAllByTestId('line-fgPct').length).toBeGreaterThan(0)
      expect(screen.getAllByTestId('line-efgPct').length).toBeGreaterThan(0)
    })

    it('should show empty trend message when no trend data', async () => {
      getGamePerformance.mockResolvedValue({
        metrics: mockPerformanceData.metrics,
        trend: [],
        overallFgPct: 50,
        overallEfgPct: 55,
        totalAttempts: 100,
        trendBuckets: { daily: [], weekly: [], monthly: [] },
      })

      render(<Performance navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getAllByText('Not enough shot data yet to show a trend.').length).toBeGreaterThan(0)
      })
    })
  })
})
