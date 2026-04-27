import { toast } from 'sonner';

interface FetchOptions extends RequestInit {
  showErrorToast?: boolean;
}

export async function fetchApi<T = any>(url: string, options: FetchOptions = {}): Promise<T> {
  const { showErrorToast = true, ...fetchOptions } = options;
  
  const token = localStorage.getItem('token');
  const headers = new Headers(fetchOptions.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.message || `Erro ${response.status}: Algo deu errado.`;
      
      if (showErrorToast) {
        toast.error('Erro na Operação', {
          description: errorMessage,
          duration: 5000,
        });
      }
      
      throw new Error(errorMessage);
    }

    return data as T;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw error;
    }

    const message = error.message || 'Falha na conexão com o servidor.';
    
    if (showErrorToast && !url.includes('/api/auth/me')) { // Avoid toast for silent auth checks
       toast.error('Erro de Conexão', {
        description: message,
        duration: 5000,
      });
    }

    throw error;
  }
}

export const api = {
  get: <T = any>(url: string, options?: FetchOptions) => fetchApi<T>(url, { ...options, method: 'GET' }),
  post: <T = any>(url: string, body?: any, options?: FetchOptions) => 
    fetchApi<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T = any>(url: string, body?: any, options?: FetchOptions) => 
    fetchApi<T>(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: <T = any>(url: string, options?: FetchOptions) => fetchApi<T>(url, { ...options, method: 'DELETE' }),
};
