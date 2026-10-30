import {test} from 'node:test';
import assert from 'node:assert/strict';
import {githubMetadata} from '../scripts/github-metadata.mjs';
const endpoint='repos/guizhan21/daily-reading-github-test/actions/runs/123';
const response=(status,body={},headers={})=>new Response(JSON.stringify(body),{status,headers});

test('transient 502 recovers the exact metadata, using only GET and private headers',async()=>{
  const requests=[],events=[],sleeps=[];
  const result=await githubMetadata(endpoint,{token:'test-secret',fetchImpl:async(url,options)=>{
    requests.push({url,options});return requests.length===1?response(502):response(200,{status:'completed',conclusion:'success'});
  },sleep:async ms=>sleeps.push(ms),onRetry:e=>events.push(e)});
  assert.deepEqual(result,{status:'completed',conclusion:'success'});
  assert.equal(requests.length,2);assert.equal(requests[1].options.method,'GET');
  assert.equal(requests[1].options.headers.Authorization,'Bearer test-secret');
  assert.equal(requests[1].url,'https://api.github.com/'+endpoint);
  assert.deepEqual(sleeps,[1000]);assert.equal(events[0].status,502);
  assert.ok(!JSON.stringify(events).includes('test-secret'));
});
test('authentication, authorization and missing resources are never retried',async()=>{
  for(const status of [401,403,404]){let calls=0;await assert.rejects(githubMetadata(endpoint,{fetchImpl:async()=>{calls++;return response(status)},sleep:async()=>assert.fail('must not wait')}),new RegExp(String(status)));assert.equal(calls,1);}
});
test('persistent service failures stop after three GETs',async()=>{
  let calls=0;const sleeps=[];await assert.rejects(githubMetadata(endpoint,{fetchImpl:async()=>{calls++;return response(503)},sleep:async ms=>sleeps.push(ms)}),/503 after 3/);assert.equal(calls,3);assert.deepEqual(sleeps,[1000,2000]);
});
test('Retry-After is respected and longer waits defer instead of retrying early',async()=>{
  let calls=0;const sleeps=[];await githubMetadata(endpoint,{fetchImpl:async()=>++calls===1?response(429,{}, {'retry-after':'2'}):response(200),sleep:async ms=>sleeps.push(ms)});assert.deepEqual(sleeps,[2000]);
  calls=0;await assert.rejects(githubMetadata(endpoint,{fetchImpl:async()=>{calls++;return response(429,{}, {'retry-after':'99999'})},sleep:async()=>assert.fail('long server delay must not be shortened')}),/deferred/);assert.equal(calls,1);
});
test('transport failure retries without logging raw error details',async()=>{
  let calls=0;const events=[];await githubMetadata(endpoint,{fetchImpl:async()=>{if(++calls===1)throw new TypeError('contains test-secret');return response(200)},sleep:async()=>{},onRetry:e=>events.push(e)});assert.equal(calls,2);assert.ok(!JSON.stringify(events).includes('test-secret'));
});
test('successful but malformed data and unapproved destinations fail closed',async()=>{
  let calls=0;await assert.rejects(githubMetadata(endpoint,{fetchImpl:async()=>{calls++;return new Response('<html>bad</html>')},sleep:async()=>assert.fail('invalid JSON must not retry')}));assert.equal(calls,1);
  await assert.rejects(githubMetadata('https://unapproved.example/actions/',{fetchImpl:async()=>assert.fail('must not transmit')}),/Unapproved/);
  await assert.rejects(githubMetadata(endpoint+'/../../../../other',{fetchImpl:async()=>assert.fail('must not transmit')}),/Unapproved/);
});
