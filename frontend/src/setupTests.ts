// Jest setup file for testing

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    };
  },
}));

// Mock styled-components
jest.mock('styled-components', () => {
  const React = require('react');
  const styled = (tag: any) => (strings: any, ...values: any[]) => {
    return React.forwardRef((props: any, ref: any) => {
      return React.createElement(tag, { ...props, ref });
    });
  };
  
  styled.div = styled('div');
  styled.button = styled('button');
  styled.span = styled('span');
  styled.input = styled('input');
  styled.form = styled('form');
  styled.h1 = styled('h1');
  styled.h2 = styled('h2');
  styled.h3 = styled('h3');
  styled.p = styled('p');
  styled.section = styled('section');
  styled.article = styled('article');
  styled.header = styled('header');
  styled.footer = styled('footer');
  styled.main = styled('main');
  styled.nav = styled('nav');
  styled.aside = styled('aside');
  styled.ul = styled('ul');
  styled.ol = styled('ol');
  styled.li = styled('li');
  styled.a = styled('a');
  styled.img = styled('img');
  styled.svg = styled('svg');
  
  return styled;
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Suppress console warnings in tests
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };

  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('validateDOMNesting'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});
