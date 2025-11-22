import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
    // Get latest commit info
    const hash = execSync('git rev-parse --short HEAD').toString().trim();
    const date = execSync('git log -1 --format=%cd --date=format:%Y-%m-%d').toString().trim();
    const time = execSync('git log -1 --format=%cd --date=format:%H:%M').toString().trim();

    const versionInfo = {
        hash,
        date,
        time,
        fullDate: `${date} ${time}`,
        displayShort: hash,
        displayFull: `${hash} • ${date}`,
        displayWithTime: `${hash} • ${date} ${time}`
    };

    // Write to public/version.json
    const versionJsonPath = path.join(__dirname, '../public/version.json');
    fs.writeFileSync(versionJsonPath, JSON.stringify(versionInfo, null, 2));

    console.log(`✓ Version generated: ${versionInfo.displayFull}`);
} catch (error) {
    // Fallback if not in a git repo (e.g., deployed without .git)
    const fallbackVersion = {
        hash: 'unknown',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0].substring(0, 5),
        displayShort: 'dev',
        displayFull: 'dev build',
        displayWithTime: 'dev build'
    };

    const outputPath = path.join(__dirname, '../public/version.json');
    fs.writeFileSync(outputPath, JSON.stringify(fallbackVersion, null, 2));

    console.log('⚠ Not a git repo, using fallback version');
}
