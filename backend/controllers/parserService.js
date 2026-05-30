// const fs = require('fs');
// const path = require('path');

// /**
//  * Searches a file's content for common port patterns or database keywords
//  */
// function analyzeFileContent(filePath) {
//     const results = {
//         detectedPorts: [],
//         detectedDatabases: [],
//         envKeys: []
//     };

//     try {
//         const content = fs.readFileSync(filePath, 'utf8');

//         // 1. Look for environment variable keys (e.g., process.env.SECRET_KEY or os.getenv('KEY'))
//         const envRegex = /(?:process\.env|os\.environ\.get|os\.getenv|config)\.([A-Z0-9_]+)/g;
//         let envMatch;
//         while ((envMatch = envRegex.exec(content)) !== null) {
//             if (envMatch[1] && !results.envKeys.includes(envMatch[1])) {
//                 results.envKeys.push(envMatch[1]);
//             }
//         }

//         // 2. Scan for ports (e.g., PORT = 3000, listen(8080))
//         const portRegex = /(?:PORT|port|ListenPort)\s*=\s*(\d{4,5})|listen\(\s*(\d{4,5})\s*\)/g;
//         let portMatch;
//         while ((portMatch = portRegex.exec(content)) !== null) {
//             const port = portMatch[1] || portMatch[2];
//             if (port && !results.detectedPorts.includes(parseInt(port))) {
//                 results.detectedPorts.push(parseInt(port));
//             }
//         }

//         // 3. Simple keyword check for databases
//         const lowerContent = content.toLowerCase();
//         if (lowerContent.includes('mongoose') || lowerContent.includes('mongodb://')) results.detectedDatabases.push('MongoDB');
//         if (lowerContent.includes('pg-pool') || lowerContent.includes('postgres://') || lowerContent.includes('sequelize')) results.detectedDatabases.push('PostgreSQL');
//         if (lowerContent.includes('redis.createclient') || lowerContent.includes('redis://')) results.detectedDatabases.push('Redis');
//         if (lowerContent.includes('mysql2') || lowerContent.includes('mysql://')) results.detectedDatabases.push('MySQL');

//     } catch (err) {
//         // Skip files that can't be read textually
//     }

//     return results;
// }

// /**
//  * Main deep parser that targets known package/config files
//  */
// exports.parseProjectDependencies = (rootPath) => {
//     const analysis = {
//         techStack: [],
//         databases: [],
//         ports: [5000], // default fallback
//         requiredEnvKeys: ['PORT', 'NODE_ENV']
//     };

//     // Check for Node.js / JavaScript ecosystem
//     const packageJsonPath = path.join(rootPath, 'package.json');
//     if (fs.existsSync(packageJsonPath)) {
//         analysis.techStack.push('Node.js / Express');
//         try {
//             const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
//             const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

//             if (allDeps['mongoose'] || allDeps['mongodb']) analysis.databases.push('MongoDB');
//             if (allDeps['pg'] || allDeps['sequelize']) analysis.databases.push('PostgreSQL');
//             if (allDeps['redis']) analysis.databases.push('Redis');
//             if (allDeps['mysql2']) analysis.databases.push('MySQL');
//         } catch (e) {
//             // Malformed package.json
//         }
//     }

//     // Check for Python ecosystem
//     const reqTextPath = path.join(rootPath, 'requirements.txt');
//     if (fs.existsSync(reqTextPath)) {
//         analysis.techStack.push('Python');
//         const content = fs.readFileSync(reqTextPath, 'utf8').toLowerCase();
//         if (content.includes('pymongo') || content.includes('django-mongodb-engine')) analysis.databases.push('MongoDB');
//         if (content.includes('psycopg2') || content.includes('sqlalchemy')) analysis.databases.push('PostgreSQL');
//         if (content.includes('redis')) analysis.databases.push('Redis');
//         if (content.includes('mysqlclient')) analysis.databases.push('MySQL');
//     }

//     // Deep scan code files up to a limit for environment setups
//     const targetFiles = ['server.js', 'app.js', 'index.js', 'main.py', 'config.js', '.env.example'];
//     targetFiles.forEach(file => {
//         const fullPath = path.join(rootPath, file);
//         if (fs.existsSync(fullPath)) {
//             const fileResults = analyzeFileContent(fullPath);
            
//             fileResults.detectedPorts.forEach(p => { if (!analysis.ports.includes(p)) analysis.ports.push(p); });
//             fileResults.detectedDatabases.forEach(db => { if (!analysis.databases.includes(db)) analysis.databases.push(db); });
//             fileResults.envKeys.forEach(k => { if (!analysis.requiredEnvKeys.includes(k)) analysis.requiredEnvKeys.push(k); });
//         }
//     });

//     // Deduplicate array values
//     analysis.databases = [...new Set(analysis.databases)];
//     if (analysis.databases.length === 0) analysis.databases.push('SQLite (Local File)'); // default fallback

