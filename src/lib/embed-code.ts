/**
 * Generate embeddable snippet code for a campaign
 */
export function generateEmbedCode(campaignId: string, options?: {
    apiUrl?: string;
    async?: boolean;
}): string {
    const apiUrl = options?.apiUrl || 'https://cdn.playflow.io';
    const asyncAttr = options?.async !== false ? ' async' : '';

    return `<!-- PlayFlow Campaign Widget -->
<script${asyncAttr} src="${apiUrl}/widget/playflow.min.js"></script>
<script>
  window.PLAYFLOW_API_URL = '${apiUrl.replace('/cdn', '/api')}';
  window.PLAYFLOW_CDN_URL = '${apiUrl}';
</script>
<div data-playflow-campaign="${campaignId}"></div>`;
}

/**
 * Generate snippet code for manual initialization
 */
export function generateManualSnippet(campaignId: string, options?: {
    apiUrl?: string;
}): string {
    const apiUrl = options?.apiUrl || 'https://cdn.playflow.io';

    return `<!-- PlayFlow Campaign Widget -->
<script async src="${apiUrl}/widget/playflow.min.js"></script>
<script>
  window.PLAYFLOW_API_URL = '${apiUrl.replace('/cdn', '/api')}';
  window.PLAYFLOW_CDN_URL = '${apiUrl}';
  
  // Run campaign after widget loads
  document.addEventListener('DOMContentLoaded', function() {
    if (window.PlayFlow) {
      window.PlayFlow.run('${campaignId}');
    }
  });
</script>`;
}

/**
 * Generate CDN URLs for a campaign
 */
export function getCampaignUrls(campaignId: string, options?: {
    apiUrl?: string;
    cdnUrl?: string;
}) {
    const apiUrl = options?.apiUrl || 'https://api.playflow.io';
    const cdnUrl = options?.cdnUrl || 'https://cdn.playflow.io';

    return {
        widgetUrl: `${cdnUrl}/widget/playflow.min.js`,
        configUrl: `${apiUrl}/v1/campaigns/${campaignId}/config`,
        eventsUrl: `${apiUrl}/v1/events`,
        previewUrl: `${apiUrl}/preview/${campaignId}`,
    };
}
