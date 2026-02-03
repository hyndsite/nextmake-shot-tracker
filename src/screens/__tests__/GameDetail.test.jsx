// src/screens/__tests__/GameDetail.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GameDetail from '../GameDetail.jsx'

vi.mock('../../lib/game-db', () => ({
  getGameSession: vi.fn(),
  listGameEventsBySession: vi.fn(),
  endGameSession: vi.fn(),
}))

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>,
}))

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
  endGameSession,
} from '../../lib/game-db'

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

describe('GameDetail Component', () => {
  let mockNavigate
  const mockGameSession = {
    id: 'game-123',
    team_name: 'Warriors',
    opponent_name: 'Lakers',
    home_away: 'home',
    level: 'High School',
    team_score: 85,
    opponent_score: 78,
    date_iso: '2025-01-20T00:00:00.000Z',
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
    { id: 'event-4', game_id: 'game-123', type: 'assist' },
    { id: 'event-5', game_id: 'game-123', type: 'rebound' },
    { id: 'event-6', game_id: 'game-123', type: 'steal' },
  ]

  beforeEach(() => {
    mockNavigate = vi.fn()
    getGameSession.mockResolvedValue(mockGameSession)
    listGameEventsBySession.mockResolvedValue(mockEvents)
    endGameSession.mockResolvedValue({
      ...mockGameSession,
      team_score: 90,
      opponent_score: 82,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render header and back button', async () => {
    render(<GameDetail id="game-123" navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument()
      expect(screen.getByText('Back')).toBeInTheDocument()
    })
  })

  it('should render game title and subtitle', async () => {
    const dateSpy = vi
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockReturnValue('Jan 20, 2025')

    render(<GameDetail id="game-123" navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Warriors vs Lakers')).toBeInTheDocument()
      expect(
        screen.getByText('Warriors · Home · High School')
      ).toBeInTheDocument()
      expect(screen.getByText('Jan 20, 2025')).toBeInTheDocument()
    })

    dateSpy.mockRestore()
  })

  it('should render final score inputs and save button disabled by default', async () => {
    render(<GameDetail id="game-123" navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Final Score')).toBeInTheDocument()
    })

    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs[0]).toHaveValue(85)
    expect(inputs[1]).toHaveValue(78)

    const saveButton = screen.getByText('Save').closest('button')
    expect(saveButton).toBeDisabled()
  })

  it('should enable save and persist updated score', async () => {
    const user = userEvent.setup()
    render(<GameDetail id="game-123" navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Final Score')).toBeInTheDocument()
    })

    const inputs = screen.getAllByRole('spinbutton')
    await user.clear(inputs[0])
    await user.type(inputs[0], '90')
    await user.clear(inputs[1])
    await user.type(inputs[1], '82')

    const saveButton = screen.getByText('Save').closest('button')
    expect(saveButton).not.toBeDisabled()

    await user.click(saveButton)

    await waitFor(() => {
      expect(endGameSession).toHaveBeenCalledWith('game-123', {
        team_score: 90,
        opponent_score: 82,
      })
    })
  })

  it('should convert negative or empty scores to null on save', async () => {
    const user = userEvent.setup()
    render(<GameDetail id="game-123" navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Final Score')).toBeInTheDocument()
    })

    const inputs = screen.getAllByRole('spinbutton')
    await user.clear(inputs[0])
    await user.type(inputs[0], '-3')
    await user.clear(inputs[1])

    const saveButton = screen.getByText('Save').closest('button')
    await user.click(saveButton)

    await waitFor(() => {
      expect(endGameSession).toHaveBeenCalledWith('game-123', {
        team_score: null,
        opponent_score: null,
      })
    })
  })

  it('should show an alert when save fails', async () => {
    const user = userEvent.setup()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    endGameSession.mockRejectedValue(new Error('fail'))

    render(<GameDetail id="game-123" navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('Final Score')).toBeInTheDocument()
    })

    const inputs = screen.getAllByRole('spinbutton')
    await user.clear(inputs[0])
    await user.type(inputs[0], '90')
    const saveButton = screen.getByText('Save').closest('button')
    await user.click(saveButton)

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Could not save score on this device.'
      )
      expect(warnSpy).toHaveBeenCalled()
    })

    warnSpy.mockRestore()
    alertSpy.mockRestore()
  })

  it('should render legend rows', async () => {
    render(<GameDetail id="game-123" navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('made shot')).toBeInTheDocument()
      expect(screen.getByText('missed shot')).toBeInTheDocument()
      expect(screen.getByText('made layup')).toBeInTheDocument()
      expect(screen.getByText('missed layup')).toBeInTheDocument()
    })
  })

  it('should render shot markers after image load', async () => {
    render(<GameDetail id="game-123" navigate={mockNavigate} />)
    await loadCourtImage()

    await waitFor(() => {
      expect(screen.getByLabelText('L Corner 3 make')).toBeInTheDocument()
      expect(screen.getByLabelText('Center Mid miss')).toBeInTheDocument()
    })
  })

  it('should render stats from events', async () => {
    render(<GameDetail id="game-123" navigate={mockNavigate} />)

    await waitFor(() => {
      const statsSection = screen.getByText('2PT').closest('section')
      const assistsCard = within(statsSection).getByText('Assists').parentElement
      const reboundsCard = within(statsSection).getByText('Rebounds').parentElement
      const stealsCard = within(statsSection).getByText('Steals').parentElement

      expect(within(assistsCard).getByText('1')).toBeInTheDocument()
      expect(within(reboundsCard).getByText('1')).toBeInTheDocument()
      expect(within(stealsCard).getByText('1')).toBeInTheDocument()
    })
  })

  it('should render shot attempts log in reverse chronological order', async () => {
    render(<GameDetail id="game-123" navigate={mockNavigate} />)

    await waitFor(() => {
      const shotAttempts = screen.getByText('Shot Attempts').closest('section')
      const rows = within(shotAttempts).getAllByText(/pointer/)
      expect(rows[0]).toHaveTextContent('2 pointer')
      expect(rows[1]).toHaveTextContent('3 pointer')
    })
  })

  it('should show empty state when no shots exist', async () => {
    listGameEventsBySession.mockResolvedValue([])

    render(<GameDetail id="game-123" navigate={mockNavigate} />)

    await waitFor(() => {
      expect(screen.getByText('No shots logged yet.')).toBeInTheDocument()
    })
  })
})
