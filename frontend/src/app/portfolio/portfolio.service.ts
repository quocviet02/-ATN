import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrganizationService } from '../organization/organization.service';
import { environment } from 'src/environments/environment';
import {
  JPortfolio, JProgram, JRisk, JProjectDependency,
  PortfolioDashboard, AiHealthCheck, AiRiskPrediction
} from '../interface/portfolio';

const BASE = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  constructor(
    private _http: HttpClient,
    private _orgService: OrganizationService,
  ) {}

  private get headers(): HttpHeaders {
    return this._orgService.orgHeaders;
  }

  // ── Portfolios ──────────────────────────────────────────────────────────────

  listPortfolios(): Observable<JPortfolio[]> {
    return this._http.get<JPortfolio[]>(`${BASE}/portfolios`, { headers: this.headers });
  }

  createPortfolio(data: Partial<JPortfolio>): Observable<JPortfolio> {
    return this._http.post<JPortfolio>(`${BASE}/portfolios`, data, { headers: this.headers });
  }

  getPortfolio(id: string): Observable<JPortfolio> {
    return this._http.get<JPortfolio>(`${BASE}/portfolios/${id}`, { headers: this.headers });
  }

  updatePortfolio(id: string, data: Partial<JPortfolio>): Observable<JPortfolio> {
    return this._http.put<JPortfolio>(`${BASE}/portfolios/${id}`, data, { headers: this.headers });
  }

  deletePortfolio(id: string): Observable<any> {
    return this._http.delete(`${BASE}/portfolios/${id}`, { headers: this.headers });
  }

  getPortfolioDashboard(id: string): Observable<PortfolioDashboard> {
    return this._http.get<PortfolioDashboard>(`${BASE}/portfolios/${id}/dashboard`, { headers: this.headers });
  }

  getPortfolioRoadmap(id: string): Observable<any> {
    return this._http.get<any>(`${BASE}/portfolios/${id}/roadmap`, { headers: this.headers });
  }

  getPortfolioDependencies(id: string): Observable<JProjectDependency[]> {
    return this._http.get<JProjectDependency[]>(`${BASE}/portfolios/${id}/dependencies`, { headers: this.headers });
  }

  getPortfolioRiskMatrix(id: string): Observable<any> {
    return this._http.get<any>(`${BASE}/portfolios/${id}/risk-matrix`, { headers: this.headers });
  }

  // ── Programs ────────────────────────────────────────────────────────────────

  listPrograms(portfolioId: string): Observable<JProgram[]> {
    return this._http.get<JProgram[]>(`${BASE}/portfolios/${portfolioId}/programs`, { headers: this.headers });
  }

  createProgram(portfolioId: string, data: Partial<JProgram>): Observable<JProgram> {
    return this._http.post<JProgram>(`${BASE}/portfolios/${portfolioId}/programs`, data, { headers: this.headers });
  }

  getProgram(id: string): Observable<JProgram> {
    return this._http.get<JProgram>(`${BASE}/programs/${id}`);
  }

  updateProgram(id: string, data: Partial<JProgram>): Observable<JProgram> {
    return this._http.put<JProgram>(`${BASE}/programs/${id}`, data);
  }

  deleteProgram(id: string): Observable<any> {
    return this._http.delete(`${BASE}/programs/${id}`);
  }

  getProgramProjects(id: string): Observable<any[]> {
    return this._http.get<any[]>(`${BASE}/programs/${id}/projects`);
  }

  getProgramRoadmap(id: string): Observable<any> {
    return this._http.get<any>(`${BASE}/programs/${id}/roadmap`);
  }

  // ── Risks ───────────────────────────────────────────────────────────────────

  listRisks(scopeType: string, scopeId: string): Observable<JRisk[]> {
    return this._http.get<JRisk[]>(`${BASE}/risks?scopeType=${scopeType}&scopeId=${scopeId}`);
  }

  createRisk(data: Partial<JRisk>): Observable<JRisk> {
    return this._http.post<JRisk>(`${BASE}/risks`, data);
  }

  updateRisk(id: string, data: Partial<JRisk>): Observable<JRisk> {
    return this._http.put<JRisk>(`${BASE}/risks/${id}`, data);
  }

  deleteRisk(id: string): Observable<any> {
    return this._http.delete(`${BASE}/risks/${id}`);
  }

  // ── Dependencies ────────────────────────────────────────────────────────────

  createDependency(data: Partial<JProjectDependency>): Observable<JProjectDependency> {
    return this._http.post<JProjectDependency>(`${BASE}/dependencies`, data);
  }

  deleteDependency(id: string): Observable<any> {
    return this._http.delete(`${BASE}/dependencies/${id}`);
  }

  // ── AI ──────────────────────────────────────────────────────────────────────

  getAiHealthCheck(portfolioId: string): Observable<AiHealthCheck> {
    return this._http.post<AiHealthCheck>(`${BASE}/portfolios/${portfolioId}/ai/health-check`, {}, { headers: this.headers });
  }

  getAiRiskPrediction(portfolioId: string): Observable<AiRiskPrediction> {
    return this._http.post<AiRiskPrediction>(`${BASE}/portfolios/${portfolioId}/ai/risk-prediction`, {}, { headers: this.headers });
  }
}
