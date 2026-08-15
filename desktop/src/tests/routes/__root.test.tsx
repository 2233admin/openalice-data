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
  const createTestRouter = (initialPath = '/') => {
    vi.mocked(useRouter).mockReturnValue({
      state: { location: { pathname: initialPath } },
      navigate: vi.fn(),
    } as never);
    vi.mocked(useLocation).mockReturnValue({ pathname: initialPath } as never);

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

  test('exposes the normal user intents without hiding infrastructure capabilities', async () => {
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
    expect(links.map((link) => link.textContent)).toEqual(['首页', '工作区', '数据源', '查询', '扩展', '日志']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/home', '/workspaces', '/data-sources', '/query', '/extensions', '/diagnostics']);
    expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute('aria-current', 'page');
    for (const infrastructureLabel of ['服务', '运行环境', 'API 凭证', '数据目录']) {
      expect(screen.queryByRole('link', { name: infrastructureLabel })).not.toBeInTheDocument();
    }
  });

  test('keeps an infrastructure deep link reachable without making it a routine tab', async () => {
    const router = createTestRouter('/backends');
    await act(async () => {
      render(
        <EnvironmentCreationProvider>
          <RouterProvider router={router} />
        </EnvironmentCreationProvider>
      );
    });
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '高级设置' })).not.toBeInTheDocument();
  });


  test('keeps navigation visible in Jupyter logs view', async () => {
    const router = createTestRouter('/jupyter-logs');
    await act(async () => {
      render(
        <EnvironmentCreationProvider>
          <RouterProvider router={router} />
        </EnvironmentCreationProvider>
      );
    });
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '日志' })).toHaveAttribute('aria-current', 'page');
  });

  test('keeps navigation visible in Backend logs view', async () => {
    const router = createTestRouter('/backend-logs');
    await act(async () => {
      render(
        <EnvironmentCreationProvider>
          <RouterProvider router={router} />
        </EnvironmentCreationProvider>
      );
    });
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '日志' })).toHaveAttribute('aria-current', 'page');
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
