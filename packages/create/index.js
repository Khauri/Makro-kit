const degit = require('degit');

const TEMPLATE_REPO = 'Khauri/Makro-kit';
const TEMPLATE_BASE_PATH = 'website';

const emitter = degit(`${TEMPLATE_REPO}/${TEMPLATE_BASE_PATH}`, {force: true});

emitter.on('info', info => {
	console.log(info.message);
});

emitter.clone('./test').then(() => {
	console.log('done');
});