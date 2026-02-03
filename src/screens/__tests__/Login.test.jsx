// src/screens/__tests__/Login.test.jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from '../Login.jsx'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      getSession: vi.fn(),
    },
  },
}))

import { supabase } from '../../lib/supabase'

const createDeferred = () => {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('Login Component', () => {
  beforeEach(() => {
    supabase.auth.signInWithOtp.mockResolvedValue({ error: null })
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render the login form and CTA', () => {
    render(<Login />)

    expect(screen.getByText('Sign in to NextMake')).toBeInTheDocument()
    expect(screen.getByText('Send magic link')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByText('I clicked the link')).toBeInTheDocument()
  })

  it('should send a magic link and clear the email field on success', async () => {
    const user = userEvent.setup()
    render(<Login />)

    const emailInput = screen.getByLabelText('Email')
    await user.type(emailInput, 'player@example.com')
    await user.click(screen.getByText('Send magic link'))

    await waitFor(() => {
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: 'player@example.com',
        options: { emailRedirectTo: `${window.location.origin}/` },
      })
    })

    await waitFor(() => {
      expect(
        screen.getByText('Magic link sent. Check your email, then return here.')
      ).toBeInTheDocument()
    })

    expect(emailInput).toHaveValue('')
  })

  it('should show an error message when sending fails', async () => {
    supabase.auth.signInWithOtp.mockResolvedValue({
      error: { message: 'Invalid email address' },
    })

    const user = userEvent.setup()
    render(<Login />)

    await user.type(screen.getByLabelText('Email'), 'bad@example.com')
    await user.click(screen.getByText('Send magic link'))

    await waitFor(() => {
      const msg = screen.getByText('Invalid email address')
      expect(msg).toBeInTheDocument()
      expect(msg).toHaveClass('text-red-600')
    })
  })

  it('should disable the button and show sending text while request is in flight', async () => {
    const deferred = createDeferred()
    supabase.auth.signInWithOtp.mockReturnValue(deferred.promise)

    const user = userEvent.setup()
    render(<Login />)

    await user.type(screen.getByLabelText('Email'), 'player@example.com')
    await user.click(screen.getByRole('button', { name: 'Send magic link' }))

    expect(
      screen.getByRole('button', { name: 'Sending magic link…' })
    ).toBeDisabled()

    deferred.resolve({ error: null })

    await waitFor(() => {
      expect(
        screen.getByText('Magic link sent. Check your email, then return here.')
      ).toBeInTheDocument()
    })
  })

  it('should call onSuccess when an active session exists', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    })

    const onSuccess = vi.fn()
    const user = userEvent.setup()
    render(<Login onSuccess={onSuccess} />)

    await user.click(screen.getByText('I clicked the link'))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('should show an error message when no session is found', async () => {
    const user = userEvent.setup()
    render(<Login />)

    await user.click(screen.getByText('I clicked the link'))

    await waitFor(() => {
      const msg = screen.getByText(
        'No active session yet. Open the email link, then tap this again.'
      )
      expect(msg).toBeInTheDocument()
      expect(msg).toHaveClass('text-red-600')
    })
  })
})
