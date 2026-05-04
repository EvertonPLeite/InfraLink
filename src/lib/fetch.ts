export async function safeFetch(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, options);
    
    const contentType = res.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        // More specific error messages based on status code or content
        let errorMessage = data.message || `Erro ${res.status}: ${res.statusText}`;
        
        if (res.status === 401) {
          errorMessage = 'Sessão expirada ou não autorizada. Por favor, faça login novamente.';
        } else if (res.status === 403) {
          errorMessage = 'Você não tem permissão para realizar esta ação.';
        } else if (res.status === 404) {
          errorMessage = 'O recurso solicitado não foi encontrado no servidor.';
        } else if (res.status >= 500) {
          errorMessage = 'Falha crítica no servidor. Por favor, tente novamente mais tarde.';
        }
        
        throw new Error(errorMessage);
      }
      return data;
    } else {
      const text = await res.text();
      // If it's HTML, it's probably a 404 or 500 error page from the server
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
        throw new Error(`Erro no servidor (Resposta HTML). Status: ${res.status}. Certifique-se de que o servidor está rodando.`);
      }
      return text;
    }
  } catch (err: any) {
    console.error(`Fetch error for ${url}:`, err);
    
    // Check for network errors (specifically when the server is down)
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão ou se o servidor está online.');
    }
    
    throw err;
  }
}
