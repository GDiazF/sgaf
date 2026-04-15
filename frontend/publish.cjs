const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuración de rutas
const versionFilePath = path.join(__dirname, 'src', 'version.js');
const packageJsonPath = path.join(__dirname, 'package.json');

// Capturar argumentos
const args = process.argv.slice(2);
const fullMessage = args.join(' ');

// 1. Validar mensaje y extraer tipo
if (!fullMessage || !fullMessage.includes(':')) {
    console.error('❌ Error: El mensaje debe tener el formato "tipo: mensaje" (ej: fix: mi ajuste)');
    process.exit(1);
}

const type = fullMessage.split(':')[0].trim().toLowerCase();
const message = fullMessage.split(':').slice(1).join(':').trim();

const validTypes = ['fix', 'feat', 'release'];
if (!validTypes.includes(type)) {
    console.error('❌ Error: El tipo debe ser fix, feat o release.');
    process.exit(1);
}

try {
    console.log(`\n🚀 Iniciando proceso de publicación para versión tipo: ${type.toUpperCase()}`);

    // 2. Leer versión actual
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    let [major, minor, patch] = packageJson.version.split('.').map(Number);

    // 3. Calcular nueva versión (según tus reglas)
    if (type === 'release') major++;
    else if (type === 'feat') minor++;
    else patch++;

    // Reiniciar números menores si sube uno mayor
    if (type === 'release' || type === 'feat') patch = 0;
    if (type === 'release') minor = 0;

    const newVersion = `${major}.${minor}.${patch}`;
    const today = new Date().toISOString().split('T')[0];

    // 4. Actualizar archivos
    console.log(`📝 Actualizando archivos a v${newVersion}...`);

    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

    const versionContent = `// Archivo central de versionamiento del sistema SGAF
// Estándar SemVer: MAYOR.MENOR.PARCHE

export const APP_VERSION = "${newVersion}";
export const APP_RELEASE_DATE = "${today}";
export const APP_DEVELOPER = "Departamento de Servicios Generales, Operaciones y Soporte TI - SLEP IQUIQUE";
`;
    fs.writeFileSync(versionFilePath, versionContent);

    // 5. Automatizar Git
    console.log(`📦 Subiendo cambios a GitHub...`);

    // Detectar rama actual
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    console.log(`📍 Rama detectada: ${currentBranch}`);

    execSync('git add .', { stdio: 'inherit' });
    execSync(`git commit -m "${type}: ${message} (v${newVersion})"`, { stdio: 'inherit' });

    // Empuja desde tu rama actual (HEAD) hacia la rama 'local' de GitHub
    console.log(`📤 Empujando cambios a la rama [local] de GitHub...`);
    execSync(`git push origin HEAD:local`, { stdio: 'inherit' });

    console.log(`\n✅ ¡Publicación exitosa! Sistema actualizado a v${newVersion} en GitHub [rama: local]\n`);

} catch (error) {
    console.error('\n❌ Hubo un error durante el proceso:', error.message);
    process.exit(1);
}
