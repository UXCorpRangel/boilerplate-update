import degit from 'degit';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import { diffLines, Change } from 'diff'; // Importar la librería 'diff' para comparaciones de líneas

// URL de tu repositorio de plantilla
const TEMPLATE_REPO = 'UXCorpRangel/boilerplate';

// Obtener __dirname usando import.meta.url en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directorio temporal para descargar la plantilla
const TEMP_DIR = path.resolve(__dirname, './node_modules/.boilerplate-update');

// Ruta absoluta al directorio del proyecto
const PROJECT_DIR = process.cwd(); // Usar el directorio actual

// Mostrar Harley en ASCII Art
function showBorderCollie() {
  const borderCollie = `
    ${chalk.blueBright('           ¡Woof! ')}
    ${chalk.blueBright('     /^ ^\\ ')}
    ${chalk.blueBright('    / 0 0 \\')}
    ${chalk.blueBright('    V\\ Y /V')}
    ${chalk.blueBright('     / - \\')}
    ${chalk.blueBright('    /    |')}
    ${chalk.blueBright('   V__)  ||')}
  `;
  console.log(
    chalk.bold.magenta(
      'Bienvenido al actualizador del Boilerplate de UXCorpRangel! 🐕'
    )
  );
  console.log(borderCollie);
}

// Función para recorrer directorios recursivamente
async function getFilesRecursive(dir: string): Promise<string[]> {
  let results: string[] = [];
  const list = await fs.readdir(dir);

  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);

    if (stat && stat.isDirectory()) {
      const subDirFiles = await getFilesRecursive(filePath);
      results = results.concat(subDirFiles); // Añadir archivos de subdirectorios
    } else {
      results.push(filePath);
    }
  }

  return results;
}

// Descargar la plantilla al directorio temporal
async function downloadTemplate(): Promise<void> {
  console.log(
    chalk.cyan(`\nVerificando o creando el directorio temporal en: ${TEMP_DIR}`)
  );

  console.log('🚀', ora);

  // const spinner = ora(
  //   chalk.blue('Descargando la última versión de la plantilla...')
  // );
  // spinner.start();

  try {
    // Asegurarse de que el directorio temporal existe o crearlo
    if (!(await fs.pathExists(TEMP_DIR))) {
      await fs.mkdir(TEMP_DIR, { recursive: true });
    }

    const emitter = degit(TEMPLATE_REPO);
    await emitter.clone(TEMP_DIR);

    // spinner.succeed(chalk.green('Plantilla descargada correctamente.'));
  } catch (error) {
    // spinner.fail(chalk.red('Error al descargar la plantilla.'));
    throw error;
  }
}

// Comparar los archivos y preguntar sobre cambios de líneas específicas
async function compareAndUpdateFiles(): Promise<void> {
  const templateFiles = await getFilesRecursive(TEMP_DIR); // Obtener archivos de plantilla recursivamente
  console.log(chalk.yellow('\nComenzando la comparación de archivos...\n'));

  for (const templateFilePath of templateFiles) {
    // Obtener la ruta relativa del archivo dentro de la plantilla
    const relativePath = path.relative(TEMP_DIR, templateFilePath);
    const projectFilePath = path.join(PROJECT_DIR, relativePath);

    // Verificar si es un archivo antes de procesarlo
    const templateFileStat = await fs.stat(templateFilePath);

    if (!templateFileStat.isFile()) {
      console.log(chalk.gray(`Saltando directorio: ${relativePath}`));
      continue;
    }

    // Leer los contenidos de los archivos para la comparación
    const templateContent = await fs.readFile(templateFilePath, 'utf-8');
    let projectContent = '';

    if (await fs.pathExists(projectFilePath)) {
      projectContent = await fs.readFile(projectFilePath, 'utf-8');
    }

    // Comparar los archivos línea por línea
    const changes: Change[] = diffLines(projectContent, templateContent);

    let finalContent = projectContent;
    let modified = false;

    // Preguntar sobre cada cambio detectado
    for (const change of changes) {
      if (change.added) {
        console.log(
          chalk.green(
            `\nLínea(s) añadida(s) en la plantilla para ${relativePath}:\n`
          ),
          change.value
        );

        const response = await prompts({
          type: 'confirm',
          name: 'update',
          message: chalk.yellow(
            `¿Deseas agregar estas líneas a tu archivo ${relativePath}?`
          ),
          initial: true,
        });

        if (response.update) {
          finalContent += change.value;
          modified = true;
        }
      } else if (change.removed) {
        console.log(
          chalk.red(
            `\nLínea(s) eliminada(s) en la plantilla para ${relativePath}:\n`
          ),
          change.value
        );

        const response = await prompts({
          type: 'confirm',
          name: 'remove',
          message: chalk.yellow(
            `¿Deseas eliminar estas líneas de tu archivo ${relativePath}?`
          ),
          initial: false,
        });

        if (response.remove) {
          finalContent = finalContent.replace(change.value, '');
          modified = true;
        }
      }
    }

    // Sobrescribir el archivo solo si ha habido cambios
    if (modified) {
      await fs.writeFile(projectFilePath, finalContent, 'utf-8');
      console.log(chalk.green(`Archivo actualizado: ${relativePath}`));
    } else {
      console.log(chalk.blue(`Archivo sin cambios: ${relativePath}`));
    }
  }
}

// Limpiar el directorio temporal
async function cleanUp(): Promise<void> {
  console.log(chalk.cyan('\nLimpiando archivos temporales en:'), TEMP_DIR);
  await fs.remove(TEMP_DIR);
  console.log(chalk.green('Archivos temporales eliminados correctamente.'));
}

// Ejecutar el proceso de actualización
async function main(): Promise<void> {
  showBorderCollie();

  try {
    await downloadTemplate();
    await compareAndUpdateFiles();
    await cleanUp();
    console.log(
      chalk.bold.magentaBright(
        '\nPlantilla actualizada correctamente. ¡Gracias por usar nuestro Boilerplate! 🐾'
      )
    );
  } catch (error) {
    console.error(chalk.red('Error al actualizar el Boilerplate:'), error);
  }
}

main();
