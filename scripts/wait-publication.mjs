// A successful Pages deployment can precede public CDN propagation. Do not
// launch playback tests against a mixed old/new catalog. No cache-busting URLs,
// credentials, media regeneration, or relaxed acceptance checks are used.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const base='https://guizhan21.github.io/';
const fields=['sourceRepository','sourceCommit','sourceRunId','publisherCommit','publisherRunId','catalogSha256','books','chapters'];
export async function probePublication(expected,indexSha256,fetcher=fetch){
 if(expected.sourceRepository!=='guizhan21/daily-reading-github-test'||!/^\d+$/.test(String(expected.sourceRunId))||!/^\d+$/.test(String(expected.publisherRunId))||![expected.sourceCommit,expected.publisherCommit].every(v=>/^[a-f0-9]{40}$/.test(v))||![indexSha256,expected.catalogSha256].every(v=>/^[a-f0-9]{64}$/.test(v)))throw Error('Invalid expected publication identity');
 const observed={ready:false};
 try{
  const read=async name=>{const r=await fetcher(base+name,{cache:'no-store',signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(name+' HTTP '+r.status);return Buffer.from(await r.arrayBuffer());};
  const manifest=JSON.parse((await read('publication.json')).toString('utf8'));
  observed.publicationMatches=fields.every(k=>String(manifest[k])===String(expected[k]));
  if(!observed.publicationMatches)return observed;
  const catalog=await read('data/books.json');observed.catalogSha256=digest(catalog);observed.catalogMatches=observed.catalogSha256===expected.catalogSha256;
  if(!observed.catalogMatches)return observed;
  const page=await read('index.html');observed.indexSha256=digest(page);observed.indexMatches=observed.indexSha256===indexSha256;
  observed.ready=observed.indexMatches;return observed;
 }catch(error){observed.reason=String(error.message).slice(0,300);return observed;}
}
export async function waitPublication(expected,indexSha256,{fetcher=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),attempts=30,intervalMs=20000,onAttempt=()=>{}}={}){
 const observations=[];
 for(let attempt=1;attempt<=attempts;attempt++){
  const row={attempt,at:new Date().toISOString(),...await probePublication(expected,indexSha256,fetcher)};observations.push(row);onAttempt(row);
  if(row.ready)return {ready:true,observations};
  if(attempt<attempts)await sleep(intervalMs);
 }
 return {ready:false,observations,reason:'Public Pages rollout is not yet byte-consistent. Preserve this deployment and investigate propagation; do not regenerate media.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const expected=JSON.parse(fs.readFileSync('library/dist-root/publication.json')),indexSha256=digest(fs.readFileSync('library/dist-root/index.html'));
 const report=await waitPublication(expected,indexSha256,{onAttempt:row=>console.log(JSON.stringify(row))});
 fs.writeFileSync('publication-readiness.json',JSON.stringify({sourceCommit:expected.sourceCommit,sourceRunId:expected.sourceRunId,publisherCommit:expected.publisherCommit,publisherRunId:expected.publisherRunId,indexSha256,...report},null,2));
 if(!report.ready)throw Error(report.reason);
}
