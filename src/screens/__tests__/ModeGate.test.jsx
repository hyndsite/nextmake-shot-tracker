// src/screens/__tests__/ModeGate.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ModeGate from '../ModeGate.jsx'

vi.mock('lucide-react', () => ({
  Gamepad2: () => <div data-testid="gamepad-icon">Gamepad</div>,
  Brain: () => <div data-testid="brain-icon">Brain</div>,
}))

describe('ModeGate Component', () => {
  it('should render both mode cards with descriptions', () => {
    render(<ModeGate />)

    expect(screen.getByText('Select Mode')).toBeInTheDocument()
    expect(screen.getByText('Game Mode')).toBeInTheDocument()
    expect(screen.getByText('Practice Mode')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Challenge yourself with competitive gameplay and leaderboard rankings.'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Refine your skills in a no-pressure environment with customizable drills.'
      )
    ).toBeInTheDocument()
    expect(screen.getByTestId('gamepad-icon')).toBeInTheDocument()
    expect(screen.getByTestId('brain-icon')).toBeInTheDocument()
  })

  it('should call onSelect with game when the game button is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<ModeGate onSelect={onSelect} />)

    await user.click(screen.getByLabelText('Start Game Mode'))
    expect(onSelect).toHaveBeenCalledWith('game')
  })

  it('should call onSelect with practice when the practice button is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<ModeGate onSelect={onSelect} />)

    await user.click(screen.getByLabelText('Start Practice Mode'))
    expect(onSelect).toHaveBeenCalledWith('practice')
  })
})
