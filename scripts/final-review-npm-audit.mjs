import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
// Preserve this historical network audit, but do not run it for the archive.
const archived = true;
if (archived) throw new Error('VOICECARE_ARCHIVED: external audit requests are disabled');
// Use the project's declared npm version in a temporary directory. No install or
// package/lockfile mutation in the project; verify the registry archive integrity.
const version='12.0.2';
const metadata=await (await fetch(`https://registry.npmjs.org/npm/${version}`)).json();
if(metadata.version!==version||!metadata.dist.tarball.startsWith('https://registry.npmjs.org/npm/'))throw Error('unexpected_registry_package');
const archive=Buffer.from(await (await fetch(metadata.dist.tarball)).arrayBuffer());
const integrity=`sha512-${createHash('sha512').update(archive).digest('base64')}`;
if(integrity!==metadata.dist.integrity)throw Error('archive_integrity_mismatch');
const dir=mkdtempSync(join(tmpdir(),'voicecare-npm-audit-'));
writeFileSync(join(dir,'npm.tgz'),archive);
execFileSync('tar',['-xf',join(dir,'npm.tgz'),'-C',dir]);
const result=spawnSync(process.execPath,[join(dir,'package/bin/npm-cli.js'),'audit','--json'],{encoding:'utf8',maxBuffer:5_000_000});
const report=JSON.parse(result.stdout);
writeFileSync('docs/voicecare-evaluation/submission-final-20260907/npm-audit.json',JSON.stringify({at:new Date().toISOString(),npmVersion:version,exitCode:result.status,report},null,2));
console.log(JSON.stringify({npmVersion:version,exitCode:result.status,vulnerabilities:report.metadata?.vulnerabilities}));
process.exitCode=result.status??1;
