// "Simple" config validation based on JSON schema
// For each config it will run transform -> validate -> resolve.
// Validate should return `true`, `false`, or an error object.

import fs from 'node:fs';
import path from 'node:path';

function Str({values, pattern, required} = {}) {
  return {type: 'string', required};
}

function Num({integer, required, loose = false} = {}) {
  return {
    type: 'number',
    required,
    ...loose && {transform: (input) => Number(input)},
    validate: (input) => typeof input === 'number' 
      && !Number.isNaN(input) 
      && (!integer || Number.isInteger(input)),
  };
}

function Bool({required, loose = true}) {
  return {
    type: 'boolean',
    ...loose && {transform: (input) => Boolean(input)},
    validate: (input) => typeof input === 'boolean',
  }
}

function Any(...of) {
  return {
    type: 'any',
    validate: (input, p) => {
      if(!of.some(v => v.validate(input, p) === true)) {
        return new Error(`${p} does not match any of the required values`)
      }
      return true;
    },
    resolve: (input, p) => {
      const first = of.find(v => v.validate(input, p) === true);
      return first.resolve?.(input, p) ?? input;
    },
  }
}

function Arr({of, max, min} = {}) {
  return {
    type: 'array',
    validate: (input, p) => {
      if(!Array.isArray(input)) {
        return new Error(`${p} is not an array`);
      }
      if(input.length > max) {
        return new Error(`Length of ${p} exceeds the maximum length of ${max}.`);
      }
      if(input.length < min) {
        return new Error(`Length of ${p} must be greater than ${min}.`)
      }
      input.forEach(item => {});
      return true;
    },
    resolve: (input, p = '') => {
      return input.reduce((acc, value, index) => {
        acc.push(value.resolve?.(value, `${p}[${index}]`) ?? value);
        return acc;
      }, [])
    }
  }
}

function Obj({properties = {}, allowAdditional = false} = {}) {
  return {
    validate: (input) => {
      if(typeof input !== 'object' || Array.isArray(input)) {
        return false;
      }
    },
    resolve: (input, p) => {
      // TODO: Handle additional properties
      return Object.entries(properties).reduce((acc, [key, config]) => {
        const part = p ? `${p}.${key}` : key;
        const val = input[key];
        if(typeof val === 'undefined') {
          if(config.required) {
            return new Error(`${part} is required to be defined in the config`);
          }
          return acc;
        }
        acc[key] = config.resolve(input, part);
        return acc;
      }, {});
    }
  };
}

// Base configuration
export const config = Obj({
  dir: Str(),
  mode: Str({values: ['dev', 'prod']}),
  routePrefix: Str(),
  viteConfig: Any(Obj(), Str()),
});

// Walks upwards from the cwd to find a markoconfig.js
export function findConfigFile(from = process.cwd()) {
  let last = from;
  do {
    const config = `${p}/.makroconfig.json`;
    if(fs.existsSync(config)){
      return config;
    }
    last = from;
    from = path.resolve(from, '..');
  } while (from !== last); // may or may not prevent an infinite loop
}

// Reads the config file
export function getConfigFile(from) {
  const configPath = findConfigFile(from);
  return JSON.parse(fs.readFileSync(configPath).toString());
}

export function getConfig(from) {
  return config.resolve(getConfigFile(from));
}