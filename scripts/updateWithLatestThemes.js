/*
 * This script creates the necessary entries in package.json based on
 * the themes in ./themes directory
 */
const path = require('path');
const fs = require('fs');
const { exec, execSync } = require('child_process');
const util = require('node:util');

const { rimrafSync } = require('rimraf');
const { parse } = require('jsonc-parser');

const execPromise = util.promisify(exec);
const basePath = process.cwd();
const packagePath = path.join(basePath, 'package.json');
const themesPath = path.join(basePath, 'themes');
const base16VscodePath = path.join(basePath, 'base16-vscode');

async function addThemesToPackageJson() {
  const packageJsonThemeObjects = fs.readdirSync(themesPath).map(filename => {
    const themeJson = parse(fs.readFileSync(path.join(themesPath, filename), 'utf8'));

    return { 
      label: filename.replace(/(.+)\.json/, '$1'),
      uiTheme: themeJson.type === 'light' ? 'hc-light' : 'vs-dark',
      path: `./themes/${filename}`
    };
  });

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageJson.contributes.themes = packageJsonThemeObjects;

  const { stdout, stderr } = await execPromise('git diff themes');

  if (stderr) {
    throw new Error("Error with git diff", stderr);
  }

  // Increment package by minor version if a diff exists
  if (stdout) {
    const packageJsonVersion = packageJson.version.split('.').map(Number);
    packageJson.version = `${packageJsonVersion[0]}.${packageJsonVersion[1] + 1}.${packageJsonVersion[2]}`;
  }

  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
}

function cloneThemes() {
  execSync('git clone https://github.com/tinted-theming/base16-vscode.git', {
    stdio: [0, 1, 2],
    cwd: basePath,
  });
}

async function main() {
  if (fs.existsSync(base16VscodePath)) {
    rimrafSync(base16VscodePath);
  }

  if (fs.existsSync(themesPath)) {
    rimrafSync(themesPath);
  }

  cloneThemes();
  fs.renameSync(path.join(base16VscodePath, 'themes'), themesPath);
  rimrafSync(base16VscodePath);

  await addThemesToPackageJson();
}

main();