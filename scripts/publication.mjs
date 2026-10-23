import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const proof=JSON.parse(fs.readFileSync('source-proof.json')),catalog=fs.readFileSync('library/dist-root/data/books.json'),books=JSON.parse(catalog).books;
assert.ok(fs.readFileSync('library/dist-root/index.html','utf8').includes('<base href="/">'));
const manifest={schema:1,url:'https://guizhan21.github.io/',sourceRepository:proof.repository,sourceCommit:proof.commit,sourceRunId:proof.runId,sourceActions:proof.actions,publisherCommit:process.env.GITHUB_SHA,createdAt:new Date().toISOString(),books:books.length,chapters:books.flatMap(b=>b.chapters).length,catalogSha256:crypto.createHash('sha256').update(catalog).digest('hex'),audioStorage:'Original Releases in the source repository; no audio copied into Pages'};
fs.writeFileSync('library/dist-root/publication.json',JSON.stringify(manifest,null,2));console.log(JSON.stringify(manifest));
