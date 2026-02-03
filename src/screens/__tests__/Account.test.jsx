// src/screens/__tests__/Account.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Account from '../Account.jsx'

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
})
