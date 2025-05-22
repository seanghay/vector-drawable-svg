#!/usr/bin/env node
const { transform } = require('..');
const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile) {
  throw new Error('inputFile is invalid');
}

if (!outputFile) {
  throw new Error('outputFile is invalid');
}

const inPath = path.resolve(inputFile);
const outPath = path.resolve(outputFile);

if (!fs.existsSync(inPath)) {
  throw new Error('input file does not exist');
}

if (fs.existsSync(outputFile)) {
  throw new Error('output already exists');
}

const content = transform(fs.readFileSync(inPath, 'utf8'));

fs.writeFileSync(outPath, content, { encoding: 'utf8' });
