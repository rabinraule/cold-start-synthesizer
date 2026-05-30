const fs = require('fs');
const path = require('path');

/**
 * Materializes synthesized memory strings onto physical local desktop structures
 */
exports.exportAssetsToDisk = (rootPath, synthesizedFiles) => {
    // 1. Establish path targets pointing to a dedicated workspace sub-folder
    const targetFolder = path.join(rootPath, 'workspace-distribution');

    try {
        // 2. Safely create directory structures if missing
        if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder, { recursive: true });
        }

        // 3. Write out the multi-variant architecture profiles
        if (synthesizedFiles.dockerCompose) {
            fs.writeFileSync(path.join(targetFolder, 'docker-compose.yml'), synthesizedFiles.dockerCompose, 'utf8');
        }

        if (synthesizedFiles.envExample) {
            fs.writeFileSync(path.join(targetFolder, '.env.example'), synthesizedFiles.envExample, 'utf8');
        }

        if (synthesizedFiles.mockSeeder) {
            // Check content types to append matching standard extension names
            const isSql = synthesizedFiles.mockSeeder.startsWith('--');
            const fileName = isSql ? 'seed.sql' : 'seed.js';
            fs.writeFileSync(path.join(targetFolder, fileName), synthesizedFiles.mockSeeder, 'utf8');
        }

        return {
            success: true,
            outputPath: targetFolder
        };
    } catch (error) {
        throw new Error(`Disk write operational error: ${error.message}`);
    }
};