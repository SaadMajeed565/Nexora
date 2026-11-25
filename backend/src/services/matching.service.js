// Blueprint matching (FR-3.2). Transparent, explainable scoring so the
// examiner can see exactly why an agent matches: tools 40, keywords 30,
// triggers 15, category 15. Total is a 0-100 percentage.

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'for', 'on', 'with', 'by',
  'is', 'are', 'it', 'its', 'as', 'at', 'from', 'that', 'this', 'you', 'your',
  'we', 'our', 'be', 'will', 'can', 'should', 'per', 'via', 'into', 'about',
  'after', 'before', 'when', 'what', 'how', 'an',
]);

function stem(word) {
  // Light normalisation so "emails" matches "email" and "orders" matches "order".
  return word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word;
}

function words(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .map(stem);
}

function computeMatch(blueprint, agent) {
  // Tools: share of the blueprint's toolkits the agent also has (40 pts).
  const bpToolkits = [...new Set((blueprint.tools || []).map((t) => (t.toolkit || '').toLowerCase()))];
  const agentToolkits = new Set((agent.tools || []).map((t) => (t.toolkit || '').toLowerCase()));
  const matchedToolkits = bpToolkits.filter((tk) => agentToolkits.has(tk));
  const toolsScore = bpToolkits.length ? Math.round((matchedToolkits.length / bpToolkits.length) * 40) : 0;

  // Keywords: share of the blueprint's purpose words found in the agent (30 pts).
  const bpWords = [...new Set(words(`${blueprint.name} ${blueprint.purpose}`))];
  const agentWordSet = new Set(
    words(`${agent.name} ${agent.description} ${(agent.capabilities || []).join(' ')} ${(agent.useCases || []).join(' ')}`)
  );
  const matchedWords = bpWords.filter((w) => agentWordSet.has(w));
  const keywordScore = bpWords.length ? Math.round((matchedWords.length / bpWords.length) * 30) : 0;

  // Triggers: share of the blueprint's triggers the agent also has (15 pts).
  const bpTriggers = (blueprint.triggers || []).map((t) => t.toLowerCase());
  const agentTriggers = (agent.triggers || []).map((t) => t.toLowerCase());
  const matchedTriggers = bpTriggers.filter((bt) =>
    agentTriggers.some((at) => at.includes(bt) || bt.includes(at))
  );
  const triggerScore = bpTriggers.length ? Math.round((matchedTriggers.length / bpTriggers.length) * 15) : 0;

  // Category: the agent's category named in the blueprint (15 pts).
  const categoryScore = `${blueprint.name} ${blueprint.purpose}`
    .toLowerCase()
    .includes((agent.category || '').toLowerCase())
    ? 15
    : 0;

  const score = Math.min(100, toolsScore + keywordScore + triggerScore + categoryScore);
  return {
    score,
    breakdown: { tools: toolsScore, keywords: keywordScore, triggers: triggerScore, category: categoryScore },
    matchedToolkits,
    matchedWords,
  };
}

function rankMatches(blueprint, agents) {
  return agents
    .map((agent) => ({ agent, match: computeMatch(blueprint, agent) }))
    .sort((a, b) => b.match.score - a.match.score);
}

module.exports = { computeMatch, rankMatches };
