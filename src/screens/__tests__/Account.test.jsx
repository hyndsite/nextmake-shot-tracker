// src/screens/__tests__/Account.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Account from '../Account.jsx'

vi.mock('../../lib/athlete-db', () => ({
  listAthletes: vi.fn(),
  getActiveAthleteId: vi.fn(),
  addAthlete: vi.fn(),
  replaceAthletes: vi.fn(),
}))
vi.mock('../../lib/athlete-profiles-db', () => ({
  updateAthleteProfile: vi.fn(),
}))

import {
  listAthletes,
  getActiveAthleteId,
  addAthlete,
  replaceAthletes,
} from '../../lib/athlete-db'
import { updateAthleteProfile } from '../../lib/athlete-profiles-db'

const setNavigatorOnline = (value) => {
  Object.defineProperty(window.navigator, 'onLine', {
    value,
    configurable: true,
  })
}

describe('Account Component', () => {
  beforeEach(() => {
    setNavigatorOnline(true)
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
    listAthletes.mockReturnValue([
      { id: 'ath-1', first_name: 'Ava', last_name: 'One', initials: 'AO', avatar_color: '#BFDBFE' },
      { id: 'ath-2', first_name: 'Max', last_name: 'Two', initials: 'MT', avatar_color: '#FBCFE8' },
    ])
    getActiveAthleteId.mockReturnValue('ath-1')
    addAthlete.mockReturnValue({
      id: 'ath-3',
      first_name: 'New',
      last_name: 'Athlete',
      initials: 'NA',
      avatar_color: '#BFDBFE',
    })
    replaceAthletes.mockImplementation(() => {})
    updateAthleteProfile.mockResolvedValue({
      id: 'ath-1',
      first_name: 'Avery',
      last_name: 'Stone',
      initials: 'AS',
      avatar_color: '#A7F3D0',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('should render the account header and sign out button', () => {
    render(<Account onSignOut={vi.fn()} />)

    expect(screen.getByText('Account')).toBeInTheDocument()
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
    expect(
      screen.getByText('All changes sync automatically when online.')
    ).toBeInTheDocument()
  })

  it('should show online status when navigator is online', () => {
    render(<Account onSignOut={vi.fn()} />)

    const status = screen.getByText('Online')
    expect(status).toBeInTheDocument()
    expect(status).toHaveClass('text-green-600')
  })

  it('should toggle offline/online status based on events', () => {
    setNavigatorOnline(false)
    render(<Account onSignOut={vi.fn()} />)

    const offlineStatus = screen.getByText('Offline')
    expect(offlineStatus).toBeInTheDocument()
    expect(offlineStatus).toHaveClass('text-orange-600')

    setNavigatorOnline(true)
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.getByText('Online')).toBeInTheDocument()

    setNavigatorOnline(false)
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('should show a placeholder when there is no last sync', () => {
    render(<Account onSignOut={vi.fn()} />)

    expect(screen.getByText('Last sync: —')).toBeInTheDocument()
  })

  it('should render last sync time from localStorage and update on storage event', () => {
    const initialValue = '2025-01-01T08:00:00.000Z'
    const updatedValue = '2025-01-02T10:30:00.000Z'

    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(initialValue)
    const toLocaleSpy = vi
      .spyOn(Date.prototype, 'toLocaleString')
      .mockReturnValue('Jan 1, 2025, 8:00 AM')

    render(<Account onSignOut={vi.fn()} />)

    expect(screen.getByText('Last sync: Jan 1, 2025, 8:00 AM')).toBeInTheDocument()

    toLocaleSpy.mockReturnValue('Jan 2, 2025, 10:30 AM')
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'nm_last_sync', newValue: updatedValue })
      )
    })

    expect(screen.getByText('Last sync: Jan 2, 2025, 10:30 AM')).toBeInTheDocument()
  })

  it('should call onSignOut when Sign Out is clicked', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    render(<Account onSignOut={onSignOut} />)

    await user.click(screen.getByText('Sign Out'))

    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('should render Profile and Athletes tabs and switch tabs', async () => {
    const user = userEvent.setup()
    render(<Account onSignOut={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Athletes' })).toBeInTheDocument()
    expect(screen.getByText('Sync status:')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Athletes' }))

    expect(screen.getByText('Athlete Profiles')).toBeInTheDocument()
    expect(screen.getByText('Ava One')).toBeInTheDocument()
    expect(screen.getByText('Max Two')).toBeInTheDocument()
  })

  it('should add a new athlete from Athletes tab', async () => {
    const user = userEvent.setup()
    render(<Account onSignOut={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Athletes' }))
    await user.click(screen.getByRole('button', { name: 'Add Athlete' }))

    expect(addAthlete).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Edit New Athlete' })).toBeInTheDocument()
  })

  it('should edit and save athlete name and color', async () => {
    const user = userEvent.setup()
    render(<Account onSignOut={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Athletes' }))
    await user.click(screen.getByRole('button', { name: 'Edit Ava One' }))

    const firstNameInput = screen.getByLabelText('First name')
    const lastNameInput = screen.getByLabelText('Last name')
    const colorInput = screen.getByLabelText('Athlete color')

    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'Avery')
    await user.clear(lastNameInput)
    await user.type(lastNameInput, 'Stone')
    await user.clear(colorInput)
    await user.type(colorInput, '#A7F3D0')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(updateAthleteProfile).toHaveBeenCalledWith('ath-1', {
      firstName: 'Avery',
      lastName: 'Stone',
      avatarColor: '#A7F3D0',
    })
    expect(replaceAthletes).toHaveBeenCalled()
    expect(screen.getByText('Avery Stone')).toBeInTheDocument()
  })
})
