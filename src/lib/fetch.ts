export async function safeFetch(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, options);
    
    const contentType = res.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Erro ${res.status}: ${res.statusText}`);
      }
      return data;
    } else {
      const text = await res.text();
      
      if (!res.ok) {
        throw new Error(text || `Erro ${res.status}: ${res.statusText}`);
      }

      // If it's HTML, the server might have returned an error page
      if (text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html')) {
        // Strip tags for a cleaner error message if it's very short, otherwise show generic message
        const stripped = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
        const shortError = stripped.length < 150 ? stripped : 'O servidor retornou uma página de erro (HTML). Verifique se a API está configurada corretamente.';
        throw new Error(`${shortError} (Status: ${res.status})`);
      }
      return text;
    }
  } catch (err: any) {
    console.error(`Fetch error for ${url}:`, err);
    throw err;
  }
}
