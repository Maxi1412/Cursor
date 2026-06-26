import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CURSOR_ROOT = join(__dirname, '..', '..');

export interface DeployResult {
  success: boolean;
  output: string;
  error?: string;
  apkPath?: string;
}

function loadConfig(): { georgeProjectPath: string; apkFileName: string; kDrivePath: string } {
  const configPath = join(CURSOR_ROOT, 'george-orchestra.config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  return {
    georgeProjectPath: config.georgeProjectPath,
    apkFileName: config.deploy.apkFileName,
    kDrivePath: config.deploy.googleDrive.fullPath,
  };
}

function runProcess(cmd: string, args: string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const chunks: string[] = [];
    const errChunks: string[] = [];
    const proc = spawn(cmd, args, { cwd, shell: true });
    proc.stdout?.on('data', (d) => chunks.push(d.toString()));
    proc.stderr?.on('data', (d) => errChunks.push(d.toString()));
    proc.on('close', (code) => {
      resolve({ code: code ?? 1, stdout: chunks.join(''), stderr: errChunks.join('') });
    });
  });
}

/**
 * Runs full George v2.19.0 deploy on Windows desktop.
 * Integrate → build APK → copy to local builds + K: Google Drive.
 */
export async function runFullDeploy(): Promise<DeployResult> {
  const config = loadConfig();
  const deployScript = join(CURSOR_ROOT, 'scripts', 'full-deploy.ps1');

  if (!existsSync(deployScript)) {
    return { success: false, output: '', error: `Deploy script not found: ${deployScript}` };
  }

  if (process.platform !== 'win32') {
    return {
      success: false,
      output: '',
      error: `Full deploy requires Windows (current: ${process.platform}). Coordinator must run on your PC.`,
    };
  }

  console.log('[orchestra] Running full deploy (v2.19.0 → K: drive)...');
  const { code, stdout, stderr } = await runProcess(
    'powershell',
    ['-ExecutionPolicy', 'Bypass', '-File', deployScript],
    CURSOR_ROOT
  );

  const output = stdout + stderr;
  const localApk = join(config.georgeProjectPath, 'builds', config.apkFileName);
  const kApk = join(config.kDrivePath, config.apkFileName);

  const success = code === 0 && existsSync(localApk);

  return {
    success,
    output,
    error: success ? undefined : `Deploy exited ${code}. ${stderr.slice(0, 500)}`,
    apkPath: success ? localApk : undefined,
  };
}

export function getExpectedApkPaths(): { local: string; kDrive: string; fileName: string } {
  const config = loadConfig();
  return {
    local: join(config.georgeProjectPath, 'builds', config.apkFileName),
    kDrive: join(config.kDrivePath, config.apkFileName),
    fileName: config.apkFileName,
  };
}
