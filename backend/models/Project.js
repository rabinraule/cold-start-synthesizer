const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    rootPath: { type: String, required: true },
    projectName: { type: String, required: true },
    structure: { type: Object, required: true },
    synthesizedFiles: {
        dockerCompose: { type: String },
        envExample: { type: String },
        mockSeeder: { type: String }
    }
}, { 
    timestamps: true // Automatically provisions createdAt and updatedAt fields
});

module.exports = mongoose.model('Project', projectSchema);