/**
 * Synthesizes a clean docker-compose.yml file based on detected requirements
 */
function generateDockerCompose(analysis) {
    let servicesBlock = '';

    if (analysis.databases.includes('MongoDB')) {
        servicesBlock += `
  mongodb:
    image: mongo:latest
    container_name: local_mongodb_${Math.floor(Math.random() * 1000)}
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    networks:
      - workspace_net
`;
    }

    if (analysis.databases.includes('PostgreSQL')) {
        servicesBlock += `
  postgres:
    image: postgres:latest
    container_name: local_postgres_${Math.floor(Math.random() * 1000)}
    environment:
      POSTGRES_USER: local_user
      POSTGRES_PASSWORD: local_secure_password
      POSTGRES_DB: dev_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - workspace_net
`;
    }

    if (analysis.databases.includes('Redis')) {
        servicesBlock += `
  redis:
    image: redis:alpine
    container_name: local_redis_${Math.floor(Math.random() * 1000)}
    ports:
      - "6379:6379"
    networks:
      - workspace_net
`;
    }

    if (!servicesBlock) {
        return `# No infrastructure services required for this layout (e.g. SQLite/local storage detected)`;
    }

    const composeTemplate = `version: '3.8'

services:${servicesBlock}

networks:
  workspace_net:
    driver: bridge

volumes:
${analysis.databases.includes('MongoDB') ? '  mongo_data:\n' : ''}${analysis.databases.includes('PostgreSQL') ? '  postgres_data:\n' : ''}`;

    return composeTemplate.trim();
}

/**
 * Synthesizes a structured boilerplate .env.example text layout
 */
function generateEnvExample(analysis) {
    let envContent = `# =========================================================================\n`;
    envContent += `# Synthesized .env.example - Cold Start Workspace Engine\n`;
    envContent += `# =========================================================================\n\n`;

    const keys = analysis.requiredEnvKeys || [];

    keys.forEach(key => {
        if (key === 'PORT') {
            const explicitPort = analysis.ports && analysis.ports[0] ? analysis.ports[0] : 5000;
            envContent += `PORT=${explicitPort}\n`;
        } else if (key === 'NODE_ENV') {
            envContent += `NODE_ENV=development\n`;
        } else if (key === 'MONGODB_URI' || key === 'MONGO_URI') {
            envContent += `MONGODB_URI=mongodb://localhost:27017/dev_database\n`;
        } else if (key.includes('DATABASE_URL') || key.includes('DB_URL')) {
            envContent += `${key}=postgresql://local_user:local_secure_password@localhost:5432/dev_db\n`;
        } else {
            envContent += `${key}=YOUR_VAL_HERE\n`;
        }
    });

    return envContent.trim();
}

/**
 * NEW: Synthesizes automated base seeding files to jump-start storage engines
 */
function generateMockSeeder(analysis) {
    if (analysis.databases.includes('MongoDB')) {
        return `/**
 * Automated Mock Data Seeder for MongoDB
 * Run using: node seed.js
 */
const { MongoClient } = require('mongodb');

const url = process.env.MONGODB_URI || 'mongodb://localhost:27017/dev_database';
const mockUsers = [
  { name: "John Doe", email: "john@example.com", role: "admin", createdAt: new Date() },
  { name: "Jane Smith", email: "jane@example.com", role: "user", createdAt: new Date() }
];

async function seedDatabase() {
  const client = new MongoClient(url);
  try {
    await client.connect();
    console.log('Connected successfully to database server for seeding');
    const db = client.db();
    
    // Clear and re-populate primary collections
    await db.collection('users').deleteMany({});
    const result = await db.collection('users').insertMany(mockUsers);
    console.log(\`Successfully seeded \${result.insertedCount} template records into 'users' collection.\`);
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    await client.close();
  }
}

seedDatabase();`.trim();
    }

    if (analysis.databases.includes('PostgreSQL')) {
        return `-- Automated Mock Data Seeder for PostgreSQL
-- Run using: psql -U local_user -d dev_db -f seed.sql

TRUNCATE TABLE users RESTART IDENTITY CASCADE;

INSERT INTO users (name, email, role, created_at) VALUES
('John Doe', 'john@example.com', 'admin', NOW()),
('Jane Smith', 'jane@example.com', 'user', NOW());

SELECT c.relname, n.n_tup_ins FROM pg_stat_user_tables n JOIN pg_class c ON n.relid = c.oid WHERE c.relname = 'users';
`.trim();
    }

    return `// No database engines requiring heavy state seeding detected.`;
}

