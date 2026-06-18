const Groq = require('groq-sdk');
const { Portfolio, Program, Project, Risk } = require('../models');

const groq  = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

async function gatherPortfolioContext(portfolioId) {
  const portfolio = await Portfolio.findById(portfolioId).lean();
  if (!portfolio) return null;
  const programs = await Program.find({ portfolioId }).lean();
  const projects = await Project.find({ portfolioId }).lean();
  const risks    = await Risk.find({ scopeType: 'portfolio', scopeId: portfolioId }).lean();
  return { portfolio, programs, projects, risks };
}

// POST /api/portfolios/:id/ai/health-check
exports.healthCheck = async (req, res) => {
  try {
    const ctx = await gatherPortfolioContext(req.params.id);
    if (!ctx) return res.status(404).json({ message: 'Portfolio not found' });

    const { portfolio, programs, projects, risks } = ctx;
    const avgProgress = projects.length
      ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length)
      : 0;
    const highRisks = risks.filter(r => r.riskScore >= 15).length;
    const budgetPct = portfolio.budget?.total > 0
      ? Math.round((portfolio.budget.spent / portfolio.budget.total) * 100) : 0;

    const prompt = `You are a senior portfolio manager AI. Analyze this portfolio and provide a health assessment.

Portfolio: "${portfolio.name}"
Status: ${portfolio.status}
Programs: ${programs.length}, Projects: ${projects.length}
Average project progress: ${avgProgress}%
Budget used: ${budgetPct}% (${portfolio.budget?.currency || 'VND'})
High risks (score≥15): ${highRisks}
Risk statuses: ${JSON.stringify(risks.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {}))}
Project statuses: ${JSON.stringify(projects.reduce((a, p) => { a[p.status] = (a[p.status] || 0) + 1; return a; }, {}))}

Respond with a JSON object:
{
  "healthScore": <0-100>,
  "grade": <"A"|"B"|"C"|"D"|"F">,
  "strengths": [<string>, ...],
  "concerns": [<string>, ...],
  "recommendations": [<string>, ...],
  "predictedCompletion": <"On track"|"At risk"|"Behind schedule"|"Critical">
}
Only output valid JSON.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL,
      temperature: 0.3,
      max_tokens: 800,
    });

    const text = completion.choices[0]?.message?.content?.trim() || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { healthScore: 50, grade: 'C', strengths: [], concerns: [], recommendations: [], predictedCompletion: 'Unknown' };
    res.json(result);
  } catch (err) {
    console.error('Portfolio AI health-check error:', err);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/portfolios/:id/ai/risk-prediction
exports.riskPrediction = async (req, res) => {
  try {
    const ctx = await gatherPortfolioContext(req.params.id);
    if (!ctx) return res.status(404).json({ message: 'Portfolio not found' });

    const { portfolio, programs, projects, risks } = ctx;

    const prompt = `You are a risk analyst AI. Predict potential risks for this portfolio.

Portfolio: "${portfolio.name}"
Current risks: ${risks.length} (high: ${risks.filter(r => r.riskScore >= 15).length})
Risk categories: ${JSON.stringify(risks.reduce((a, r) => { a[r.category] = (a[r.category] || 0) + 1; return a; }, {}))}
Programs: ${programs.length}, Projects: ${projects.length}
Project statuses: ${JSON.stringify(projects.reduce((a, p) => { a[p.status] = (a[p.status] || 0) + 1; return a; }, {}))}

Predict 3-5 potential emerging risks. Respond with JSON:
{
  "predictedRisks": [
    {
      "title": <string>,
      "category": <"technical"|"resource"|"financial"|"schedule"|"scope"|"external">,
      "probability": <1-5>,
      "impact": <1-5>,
      "rationale": <string>,
      "suggestedMitigation": <string>
    }
  ],
  "overallRiskTrend": <"improving"|"stable"|"worsening">,
  "summary": <string>
}
Only output valid JSON.`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: MODEL,
      temperature: 0.4,
      max_tokens: 1000,
    });

    const text = completion.choices[0]?.message?.content?.trim() || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { predictedRisks: [], overallRiskTrend: 'stable', summary: '' };
    res.json(result);
  } catch (err) {
    console.error('Portfolio AI risk-prediction error:', err);
    res.status(500).json({ message: err.message });
  }
};
