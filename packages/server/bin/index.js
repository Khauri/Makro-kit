#!/usr/bin/env node
import path from 'path';
import {program} from 'commander';
import * as controller from '../index.js';

program
  .name('makro')
  // Dev Command
  .command('dev')
  .alias('d')
  .argument('[dir]', 'Path to the directory containing the project. Defaults to the current directory.', process.cwd())
  .option('-p, --port <port>', 'Port to use for the server. Defaults to 3000', 3000)
  .action((dir) => {
    const absDir = path.resolve(dir);
    controller.dev(absDir);
  });

// Build Command
program.command('build')
  .alias('b')
  .argument('[dir]', 'Path to the directory containing the project. Defaults to the current directory.', process.cwd())
  .option('-o, --output <path>', 'Path to the directory to output the built project. Defaults to ./dist', './dist')
  .action((dir, options) => {
    const absDir = path.resolve(dir);
    controller.build(absDir, options);
  });

// Serve command
program.command('serve')
  .alias('s')
  .argument('[file]', 'Path to the file containing the built project. Defaults to ./dist directory.', './dist/index.js')
  .option('-p, --port <port>', 'Port to use for the server. Will use process.env.PORT if not specified')
  .option('-r, --root <path>', 'Path to the directory to serve. Defaults to the current directory.', path.resolve(process.cwd(), './routes'))
  .action((dir, options) => {
    const absDir = path.resolve(dir);
    controller.serve(absDir, options); 
  });

program.parse();
