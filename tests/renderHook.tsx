import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach } from 'vitest';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); });

export function renderHook<T>(hook: () => T, wrap: (children: ReactNode) => ReactNode = children => children) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  let current: T;
  const Probe = () => { current = hook(); return null; };
  const rerender = () => act(() => root.render(wrap(<Probe />)));
  const unmount = () => act(() => { root.unmount(); container.remove(); });
  cleanups.push(unmount);
  rerender();
  return { get current() { return current; }, rerender };
}

export const flush = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
