import type { WebhookConfig, WebhookPayload, DeliveryResult, DeliveryOptions } from "../types.js";

export async function deliverGithubPush(
  webhook: WebhookConfig,
  payload: WebhookPayload,
  options: DeliveryOptions = {},
): Promise<DeliveryResult> {
  const config = webhook.config || {};
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return {
      success: false,
      status: 0,
      duration: 0,
      error: "GITHUB_TOKEN environment variable is not set",
    };
  }

  if (!config.githubOwner || !config.githubRepo) {
    return {
      success: false,
      status: 0,
      duration: 0,
      error: "GitHub owner and repo are required",
    };
  }

  const branch = config.githubBranch || "main";
  const startTime = Date.now();

  const fetchGithub = async (url: string, method: string, body?: any) => {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Kyro-CMS-Webhook/1.0",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API HTTP ${res.status}: ${text}`);
    }
    return res.json();
  };

  try {
    // 1. Get branch ref
    const refUrl = `https://api.github.com/repos/${config.githubOwner}/${config.githubRepo}/git/refs/heads/${branch}`;
    const refData = await fetchGithub(refUrl, "GET");
    const commitSha = refData.object.sha;

    // 2. Get commit tree
    const commitUrl = `https://api.github.com/repos/${config.githubOwner}/${config.githubRepo}/git/commits/${commitSha}`;
    const commitData = await fetchGithub(commitUrl, "GET");
    const treeSha = commitData.tree.sha;

    // 3. Create new empty commit
    const newCommitUrl = `https://api.github.com/repos/${config.githubOwner}/${config.githubRepo}/git/commits`;
    const newCommitData = await fetchGithub(newCommitUrl, "POST", {
      message: `Content updated via Kyro CMS (${payload.event})`,
      tree: treeSha,
      parents: [commitSha],
    });
    const newCommitSha = newCommitData.sha;

    // 4. Update ref (This triggers the push event)
    await fetchGithub(refUrl, "PATCH", {
      sha: newCommitSha,
      force: false,
    });

    return {
      success: true,
      status: 201,
      duration: Date.now() - startTime,
      body: `Successfully pushed empty commit ${newCommitSha} to branch ${branch}`,
    };
  } catch (error: any) {
    return {
      success: false,
      status: 0,
      duration: Date.now() - startTime,
      error: error.message || "Failed to push empty commit to GitHub",
    };
  }
}
