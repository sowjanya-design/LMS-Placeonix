const fs = require('fs');
let code = fs.readFileSync('backend/src/models/Enrollment.js', 'utf8');

// Remove the fee object
code = code.replace(/fee: \{[\s\S]*?\},/, '');
// Remove the virtual
code = code.replace(/enrollmentSchema\.virtual\('isPaidFull'\)\.get\(function \(\) \{[\s\S]*?\}\);/, '');

fs.writeFileSync('backend/src/models/Enrollment.js', code);
