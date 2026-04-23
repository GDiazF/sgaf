const fs = require('fs');
const path = require('path');

const versionFilePath = path.join(__dirname, 'src', 'version.js');
const packageJsonPath = path.join(__dirname, 'package.json');

const type = process.argv[2] || 'patch'; // major, minor, patch

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
let [major, minor, patch] = packageJson.version.split('.').map(Number);

if (type === 'major') major++;
else if (type === 'minor') minor++;
else patch++;

if (type === 'major' || type === 'minor') patch = 0;
if (type === 'major') minor = 0;

const newVersion = `${major}.${minor}.${patch}`;
const today = new Date().toISOString().split('T')[0];

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// Update version.js
const versionContent = `// Archivo central de versionamiento del sistema SGAF
// Estándar SemVer: MAYOR.MENOR.PARCHE

export const APP_VERSION = "${newVersion}";
export const APP_RELEASE_DATE = "${today}";
export const APP_DEVELOPER = "Departamento de Servicios Generales, Operaciones y Soporte TI - SLEP IQUIQUE";
`;

fs.writeFileSync(versionFilePath, versionContent);

console.log(`✅ Sistema actualizado a la versión v${newVersion} (${today})`);
