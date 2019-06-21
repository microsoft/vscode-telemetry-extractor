import * as os from 'os';
import * as cp from 'child_process';

// Execute the bat file if it's windows else the sh file
if (os.platform() === "win32") {
    cp.execSync('./update-repositories.bat');
} else {
    cp.execSync('./update-repositories.sh');
}