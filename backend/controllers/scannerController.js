const fs = require('fs');
const path = require('path');
const Project = require('../models/Project');
const { parseProjectDependencies } = require('./parserService');
const { synthesizeWorkspaceAssets } = require('./synthesisService');
const { exportAssetsToDisk } = require('./exporterService'); // Import Exporter Engine

const IGNORE_DIRS = new Set(['node_modules', '.git', '.venv', 'venv', 'dist', 'build', '.next', '.nuxt', 'out']);

function buildFileTree(dirPath, relativePath = '') {
    const baseName = path.basename(dirPath);
    if (IGNORE_DIRS.has(baseName)) return null;

    let stats;
    try { stats = fs.statSync(dirPath); } catch (err) { return null; }

    const node = {
        name: baseName,
        path: relativePath || baseName,
        type: stats.isDirectory() ? 'directory' : 'file',
        extension: stats.isDirectory() ? '' : path.extname(baseName)
    };

    if (stats.isDirectory()) {
        node.children = [];
        try {
            const files = fs.readdirSync(dirPath);
            for (const file of files) {
                const childPath = path.join(dirPath, file);
                const childRelativePath = relativePath ? path.join(relativePath, file) : file;
                const childNode = buildFileTree(childPath, childRelativePath);
                if (childNode) node.children.push(childNode);
            }
        } catch (err) {}
    }

    return node;
}

/**
 * POST /api/scan
 * Scans, analyzes, and caches workspace models
 */
exports.scanRepository = async (req, res, next) => {
    try {
        const { targetPath } = req.body;

        if (!targetPath) {
            return res.status(400).json({ status: "ERROR", message: "Target directory path is required." });
        }

        if (!fs.existsSync(targetPath)) {
            return res.status(404).json({ status: "ERROR", message: "Provided directory path does not exist on this machine." });
        }

        const stats = fs.statSync(targetPath);
        if (!stats.isDirectory()) {
            return res.status(400).json({ status: "ERROR", message: "Provided path is a file, not a directory." });
        }

        const projectName = path.basename(path.resolve(targetPath));
        const fileTreeStructure = buildFileTree(targetPath);

        if (!fileTreeStructure) {
            return res.status(500).json({ status: "ERROR", message: "Failed to parse directory tree structure." });
        }

        const technicalStackAnalysis = parseProjectDependencies(targetPath);
        const configurations = synthesizeWorkspaceAssets(technicalStackAnalysis);

        const savedProject = await Project.create({
            rootPath: targetPath,
            projectName: projectName,
            structure: fileTreeStructure,
            synthesizedFiles: configurations
        });

        res.status(201).json({
            status: "SUCCESS",
            message: "Workspace configuration synthesized and cached successfully.",
            data: {
                projectId: savedProject._id,
                projectName: savedProject.projectName,
                rootPath: savedProject.rootPath,
                analysis: technicalStackAnalysis,
                synthesizedFiles: savedProject.synthesizedFiles,
                structure: savedProject.structure
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/export
 * Materializes configuration payloads onto physical local desktop structures
 */
exports.exportProjectWorkspace = async (req, res, next) => {
    try {
        const { projectId } = req.body;

        if (!projectId) {
            return res.status(400).json({ status: "ERROR", message: "Project record ID parameter is required." });
        }

        // Locate existing workspace profile from Atlas cloud storage records
        const targetProject = await Project.findById(projectId);
        if (!targetProject) {
            return res.status(404).json({ status: "ERROR", message: "Target configuration profile index tracking record was not found." });
        }

        // Run materialization pipeline directly onto local desktop storage path
        console.log(`[Exporter] Committing assets onto disk paths for: ${targetProject.projectName}`);
        const result = exportAssetsToDisk(targetProject.rootPath, targetProject.synthesizedFiles);

        res.status(200).json({
            status: "SUCCESS",
            message: `Files successfully written locally to disk! Path: ${result.outputPath}`,
            data: {
                outputPath: result.outputPath
            }
        });

    } catch (error) {
        res.status(500).json({ status: "ERROR", message: error.message });
    }
};

/**
 * GET /api/history
 * Fetches all previously cached project summaries from MongoDB Atlas
 */
/**
 * GET /api/history
 * Fetches all previously cached project summaries from MongoDB Atlas with timestamps
 */
exports.getWorkspaceHistory = async (req, res, next) => {
    try {
        // Added 'synthesizedFiles' to the select statement so clicking a history card can pull the data!
        const projects = await Project.find({}, 'projectName rootPath synthesizedFiles createdAt')
                                      .sort({ createdAt: -1 });

        res.status(200).json({
            status: "SUCCESS",
            data: projects
        });
    } catch (error) {
        res.status(500).json({ status: "ERROR", message: error.message });
    }
};/**
 * DELETE /api/history
 * Drops all workspace collection data from MongoDB completely
 */
exports.clearWorkspaceHistory = async (req, res, next) => {
    try {
        // Drop all documents out of your Project model collection
        await Project.deleteMany({});

        res.status(200).json({
            status: "SUCCESS",
            message: "All database synthesis profiles dropped cleanly from MongoDB."
        });
    } catch (error) {
        res.status(500).json({ status: "ERROR", message: error.message });
    }
};/**
 * DELETE /api/history
 * Drops all workspace collection data from MongoDB completely
 */
exports.clearWorkspaceHistory = async (req, res, next) => {
    try {
        // Drop all documents out of your Project model collection
        await Project.deleteMany({});

        res.status(200).json({
            status: "SUCCESS",
            message: "All database synthesis profiles dropped cleanly from MongoDB."
        });
    } catch (error) {
        res.status(500).json({ status: "ERROR", message: error.message });
    }
};