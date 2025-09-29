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

// Mock Next.js app router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: jest.fn(),
  notFound: jest.fn(),
  permanentRedirect: jest.fn(),
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));

// Mock styled-components
jest.mock('styled-components', () => {
  const React = require('react');
  const styled = (tag: any) => (strings: any, ...values: any[]) => {
    const StyledComponent = React.forwardRef((props: any, ref: any) => {
      return React.createElement(tag, { ...props, ref });
    });
    StyledComponent.displayName = `Styled(${tag})`;
    return StyledComponent;
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

  const ThemeProvider = ({ children }: any) =>
    React.createElement('div', null, children);
  const css = (...args: any[]) => args;
  const keyframes = (...args: any[]) => args;
  const createGlobalStyle = () => () => null;
  class ServerStyleSheet {
    collectStyles(n: any) { return n; }
    getStyleElement() { return null; }
    seal() {}
  }

  return {
    __esModule: true,
    default: styled,
    ThemeProvider,
    css,
    keyframes,
    createGlobalStyle,
    ServerStyleSheet,
    ...styled,
  };
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
  root: Element | null = null;
  rootMargin: string = '';
  thresholds: ReadonlyArray<number> = [];
  
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Suppress known noisy console messages in tests while preserving real errors
const originalWarn = console.warn;
const originalError = console.error;

// Known noisy React messages that are safe to suppress
const SUPPRESSED_WARNINGS = [
  'Warning: ReactDOM.render is no longer supported',
  'Warning: validateDOMNesting',
  'Warning: Each child in a list should have a unique "key" prop',
  'Warning: Failed prop type:',
];

const SUPPRESSED_ERRORS = [
  'Warning: validateDOMNesting',
  'Warning: Each child in a list should have a unique "key" prop',
  'Warning: Failed prop type:',
];

beforeAll(() => {
  console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string') {
      const message = args[0];
      
      // Only suppress known noisy warnings
      if (SUPPRESSED_WARNINGS.some(pattern => message.includes(pattern))) {
        return;
      }
    }
    
    // Log all other warnings
    originalWarn.call(console, ...args);
  };

  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string') {
      const message = args[0];
      
      // Only suppress known noisy error messages
      if (SUPPRESSED_ERRORS.some(pattern => message.includes(pattern))) {
        return;
      }
    }
    
    // Log all other errors (these are likely real failures)
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});
