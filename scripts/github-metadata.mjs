// GET-only metadata retry. Authentication and validation failures stay fatal.
const prefixes = [
  'repos/guizhan21/daily-reading-github-test/actions/',
  'repos/guizhan21/guizhan21.github.io/actions/',
];
const transient = new Set([429, 500, 502, 503, 504]);
export async function githubMetadata(endpoint, {
  token, fetchImpl = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  onRetry = () => {},
} = {}) {
  if (typeof endpoint !== 'string' || !prefixes.some(p => endpoint.startsWith(p)) || /[\s\\%#]/.test(endpoint) || endpoint.includes('..'))
    throw Error('Unapproved GitHub metadata endpoint');
  const headers = {Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'};
  if (token) headers.Authorization = 'Bearer ' + token;
  for (let attempt = 1; attempt <= 3; attempt++) {
    let response, status;
    try {
      response = await fetchImpl('https://api.github.com/' + endpoint, {
        method: 'GET', headers, signal: AbortSignal.timeout(30000), redirect: 'error',
      });
      status = response.status;
    } catch (error) {
      // No raw request/error text: it can contain credentials from a fetch wrapper.
      if (!['TypeError', 'TimeoutError', 'AbortError'].includes(error?.name)) throw error;
      status = 'network';
    }
    if (response?.ok) return response.json();
    if (response) await response.body?.cancel();
    if (attempt === 3 || status !== 'network' && !transient.has(status))
      throw Error('GitHub metadata request failed: ' + status + ' after ' + attempt + ' attempt(s): ' + endpoint);
    const seconds = Number(response?.headers.get('retry-after'));
    if (Number.isFinite(seconds) && seconds > 30)
      throw Error('GitHub metadata retry deferred for ' + seconds + ' seconds: ' + endpoint);
    const delayMs = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : attempt * 1000;
    onRetry({event: 'github_metadata_retry', endpoint, attempt, status, delayMs});
    await sleep(delayMs);
  }
}
