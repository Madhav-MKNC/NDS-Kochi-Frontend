// import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from "axios";
import { toast } from 'sonner';

// ============================================================================
// Types & Interfaces (Based on Backend Documentation)
// ============================================================================

// Dynamically fetched using api endpoint /general/constants
export let BHAGAT_NAMES: string[] = [];
export let STATUS_OPTIONS: string[] = [];
export let COORDINATOR_NAME = "";
export let DRIVER_NAME = "";

export const BOOK_NAMES = [
  'gyan ganga (hindi)',
  'gyan ganga (english)',
  'gyan ganga (malayalam)',
  'gyan ganga (tamil)',
  'gyan ganga (kannada)',
  'gyan ganga (bengali)',
  'gyan ganga (assam)',
  'gyan ganga (odia)',
  'gyan ganga (nepali)',
  'jine ki raah (hindi)',
  'jine ki raah (english)',
  'jine ki raah (malayalam)',
  'jine ki raah (tamil)',
  'jine ki raah (kannada)',
  'jine ki raah (bengali)',
  'jine ki raah (assam)',
  'jine ki raah (odia)',
  'jine ki raah (nepali)',
] as const;
export type BookName = typeof BOOK_NAMES[number];

export interface ConstantsResponse {
  coordinator_name: string;
  driver_name: string;
  status: string[];
  assigned_bhagat: string[];
}

// Base interfaces
export interface ApiResponse<T = any> {
  data?: T;
  msg?: string;
  message?: string;
  error?: string;
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: any;
}

// Authentication interfaces
export interface LoginInitRequest {
  username: string; // email
  password: string;
}

export interface LoginInitResponse {
  msg: string;
}

export interface VerifyOtpRequest {
  email: string;
  code: string;
}

export interface VerifyOtpResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  email: string;
  name: string;
}

// Book Seva interfaces
export interface BookSevaBase {
  id: string;
  date: string;
  seva_place: string;
  sevadar_name: string;
  book_name: BookName;
  book_type: string;
  quantity: number;
  coordinator_name: string;
  driver_name: string;
}

export interface BookSevaCreate extends BookSevaBase { }

export interface BookSevaUpdate extends Partial<BookSevaBase> { }

export interface BookSevaRead extends BookSevaBase {
  date_from?: string;
  date_to?: string;
}

// Calling Seva interfaces
export interface CallingSevaBase {
  id: string;
  date: string;
  address: string;
  mobile_no: string;
  status: string;
  assigned_bhagat_name: string;
  remarks?: string;
  wa_message?: string;
}

export interface CallingSevaCreate extends CallingSevaBase { }

export interface CallingSevaUpdate extends Partial<CallingSevaBase> { }

export interface CallingSevaRead extends CallingSevaBase { }

// Expense interfaces
export interface ExpenseBase {
  id: string;
  date: string;
  item_name: string;
  item_price: number;
  quantity: number;
  total_amount: number;
  category: string;
}

export interface ExpenseCreate extends ExpenseBase { }

export interface ExpenseUpdate extends Partial<ExpenseBase> { }

export interface ExpenseRead extends ExpenseBase { }

// Query parameters
export interface QueryParams {
  [key: string]: any;
}

// ============================================================================
// Custom Error Classes
// ============================================================================

export class ApiServiceError extends Error {
  public status: number;
  public code?: string;
  public details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiServiceError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class NetworkError extends ApiServiceError {
  constructor(message: string = 'Network connection failed') {
    super(message, 0, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class ValidationError extends ApiServiceError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiServiceError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiServiceError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApiServiceError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ServerError extends ApiServiceError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'SERVER_ERROR');
    this.name = 'ServerError';
  }
}

// ============================================================================
// Configuration & Constants
// ============================================================================

const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};

const DEFAULT_HEADERS = {
  'Accept': 'application/json',
};

// ============================================================================
// Token Management
// ============================================================================

class TokenManager {
  private static readonly TOKEN_KEY = 'access_token';

