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
      // If it's HTML, it's probably a 404 or 500 error page from the server
      if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
        throw new Error(`Erro no servidor (Resposta HTML). Status: ${res.status}. Verifique se a rota ${url} existe.`);
      }
      return text;
    }
  } catch (err: any) {
    console.error(`Fetch error for ${url}:`, err);
    throw err;
  }
}
