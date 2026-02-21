// src/screens/__tests__/GameNew.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GameNew from '../GameNew.jsx'

vi.mock('../../lib/game-db', () => ({
  addGameSession: vi.fn(),
}))

vi.mock('../../lib/athlete-db', () => ({
  listAthletes: vi.fn(),
  getActiveAthleteId: vi.fn(),
  setActiveAthlete: vi.fn(),
}))

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>,
}))

import { addGameSession } from '../../lib/game-db'
import { listAthletes, getActiveAthleteId, setActiveAthlete } from '../../lib/athlete-db'

const getFieldControl = (labelText) => {
  const label = screen.getByText(labelText)
  const container = label.closest('div')
  return container.querySelector('input, select')
}

describe('GameNew Component', () => {
  let mockNavigate
  const todayISO = () => new Date().toISOString().slice(0, 10)

  beforeEach(() => {
    mockNavigate = vi.fn()
    addGameSession.mockResolvedValue({ id: 'game-123' })
    listAthletes.mockReturnValue([
      { id: 'ath-1', first_name: 'Max', last_name: 'McCarty' },
      { id: 'ath-2', first_name: 'Jane', last_name: 'Doe' },
    ])
    getActiveAthleteId.mockReturnValue('ath-1')
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render form fields with default values', () => {
    render(<GameNew navigate={mockNavigate} />)

    expect(screen.getByText('New Game')).toBeInTheDocument()
    expect(getFieldControl('Athlete')).toHaveValue('ath-1')
    expect(getFieldControl('Date')).toHaveValue(todayISO())
    expect(getFieldControl('Your Team')).toHaveValue('')
    expect(getFieldControl('Opponent')).toHaveValue('')
    expect(getFieldControl('Venue')).toHaveValue('')
    expect(getFieldControl('Level')).toHaveValue('High School')
    expect(getFieldControl('Home/Away')).toHaveValue('Home')
    expect(screen.getByText('Start Game')).toBeInTheDocument()
  })

  it('should render Start Game button below the athlete row as a full-width action', () => {
    render(<GameNew navigate={mockNavigate} />)

    const athleteRow = screen.getByTestId('athlete-start-row')
    const startButton = screen.getByRole('button', { name: 'Start Game' })
    const athleteSelect = getFieldControl('Athlete')

    expect(athleteRow).not.toContainElement(startButton)
    expect(athleteRow).toContainElement(screen.getByText('Athlete'))
    expect(startButton.className).toContain('w-full')
    expect(athleteSelect.className).toContain('w-full')
  })

  it('should navigate back to gate when Back is clicked', async () => {
    const user = userEvent.setup()
    render(<GameNew navigate={mockNavigate} />)

    await user.click(screen.getByText('Back'))

    expect(mockNavigate).toHaveBeenCalledWith('gate')
  })

  it('should validate required fields before saving', async () => {
    const user = userEvent.setup()
    render(<GameNew navigate={mockNavigate} />)

    await user.click(screen.getByText('Start Game'))

    expect(window.alert).toHaveBeenCalledWith('Enter your team.')

    await user.type(getFieldControl('Your Team'), 'Warriors')
    await user.click(screen.getByText('Start Game'))

    expect(window.alert).toHaveBeenCalledWith('Enter the opponent.')
  })

  it('should call addGameSession and navigate to game-logger', async () => {
    const user = userEvent.setup()
    render(<GameNew navigate={mockNavigate} />)

    await user.type(getFieldControl('Your Team'), ' Warriors ')
    await user.type(getFieldControl('Opponent'), ' Lakers ')
    await user.type(getFieldControl('Venue'), ' Main Gym ')
    await user.selectOptions(getFieldControl('Level'), 'Middle School')
    await user.selectOptions(getFieldControl('Home/Away'), 'Away')
    await user.selectOptions(getFieldControl('Athlete'), 'ath-2')
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await user.click(screen.getByText('Start Game'))

    await waitFor(() => {
      expect(setActiveAthlete).toHaveBeenCalledWith('ath-2')
      expect(addGameSession).toHaveBeenCalledWith({
        athlete_id: 'ath-2',
        date_iso: todayISO(),
        team_name: 'Warriors',
        opponent_name: 'Lakers',
        venue: 'Main Gym',
        level: 'Middle School',
        home_away: 'away',
      })
      expect(mockNavigate).toHaveBeenCalledWith('game-logger', { id: 'game-123' })
    })
  })

  it('should pass null venue when empty and show saving state', async () => {
    const user = userEvent.setup()
    let resolveSession
    const pending = new Promise((resolve) => {
      resolveSession = resolve
    })
    addGameSession.mockReturnValue(pending)

    render(<GameNew navigate={mockNavigate} />)

    await user.type(getFieldControl('Your Team'), 'Warriors')
    await user.type(getFieldControl('Opponent'), 'Lakers')
    await user.click(screen.getByText('Start Game'))

    const startButton = screen.getByText('Starting…').closest('button')
    expect(startButton).toBeDisabled()

    resolveSession({ id: 'game-999' })

    await waitFor(() => {
      expect(addGameSession).toHaveBeenCalledWith(
        expect.objectContaining({
          athlete_id: 'ath-1',
          venue: null,
        })
      )
      expect(mockNavigate).toHaveBeenCalledWith('game-logger', { id: 'game-999' })
    })
  })

  it('should block start when no athlete profiles exist', async () => {
    const user = userEvent.setup()
    listAthletes.mockReturnValue([])
    getActiveAthleteId.mockReturnValue(null)

    render(<GameNew navigate={mockNavigate} />)

    await user.type(getFieldControl('Your Team'), 'Warriors')
    await user.type(getFieldControl('Opponent'), 'Lakers')
    await user.click(screen.getByText('Start Game'))

    expect(window.alert).toHaveBeenCalledWith('Select an athlete profile first.')
    expect(addGameSession).not.toHaveBeenCalled()
  })

  it('should ask for confirmation before changing athlete and allow cancel', async () => {
    const user = userEvent.setup()
    render(<GameNew navigate={mockNavigate} />)

    await user.selectOptions(getFieldControl('Athlete'), 'ath-2')

    expect(
      screen.getByText('Switch to Jane Doe for this game?')
    ).toBeInTheDocument()
    expect(getFieldControl('Athlete')).toHaveValue('ath-1')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(
      screen.queryByText('Switch to Jane Doe for this game?')
    ).not.toBeInTheDocument()
    expect(getFieldControl('Athlete')).toHaveValue('ath-1')
    expect(setActiveAthlete).not.toHaveBeenCalledWith('ath-2')
  })
})
