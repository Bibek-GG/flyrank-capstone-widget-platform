const config = require('../config');
const logger = require('../utils/logger');

class GeoProviderB {
  constructor() {
    this.name = 'ipapi';
  }

  /**
   * Lookup geolocation for IP using ipapi.co
   * @param {string} ip 
   * @returns {Promise<{ country: string, region: string, city: string, country_code: string, provider: string }>}
   */
  async lookup(ip) {
    if (config.geoProviderBSimulateFail || process.env.GEO_PROVIDER_B_SIMULATE_FAIL === 'true') {
      throw new Error('[SIMULATED_FAILURE] GeoProviderB (ipapi.co) simulated failure');
    }

    // In automated testing environment, avoid live external network calls
    if (process.env.NODE_ENV === 'test' || config.env === 'test') {
      return {
        country: 'Germany',
        region: 'Bavaria',
        city: 'Munich',
        country_code: 'DE',
        provider: this.name
      };
    }

    const url = `${config.geoProviderBUrl}/${encodeURIComponent(ip)}/json/`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'FlyRank-Widget-Platform/1.0'
        },
        signal: AbortSignal.timeout(config.geoTimeoutMs)
      });

      if (!response.ok) {
        throw new Error(`ipapi.co responded with HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`ipapi.co error: ${data.reason || 'lookup failed'}`);
      }

      return {
        country: data.country_name || 'Unknown',
        region: data.region || 'Unknown',
        city: data.city || 'Unknown',
        country_code: data.country_code || 'XX',
        provider: this.name
      };
    } catch (err) {
      logger.warn(`GeoProviderB lookup failed for IP ${ip}: ${err.message}`);
      throw err;
    }
  }
}

module.exports = new GeoProviderB();
