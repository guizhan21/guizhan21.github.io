export const sourceRepository='guizhan21/daily-reading-github-test';
export function validateRun(run){
 if(!run||run.repository?.full_name!==sourceRepository||run.head_branch!=='main'||run.status!=='completed'||run.conclusion!=='success'||run.path!=='.github/workflows/pages.yml'||!/^[a-f0-9]{40}$/.test(run.head_sha))throw Error('Only the successful authoritative main Pages workflow may publish');
}
export function validateJobs(jobs){for(const name of ['build','deploy','external (chrome)','external (firefox)','external (webkit)'])if(!jobs.some(j=>j.name===name&&j.conclusion==='success'))throw Error('Missing source gate '+name);}
