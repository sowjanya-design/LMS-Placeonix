const fs = require('fs');
const file = 'frontend/src/lib/types.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /studentProfile\?: \{[\s\S]*?enrollmentId\?: string;[\s\S]*?\};/,
  "studentProfile?: { enrollmentId?: string; resume?: string; skills?: string[]; college?: string; degree?: string; graduationYear?: number; linkedIn?: string; github?: string; portfolio?: string; }; bio?: string;"
);

// Fix the map(s => ...) error in profile/page.tsx
const profileFile = 'frontend/src/app/dashboard/profile/page.tsx';
if (fs.existsSync(profileFile)) {
  let profileCode = fs.readFileSync(profileFile, 'utf8');
  profileCode = profileCode.replace(/s => s\.trim\(\)/g, "(s: string) => s.trim()");
  fs.writeFileSync(profileFile, profileCode);
}

fs.writeFileSync(file, code);
