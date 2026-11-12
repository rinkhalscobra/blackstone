import { act } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { renderHook, flush } from './renderHook';

function touch(element: Element, type: string, x = 0, y = 0) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: type === 'touchend' || type === 'touchcancel' ? [] : [{ clientX: x, clientY: y }] });
  act(() => { element.dispatchEvent(event); });
  return event;
}
function mount(onRefresh = vi.fn(async () => undefined)) {
  const result = renderHook(() => null, () => <PullToRefresh onRefresh={onRefresh}><div data-content><div data-scroll-list>Content</div></div></PullToRefresh>);
  const content = document.querySelector<HTMLElement>('[data-content]')!;
  const offset = content.parentElement!;
  return { ...result, onRefresh, content, offset };
}

beforeEach(() => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
});

it('has no idle transform and does not intercept ordinary page scrolling', () => {
  const { content, offset, onRefresh } = mount();
  expect(offset.style.transform).toBe('');
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 400 });
  touch(content, 'touchstart', 10, 100);
  expect(touch(content, 'touchmove', 10, 300).defaultPrevented).toBe(false);
  touch(content, 'touchend');
  expect(offset.style.transform).toBe('');
  expect(onRefresh).not.toHaveBeenCalled();
});

it('leaves horizontal swipes and nested scrolling to the browser', () => {
  const { content, offset, onRefresh } = mount();
  touch(content, 'touchstart', 10, 100);
  expect(touch(content, 'touchmove', 210, 110).defaultPrevented).toBe(false);
  touch(content, 'touchend');
  const list = document.querySelector<HTMLElement>('[data-scroll-list]')!;
  list.scrollTop = 150;
  touch(list, 'touchstart', 10, 100);
  expect(touch(list, 'touchmove', 10, 300).defaultPrevented).toBe(false);
  touch(list, 'touchend');
  expect(offset.style.transform).toBe('');
  expect(onRefresh).not.toHaveBeenCalled();
});

it('refreshes once for an intentional pull at the top and releases its transform afterward', async () => {
  let finish: () => void;
  const onRefresh = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  const { content, offset } = mount(onRefresh);
  touch(content, 'touchstart', 10, 0);
  expect(touch(content, 'touchmove', 10, 200).defaultPrevented).toBe(true);
  expect(offset.style.transform).toBe('translateY(100px)');
  touch(content, 'touchend');
  expect(onRefresh).toHaveBeenCalledTimes(1);
  expect(offset.style.transform).toBe('translateY(60px)');
  touch(content, 'touchstart', 10, 0);
  touch(content, 'touchmove', 10, 200);
  touch(content, 'touchend');
  expect(onRefresh).toHaveBeenCalledTimes(1);
  await act(async () => finish!());
  await flush();
  expect(offset.style.transform).toBe('');
});

it('resets short or cancelled pulls without refreshing', () => {
  const { content, offset, onRefresh } = mount();
  touch(content, 'touchstart', 10, 100);
  touch(content, 'touchmove', 10, 140);
  expect(offset.style.transform).toBe('translateY(20px)');
  touch(content, 'touchend');
  expect(offset.style.transform).toBe('');
  touch(content, 'touchstart', 10, 100);
  touch(content, 'touchmove', 10, 300);
  touch(content, 'touchcancel');
  expect(offset.style.transform).toBe('');
  expect(onRefresh).not.toHaveBeenCalled();
});

it('does not refresh if the page starts scrolling during a gesture', () => {
  const { content, offset, onRefresh } = mount();
  touch(content, 'touchstart', 10, 100);
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 10 });
  expect(touch(content, 'touchmove', 10, 300).defaultPrevented).toBe(false);
  touch(content, 'touchend');
  expect(offset.style.transform).toBe('');
  expect(onRefresh).not.toHaveBeenCalled();
});
