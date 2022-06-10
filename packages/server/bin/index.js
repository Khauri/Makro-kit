#!/usr/bin/env node
import path from 'path';
import {program} from 'commander';
import * as controller from '../index.js';

program
  .name('makro')
  .argument('[dir]', 'Path to the directory containing the project. Defaults to the current directory.', process.cwd())
  .action((dir) => {
    const absDir = path.resolve(dir);
    controller.dev(absDir);
  })

program.parse();
