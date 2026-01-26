/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SignInForm } from '@/components/auth/SignInForm';

// Mock the auth actions
vi.mock('@/lib/auth/actions', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

import { signIn, signUp } from '@/lib/auth/actions';

describe('SignInForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password inputs with sign in button', () => {
    render(<SignInForm />);
    
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows loading state when signing in', async () => {
    vi.mocked(signIn).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<SignInForm />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();
    });
  });

  it('shows error message on sign in failure', async () => {
    vi.mocked(signIn).mockResolvedValue({ success: false, error: 'Invalid credentials' });
    
    render(<SignInForm />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  it('can toggle to sign up mode', () => {
    render(<SignInForm />);
    
    const toggleButton = screen.getByText(/don't have an account/i);
    fireEvent.click(toggleButton);
    
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
  });

  it('shows success state after sign up', async () => {
    vi.mocked(signUp).mockResolvedValue({ success: true });
    
    render(<SignInForm />);
    
    // Switch to sign up mode
    fireEvent.click(screen.getByText(/don't have an account/i));
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/account created/i)).toBeInTheDocument();
      expect(screen.getByText(/check your email to confirm/i)).toBeInTheDocument();
    });
  });

  it('shows error message on sign up failure', async () => {
    vi.mocked(signUp).mockResolvedValue({ success: false, error: 'Email already registered' });
    
    render(<SignInForm />);
    
    // Switch to sign up mode
    fireEvent.click(screen.getByText(/don't have an account/i));
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /create account/i });
    
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
    });
  });
});
