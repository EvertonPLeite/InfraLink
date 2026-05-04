export async function safeFetch(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, options);
    
    // Handle 401 Unauthorized globally if needed (e.g. redirect to login)
    if (res.status === 401 && !url.includes('/auth/login')) {
       // Optional: clear local storage or handle session expiry
       console.warn('Session expired or unauthorized');
    }

    const contentType = res.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        // Map common status codes to friendly Portuguese messages
        let message = data.message || `Erro ${res.status}`;
        
        switch (res.status) {
          case 400: message = data.message || 'Dados inválidos. Verifique os campos e tente novamente.'; break;
          case 401: message = 'Sessão expirada ou não autorizado. Por favor, faça login novamente.'; break;
          case 403: message = 'Você não tem permissão para realizar esta ação.'; break;
          case 404: message = 'O recurso solicitado não foi encontrado.'; break;
          case 429: message = 'Muitas solicitações. Tente novamente em alguns instantes.'; break;
          case 500: message = 'Erro interno no servidor. Nossa equipe já foi notificada.'; break;
          case 503: message = 'O serviço está temporariamente indisponível. Tente novamente mais tarde.'; break;
        }

        const error = new Error(message);
        (error as any).status = res.status;
        (error as any).data = data;
        throw error;
      }
      return data;
    } else {
      const text = await res.text();
      if (res.ok) return text;

      // If it's HTML, it's probably a 404 or 500 error page from the server
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
        throw new Error(`Erro inesperado no servidor (${res.status}). Por favor, tente novamente.`);
      }
      throw new Error(text || `Erro ${res.status}: ${res.statusText}`);
    }
  } catch (err: any) {
    // Network errors
    if (err.message === 'Failed to fetch') {
      throw new Error('Falha na conexão com o servidor. Verifique sua internet.');
    }
    console.error(`Fetch error for ${url}:`, err);
    throw err;
  }
}
