// src/screens/__tests__/GameNew.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GameNew from '../GameNew.jsx'

vi.mock('../../lib/game-db', () => ({
  addGameSession: vi.fn(),
}))

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>,
}))

import { addGameSession } from '../../lib/game-db'

const getFieldControl = (labelText) => {
  const label = screen.getByText(labelText)
  const container = label.closest('div')
  return container.querySelector('input, select')
}

describe('GameNew Component', () => {
  let mockNavigate
  let dateNowSpy

  beforeEach(() => {
    mockNavigate = vi.fn()
    addGameSession.mockResolvedValue({ id: 'game-123' })
    dateNowSpy = vi
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-02-03T12:00:00Z').valueOf())
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
    dateNowSpy?.mockRestore()
  })

  it('should render form fields with default values', () => {
    render(<GameNew navigate={mockNavigate} />)

    expect(screen.getByText('New Game')).toBeInTheDocument()
    expect(getFieldControl('Date')).toHaveValue('2026-02-03')
    expect(getFieldControl('Your Team')).toHaveValue('')
    expect(getFieldControl('Opponent')).toHaveValue('')
    expect(getFieldControl('Venue')).toHaveValue('')
    expect(getFieldControl('Level')).toHaveValue('High School')
    expect(getFieldControl('Home/Away')).toHaveValue('Home')
    expect(screen.getByText('Start Game')).toBeInTheDocument()
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

    await user.click(screen.getByText('Start Game'))

    await waitFor(() => {
      expect(addGameSession).toHaveBeenCalledWith({
        date_iso: '2026-02-03',
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
          venue: null,
        })
      )
      expect(mockNavigate).toHaveBeenCalledWith('game-logger', { id: 'game-999' })
    })
  })
})
