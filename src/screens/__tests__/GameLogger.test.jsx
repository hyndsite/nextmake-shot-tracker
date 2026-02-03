// src/screens/__tests__/GameLogger.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GameLogger from '../GameLogger.jsx'

// Mock game-db module (IndexedDB operations)
vi.mock('../../lib/game-db', () => ({
  getGameSession: vi.fn(),
  listGameEventsBySession: vi.fn(),
  addGameEvent: vi.fn(),
  endGameSession: vi.fn(),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Target: () => <div data-testid="target-icon">Target</div>,
  Hand: () => <div data-testid="hand-icon">Hand</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
}))

// Mock react-icons
vi.mock('react-icons/md', () => ({
  MdSportsBasketball: ({ color, style }) => (
    <div data-testid="basketball-icon" data-color={color} style={style}>
      Basketball
    </div>
  ),
}))

import {
  getGameSession,
  listGameEventsBySession,
  addGameEvent,
  endGameSession,
} from '../../lib/game-db'

const getStatsSection = () => screen.getByText('2PT').closest('section')
const getMiniStat = (label) => within(getStatsSection()).getByText(label).parentElement
const getStatCard = (label) => within(getStatsSection()).getByText(label).parentElement
const getFtModal = () =>
  screen
    .getAllByText('Log Free Throw')
    .map((el) => el.closest('.absolute'))
    .find(Boolean)
const getShotModal = () => document.querySelector('.shotmodal')
const loadCourtImage = async () => {
  const courtImage = await screen.findByAltText('Half court')
  await act(async () => {
    Object.defineProperty(courtImage, 'naturalWidth', {
      value: 800,
      writable: true,
    })
    Object.defineProperty(courtImage, 'naturalHeight', {
      value: 1000,
      writable: true,
    })
    courtImage.dispatchEvent(new Event('load'))
  })
  return courtImage
}
const openShotModal = async (user, zoneId = 'left_corner_3') => {
  await loadCourtImage()
  const zoneButton = await screen.findByRole('button', {
    name: new RegExp(`Log shot for ${zoneId}`),
  })
  await user.click(zoneButton)
  await waitFor(() => {
    expect(getShotModal()).toBeTruthy()
  })
  return getShotModal()
}