  public static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  public static setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  public static removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.TOKEN_KEY);
  }

  public static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      return payload.exp < now;
    } catch {
      return true;
    }
  }
}

// ============================================================================
// Loading State Management
// ============================================================================

class LoadingManager {
  private static loadingStates = new Map<string, boolean>();
  private static listeners = new Set<(states: Record<string, boolean>) => void>();

  public static setLoading(key: string, loading: boolean): void {
    this.loadingStates.set(key, loading);
    this.notifyListeners();
  }

  public static isLoading(key: string): boolean {
    return this.loadingStates.get(key) || false;
  }

  public static subscribe(listener: (states: Record<string, boolean>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private static notifyListeners(): void {
    const states = Object.fromEntries(this.loadingStates);
    this.listeners.forEach(listener => listener(states));
  }
}

// ============================================================================
// Request Queue & Deduplication
// ============================================================================

class RequestQueue {
  private pendingRequests = new Map<string, Promise<any>>();

  private generateKey(config: AxiosRequestConfig): string {
    return `${config.method}-${config.url}-${JSON.stringify(config.params)}-${JSON.stringify(config.data)}`;
  }

  public async deduplicate<T>(config: AxiosRequestConfig, executor: () => Promise<T>): Promise<T> {
    const key = this.generateKey(config);

    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = executor().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

// ============================================================================
// API Client Class
// ============================================================================

class ApiClient {
  private axiosInstance: AxiosInstance;
  private requestQueue = new RequestQueue();

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: DEFAULT_HEADERS,
    });

    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  private setupRequestInterceptor(): void {
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Add authorization header for protected endpoints
        const token = TokenManager.getToken();
        const isAuthEndpoint = config.url === '/auth/login-init' || config.url === '/auth/verify-otp';

        if (token && !TokenManager.isTokenExpired(token) && !isAuthEndpoint) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Set content type based on endpoint
        if (config.url === '/auth/login-init') {
          config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        } else {
          config.headers['Content-Type'] = 'application/json';
        }

        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
            params: config.params,
            data: config.data,
          });
        }

        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  private setupResponseInterceptor(): void {
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API] Response ${response.status}`, response.data);
        }
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors (redirect to login)
        if (error.response?.status === 401 && !originalRequest._retry) {
          TokenManager.removeToken();
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/';
          }
        }

        throw this.handleError(error);
      }
    );
  }

  private handleError(error: any): ApiServiceError {
    if (!error.response) {
      // Network error
      return new NetworkError('Network connection failed. Please check your internet connection.');
    }

    const { status, data } = error.response;
    const message = data?.message || data?.msg || data?.error || 'An unexpected error occurred';

    switch (status) {
      case 400:
        return new ValidationError(message, data?.errors);
      case 401:
        return new AuthenticationError(message);
      case 403:
        return new AuthorizationError(message);
      case 404:
        return new NotFoundError(message);
      case 429:
        return new ApiServiceError('Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
      case 500:
      case 502:
      case 503:
      case 504:
        return new ServerError('Server is currently unavailable. Please try again later.');
      default:
        return new ApiServiceError(message, status);
    }
  }

  private async makeRequest<T>(
    config: AxiosRequestConfig,
    retryCount: number = 0
  ): Promise<T> {
    const loadingKey = `${config.method}-${config.url}`;

    try {
      LoadingManager.setLoading(loadingKey, true);

      return await this.requestQueue.deduplicate(config, async () => {
        try {
          const response: AxiosResponse = await this.axiosInstance(config);

          // Handle different response structures
          if (response.data && typeof response.data === 'object') {
            // If response has data property, return it
            if ('data' in response.data && response.data.data !== undefined) {
              return response.data.data;
            }
            // Otherwise return the whole response data
            return response.data;
          }

          return response.data;
        } catch (error: any) {
          // Retry logic for network errors or 5xx errors
          if (retryCount < API_CONFIG.retryAttempts) {
            const shouldRetry =
              !error.response ||
              error.response.status >= 500;

            if (shouldRetry) {
              const delay = API_CONFIG.retryDelay * Math.pow(2, retryCount);
              await new Promise(resolve => setTimeout(resolve, delay));
              return this.makeRequest<T>(config, retryCount + 1);
            }
          }
          throw error;
        }
      });
    } catch (error: any) {
      const apiError = error instanceof ApiServiceError ? error : this.handleError(error);

      // Show toast notification for errors (except 401 which redirects)
      if (apiError.status !== 401) {
        toast.error(apiError.message);
      }

      throw apiError;
    } finally {
      LoadingManager.setLoading(loadingKey, false);
    }
  }

  // HTTP methods
  public async get<T>(url: string, params?: QueryParams): Promise<T> {
    return this.makeRequest<T>({ method: 'GET', url, params });
  }

  public async post<T>(url: string, data?: any, isFormData = false): Promise<T> {
    const config: AxiosRequestConfig = { method: 'POST', url };

    if (isFormData) {
      // Convert data to URLSearchParams for form-urlencoded
      const formData = new URLSearchParams();
      Object.entries(data || {}).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      config.data = formData;
    } else {
      config.data = data;
    }

    return this.makeRequest<T>(config);
  }

  public async put<T>(url: string, data?: any): Promise<T> {
    return this.makeRequest<T>({ method: 'PUT', url, data });
  }

  public async patch<T>(url: string, data?: any): Promise<T> {
    return this.makeRequest<T>({ method: 'PATCH', url, data });
  }

  public async delete<T>(url: string): Promise<T> {
    return this.makeRequest<T>({ method: 'DELETE', url });
  }
}

// ============================================================================
// API Service Instance
// ============================================================================

const apiClient = new ApiClient();

// ============================================================================
// Authentication API Functions
// ============================================================================

export const authApi = {
  async loginInit(data: LoginInitRequest): Promise<LoginInitResponse> {
    return apiClient.post<LoginInitResponse>('/auth/login-init', data, true); // form-urlencoded
  },

  async verifyOtp(data: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    const response = await apiClient.post<VerifyOtpResponse>('/auth/verify-otp', data);
    if (response.access_token) {
      TokenManager.setToken(response.access_token);
    }
    return response;
  },

  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>('/auth/me');
  },

  async logout(): Promise<{ msg: string }> {
    try {
      const response = await apiClient.post<{ msg: string }>('/auth/logout');
      return response;
    } finally {
      TokenManager.removeToken();
    }
  }
};

// ============================================================================
// Book Seva API Functions
// ============================================================================

export const bookSevaApi = {
  async create(data: BookSevaCreate): Promise<BookSevaRead> {
    try {
      const response = await apiClient.post<BookSevaRead>('/book-seva', data);
      toast.success('Book seva created successfully');
      return response;
    } catch (error) {
      // Reset loading states or buttons here if needed
      throw error;
    }
  },

  async getAll(params?: {
    skip?: number;
    limit?: number;
    from_date?: string;
    to_date?: string;
  }): Promise<BookSevaRead[]> {
    return apiClient.get<BookSevaRead[]>('/book-seva', params);
  },

  async getById(id: string): Promise<BookSevaRead> {
    return apiClient.get<BookSevaRead>(`/book-seva/${id}`);
  },

  async update(id: string, data: BookSevaUpdate): Promise<BookSevaRead> {
    try {
      const response = await apiClient.put<BookSevaRead>(`/book-seva/${id}`, data);
      toast.success('Book seva updated successfully');
      return response;
    } catch (error) {
      // Reset loading states or buttons here if needed
      throw error;
    }
  },

  async delete(id: string): Promise<{ msg: string }> {
    const response = await apiClient.delete<{ msg: string }>(`/book-seva/${id}`);
    toast.success('Book seva deleted successfully');
    return response;
  }
};

// ============================================================================
// Calling Seva API Functions
// ============================================================================

export const callingSevaApi = {
  async create(data: CallingSevaCreate): Promise<CallingSevaRead> {
    try {
      const response = await apiClient.post<CallingSevaRead>('/calling-seva', data);
      toast.success('Calling seva created successfully');
      return response;
    } catch (error) {
      // Reset loading states or buttons here if needed
      throw error;
    }
  },

  async getAll(params?: {
    skip?: number;
    limit?: number;
    status?: string;
  }): Promise<CallingSevaRead[]> {
    return apiClient.get<CallingSevaRead[]>('/calling-seva', params);
  },

  async getById(id: string): Promise<CallingSevaRead> {
    return apiClient.get<CallingSevaRead>(`/calling-seva/${id}`);
  },

  async update(id: string, data: CallingSevaUpdate): Promise<CallingSevaRead> {
    try {
      const response = await apiClient.put<CallingSevaRead>(`/calling-seva/${id}`, data);
      toast.success('Calling seva updated successfully');
      return response;
    } catch (error) {
      // Reset loading states or buttons here if needed
      throw error;
    }
  },

  async delete(id: string): Promise<{ msg: string }> {
    const response = await apiClient.delete<{ msg: string }>(`/calling-seva/${id}`);
    toast.success('Calling seva deleted successfully');
    return response;
  }
};

// ============================================================================
// Expenses API Functions
// ============================================================================

export const expensesApi = {
  async create(data: ExpenseCreate): Promise<ExpenseRead> {
    try {
      const response = await apiClient.post<ExpenseRead>('/expenses', data);
      toast.success('Expense created successfully');
      return response;
    } catch (error) {
      // Reset loading states or buttons here if needed
      throw error;
    }
  },

  async getAll(params?: {
    skip?: number;
    limit?: number;
    from_date?: string;
    to_date?: string;
  }): Promise<ExpenseRead[]> {
    return apiClient.get<ExpenseRead[]>('/expenses', params);
  },

  async getById(id: string): Promise<ExpenseRead> {
    return apiClient.get<ExpenseRead>(`/expenses/${id}`);
  },

  async update(id: string, data: ExpenseUpdate): Promise<ExpenseRead> {
    try {
      const response = await apiClient.put<ExpenseRead>(`/expenses/${id}`, data);
      toast.success('Expenses updated successfully');
      return response;
    } catch (error) {
      // Reset loading states or buttons here if needed
      throw error;
    }
  },

  async delete(id: string): Promise<{ msg: string }> {
    const response = await apiClient.delete<{ msg: string }>(`/expenses/${id}`);
    toast.success('Expense deleted successfully');
    return response;
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

export const apiUtils = {
  // Get loading state for a specific API call
  isLoading: LoadingManager.isLoading,

  // Subscribe to loading state changes
  subscribeToLoadingStates: LoadingManager.subscribe,

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = TokenManager.getToken();
    return token ? !TokenManager.isTokenExpired(token) : false;
  },

  // Get current token
  getToken: TokenManager.getToken,

  // Manual token management
  setToken: TokenManager.setToken,
  removeToken: TokenManager.removeToken,

  // Format API errors for display
  formatError(error: ApiServiceError): string {
    if (error instanceof ValidationError && error.details) {
      return Object.values(error.details).flat().join(', ');
    }
    return error.message;
  },

  // Build query string from params
  buildQueryString(params: QueryParams): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    return searchParams.toString();
  }
};

// ============================================================================
// Export Default API Service
// ============================================================================


export async function fetchConstants(): Promise<ConstantsResponse> {
  const constants = await apiClient.get<ConstantsResponse>('/general/constants');
  BHAGAT_NAMES = constants.assigned_bhagat;
  STATUS_OPTIONS = constants.status;
  COORDINATOR_NAME = constants.coordinator_name;
  DRIVER_NAME = constants.driver_name;
  return constants;
}

const api = {
  auth: authApi,
  bookSeva: bookSevaApi,
  callingSeva: callingSevaApi,
  expenses: expensesApi,
  utils: apiUtils,
};

export default api;
