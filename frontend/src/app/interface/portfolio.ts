export type PortfolioStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type RiskCategory    = 'technical' | 'resource' | 'financial' | 'schedule' | 'scope' | 'external';
export type RiskStatus      = 'identified' | 'mitigated' | 'occurred' | 'closed';
export type DependencyType  = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';

export interface JBudget {
  total:    number;
  spent:    number;
  currency: string;
}

export interface JPortfolio {
  id:             string;
  organizationId: string;
  name:           string;
  description:    string;
  strategicGoals: string[];
  status:         PortfolioStatus;
  startDate:      string | null;
  targetEndDate:  string | null;
  actualEndDate:  string | null;
  budget:         JBudget;
  ownerId:        any;
  stakeholders:   any[];
  color:          string;
  icon:           string;
  createdBy?:     any;
  createdAt:      string;
  updatedAt:      string;
}

export interface JSuccessMetric {
  metric:  string;
  target:  string;
  current: string;
}

export interface JProgram {
  id:               string;
  portfolioId:      string;
  organizationId:   string;
  name:             string;
  description:      string;
  status:           PortfolioStatus;
  startDate:        string | null;
  targetEndDate:    string | null;
  actualEndDate:    string | null;
  budget:           JBudget;
  programManagerId: any;
  objectives:       string[];
  successMetrics:   JSuccessMetric[];
  color:            string;
  icon:             string;
  createdAt:        string;
  updatedAt:        string;
}

export interface JRisk {
  id:             string;
  scopeType:      'portfolio' | 'program' | 'project';
  scopeId:        string;
  title:          string;
  description:    string;
  category:       RiskCategory;
  probability:    number;
  impact:         number;
  riskScore:      number;
  status:         RiskStatus;
  mitigationPlan: string;
  ownerId:        any;
  dueDate:        string | null;
  createdBy?:     any;
  createdAt:      string;
}

export interface JProjectDependency {
  id:            string;
  fromProjectId: any;
  toProjectId:   any;
  type:          DependencyType;
  description:   string;
  isBlocking:    boolean;
  createdBy?:    any;
  createdAt:     string;
}

export interface PortfolioDashboard {
  portfolio: JPortfolio;
  stats: {
    programCount: number;
    projectCount:  number;
    avgProgress:   number;
    budgetUsage:   number;
    statusCounts:  Record<string, number>;
    riskCounts:    Record<string, number>;
  };
}

export interface AiHealthCheck {
  healthScore:         number;
  grade:               string;
  strengths:           string[];
  concerns:            string[];
  recommendations:     string[];
  predictedCompletion: string;
}

export interface AiRiskPrediction {
  predictedRisks: {
    title:               string;
    category:            RiskCategory;
    probability:         number;
    impact:              number;
    rationale:           string;
    suggestedMitigation: string;
  }[];
  overallRiskTrend: 'improving' | 'stable' | 'worsening';
  summary:          string;
}
