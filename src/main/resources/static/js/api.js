/**
 * CAREVISTA HOSPITAL MANAGEMENT SAAS
 * API Client Module - Robust REST Client with standard error handling
 */

const Api = (function () {
  'use strict';

  async function request(endpoint, options = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    };

    try {
      const response = await fetch(endpoint, config);
      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        let errorMsg = 'An error occurred during the request.';
        if (typeof data === 'object' && data !== null) {
          errorMsg = data.message || data.error || errorMsg;
        } else if (typeof data === 'string' && data.length > 0) {
          errorMsg = data;
        }
        return {
          ok: false,
          success: false,
          status: response.status,
          message: errorMsg,
          data: null
        };
      }

      return {
        ok: true,
        success: true,
        status: response.status,
        message: data.message || 'Success',
        data: data.data !== undefined ? data.data : data
      };
    } catch (networkError) {
      console.error('CareVista Network Error:', networkError);
      return {
        ok: false,
        success: false,
        status: 0,
        message: 'Unable to connect to CareVista server. Please verify your connection.',
        data: null
      };
    }
  }

  return {
    get: (endpoint) => request(endpoint, { method: 'GET' }),
    post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (endpoint) => request(endpoint, { method: 'DELETE' })
  };
})();

if (typeof window !== 'undefined') {
  window.Api = Api;
  window.api = Api;
}
