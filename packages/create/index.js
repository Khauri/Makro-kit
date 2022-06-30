// Clones a starter project directory from a git repository
const degit = require('degit');
const path = require('path');
const fs = require('fs');
const {program} = require('commander');

const TEMPLATE_REPO = 'Khauri/Makro-kit';
const TEMPLATE_BASE_PATH = 'examples/default';

const emitter = degit(`${TEMPLATE_REPO}/${TEMPLATE_BASE_PATH}`, {force: true});

emitter.on('info', info => {
	console.log(info.message);
});

// cli program that takes in the path of the project to be created
program.version('0.0.1')
	.arguments('<path>')
	.action(async (p) => {
		// resolve the path using the cwd
		const resolvedPath = path.resolve(process.cwd(), p);
		// check if the resolvedPath is an empty directory
		if (fs.existsSync(resolvedPath) && fs.readdirSync(resolvedPath).length > 0) {
			console.error('Error: the provided path is not an empty directory.');
			process.exit(1);
		}
		console.log(`Creating project at ${resolvedPath}`);
		await emitter.clone(path);
	})
	.parse(process.argv);
