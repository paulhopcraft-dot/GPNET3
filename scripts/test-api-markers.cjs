const http = require('http');

// First login to get cookies
const loginData = JSON.stringify({ email: 'admin@gpnet.local', password: 'test123' });

const loginReq = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
}, (res) => {
  let cookies = res.headers['set-cookie'] || [];
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Login status:', res.statusCode);

    // Now fetch recovery chart for Jacob Gunn case
    const caseId = 'FD-46986';
    const chartReq = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/cases/' + caseId + '/recovery-chart',
      method: 'GET',
      headers: { 'Cookie': cookies.join('; ') }
    }, (chartRes) => {
      let chartBody = '';
      chartRes.on('data', chunk => chartBody += chunk);
      chartRes.on('end', () => {
        try {
          const data = JSON.parse(chartBody);
          console.log('\nCertificate Markers:');
          if (data.certificateMarkers) {
            data.certificateMarkers.forEach((m, i) => {
              console.log('  Marker', i+1, ':', JSON.stringify({
                certificateNumber: m.certificateNumber,
                certificateId: m.certificateId,
                hasDocUrl: Boolean(m.documentUrl),
                docUrlLen: m.documentUrl ? m.documentUrl.length : 0
              }));
            });
          } else {
            console.log('No certificateMarkers in response');
            console.log('Keys:', Object.keys(data));
          }
        } catch (e) {
          console.log('Parse error:', e.message);
          console.log('Response:', chartBody.substring(0, 500));
        }
      });
    });
    chartReq.end();
  });
});
loginReq.write(loginData);
loginReq.end();
