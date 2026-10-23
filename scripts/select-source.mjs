import fs from 'node:fs';
import {sourceRepository,validateRun,validateJobs} from './source-policy.mjs';
const repository=sourceRepository,api='https://api.github.com/',requested=process.env.SOURCE_RUN_ID||'';
if(requested&&!/^\d+$/.test(requested))throw Error('Expected numeric source workflow run ID');
async function github(endpoint){const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};if(process.env.GH_TOKEN)headers.Authorization='Bearer '+process.env.GH_TOKEN;const r=await fetch(api+endpoint,{headers});if(!r.ok)throw Error('GitHub metadata request failed: '+r.status);return r.json();}
const run=requested?await github('repos/'+repository+'/actions/runs/'+requested):(await github('repos/'+repository+'/actions/workflows/pages.yml/runs?branch=main&status=success&per_page=1')).workflow_runs[0];
validateRun(run);
const jobs=(await github('repos/'+repository+'/actions/runs/'+run.id+'/attempts/'+run.run_attempt+'/jobs?per_page=100')).jobs;
// A retry can reuse passed jobs from the first attempt; the current run jobs endpoint
// provides that merged set, while the attempt endpoint remains useful audit evidence.
const merged=(await github('repos/'+repository+'/actions/runs/'+run.id+'/jobs?per_page=100')).jobs;
validateJobs(merged);
let current;try{const r=await fetch('https://guizhan21.github.io/publication.json',{cache:'no-store'});if(r.ok)current=await r.json();}catch{/* First publication has no current root manifest. */}
const needed=process.env.FORCE==='true'||current?.sourceCommit!==run.head_sha||current?.publisherCommit!==process.env.GITHUB_SHA;
fs.appendFileSync(process.env.GITHUB_OUTPUT,`sha=${run.head_sha}\nsource_run_id=${run.id}\nneeded=${needed}\n`);
fs.writeFileSync('source-proof.json',JSON.stringify({repository,commit:run.head_sha,runId:run.id,attempt:run.run_attempt,actions:run.html_url,needed,attemptJobs:jobs.map(j=>({name:j.name,conclusion:j.conclusion})),mergedJobs:merged.map(j=>({name:j.name,conclusion:j.conclusion}))},null,2));
console.log(JSON.stringify({sourceCommit:run.head_sha,sourceRunId:run.id,needed}));
