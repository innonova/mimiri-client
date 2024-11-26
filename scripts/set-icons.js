import shell from 'shelljs';
import Path from 'path';

const cwd = process.cwd()

const icons = Path.join(cwd, 'src', 'icons')
const target = Path.join(cwd, 'src', process.argv[2])


console.log(icons, target);

shell.rm('-rf', icons)
shell.exec(`ln -s "${target}" "${icons}"`)

