import { execSync } from 'child_process';
import { platform } from 'os';

const PORT = 5173;

console.log(`Checking for processes on port ${PORT}...`);

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
          console.log(`Found process ${pid} listening on port ${PORT}, killing it...`);
          try {
            execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
            console.log(`Process ${pid} terminated`);
          } catch (e) {
          }
        }
        
        execSync('timeout /t 1 /nobreak >nul 2>&1', { shell: true });
        console.log(`Port ${PORT} is now free`);
      } else {
        console.log(`Port ${PORT} is already free`);
      }
    } catch (e) {
      console.log(`Port ${PORT} is already free`);
    }
  } else {
    try {
      const pid = execSync(`lsof -ti:${PORT}`, { encoding: 'utf-8' }).trim();
      if (pid) {
        console.log(`Found process ${pid} on port ${PORT}, killing it...`);
        execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
        execSync('sleep 1', { stdio: 'ignore' });
        console.log(`Port ${PORT} is now free`);
      }
    } catch (e) {
      console.log(`Port ${PORT} is already free`);
    }
  }
} catch (error) {
  console.log(`Port ${PORT} check completed`);
}
