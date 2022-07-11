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
  .option('-d, --routesDir <path>', 'Override the default path to the routes directory.')
  .action((dir, options) => {
    const absDir = path.resolve(dir);
    controller.dev(absDir, options);
  });

// Build Command
program.command('build')
  .alias('b')
  .argument('[dir]', 'Path to the directory containing the project. Defaults to the current directory.', process.cwd())
  .option('-o, --outDir <path>', 'Path to the directory to output the built project. Defaults to ./dist', './dist')
  .option('-d, --routesDir <path>', 'Override the default path to the routes directory.')
  .action((dir, options) => {
    const absDir = path.resolve(dir);
    controller.build(absDir, options);
  });

// Serve command
program.command('serve')
  .alias('s')
  .argument('[dir]', 'Path to the directory containing the project. Defaults to the current directory.', process.cwd())
  .option('-p, --port <port>', 'Port to use for the server. Will use process.env.PORT if not specified')
  .option('-d, --routesDir <path>', 'Override the default path to the routes directory.')
  .action((dir, options) => {
    const absDir = path.resolve(dir);
    controller.serve(absDir, options); 
  });

program.parse();