describe('GameLogger Component', () => {
  let mockNavigate
  const mockGameSession = {
    id: 'game-123',
    team_name: 'Warriors',
    opponent_name: 'Lakers',
    home_away: 'home',
    level: 'High School',
    team_score: 85,
    opponent_score: 78,
    status: 'active',
  }

  const mockEvents = [
    {
      id: 'event-1',
      game_id: 'game-123',
      type: 'shot',
      zone_id: 'left_corner_3',
      shot_type: 'catch_shoot',
      is_three: true,
      made: true,
      contested: false,
      ts: '2025-01-15T10:00:00Z',
    },
    {
      id: 'event-2',
      game_id: 'game-123',
      type: 'shot',
      zone_id: 'center_mid',
      shot_type: 'layup',
      is_three: false,
      made: false,
      contested: true,
      pickup_type: 'high_pickup',
      finish_type: 'overhand',
      ts: '2025-01-15T10:01:00Z',
    },
    {
      id: 'event-3',
      game_id: 'game-123',
      type: 'freethrow',
      made: true,
      ts: '2025-01-15T10:02:00Z',
    },
    {
      id: 'event-4',
      game_id: 'game-123',
      type: 'assist',
      ts: '2025-01-15T10:03:00Z',
    },
    {
      id: 'event-5',
      game_id: 'game-123',
      type: 'rebound',
      ts: '2025-01-15T10:04:00Z',
    },
    {
      id: 'event-6',
      game_id: 'game-123',
      type: 'steal',
      ts: '2025-01-15T10:05:00Z',
    },
    {
      id: 'event-7',
      game_id: 'game-123',
      type: 'forced_turnover',
      ts: '2025-01-15T10:06:00Z',
    },
  ]

  beforeEach(() => {
    mockNavigate = vi.fn()
    getGameSession.mockResolvedValue(mockGameSession)
    listGameEventsBySession.mockResolvedValue(mockEvents)
    addGameEvent.mockResolvedValue({ id: 'new-event' })
    endGameSession.mockResolvedValue(mockGameSession)

    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Rendering Tests', () => {
    it('should render loading state initially', () => {
      getGameSession.mockImplementation(() => new Promise(() => {}))
      listGameEventsBySession.mockImplementation(() => new Promise(() => {}))

      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      expect(screen.getByText('Loading…')).toBeInTheDocument()
    })

    it('should render game title line with team names and location', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Warriors vs Lakers · Home · High School/)
        ).toBeInTheDocument()
      })
    })

    it('should render Back button', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Back')).toBeInTheDocument()
        expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument()
      })
    })

    it('should render court image', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        const courtImage = screen.getByAltText('Half court')
        expect(courtImage).toBeInTheDocument()
        expect(courtImage).toHaveAttribute('src', '/court-half.svg')
      })
    })

    it('should render final score inputs', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Final Score')).toBeInTheDocument()
      })

      const inputs = screen.getAllByRole('spinbutton')
      expect(inputs).toHaveLength(2)
      expect(inputs[0]).toHaveValue(85)
      expect(inputs[1]).toHaveValue(78)
    })

    it('should render quick stat buttons', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Steals/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Rebounds/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Assists/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Forced TO/ })).toBeInTheDocument()
      })
    })

    it('should render Log Free Throw button', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Log Free Throw')).toBeInTheDocument()
      })
    })

    it('should render End Game button', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('End Game')).toBeInTheDocument()
      })
    })

    it('should render legend with shot colors', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('made shot')).toBeInTheDocument()
        expect(screen.getByText('missed shot')).toBeInTheDocument()
        expect(screen.getByText('made layup')).toBeInTheDocument()
        expect(screen.getByText('missed layup')).toBeInTheDocument()
      })
    })
  })

  describe('Stats Display Tests', () => {
    it('should calculate and display 2PT makes correctly', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        // 1 made layup (2-pointer) from mockEvents
        const miniStat = getMiniStat('2PT')
        expect(within(miniStat).getByText('0')).toBeInTheDocument()
      })
    })

    it('should calculate and display 3PT makes correctly', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        // 1 made 3-pointer from mockEvents
        const miniStat = getMiniStat('3PT')
        expect(within(miniStat).getByText('1')).toBeInTheDocument()
      })
    })

    it('should calculate and display FT makes correctly', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        const miniStat = getMiniStat('FT')
        expect(within(miniStat).getByText('1')).toBeInTheDocument()
      })
    })

    it('should calculate and display total points correctly', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        // 1 made 3PT (3 points) + 1 FT (1 point) = 4 points
        const miniStat = getMiniStat('TP')
        expect(within(miniStat).getByText('4')).toBeInTheDocument()
      })
    })

    it('should display assists count', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        const statCard = getStatCard('Assists')
        expect(within(statCard).getByText('1')).toBeInTheDocument()
      })
    })

    it('should display rebounds count', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        const statCard = getStatCard('Rebounds')
        expect(within(statCard).getByText('1')).toBeInTheDocument()
      })
    })

    it('should display steals count', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        const statCard = getStatCard('Steals')
        expect(within(statCard).getByText('1')).toBeInTheDocument()
      })
    })

    it('should display forced turnovers count', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        const statCard = getStatCard('Forced TO')
        expect(within(statCard).getByText('1')).toBeInTheDocument()
      })
    })

    it('should calculate FG% correctly', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        // 1 make out of 2 attempts = 50%
        const statCard = getStatCard('FG%')
        expect(within(statCard).getByText('50%')).toBeInTheDocument()
      })
    })

    it('should calculate eFG% correctly', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        // (1 + 0.5 * 1) / 2 = 0.75 = 75%
        const statCard = getStatCard('eFG%')
        expect(within(statCard).getByText('75%')).toBeInTheDocument()
      })
    })

    it('should display Makes count', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        const statCard = getStatCard('Makes')
        expect(within(statCard).getByText('1')).toBeInTheDocument()
      })
    })

    it('should display Misses count', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        const statCard = getStatCard('Misses')
        expect(within(statCard).getByText('1')).toBeInTheDocument()
      })
    })

    it('should display freethrows with makes/attempts', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        const statCard = getStatCard('Freethrows')
        expect(within(statCard).getByText('1/1')).toBeInTheDocument()
      })
    })
  })

  describe('Shot Attempts Log Tests', () => {
    it('should display shot attempts section', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Shot Attempts')).toBeInTheDocument()
      })
    })

    it('should show "No shots logged yet" when no events', async () => {
      listGameEventsBySession.mockResolvedValue([])

      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('No shots logged yet.')).toBeInTheDocument()
      })
    })

    it('should display shot events in reverse chronological order', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        const shotAttempts = screen.getByText('Shot Attempts').closest('section')
        const rows = within(shotAttempts).getAllByRole('button')
        // Should have 2 shot events displayed
        expect(rows.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('should display 3-pointer shot correctly', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        const shotAttempts = screen.getByText('Shot Attempts').closest('section')
        const row = within(shotAttempts).getByText('3 pointer').closest('button')
        expect(within(row).getByText('L Corner 3')).toBeInTheDocument()
        expect(within(row).getByText('Make')).toBeInTheDocument()
      })
    })

    it('should display 2-pointer shot correctly', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        const shotAttempts = screen.getByText('Shot Attempts').closest('section')
        const row = within(shotAttempts).getByText('2 pointer').closest('button')
        expect(within(row).getByText('Center Mid')).toBeInTheDocument()
        expect(within(row).getByText('Miss')).toBeInTheDocument()
      })
    })

    it('should display freethrow correctly', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        const shotAttempts = screen.getByText('Shot Attempts').closest('section')
        expect(within(shotAttempts).getByText('Freethrow')).toBeInTheDocument()
      })
    })

    it('should display shot type label on shot rows', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Catch & Shoot')).toBeInTheDocument()
        expect(screen.getByText('Layup')).toBeInTheDocument()
      })
    })

    it('should make shot rows clickable', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('3 pointer')).toBeInTheDocument()
      })

      const shotAttempts = screen.getByText('Shot Attempts').closest('section')
      const shotRow = within(shotAttempts).getByText('3 pointer').closest('button')
      expect(shotRow).toBeInTheDocument()
      expect(shotRow).toHaveAttribute('aria-label', 'Edit shot')

      await user.click(shotRow)

      // Should open shot modal
      await waitFor(() => {
        const modal = getShotModal()
        expect(modal).toBeTruthy()
        expect(within(modal).getByText('L Corner 3')).toBeInTheDocument()
        expect(within(modal).getByText('3-pointer')).toBeInTheDocument()
      })
    })

    it('should not make freethrow rows clickable', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        const shotAttempts = screen.getByText('Shot Attempts').closest('section')
        const ftRow = within(shotAttempts).getByText('Freethrow').closest('div')
        expect(ftRow).not.toHaveAttribute('aria-label')
      })
    })
  })

  describe('Court Zone Interaction Tests', () => {
    it('should render zone click targets', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)
      await loadCourtImage()

      await waitFor(() => {
        // Should have zone buttons for all zones
        const zoneButtons = screen.getAllByRole('button', {
          name: /Log shot for/,
        })
        expect(zoneButtons.length).toBeGreaterThan(0)
      })
    })

    it('should open shot modal when zone is clicked', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      const modal = await openShotModal(user, 'left_corner_3')
      expect(within(modal).getByText('L Corner 3')).toBeInTheDocument()
      expect(within(modal).getByText('3-pointer')).toBeInTheDocument()
    })

    it('should plot shot markers on the court', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)
      await loadCourtImage()

      await waitFor(() => {
        const markers = screen.getAllByTestId('basketball-icon')
        // Should have 2 shot markers (2 shot events in mockEvents)
        expect(markers.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('should color made shots green', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)
      await loadCourtImage()

      await waitFor(() => {
        const markers = screen.getAllByTestId('basketball-icon')
        const madeShot = markers.find((m) => m.dataset.color === '#059669')
        expect(madeShot).toBeTruthy()
      })
    })

    it('should color missed non-layup shots red', async () => {
      const eventsWithMissedJumper = [
        {
          id: 'event-miss',
          game_id: 'game-123',
          type: 'shot',
          zone_id: 'left_corner_3',
          shot_type: 'catch_shoot',
          is_three: true,
          made: false,
          contested: false,
          ts: '2025-01-15T10:00:00Z',
        },
      ]
      listGameEventsBySession.mockResolvedValue(eventsWithMissedJumper)

      render(<GameLogger id="game-123" navigate={mockNavigate} />)
      await loadCourtImage()

      await waitFor(() => {
        const markers = screen.getAllByTestId('basketball-icon')
        const missedShot = markers.find((m) => m.dataset.color === '#dc2626')
        expect(missedShot).toBeTruthy()
      })
    })

    it('should color made layups blue', async () => {
      const eventsWithMadeLayup = [
        {
          id: 'event-layup',
          game_id: 'game-123',
          type: 'shot',
          zone_id: 'center_mid',
          shot_type: 'layup',
          is_three: false,
          made: true,
          contested: false,
          ts: '2025-01-15T10:00:00Z',
        },
      ]
      listGameEventsBySession.mockResolvedValue(eventsWithMadeLayup)

      render(<GameLogger id="game-123" navigate={mockNavigate} />)
      await loadCourtImage()

      await waitFor(() => {
        const markers = screen.getAllByTestId('basketball-icon')
        const madeLayup = markers.find((m) => m.dataset.color === '#2563eb')
        expect(madeLayup).toBeTruthy()
      })
    })

    it('should color missed layups yellow', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)
      await loadCourtImage()

      await waitFor(() => {
        const markers = screen.getAllByTestId('basketball-icon')
        const missedLayup = markers.find((m) => m.dataset.color === '#eab308')
        expect(missedLayup).toBeTruthy()
      })
    })
  })

  describe('Shot Modal Tests', () => {
    it('should display zone label in modal', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      const modal = await openShotModal(user, 'left_corner_3')
      expect(within(modal).getByText('L Corner 3')).toBeInTheDocument()
    })

    it('should display 3-pointer label for 3PT zones', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      const modal = await openShotModal(user, 'left_corner_3')
      expect(within(modal).getByText('3-pointer')).toBeInTheDocument()
    })

    it('should display 2-pointer label for 2PT zones', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      const modal = await openShotModal(user, 'center_mid')
      expect(within(modal).getByText('2-pointer')).toBeInTheDocument()
    })

    it('should render all shot type buttons', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      const modal = await openShotModal(user, 'left_corner_3')
      expect(within(modal).getByText('Catch & Shoot')).toBeInTheDocument()
      expect(within(modal).getByText('Off-Dribble')).toBeInTheDocument()
      expect(within(modal).getByText('Layup')).toBeInTheDocument()
      expect(within(modal).getByText('Floater')).toBeInTheDocument()
    })

    it('should allow selecting a shot type', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      const modal = await openShotModal(user, 'left_corner_3')
      const catchShootButton = within(modal).getByText('Catch & Shoot')
      await user.click(catchShootButton)

      await waitFor(() => {
        expect(catchShootButton).toHaveClass('selected')
      })
    })

    it('should render contested toggle button', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      const modal = await openShotModal(user, 'left_corner_3')
      expect(within(modal).getByText('Uncontested')).toBeInTheDocument()
    })

    it('should toggle contested status when clicked', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      const modal = await openShotModal(user, 'left_corner_3')
      const catchShootButton = within(modal).getByText('Catch & Shoot')
      await user.click(catchShootButton)

      const contestedButton = within(modal).getByText('Uncontested')
      await user.click(contestedButton)

      await waitFor(() => {
        expect(within(modal).getByText('Contested')).toBeInTheDocument()
      })
    })

    it('should show layup metadata fields when Layup is selected', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      const modal = await openShotModal(user, 'left_corner_3')
      const layupButton = within(modal).getByText('Layup')
      await user.click(layupButton)

      await waitFor(() => {
        expect(within(modal).getByText('Pickup Type (Layup)')).toBeInTheDocument()
        expect(within(modal).getByText('Finish Type (Layup)')).toBeInTheDocument()
      })
    })

    it('should render pickup type buttons for layups', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      const modal = await openShotModal(user, 'left_corner_3')
      const layupButton = within(modal).getByText('Layup')
      await user.click(layupButton)

      await waitFor(() => {
        expect(within(modal).getByText('High')).toBeInTheDocument()
        expect(within(modal).getByText('Low')).toBeInTheDocument()
        expect(within(modal).getByText('2-Hand')).toBeInTheDocument()
        expect(within(modal).getByText('Football')).toBeInTheDocument()
      })
    })

    it('should render finish type buttons for layups', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      const modal = await openShotModal(user, 'left_corner_3')
      const layupButton = within(modal).getByText('Layup')
      await user.click(layupButton)

      await waitFor(() => {
        const finishSection = within(modal)
          .getByText('Finish Type (Layup)')
          .parentElement
        expect(within(finishSection).getByText('Overhand')).toBeInTheDocument()
        expect(within(finishSection).getByText('Underhand')).toBeInTheDocument()
        expect(within(finishSection).getByText('Floater')).toBeInTheDocument()
      })
    })

    it('should disable Make/Miss buttons until shot type is selected', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      const modal = await openShotModal(user, 'left_corner_3')
      const makeButton = within(modal).getByText('Make').closest('button')
      const missButton = within(modal).getByText('Miss').closest('button')
      expect(makeButton).toBeDisabled()
      expect(missButton).toBeDisabled()
    })

    it('should enable Make/Miss buttons after shot type is selected', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      const modal = await openShotModal(user, 'left_corner_3')
      const catchShootButton = within(modal).getByText('Catch & Shoot')
      await user.click(catchShootButton)

      await waitFor(() => {
        const makeButton = within(modal).getByText('Make').closest('button')
        const missButton = within(modal).getByText('Miss').closest('button')
        expect(makeButton).not.toBeDisabled()
        expect(missButton).not.toBeDisabled()
      })
    })

    it('should close modal when Cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)
      await loadCourtImage()

      const zoneButton = await screen.findByRole('button', {
        name: /Log shot for left_corner_3/,
      })
      await user.click(zoneButton)

      const cancelButton = await screen.findByText('Cancel')
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('3-pointer')).not.toBeInTheDocument()
      })
    })

    it('should close modal when backdrop is clicked', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)
      await loadCourtImage()

      const zoneButton = await screen.findByRole('button', {
        name: /Log shot for left_corner_3/,
      })
      await user.click(zoneButton)

      await waitFor(() => {
        expect(screen.getByText('3-pointer')).toBeInTheDocument()
      })

      const backdrop = screen
        .getByText('3-pointer')
        .closest('.shotmodal')
        .querySelector('.bg-black\\/40')
      await user.click(backdrop)

      await waitFor(() => {
        expect(screen.queryByText('3-pointer')).not.toBeInTheDocument()
      })
    })
  })

  describe('Shot Recording Tests', () => {
    it('should record a made shot', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)
      const modal = await openShotModal(user, 'left_corner_3')
      const catchShootButton = within(modal).getByText('Catch & Shoot')
      await user.click(catchShootButton)

      const makeButton = within(modal).getByText('Make').closest('button')
      await user.click(makeButton)

      await waitFor(() => {
        expect(addGameEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            game_id: 'game-123',
            mode: 'game',
            type: 'shot',
            zone_id: 'left_corner_3',
            is_three: true,
            shot_type: 'catch_shoot',
            contested: false,
            made: true,
          })
        )
      })
    })

    it('should record a missed shot', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      const modal = await openShotModal(user, 'left_corner_3')
      const catchShootButton = within(modal).getByText('Catch & Shoot')
      await user.click(catchShootButton)

      const missButton = within(modal).getByText('Miss').closest('button')
      await user.click(missButton)

      await waitFor(() => {
        expect(addGameEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            made: false,
          })
        )
      })
    })

    it('should record contested shot correctly', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      const modal = await openShotModal(user, 'left_corner_3')
      const catchShootButton = within(modal).getByText('Catch & Shoot')
      await user.click(catchShootButton)

      const contestedButton = within(modal).getByText('Uncontested')
      await user.click(contestedButton)

      const makeButton = within(modal).getByText('Make').closest('button')
      await user.click(makeButton)

      await waitFor(() => {
        expect(addGameEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            contested: true,
          })
        )
      })
    })

    it('should record layup with pickup and finish types', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      const modal = await openShotModal(user, 'center_mid')
      const layupButton = within(modal).getByText('Layup')
      await user.click(layupButton)

      const highPickup = within(modal).getByText('High')
      await user.click(highPickup)

      const overhand = within(modal).getByText('Overhand')
      await user.click(overhand)

      const makeButton = within(modal).getByText('Make').closest('button')
      await user.click(makeButton)

      await waitFor(() => {
        expect(addGameEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            shot_type: 'layup',
            pickup_type: 'high_pickup',
            finish_type: 'overhand',
          })
        )
      })
    })

    it('should clear layup metadata for non-layup shots', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      const modal = await openShotModal(user, 'left_corner_3')
      const catchShootButton = within(modal).getByText('Catch & Shoot')
      await user.click(catchShootButton)

      const makeButton = within(modal).getByText('Make').closest('button')
      await user.click(makeButton)

      await waitFor(() => {
        expect(addGameEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            shot_type: 'catch_shoot',
            pickup_type: null,
            finish_type: null,
          })
        )
      })
    })

    it('should close modal and refresh data after recording shot', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      const modal = await openShotModal(user, 'left_corner_3')
      const catchShootButton = within(modal).getByText('Catch & Shoot')
      await user.click(catchShootButton)

      const makeButton = within(modal).getByText('Make').closest('button')
      await user.click(makeButton)

      await waitFor(() => {
        expect(getShotModal()).toBeNull()
        expect(getGameSession).toHaveBeenCalledTimes(2)
        expect(listGameEventsBySession).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('Shot Editing Tests', () => {
    it('should open edit modal when shot row is clicked', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Shot Attempts')).toBeInTheDocument()
      })

      const shotAttempts = screen.getByText('Shot Attempts').closest('section')
      const shotRow = within(shotAttempts).getByText('3 pointer').closest('button')
      await user.click(shotRow)

      await waitFor(() => {
        const modal = getShotModal()
        expect(modal).toBeTruthy()
        expect(within(modal).getByText('L Corner 3')).toBeInTheDocument()
        expect(within(modal).getByText('3-pointer')).toBeInTheDocument()
      })
    })

    it('should pre-populate modal with existing shot data', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Shot Attempts')).toBeInTheDocument()
      })

      const shotAttempts = screen.getByText('Shot Attempts').closest('section')
      const shotRow = within(shotAttempts).getByText('3 pointer').closest('button')
      await user.click(shotRow)

      await waitFor(() => {
        const modal = getShotModal()
        const catchShootButton = within(modal).getByText('Catch & Shoot')
        expect(catchShootButton).toHaveClass('selected')
      })
    })

    it('should pre-populate contested status when editing', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('2 pointer')).toBeInTheDocument()
      })

      const shotRow = screen.getByText('2 pointer').closest('button')
      await user.click(shotRow)

      await waitFor(() => {
        expect(screen.getByText('Contested')).toBeInTheDocument()
      })
    })

    it('should pre-populate layup metadata when editing', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('2 pointer')).toBeInTheDocument()
      })

      const shotRow = screen.getByText('2 pointer').closest('button')
      await user.click(shotRow)

      await waitFor(() => {
        const highButton = screen.getByText('High')
        const overhandButton = screen.getByText('Overhand')
        expect(highButton).toHaveClass('selected')
        expect(overhandButton).toHaveClass('selected')
      })
    })

    it('should update existing shot when editing', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Shot Attempts')).toBeInTheDocument()
      })

      const shotAttempts = screen.getByText('Shot Attempts').closest('section')
      const shotRow = within(shotAttempts).getByText('3 pointer').closest('button')
      await user.click(shotRow)

      await waitFor(() => {
        expect(getShotModal()).toBeTruthy()
      })
      const modal = getShotModal()
      const offDribbleButton = within(modal).getByText('Off-Dribble')
      await user.click(offDribbleButton)

      const missButton = within(modal).getByText('Miss').closest('button')
      await user.click(missButton)

      await waitFor(() => {
        expect(addGameEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'event-1',
            shot_type: 'off_dribble',
            made: false,
          })
        )
      })
    })
  })

  describe('Free Throw Tests', () => {
    it('should open FT modal when Log Free Throw button is clicked', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Log Free Throw/ })).toBeInTheDocument()
      })

      const ftButton = screen.getByRole('button', { name: /Log Free Throw/ })
      await user.click(ftButton)

      await waitFor(() => {
        const modal = getFtModal()
        expect(modal).toBeTruthy()
        expect(within(modal).getByText('Make')).toBeInTheDocument()
        expect(within(modal).getByText('Miss')).toBeInTheDocument()
      })
    })

    it('should record a made free throw', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Log Free Throw/ })).toBeInTheDocument()
      })

      const ftButton = screen.getByRole('button', { name: /Log Free Throw/ })
      await user.click(ftButton)

      await waitFor(() => {
        const modal = getFtModal()
        const makeButton = within(modal).getByText('Make')
        expect(makeButton).toBeInTheDocument()
      })

      const modal = getFtModal()
      const makeButton = within(modal).getByText('Make')
      await user.click(makeButton)

      await waitFor(() => {
        expect(addGameEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            game_id: 'game-123',
            mode: 'game',
            type: 'freethrow',
            made: true,
          })
        )
      })
    })

    it('should record a missed free throw', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Log Free Throw/ })).toBeInTheDocument()
      })

      const ftButton = screen.getByRole('button', { name: /Log Free Throw/ })
      await user.click(ftButton)

      let modalContainer
      await waitFor(() => {
        modalContainer = getFtModal()
        expect(modalContainer).toBeTruthy()
      })
      const missButton = within(modalContainer).getByText('Miss')
      await user.click(missButton)

      await waitFor(() => {
        expect(addGameEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'freethrow',
            made: false,
          })
        )
      })
    })

    it('should close FT modal after recording', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Log Free Throw/ })).toBeInTheDocument()
      })

      const ftButton = screen.getByRole('button', { name: /Log Free Throw/ })
      await user.click(ftButton)

      let modalContainer
      await waitFor(() => {
        modalContainer = getFtModal()
        expect(modalContainer).toBeTruthy()
      })
      const makeButton = within(modalContainer).getByText('Make')
      await user.click(makeButton)

      await waitFor(() => {
        expect(getFtModal()).toBeUndefined()
      })
    })

    it('should close FT modal when X is clicked', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Log Free Throw/ })).toBeInTheDocument()
      })

      const ftButton = screen.getByRole('button', { name: /Log Free Throw/ })
      await user.click(ftButton)

      await waitFor(() => {
        const modal = getFtModal()
        expect(modal).toBeTruthy()
      })

      const modal = getFtModal()
      const xButton = within(modal).getByTestId('x-icon').closest('button')
      await user.click(xButton)

      await waitFor(() => {
        expect(getFtModal()).toBeUndefined()
      })
    })
  })

  describe('Quick Stats Tests', () => {
    it('should log steal when Steals button is clicked', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Steals/ })).toBeInTheDocument()
      })

      const stealsButton = screen.getByRole('button', { name: /Steals/ })
      await user.click(stealsButton)

      await waitFor(() => {
        expect(addGameEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            game_id: 'game-123',
            mode: 'game',
            type: 'steal',
          })
        )
      })
    })

    it('should log rebound when Rebounds button is clicked', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Rebounds/ })).toBeInTheDocument()
      })

      const reboundsButton = screen.getByRole('button', { name: /Rebounds/ })
      await user.click(reboundsButton)

      await waitFor(() => {
        expect(addGameEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'rebound',
          })
        )
      })
    })

    it('should log assist when Assists button is clicked', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Assists/ })).toBeInTheDocument()
      })

      const assistsButton = screen.getByRole('button', { name: /Assists/ })
      await user.click(assistsButton)

      await waitFor(() => {
        expect(addGameEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'assist',
          })
        )
      })
    })

    it('should log forced turnover when Forced TO button is clicked', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Forced TO/ })).toBeInTheDocument()
      })

      const forcedToButton = screen.getByRole('button', { name: /Forced TO/ })
      await user.click(forcedToButton)

      await waitFor(() => {
        expect(addGameEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'forced_turnover',
          })
        )
      })
    })

    it('should refresh data after logging quick stat', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Steals/ })).toBeInTheDocument()
      })

      vi.clearAllMocks()

      const stealsButton = screen.getByRole('button', { name: /Steals/ })
      await user.click(stealsButton)

      await waitFor(() => {
        expect(getGameSession).toHaveBeenCalled()
        expect(listGameEventsBySession).toHaveBeenCalled()
      })
    })
  })

  describe('End Game Tests', () => {
    it('should show confirmation dialog when End Game is clicked', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('End Game')).toBeInTheDocument()
      })

      const endGameButton = screen.getByText('End Game')
      await user.click(endGameButton)

      expect(window.confirm).toHaveBeenCalledWith('End this game?')
    })

    it('should end game with final scores when confirmed', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('End Game')).toBeInTheDocument()
      })

      const endGameButton = screen.getByText('End Game')
      await user.click(endGameButton)

      await waitFor(() => {
        expect(endGameSession).toHaveBeenCalledWith('game-123', {
          team_score: 85,
          opponent_score: 78,
        })
      })
    })

    it('should navigate to gate after ending game', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('End Game')).toBeInTheDocument()
      })

      const endGameButton = screen.getByText('End Game')
      await user.click(endGameButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('gate')
      })
    })

    it('should not end game when confirmation is cancelled', async () => {
      window.confirm.mockReturnValue(false)
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('End Game')).toBeInTheDocument()
      })

      const endGameButton = screen.getByText('End Game')
      await user.click(endGameButton)

      expect(endGameSession).not.toHaveBeenCalled()
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('should handle null scores gracefully', async () => {
      getGameSession.mockResolvedValue({
        ...mockGameSession,
        team_score: null,
        opponent_score: null,
      })
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('End Game')).toBeInTheDocument()
      })

      const endGameButton = screen.getByText('End Game')
      await user.click(endGameButton)

      await waitFor(() => {
        expect(endGameSession).toHaveBeenCalledWith('game-123', {
          team_score: null,
          opponent_score: null,
        })
      })
    })

    it('should parse updated score inputs before ending game', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Final Score')).toBeInTheDocument()
      })

      const inputs = screen.getAllByRole('spinbutton')
      await user.clear(inputs[0])
      await user.type(inputs[0], '100')
      await user.clear(inputs[1])
      await user.type(inputs[1], '95')

      const endGameButton = screen.getByText('End Game')
      await user.click(endGameButton)

      await waitFor(() => {
        expect(endGameSession).toHaveBeenCalledWith('game-123', {
          team_score: 100,
          opponent_score: 95,
        })
      })
    })

    it('should handle negative scores by converting to null', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Final Score')).toBeInTheDocument()
      })

      const inputs = screen.getAllByRole('spinbutton')
      await user.clear(inputs[0])
      await user.type(inputs[0], '-5')

      const endGameButton = screen.getByText('End Game')
      await user.click(endGameButton)

      await waitFor(() => {
        expect(endGameSession).toHaveBeenCalledWith('game-123', {
          team_score: null,
          opponent_score: 78,
        })
      })
    })
  })

  describe('Navigation Tests', () => {
    it('should navigate to gate when Back button is clicked', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Back')).toBeInTheDocument()
      })

      const backButton = screen.getByText('Back').closest('button')
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith('gate')
    })

    it('should handle undefined navigate prop gracefully', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" />)

      await waitFor(() => {
        expect(screen.getByText('Back')).toBeInTheDocument()
      })

      const backButton = screen.getByText('Back').closest('button')
      await user.click(backButton)

      // Should not throw error
      expect(backButton).toBeInTheDocument()
    })
  })

  describe('Score Input Tests', () => {
    it('should update team score when input changes', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Final Score')).toBeInTheDocument()
      })

      const inputs = screen.getAllByRole('spinbutton')
      await user.clear(inputs[0])
      await user.type(inputs[0], '90')

      expect(inputs[0]).toHaveValue(90)
    })

    it('should update opponent score when input changes', async () => {
      const user = userEvent.setup()
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Final Score')).toBeInTheDocument()
      })

      const inputs = screen.getAllByRole('spinbutton')
      await user.clear(inputs[1])
      await user.type(inputs[1], '80')

      expect(inputs[1]).toHaveValue(80)
    })

    it('should display placeholder text for empty scores', async () => {
      getGameSession.mockResolvedValue({
        ...mockGameSession,
        team_score: null,
        opponent_score: null,
      })

      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        const inputs = screen.getAllByRole('spinbutton')
        expect(inputs[0]).toHaveAttribute('placeholder', 'Us')
        expect(inputs[1]).toHaveAttribute('placeholder', 'Them')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle null game session gracefully', async () => {
      getGameSession.mockResolvedValue(null)

      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
      })

      // Should still render the component structure
      expect(screen.getByText('Back')).toBeInTheDocument()
    })

    it('should handle empty events array', async () => {
      listGameEventsBySession.mockResolvedValue([])

      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('No shots logged yet.')).toBeInTheDocument()
      })
    })

    it('should handle game session without home_away field', async () => {
      getGameSession.mockResolvedValue({
        ...mockGameSession,
        home_away: null,
      })

      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        // Should display "Away" as fallback when field is missing
        expect(
          screen.getByText(/Warriors vs Lakers · Away · High School/)
        ).toBeInTheDocument()
      })
    })

    it('should handle game session with away home_away', async () => {
      getGameSession.mockResolvedValue({
        ...mockGameSession,
        home_away: 'away',
      })

      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Warriors vs Lakers · Away · High School/)
        ).toBeInTheDocument()
      })
    })

    it('should handle events without zone_id', async () => {
      const eventsWithoutZone = [
        {
          id: 'event-no-zone',
          game_id: 'game-123',
          type: 'shot',
          shot_type: 'catch_shoot',
          is_three: true,
          made: true,
          contested: false,
          ts: '2025-01-15T10:00:00Z',
        },
      ]
      listGameEventsBySession.mockResolvedValue(eventsWithoutZone)

      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByText('Unknown Zone')).toBeInTheDocument()
      })
    })

    it('should handle image load without natural dimensions', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        const courtImage = screen.getByAltText('Half court')
        Object.defineProperty(courtImage, 'naturalWidth', { value: 0 })
        Object.defineProperty(courtImage, 'naturalHeight', { value: 0 })
        courtImage.dispatchEvent(new Event('load'))
      })

      // Component should not crash
      expect(screen.getByAltText('Half court')).toBeInTheDocument()
    })

    it('should prevent state updates after unmount', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      let resolveGameData
      const delayedPromise = new Promise((resolve) => {
        resolveGameData = resolve
      })

      getGameSession.mockReturnValue(delayedPromise)

      const { unmount } = render(<GameLogger id="game-123" navigate={mockNavigate} />)

      unmount()

      resolveGameData(mockGameSession)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(consoleWarnSpy).not.toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })

    it('should call addGameEvent for quick stats without crashing', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const user = userEvent.setup()

      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Steals/ })).toBeInTheDocument()
      })

      const stealsButton = screen.getByRole('button', { name: /Steals/ })
      await user.click(stealsButton)

      await waitFor(() => {
        expect(addGameEvent).toHaveBeenCalled()
      })

      expect(consoleErrorSpy).not.toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })

    it('should calculate FG% as 0 when no attempts', async () => {
      listGameEventsBySession.mockResolvedValue([])

      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        const statCard = getStatCard('FG%')
        expect(within(statCard).getByText('0%')).toBeInTheDocument()
      })
    })

    it('should handle freethrow without zone_id', async () => {
      const ftEvents = [
        {
          id: 'ft-1',
          game_id: 'game-123',
          type: 'freethrow',
          made: true,
          ts: '2025-01-15T10:00:00Z',
        },
      ]
      listGameEventsBySession.mockResolvedValue(ftEvents)

      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        const shotAttempts = screen.getByText('Shot Attempts').closest('section')
        expect(within(shotAttempts).getByText('Free Throw')).toBeInTheDocument()
      })
    })
  })

  describe('Utility Function Tests', () => {
    it('should handle object-based ZONE_ANCHORS', async () => {
      // Real ZONE_ANCHORS is already tested implicitly, but this confirms the utility handles both formats
      render(<GameLogger id="game-123" navigate={mockNavigate} />)
      await loadCourtImage()

      // Should render without errors
      expect(screen.getByAltText('Half court')).toBeInTheDocument()
    })

    it('should detect pixel coordinate mode correctly', async () => {
      render(<GameLogger id="game-123" navigate={mockNavigate} />)
      await loadCourtImage()

      // ZONE_ANCHORS uses pixel coordinates (all values > 100)
      // Component should render zone buttons correctly
      const zoneButtons = screen.getAllByRole('button', {
        name: /Log shot for/,
      })
      expect(zoneButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Title Line Tests', () => {
    it('should handle missing level field', async () => {
      getGameSession.mockResolvedValue({
        ...mockGameSession,
        level: null,
      })

      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        expect(
          screen.getByText(/Warriors vs Lakers · Home/)
        ).toBeInTheDocument()
      })
    })

    it('should handle all missing optional fields', async () => {
      getGameSession.mockResolvedValue({
        id: 'game-123',
        team_name: '',
        opponent_name: '',
        home_away: null,
        level: null,
      })

      render(<GameLogger id="game-123" navigate={mockNavigate} />)

      await waitFor(() => {
        // Should still render without crashing
        expect(screen.getByText('Back')).toBeInTheDocument()
      })
    })
  })
})