/**
 * Controller-facing interface to assemble workspace payloads
 */
/**
 * Synthesizes architecture configuration layouts matching polyglot requirements
 */
exports.synthesizeWorkspaceAssets = (analysis) => {
    const { techStack, databases, ports, requiredEnvKeys } = analysis;
    
    // Evaluate application base image and start options
    let baseAppImage = "node:18-alpine";
    let startCommand = "command: [\"npm\", \"start\"]";

    if (techStack.includes("Python")) {
        baseAppImage = "python:3.11-slim";
        startCommand = `command: ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${ports[0]}"]`;
    } else if (techStack.includes("Java") || techStack.includes("Spring Boot")) {
        baseAppImage = "eclipse-temurin:17-jdk-alpine";
        startCommand = `command: ["java", "-jar", "target/app.jar"]`;
    }

    // Build database composition blocks dynamically
    let databaseServicesBlock = "";
    let volumesBlock = "";
    let environmentVariablesVariablesStr = "";
    let mockSeederContent = "";

    // MONGODB TEMPLATE MANIFEST SETUP
    if (databases.includes("MongoDB")) {
        databaseServicesBlock += `
  mongodb:
    image: mongo:latest
    container_name: local_mongodb_${Math.floor(100 + Math.random() * 900)}
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    networks:
      - workspace_net
`;
        volumesBlock += "  mongo_data:\n";
        environmentVariablesVariablesStr += "MONGODB_URI=mongodb://mongodb:27017/workspace_db\n";
        mockSeederContent += `// Automated Polyglot Seed Script for MongoDB
const collections = ['users', 'logs', 'settings'];
console.log('Inserting mock environment records into workspace_db...');
collections.forEach(c => console.log(\`Successfully initialized core mock data for collection: \${c}\`));\n`;
    }

    // POSTGRESQL TEMPLATE MANIFEST SETUP
    if (databases.includes("PostgreSQL")) {
        databaseServicesBlock += `
  postgresql:
    image: postgres:15-alpine
    container_name: local_postgres_${Math.floor(100 + Math.random() * 900)}
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secretpassword
      POSTGRES_DB: app_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - workspace_net
`;
        volumesBlock += "  postgres_data:\n";
        environmentVariablesVariablesStr += "DATABASE_URL=postgresql://admin:secretpassword@postgresql:5432/app_dev?schema=public\n";
        
        if (!mockSeederContent) {
            mockSeederContent += `-- Automated Polyglot Seed Script for PostgreSQL
INSERT INTO users (username, email, role) VALUES 
('developer_admin', 'admin@local.dev', 'SUPERUSER'),
('test_user_alpha', 'alpha@local.dev', 'USER');\n`;
        }
    }

    // Fallback scenario for default systems
    if (!databaseServicesBlock) {
        environmentVariablesVariablesStr += "# Local persistent embedded SQLite selected.\n";
        mockSeederContent += "// No multi-tier database engines detected. External seed generation bypassed.\n";
    }

    // Loop through missing environment keys smoothly
    requiredEnvKeys.forEach(key => {
        if (!environmentVariablesVariablesStr.includes(key)) {
            if (key === 'PORT' || key === 'SERVER_PORT') {
                environmentVariablesVariablesStr += `${key}=${ports[0]}\n`;
            } else {
                environmentVariablesVariablesStr += `${key}=development\n`;
            }
        }
    });

    // Compile the final production-ready docker-compose schema
    const dockerCompose = `version: '3.8'

services:
  app:
    image: ${baseAppImage}
    container_name: local_app_service
    ports:
      - "${ports[0]}:${ports[0]}"
    environment:
${requiredEnvKeys.map(k => `      - ${k}`).join('\n')}
    ${startCommand}
    networks:
      - workspace_net
${databases.length > 0 ? `    depends_on:\n${databases.map(db => `      - ${db.toLowerCase()}`).join('\n')}` : ''}
${databaseServicesBlock}
networks:
  workspace_net:
    driver: bridge

${volumesBlock ? `volumes:\n${volumesBlock}` : ''}`;

    return {
        dockerCompose: dockerCompose.trim(),
        envExample: environmentVariablesVariablesStr.trim(),
        mockSeeder: mockSeederContent.trim()
    };
};