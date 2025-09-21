/**
 * Jest-friendly Axios mock that supports axios.create(...) and verb methods.
 */
import type { AxiosInstance } from 'axios';

// Jest type declarations for this mock file
declare const jest: any;

// Per-instance verb stubs
const instanceMethods = {
  get:    jest.fn(),
  post:   jest.fn(),
  put:    jest.fn(),
  patch:  jest.fn(),
  delete: jest.fn(),
  request: jest.fn(),
};

// Interceptor stubs
const interceptors = {
  request: { use: jest.fn(), eject: jest.fn() },
  response: { use: jest.fn(), eject: jest.fn() },
};

export const mockAxiosInstance = {
  ...instanceMethods,
  interceptors,
  defaults: {} as any,
} as unknown as AxiosInstance;

// Default export that mimics the axios module
const mockAxios: any = {
  ...instanceMethods,
  interceptors,
  defaults: {} as any,
  create: jest.fn(() => mockAxiosInstance),
  isAxiosError: (e: any) => !!e?.isAxiosError,
};

export { mockAxios };
export default mockAxios;