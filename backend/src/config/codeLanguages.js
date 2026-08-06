// Server-side whitelist of languages a CodingChallenge may target. The client
// only ever sends our short `code` (e.g. 'python') — never a raw executor
// language/version string — so a submission can't request an arbitrary
// runtime the executor happens to support but we haven't reviewed.
// Versions pinned to what the public Piston instance (emkc.org) serves as of
// this writing; check GET {PISTON_URL}/runtimes if execution starts failing
// with "language not found" after a Piston update.
module.exports = {
  javascript: { pistonLanguage: 'javascript', version: '18.15.0', label: 'JavaScript (Node 18)' },
  python: { pistonLanguage: 'python', version: '3.10.0', label: 'Python 3.10' },
  java: { pistonLanguage: 'java', version: '15.0.2', label: 'Java 15' },
  cpp: { pistonLanguage: 'cpp', version: '10.2.0', label: 'C++ (GCC 10.2)' },
};
