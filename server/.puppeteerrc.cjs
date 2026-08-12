const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer so Chrome is saved inside the server directory on Render
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
