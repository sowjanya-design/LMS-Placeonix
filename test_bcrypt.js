const bcrypt = require('bcryptjs');
const hash = '$2a$12$yWIDES8gFl.s7Bp3Jo25beXFzjwGSp7Ol.AzJ6tcf/p0pPiQvFHwG';
bcrypt.compare('Password123', hash).then(res => console.log('Match?', res));
