/// <reference types="vitest/globals" />
import { render, screen, act } from '@testing-library/react';
import { vi } from 'vitest';
import { Route } from '../../routes/__root';
import { RouterProvider, createRouter, useRouter, useLocation } from '@tanstack/react-router';
import { EnvironmentCreationProvider } from '../../contexts/EnvironmentCreationContext';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Mock @tanstack/react-router
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useRouter: vi.fn(),
    useLocation: vi.fn(),
    useMatch: vi.fn(() => ({ pathname: '/' })),
  };
});

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('Root Route', () => {
  const createTestRouter = (initialPath = '/', searchStr = '') => {
    vi.mocked(useRouter).mockReturnValue({
      state: { location: { pathname: initialPath } },
      navigate: vi.fn(),
    } as never);
    vi.mocked(useLocation).mockReturnValue({ pathname: initialPath, searchStr } as never);

    const router = createRouter({
      routeTree: Route,
      defaultPreload: 'intent',
      defaultStaleTime: 0,
    });
    return router;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset router mocks to their defaults for each test
    vi.mocked(useRouter).mockReturnValue({
      state: { location: { pathname: '/' } },
      navigate: vi.fn(),
    } as never);
    vi.mocked(useLocation).mockReturnValue({ pathname: '/' } as never);
  });

  test('renders Root component without crashing', async () => {
    const router = createTestRouter();
    await act(async () => {
      render(
        <EnvironmentCreationProvider>
          <RouterProvider router={router} />
        </EnvironmentCreationProvider>
      );
    });
    expect(screen.getByText('OPENALICE DATA PLATFORM')).toBeInTheDocument();
    expect(screen.getByText(/Powered by OpenBB/i)).toBeInTheDocument();
  });

  test('exposes only the three normal user intents', async () => {
    const router = createTestRouter('/home');
    await act(async () => {
      render(
        <EnvironmentCreationProvider>
          <RouterProvider router={router} />
        </EnvironmentCreationProvider>
      );
    });

    const navigation = screen.getByRole('navigation', { name: '主导航' });
    const links = Array.from(navigation.querySelectorAll('a'));
    expect(links.map((link) => link.textContent)).toEqual(['首页', '数据源', '环境与扩展']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/home', '/data-sources', '/environment-extensions']);
    expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('group', { name: 'ODP' })).not.toBeInTheDocument();
    for (const legacyLabel of ['查询', '维护', '工作区', '数据目录', 'Backends', 'Environments', 'Extensions', 'Logs']) {
      expect(screen.queryByRole('link', { name: legacyLabel })).not.toBeInTheDocument();
    }
  });

  test('keeps legacy infrastructure deep links reachable without routine tabs', async () => {
    const router = createTestRouter('/backends');
    await act(async () => {
      render(
        <EnvironmentCreationProvider>
          <RouterProvider router={router} />
        </EnvironmentCreationProvider>
      );
    });
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '环境与扩展' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: 'Backends' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '高级设置' })).not.toBeInTheDocument();
  });

  test('maps legacy logs deep links to the combined environment surface', async () => {
    const router = createTestRouter('/backend-logs');
    await act(async () => {
      render(
        <EnvironmentCreationProvider>
          <RouterProvider router={router} />
        </EnvironmentCreationProvider>
      );
    });
    expect(screen.getByRole('link', { name: '环境与扩展' })).toHaveAttribute('aria-current', 'page');
  });

  test('hides navigation links in Setup view', async () => {
    const router = createTestRouter('/setup'); // Explicitly set path
    await act(async () => {
      render(
        <EnvironmentCreationProvider>
          <RouterProvider router={router} />
        </EnvironmentCreationProvider>
      );
    });
    expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument();
  });

  test('hides navigation links in Installation Progress view', async () => {
    const router = createTestRouter('/installation-progress'); // Explicitly set path
    await act(async () => {
      render(
        <EnvironmentCreationProvider>
          <RouterProvider router={router} />
        </EnvironmentCreationProvider>
      );
    });
    expect(screen.queryByRole('navigation', { name: '主导航' })).not.toBeInTheDocument();
  });
});
