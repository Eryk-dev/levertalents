import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';

const mockUseAuth = vi.fn();
const mockUseUserProfile = vi.fn();

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/hooks/useUserProfile', () => ({ useUserProfile: () => mockUseUserProfile() }));

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="path">{loc.pathname}</div>;
}

describe('ProtectedRoute (D-23 + Pitfall §4) [INV-3-17]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /first-login-change-password when must_change_password=true', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, userRole: 'liderado', loading: false });
    mockUseUserProfile.mockReturnValue({
      data: { id: 'u1', must_change_password: true, temp_password_expires_at: null },
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/jobs']}>
        <Routes>
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <div>Jobs</div>
              </ProtectedRoute>
            }
          />
          <Route path="/first-login-change-password" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('path')).toHaveTextContent('/first-login-change-password');
  });

  it('does NOT redirect when already on /first-login-change-password (no loop)', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, userRole: 'liderado', loading: false });
    mockUseUserProfile.mockReturnValue({
      data: { id: 'u1', must_change_password: true, temp_password_expires_at: null },
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/first-login-change-password']}>
        <Routes>
          <Route
            path="/first-login-change-password"
            element={
              <ProtectedRoute>
                <div data-testid="page">Card</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('page')).toBeInTheDocument();
  });

  it('renders children when must_change_password=false', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, userRole: 'liderado', loading: false });
    mockUseUserProfile.mockReturnValue({
      data: { id: 'u1', must_change_password: false, temp_password_expires_at: null },
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/jobs']}>
        <Routes>
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <div data-testid="ok">Jobs</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('ok')).toBeInTheDocument();
  });
});
