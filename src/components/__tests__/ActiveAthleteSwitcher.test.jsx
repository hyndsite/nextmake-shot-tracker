import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ActiveAthleteSwitcher from '../ActiveAthleteSwitcher.jsx'

describe('ActiveAthleteSwitcher', () => {
  const athletes = [
    { id: 'ath-1', first_name: 'Ava', last_name: 'One', initials: 'AO', avatar_color: '#BFDBFE' },
    { id: 'ath-2', first_name: 'Max', last_name: 'Two', initials: 'MT', avatar_color: '#FBCFE8' },
  ]

  it('renders active athlete label and name', () => {
    render(
      <ActiveAthleteSwitcher
        athletes={athletes}
        activeAthleteId="ath-1"
        onSelectAthlete={() => {}}
      />,
    )

    expect(screen.getByText('Active athlete')).toBeInTheDocument()
    expect(screen.getByText('Ava One')).toBeInTheDocument()
  })

  it('toggles athlete list from switch button', async () => {
    const user = userEvent.setup()
    render(
      <ActiveAthleteSwitcher
        athletes={athletes}
        activeAthleteId="ath-1"
        onSelectAthlete={() => {}}
      />,
    )

    expect(screen.queryByLabelText('Athlete list')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Switch athlete' }))

    expect(screen.getByLabelText('Athlete list')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Max Two' })).toBeInTheDocument()
  })

  it('calls onSelectAthlete and closes list when athlete selected', async () => {
    const user = userEvent.setup()
    const onSelectAthlete = vi.fn()

    render(
      <ActiveAthleteSwitcher
        athletes={athletes}
        activeAthleteId="ath-1"
        onSelectAthlete={onSelectAthlete}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Switch athlete' }))
    await user.click(screen.getByRole('button', { name: 'Max Two' }))

    expect(onSelectAthlete).toHaveBeenCalledWith('ath-2')
    expect(screen.queryByLabelText('Athlete list')).not.toBeInTheDocument()
  })

  it('shows empty athlete text when list is empty', async () => {
    const user = userEvent.setup()

    render(
      <ActiveAthleteSwitcher
        athletes={[]}
        activeAthleteId=""
        onSelectAthlete={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Switch athlete' }))

    expect(screen.getByText('No athlete profiles yet.')).toBeInTheDocument()
  })
})
