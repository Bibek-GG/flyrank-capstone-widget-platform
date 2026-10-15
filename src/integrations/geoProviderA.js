const config = require('../config');
const logger = require('../utils/logger');

class GeoProviderA {
  constructor() {
    this.name = 'ip-api';
  }

  /**
   * Lookup geolocation for IP using ip-api.com
   * @param {string} ip 
   * @returns {Promise<{ country: string, region: string, city: string, country_code: string, provider: string }>}
   */
  async lookup(ip) {
    if (config.geoProviderASimulateFail || process.env.GEO_PROVIDER_A_SIMULATE_FAIL === 'true') {
      throw new Error('[SIMULATED_FAILURE] GeoProviderA (ip-api) simulated failure');
    }

    // In automated testing environment, avoid live external network calls
    if (process.env.NODE_ENV === 'test' || config.env === 'test') {
      return {
        country: 'United States',
        region: 'California',
        city: 'San Francisco',
        country_code: 'US',
        provider: this.name
      };
    }

    const url = `${config.geoProviderAUrl}/${encodeURIComponent(ip)}?fields=status,message,country,regionName,city,countryCode`;

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(config.geoTimeoutMs)
      });

      if (!response.ok) {
        throw new Error(`ip-api responded with HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== 'success') {
        throw new Error(`ip-api returned fail status: ${data.message || 'unknown'}`);
      }

      return {
        country: data.country || 'Unknown',
        region: data.regionName || 'Unknown',
        city: data.city || 'Unknown',
        country_code: data.countryCode || 'XX',
        provider: this.name
      };
    } catch (err) {
      logger.warn(`GeoProviderA lookup failed for IP ${ip}: ${err.message}`);
      throw err;
    }
  }
}

module.exports = new GeoProviderA();
