// Fetches the client's public IP addresses (both IPv4 and IPv6 if available)
export const getClientIP = async (): Promise<string | null> => {
  try {
    // Try to get IPv6 first (api64 returns IPv6 if available, IPv4 otherwise)
    const response = await fetch('https://api64.ipify.org?format=json');
    if (!response.ok) {
      console.error('Failed to fetch IP address');
      return null;
    }
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error fetching client IP:', error);
    return null;
  }
};

// Fetches both IPv4 and IPv6 addresses for comprehensive validation
export const getClientIPs = async (): Promise<{ ipv4: string | null; ipv6: string | null }> => {
  const results: { ipv4: string | null; ipv6: string | null } = { ipv4: null, ipv6: null };
  
  try {
    // Fetch both in parallel
    const [ipv4Response, ipv6Response] = await Promise.allSettled([
      fetch('https://api.ipify.org?format=json'),
      fetch('https://api64.ipify.org?format=json')
    ]);
    
    if (ipv4Response.status === 'fulfilled' && ipv4Response.value.ok) {
      const data = await ipv4Response.value.json();
      results.ipv4 = data.ip;
    }
    
    if (ipv6Response.status === 'fulfilled' && ipv6Response.value.ok) {
      const data = await ipv6Response.value.json();
      // api64 may return either IPv4 or IPv6
      const ip = data.ip;
      if (ip && ip.includes(':')) {
        results.ipv6 = ip;
      } else if (!results.ipv4) {
        results.ipv4 = ip;
      }
    }
  } catch (error) {
    console.error('Error fetching client IPs:', error);
  }
  
  return results;
};
