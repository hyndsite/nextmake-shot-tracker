// src/screens/__tests__/GameNew.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
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
    expect(getFieldControl('Level')).toHaveValue('k_12')
    expect(getFieldControl('Grade')).toHaveValue('')
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
    await user.selectOptions(getFieldControl('Level'), 'college')
    await user.selectOptions(getFieldControl('Academic Season'), '2025-26')
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
        level_category: 'college',
        level_grade: null,
        college_season: '2025-26',
        aau_season: null,
        aau_competition_level: null,
        level: 'College · 2025-26',
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
    await user.selectOptions(getFieldControl('Grade'), '1st Grade')
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

  it('should require a detail selection for the chosen level category', async () => {
    const user = userEvent.setup()
    render(<GameNew navigate={mockNavigate} />)

    await user.type(getFieldControl('Your Team'), 'Warriors')
    await user.type(getFieldControl('Opponent'), 'Lakers')
    await user.click(screen.getByText('Start Game'))

    expect(window.alert).toHaveBeenCalledWith('Select a K-12 grade.')

    await user.selectOptions(getFieldControl('Level'), 'aau')
    await user.click(screen.getByText('Start Game'))

    expect(window.alert).toHaveBeenCalledWith('Select an AAU season.')

    await user.selectOptions(getFieldControl('AAU Season'), 'Summer')
    await user.click(screen.getByText('Start Game'))

    expect(window.alert).toHaveBeenCalledWith('Select an AAU competition level.')
  })

  it('should switch the detail dropdown and clear stale values when the level category changes', async () => {
    const user = userEvent.setup()
    render(<GameNew navigate={mockNavigate} />)

    await user.selectOptions(getFieldControl('Grade'), '1st Grade')
    expect(getFieldControl('Grade')).toHaveValue('1st Grade')

    await user.selectOptions(getFieldControl('Level'), 'college')

    expect(screen.queryByText('Grade')).not.toBeInTheDocument()
    expect(getFieldControl('Academic Season')).toHaveValue('')

    await user.selectOptions(getFieldControl('Level'), 'k_12')
    expect(getFieldControl('Grade')).toHaveValue('')
  })

  it('should render the AAU season dropdown when AAU / Travel is selected', async () => {
    const user = userEvent.setup()
    render(<GameNew navigate={mockNavigate} />)

    await user.selectOptions(getFieldControl('Level'), 'aau')

    expect(getFieldControl('AAU Season')).toHaveValue('')
    expect(getFieldControl('Competition Level')).toHaveValue('')
    expect(screen.getByRole('option', { name: 'Winter' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Spring' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Summer' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Fall' })).toBeInTheDocument()
    expect(
      within(getFieldControl('Competition Level')).getByRole('option', { name: 'College' })
    ).toBeInTheDocument()
    expect(
      within(getFieldControl('Competition Level')).getByRole('option', { name: 'Adult' })
    ).toBeInTheDocument()
  })

  it('should submit AAU with season and competition level', async () => {
    const user = userEvent.setup()
    render(<GameNew navigate={mockNavigate} />)

    await user.type(getFieldControl('Your Team'), 'Warriors')
    await user.type(getFieldControl('Opponent'), 'Lakers')
    await user.selectOptions(getFieldControl('Level'), 'aau')
    await user.selectOptions(getFieldControl('AAU Season'), 'Summer')
    await user.selectOptions(getFieldControl('Competition Level'), '7th Grade')
    await user.click(screen.getByText('Start Game'))

    await waitFor(() => {
      expect(addGameSession).toHaveBeenCalledWith(
        expect.objectContaining({
          level_category: 'aau',
          level_grade: null,
          college_season: null,
          aau_season: 'Summer',
          aau_competition_level: '7th Grade',
          level: 'AAU / Travel · Summer · 7th Grade',
        })
      )
    })
  })

  it('should allow Other without a detail selection', async () => {
    const user = userEvent.setup()
    render(<GameNew navigate={mockNavigate} />)

    await user.type(getFieldControl('Your Team'), 'Warriors')
    await user.type(getFieldControl('Opponent'), 'Lakers')
    await user.selectOptions(getFieldControl('Level'), 'other')
    await user.click(screen.getByText('Start Game'))

    await waitFor(() => {
      expect(addGameSession).toHaveBeenCalledWith(
        expect.objectContaining({
          level_category: 'other',
          level_grade: null,
          college_season: null,
          aau_season: null,
          aau_competition_level: null,
          level: 'Other',
        })
      )
    })
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
