import 'dotenv/config'
import shell from 'shelljs';

console.log(process.env.DEPLOY_TARGET);
shell.exec(`scp -r ./dist/* ${process.env.DEPLOY_TARGET}`)


