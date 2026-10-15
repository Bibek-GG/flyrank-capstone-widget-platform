const http = require('http');

async function testEndpoint(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function run() {
  console.log('--- STARTING PLATFORM SERVERS FOR INTEGRATION CHECK ---');

  // Start Platform API server (Port 4000)
  const app = require('../src/app');
  const db = require('../src/db');
  await db.initializeDatabase();
  const apiServer = app.listen(4000);

  // Start Test Site server (Port 5500)
  const testSiteApp = require('express')();
  const path = require('path');
  const express = require('express');
  testSiteApp.use(express.static(path.join(__dirname, '../public/test-site')));
  testSiteApp.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/test-site/index.html'));
  });
  const testSiteServer = testSiteApp.listen(5500);

  try {
    console.log('1. Testing Platform Health Probe (Port 4000)...');
    const health = await testEndpoint('http://localhost:4000/health');
    console.log(`   Status: ${health.statusCode}, Body: ${health.body}`);
    if (health.statusCode !== 200) throw new Error('Health check failed');

    console.log('2. Testing Versioned Static Asset (Port 4000)...');
    const asset = await testEndpoint('http://localhost:4000/widget.v1.js');
    console.log(`   Status: ${asset.statusCode}, Cache-Control: ${asset.headers['cache-control']}, Type: ${asset.headers['content-type']}`);
    if (asset.statusCode !== 200 || !asset.headers['cache-control'].includes('immutable')) {
      throw new Error('Asset serving failed');
    }

    console.log('3. Testing Separate-Origin Customer Test Site (Port 5500)...');
    const testSite = await testEndpoint('http://localhost:5500/');
    console.log(`   Status: ${testSite.statusCode}, Title check: ${testSite.body.includes('Customer External Website Demo')}`);
    if (testSite.statusCode !== 200 || !testSite.body.includes('Customer External Website Demo')) {
      throw new Error('Test site server failed');
    }

    console.log('4. Testing Public Widget Config with CORS (Origin: http://localhost:5500 -> Port 4000)...');
    const config = await testEndpoint('http://localhost:4000/api/public/widgets/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/config', {
      headers: { 'Origin': 'http://localhost:5500' }
    });
    console.log(`   Status: ${config.statusCode}, CORS Allow-Origin: ${config.headers['access-control-allow-origin']}`);
    if (config.statusCode !== 200 || !config.headers['access-control-allow-origin']) {
      throw new Error('Cross-origin config request failed');
    }

    console.log('5. Testing Cross-Origin Lead Submission (Origin: http://localhost:5500 -> Port 4000)...');
    const postData = JSON.stringify({
      email: 'customer-lead@origin-test.com',
      first_name: 'OriginVerifier'
    });
    const subRes = await testEndpoint('http://localhost:4000/api/public/widgets/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/submissions', {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:5500',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Idempotency-Key': 'idem-test-site-origin-check-1'
      },
      body: postData
    });
    console.log(`   Status: ${subRes.statusCode}, Body: ${subRes.body}`);
    if (subRes.statusCode !== 201) throw new Error('Lead submission failed');

    console.log('6. Testing Owner Dashboard API to verify the lead from Port 5500 is stored & visible...');
    const { getAliceToken } = require('../tests/test-helper');
    const aliceToken = getAliceToken();
    const dashRes = await testEndpoint('http://localhost:4000/api/dashboard/submissions?limit=5', {
      headers: {
        'Authorization': `Bearer ${aliceToken}`
      }
    });
    const dashData = JSON.parse(dashRes.body);
    const found = dashData.submissions.find(s => s.data && s.data.email === 'customer-lead@origin-test.com');
    console.log(`   Dashboard returned ${dashData.submissions.length} submissions. Found lead: ${found ? 'YES (' + found.id + ')' : 'NO'}`);
    if (!found) throw new Error('Lead not visible in dashboard!');

    console.log('--- ALL INTEGRATION & CROSS-ORIGIN CHECKS PASSED SUCCESSFULLY ---');
  } finally {
    apiServer.close();
    testSiteServer.close();
    await db.close();
  }
}

run().catch((err) => {
  console.error('Integration check failed:', err);
  process.exit(1);
});
