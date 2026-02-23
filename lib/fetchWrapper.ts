const fetchWrapper = async (...args: Parameters<typeof fetch>): Promise<Response | undefined> => {
  try {
    const response = await fetch(...args);

    // if backend sent a redirect
    if (response.redirected) {
      window.location.href = response.url;
      return;
    }

    // For API routes (JSON endpoints), always return the response
    // so callers can handle errors themselves (including 4xx and 5xx)
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';
    if (url.includes('/api/')) {
      return response;
    }

    if (response.status == 404) {
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/html")) {
        const html = await response.text();
        document.open();
        document.write(html);
        document.close();
        return;
      } else {
        console.error("Backend returned Endpoint Not Found.");
        return response;
      }
    } else if (response.status >= 500) {
      console.error("Backend error:", response.status, response.statusText);
      return response;
    }

    return response;
  } catch (error) {
    console.error("Network error in fetchWrapper:", error);
    throw error;
  }
};

export default fetchWrapper;
