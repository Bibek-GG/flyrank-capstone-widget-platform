const geoProviderA = require('../integrations/geoProviderA');
const geoProviderB = require('../integrations/geoProviderB');
const { isPrivateOrLoopbackIp } = require('../utils/ip');
const logger = require('../utils/logger');

class GeolocationService {
  constructor() {
    this.providerA = geoProviderA;
    this.providerB = geoProviderB;
  }

  /**
   * Enrich client IP with geolocation data using resilient fallback chain
   * Provider A -> Provider B -> Graceful null
   * @param {string} ip 
   * @returns {Promise<{ country: string, region: string, city: string, country_code: string, provider: string }|null>}
   */
  async enrichIp(ip) {
    if (!ip) {
      return null;
    }

    // Handle localhost / private IP safely without making external calls
    if (isPrivateOrLoopbackIp(ip)) {
      return {
        country: 'Localhost',
        region: 'Local Development',
        city: 'Localhost',
        country_code: 'LOCAL',
        provider: 'loopback'
      };
    }

    // Step 1: Attempt Provider A (ip-api)
    try {
      const geoData = await this.providerA.lookup(ip);
      if (geoData && geoData.country) {
        return geoData;
      }
    } catch (errA) {
      logger.warn(`Provider A failed, initiating fallback to Provider B for IP ${ip}: ${errA.message}`);
    }

    // Step 2: Attempt Provider B (ipapi.co)
    try {
      const geoData = await this.providerB.lookup(ip);
      if (geoData && geoData.country) {
        return geoData;
      }
    } catch (errB) {
      logger.warn(`Provider B also failed for IP ${ip}: ${errB.message}`);
    }

    // Step 3: Graceful fallback - return null without failing the submission
    logger.info(`All geolocation providers failed or timed out for IP ${ip}. Continuing submission without geolocation.`);
    return null;
  }
}

module.exports = new GeolocationService();
