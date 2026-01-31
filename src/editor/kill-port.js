import { execSync } from 'child_process';
import { platform } from 'os';

const PORT = 5173;

try {
  if (platform() === 'win32') {
    try {
      const output = execSync(`netstat -ano | findstr :${PORT}`, { encoding: 'utf-8' });
      const lines = output.trim().split('\n');
      const pidsToKill = new Set();
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const state = parts[parts.length - 2];
        const pid = parts[parts.length - 1];
        
        if (state === 'LISTENING' && pid && !isNaN(pid) && parseInt(pid) > 0) {
          pidsToKill.add(pid);
        }
      }
      
      if (pidsToKill.size > 0) {
        for (const pid of pidsToKill) {
          try {
            execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
          } catch (e) {
          }
        }
        
        execSync('timeout /t 1 /nobreak >nul 2>&1', { shell: true });
      }
    } catch (e) {
    }
  } else {
    try {
      const pid = execSync(`lsof -ti:${PORT}`, { encoding: 'utf-8' }).trim();
      if (pid) {
        execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
        execSync('sleep 1', { stdio: 'ignore' });
      }
    } catch (e) {
    }
  }
} catch (error) {
}
