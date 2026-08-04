import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    console.log('Step 1: starting');
    const base44 = createClientFromRequest(req);
    console.log('Step 2: client created');
    const user = await base44.auth.me();
    console.log('Step 3: got user', user?.id);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    console.log('Step 4: getting connection');
    const conn = await base44.asServiceRole.connectors.getConnection('github');
    console.log('Step 5: got connection', typeof conn);
    const accessToken = conn?.accessToken;
    console.log('Step 6: token present?', !!accessToken);

    if (!accessToken) {
      return Response.json({ error: 'No GitHub access token' }, { status: 500 });
    }

    const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    const repos = await res.json();
    if (!res.ok) return Response.json({ error: repos }, { status: res.status });
    const summary = repos.map((r) => ({
      full_name: r.full_name,
      name: r.name,
      default_branch: r.default_branch,
      private: r.private,
      updated_at: r.updated_at,
    }));
    return Response.json({ repos: summary });
  } catch (error) {
    console.log('Error caught:', error?.message || String(error));
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}