//     return analysis;
// };








const fs = require('fs');
const path = require('path');

/**
 * Recursively inspects a directory for specific language indicators or files,
 * explicitly ignoring heavy development build folders to prevent performance lags.
 */
function findManifestFiles(dirPath, filesFound = { node: [], python: [], java: [] }) {
    const IGNORE_DIRS = new Set(['node_modules', '.git', 'venv', '.venv', 'dist', 'build', 'target', '.idea']);
    let files;
    
    try {
        files = fs.readdirSync(dirPath);
    } catch (err) {
        return filesFound;
    }

    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        let stats;
        try { stats = fs.statSync(fullPath); } catch (err) { continue; }

        if (stats.isDirectory()) {
            if (!IGNORE_DIRS.has(file)) {
                findManifestFiles(fullPath, filesFound);
            }
        } else {
            // Node ecosystem markers
            if (file === 'package.json') filesFound.node.push(fullPath);
            
            // Python ecosystem markers
            if (file === 'requirements.txt' || file === 'Pipfile' || file === 'pyproject.toml') {
                filesFound.python.push(fullPath);
            }
            
            // Java ecosystem markers
            if (file === 'pom.xml' || file === 'build.gradle') {
                filesFound.java.push(fullPath);
            }
        }
    }
    return filesFound;
}

/**
 * Core Polyglot Extraction Module
 */
exports.parseProjectDependencies = (rootPath) => {
    const analysis = {
        techStack: [],
        databases: [],
        ports: [5000], // Default fallback port
        requiredEnvKeys: ['NODE_ENV', 'PORT']
    };

    const manifests = findManifestFiles(rootPath);

    // === 1. NODE.JS / EXPRESS PARSING MATRIX ===
    if (manifests.node.length > 0) {
        analysis.techStack.push("Node.js / Express");
        manifests.node.forEach(p => {
            try {
                const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
                const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
                
                if (allDeps['mongoose'] || allDeps['mongodb']) analysis.databases.push('MongoDB');
                if (allDeps['pg']) analysis.databases.push('PostgreSQL');
                if (allDeps['mysql2'] || allDeps['mysql']) analysis.databases.push('MySQL');
                if (allDeps['redis']) analysis.databases.push('Redis');
            } catch (e) {}
        });
    }

    // === 2. PYTHON ECOSYSTEM PARSING MATRIX ===
    if (manifests.python.length > 0) {
        analysis.techStack.push("Python");
        analysis.requiredEnvKeys = ['PYTHONUNBUFFERED', 'PORT', 'DATABASE_URL'];
        analysis.ports = [8000]; // Default Python port standard

        manifests.python.forEach(p => {
            try {
                const content = fs.readFileSync(p, 'utf8').toLowerCase();

                if (content.includes('fastapi')) analysis.techStack.push('FastAPI');
                if (content.includes('django')) analysis.techStack.push('Django');
                if (content.includes('flask')) analysis.techStack.push('Flask');

                if (content.includes('pymongo') || content.includes('motor')) analysis.databases.push('MongoDB');
                if (content.includes('psycopg2') || content.includes('asyncpg')) analysis.databases.push('PostgreSQL');
                if (content.includes('mysql-connector') || content.includes('pymysql')) analysis.databases.push('MySQL');
                if (content.includes('redis')) analysis.databases.push('Redis');
            } catch (e) {}
        });
    }

    // === 3. JAVA ECOSYSTEM PARSING MATRIX ===
    if (manifests.java.length > 0) {
        analysis.techStack.push("Java");
        analysis.requiredEnvKeys = ['SPRING_PROFILES_ACTIVE', 'SERVER_PORT', 'SPRING_DATASOURCE_URL'];
        analysis.ports = [8080]; // Default Spring Boot port standard

        manifests.java.forEach(p => {
            try {
                const content = fs.readFileSync(p, 'utf8');

                if (content.includes('spring-boot-starter') || content.includes('springboot')) {
                    analysis.techStack.push('Spring Boot');
                }

                if (content.includes('mongodb') || content.includes('mongo')) analysis.databases.push('MongoDB');
                if (content.includes('postgresql') || content.includes('postgres')) analysis.databases.push('PostgreSQL');
                if (content.includes('mysql-connector') || content.includes('mysql')) analysis.databases.push('MySQL');
            } catch (e) {}
        });
    }

    // De-duplicate array entries collected across recursive sub-folder matches
    analysis.techStack = [...new Set(analysis.techStack)];
    analysis.databases = [...new Set(analysis.databases)];

    // Generics fallback handling
    if (analysis.techStack.length === 0) {
        analysis.techStack.push("Generic Static App");
    }
    if (analysis.databases.length === 0) {
        analysis.databases.push("SQLite (Embedded / In-Memory)");
    }

    return analysis;
};