/// <reference types="vitest/globals" />
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useNavigate } from '@tanstack/react-router';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Route as IndexRoute } from '../../routes/index';
import React from 'react'; // Import React for ComponentType
// Mock @tanstack/react-router
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock @tauri-apps/api/event
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(vi.fn())),
}));
describe('Index Route', () => {
  const IndexComponent = IndexRoute.options.component as React.ComponentType;
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(invoke).mockClear();
    vi.mocked(listen).mockClear();
    localStorage.clear();
  });

  test('displays loading message initially', () => {
    render(<IndexComponent />);
    expect(screen.getByText(/正在启动 OpenAlice Data Platform/i)).toBeInTheDocument();
    expect(screen.getByText(/Checking installation status.../i)).toBeInTheDocument();
  });

  test('redirects to /home if installed via event', async () => {
    const unlistenMock = vi.fn();
    vi.mocked(listen).mockImplementation(async (eventName, handler) => {
      if (eventName === 'installation-status') {
        // Trigger the handler immediately within act
        void await act(async () => {
          handler({ event: 'installation-status', id: 0, payload: true });
          await Promise.resolve(); // flush microtasks if handler is async
        });
      }
      return Promise.resolve(unlistenMock);
    });
    vi.mocked(invoke).mockImplementation((cmd) => {
      if (cmd === 'get_installation_state') {
        return Promise.resolve({ is_installed: true });
      }
      return Promise.resolve(undefined);
    });

    await act(async () => { // Wrap render in act
      render(<IndexComponent />);
      await Promise.resolve(); // Flush microtasks after render
    });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: '/home' }));
    expect(vi.mocked(invoke)).not.toHaveBeenCalledWith('get_installation_state');
  });

  test('redirects to /setup if not installed via event', async () => {
    const unlistenMock = vi.fn();
    vi.mocked(listen).mockImplementation(async (eventName, handler) => {
      if (eventName === 'installation-status') {
        await act(async () => {
          handler({ event: 'installation-status', id: 0, payload: false });
        });
      }
      return Promise.resolve(unlistenMock);
    });
    vi.mocked(invoke).mockImplementation((cmd) => {
      if (cmd === 'get_installation_state') {
        return Promise.resolve({ is_installed: false });
      }
      return Promise.resolve(undefined);
    });

    await act(async () => {
      render(<IndexComponent />);
      await Promise.resolve(); // Flush microtasks if listener resolves during render.
    });

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: '/setup' }));
    expect(vi.mocked(invoke)).not.toHaveBeenCalledWith('get_installation_state');
  });

  test('does not redirect after leaving the loading route', async () => {
    let statusHandler: ((event: { event: string; id: number; payload: boolean }) => void) | undefined;
    const unlistenStatus = vi.fn();
    const unlistenDirectory = vi.fn();

    vi.mocked(listen).mockImplementation(async (eventName, handler) => {
      if (eventName === "installation-status") {
        statusHandler = handler as typeof statusHandler;
        return unlistenStatus;
      }
      return unlistenDirectory;
    });
    vi.useFakeTimers();

    const view = render(<IndexComponent />);
    view.unmount();
    await act(async () => {
      await Promise.resolve();
      statusHandler?.({ event: "installation-status", id: 0, payload: true });
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
    expect(unlistenStatus).toHaveBeenCalled();
    expect(unlistenDirectory).toHaveBeenCalled();
    vi.useRealTimers();
  });

});
