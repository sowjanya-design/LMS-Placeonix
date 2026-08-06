const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const LANGUAGES = require('../config/codeLanguages');

// Untrusted user code is NEVER executed in this process or on this host — it
// is always forwarded to an external sandboxed execution service (Piston by
// default: https://github.com/engineer-man/piston, no API key required, MIT
// licensed, self-hostable). Swap providers by changing CODE_EXEC_API_URL —
// this file is the only place that talks to the executor.
const API_URL = process.env.CODE_EXEC_API_URL || 'https://emkc.org/api/v2/piston';
const MAX_CODE_LENGTH = 20000; // characters
const MAX_STDIN_LENGTH = 5000;
const COMPILE_TIMEOUT_MS = 10000;
const RUN_TIMEOUT_MS = Number(process.env.CODE_EXEC_RUN_TIMEOUT_MS) || 8000;

/**
 * Runs `code` in the given whitelisted language against optional stdin.
 * Throws AppError(400) for bad input, AppError(502) if the executor itself
 * is unreachable/erroring — never throws raw fetch/network errors upstream.
 *
 * @returns {{stdout: string, stderr: string, exitCode: number, timedOut: boolean}}
 */
async function executeCode({ language, code, stdin = '' }) {
  const lang = LANGUAGES[language];
  if (!lang) {
    throw new AppError(`Unsupported language '${language}'. Allowed: ${Object.keys(LANGUAGES).join(', ')}`, 400);
  }
  if (typeof code !== 'string' || !code.trim()) {
    throw new AppError('code is required', 400);
  }
  if (code.length > MAX_CODE_LENGTH) {
    throw new AppError(`code exceeds ${MAX_CODE_LENGTH} characters`, 400);
  }
  if (String(stdin).length > MAX_STDIN_LENGTH) {
    throw new AppError(`stdin exceeds ${MAX_STDIN_LENGTH} characters`, 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS + COMPILE_TIMEOUT_MS + 2000);

  let res;
  try {
    res = await fetch(`${API_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        language: lang.pistonLanguage,
        version: lang.version,
        files: [{ content: code }],
        stdin: String(stdin),
        // Hardcoded server-side — never taken from the client, which could
        // otherwise request an unbounded run to exhaust the executor.
        compile_timeout: COMPILE_TIMEOUT_MS,
        run_timeout: RUN_TIMEOUT_MS,
      }),
    });
  } catch (err) {
    logger.error(`Code execution request failed: ${err.message}`);
    throw new AppError('Code execution service is unavailable — try again shortly', 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    logger.error(`Code execution service returned ${res.status}`);
    throw new AppError('Code execution service rejected the request', 502);
  }

  const data = await res.json();
  const run = data.run || {};
  const compile = data.compile;

  // A non-zero compile step means the code never ran — surface it as stderr
  // so the caller (challenge grading, or a student's manual "run") treats it
  // like any other failed run rather than a separate code path.
  if (compile && compile.code !== 0) {
    return { stdout: '', stderr: compile.stderr || compile.output || 'Compilation failed', exitCode: compile.code, timedOut: false };
  }

  return {
    stdout: run.stdout || '',
    stderr: run.stderr || '',
    exitCode: run.code ?? 1,
    timedOut: run.signal === 'SIGKILL',
  };
}

module.exports = { executeCode, LANGUAGES };
