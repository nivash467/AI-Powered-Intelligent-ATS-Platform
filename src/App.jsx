import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, CheckCircle2, ShieldAlert, BarChart, Settings2, Sparkles, User, Users, GraduationCap, Briefcase, ChevronDown, Check, X, FileText, Crown, LayoutDashboard, Search, Bell, XCircle, Award, BarChart2, Sliders, Plus, Loader2, Filter, ArrowDownAZ, ArrowUpAZ, ChevronRight, Calendar, TrendingUp, Target, ExternalLink, Activity, Eye, Cpu, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { extractTextFromFile } from './utils/parsing';
import { analyzeResume } from './utils/scoring';
import { generateJobConfig } from './utils/aiGenerator';
import { fetchGitHubCandidateData } from './utils/githubService';
import { fetchLeetCodeCandidateData } from './utils/leetcodeService';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

// --- Sub-Components ---
const CandidateModal = ({ candidate, onClose, onToggleStatus, onUpdateCandidate, platformPreferences }) => {
  const [manualGithub, setManualGithub] = useState('');
  const [isFetchingGithub, setIsFetchingGithub] = useState(false);
  const [manualLeetcode, setManualLeetcode] = useState('');
  const [isFetchingLeetcode, setIsFetchingLeetcode] = useState(false);

  if (!candidate) return null;

  // AI Recommendation Logic
  const generateRecommendation = () => {
    let text = `Candidate demonstrates foundational knowledge in the required domain. `;
    if (candidate.score >= 80) {
      text = `This is a highly recommended profile. The candidate strongly matches core requirements, particularly with ${candidate.foundSkills.slice(0, 2).join(' and ')}. `;
    } else if (candidate.score < 50) {
      text = `This candidate falls below the recommended ATS threshold. `;
    }

    if (candidate.missingSkills.length > 0) {
      text += `However, technical gaps were identified regarding ${candidate.missingSkills.slice(0, 3).join(', ')}. `;
      if (candidate.score >= 70) text += `Consider evaluating their ability to learn these quickly.`;
      else text += `This significantly impacts their overall capability for this specific role.`;
    } else {
      text += `They possess all the critical hard skills evaluated for this position.`;
    }

    return text;
  };

  // Score Color logic 
  const getScoreColor = (score) => {
    if (score >= 70) return 'var(--success)';
    if (score >= 40) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getScoreLabel = (score) => {
    if (score >= 70) return "Strong Match";
    if (score >= 40) return "Moderate Match";
    return "Needs Review";
  };

  const sColor = getScoreColor(candidate.score);

  const handleManualGithubFetch = async () => {
    if (!manualGithub.trim()) return;
    setIsFetchingGithub(true);
    try {
      // Basic extraction if they paste a full URL instead of just the username
      const usernameMatch = manualGithub.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
      const usernameToFetch = usernameMatch ? usernameMatch[1] : manualGithub.trim();

      const realGitHubData = await fetchGitHubCandidateData(usernameToFetch);

      if (realGitHubData && onUpdateCandidate) {
        // Build an updated candidate object
        const updatedCandidate = {
          ...candidate,
          intelligence: {
            ...candidate.intelligence,
            github_url: realGitHubData.github_url,
            github_username: realGitHubData.github_username,
            github_avatar: realGitHubData.github_avatar,
            github_repo_count: realGitHubData.github_repo_count,
            github_stars: realGitHubData.github_stars,
            github_forks: realGitHubData.github_forks,
            github_commit_activity: realGitHubData.github_commit_activity,
            languages_used: realGitHubData.languages_used
          }
        };
        onUpdateCandidate(candidate.id, updatedCandidate);
      } else {
        alert("Could not find a GitHub profile for that username.");
      }
    } catch (error) {
      console.error(error);
      alert("Error fetching GitHub profile.");
    } finally {
      setIsFetchingGithub(false);
      setManualGithub('');
    }
  };

  const handleManualLeetcodeFetch = async () => {
    if (!manualLeetcode.trim()) return;
    setIsFetchingLeetcode(true);
    try {
      const usernameMatch = manualLeetcode.match(/(?:https?:\/\/)?(?:www\.)?leetcode\.com(?:\/u)?\/([a-zA-Z0-9_-]+)/i);
      const usernameToFetch = usernameMatch ? usernameMatch[1] : manualLeetcode.trim();

      const realLeetCodeData = await fetchLeetCodeCandidateData(usernameToFetch);

      if (realLeetCodeData && onUpdateCandidate) {
        const updatedCandidate = {
          ...candidate,
          intelligence: {
            ...candidate.intelligence,
            leetcode_url: realLeetCodeData.leetcode_url,
            leetcode_username: realLeetCodeData.leetcode_username,
            leetcode_avatar: realLeetCodeData.leetcode_avatar,
            leetcode_total_solved: realLeetCodeData.total_solved,
            leetcode_easy_solved: realLeetCodeData.easy_solved,
            leetcode_medium_solved: realLeetCodeData.medium_solved,
            leetcode_hard_solved: realLeetCodeData.hard_solved,
            leetcode_ranking: realLeetCodeData.ranking
          }
        };
        onUpdateCandidate(candidate.id, updatedCandidate);
      } else {
        alert("Could not find a LeetCode profile for that username.");
      }
    } catch (error) {
      console.error(error);
      alert("Error fetching LeetCode profile.");
    } finally {
      setIsFetchingLeetcode(false);
      setManualLeetcode('');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Candidate Analysis Profile</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Detailed ATS breakdown and resume insights.</p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Section 1 & 2: Overview & Main Score */}
          <div className="grid-2">
            <section>
              <h3 className="section-title"><User size={18} /> Candidate Overview</h3>
              <div className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ width: '64px', height: '64px', background: 'var(--bg-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  <User size={32} />
                </div>
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{candidate.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 1rem' }}>
                    <span style={{ fontWeight: 500 }}>Experience:</span> <span>{candidate.experienceDetected} Years</span>
                    <span style={{ fontWeight: 500 }}>Education:</span> <span>{candidate.education}</span>
                    <span style={{ fontWeight: 500 }}>File:</span> <span>{candidate.fileName}</span>
                    {candidate.personal_info?.linkedin_url && (
                      <><span style={{ fontWeight: 500 }}>LinkedIn:</span> <span><a href={candidate.personal_info.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>{candidate.personal_info.linkedin_username || 'Profile'}</a></span></>
                    )}
                  </div>
                </div>
              </div>
            </section>
            <section>
              <h3 className="section-title"><Award size={18} /> Overall ATS Score</h3>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '141px' }}>
                <div style={{ fontSize: '3rem', fontWeight: 800, color: sColor, lineHeight: 1 }}>
                  {candidate.score}<span style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>/100</span>
                </div>
                <div style={{ width: '80%', height: '8px', background: 'var(--bg-color)', borderRadius: '4px', margin: '1rem 0 0.5rem', overflow: 'hidden' }}>
                  <div style={{ width: `${candidate.score}%`, height: '100%', background: sColor }}></div>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: sColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {getScoreLabel(candidate.score)}
                </div>
              </div>
            </section>
          </div>

          {/* Section 3: Score Breakdown */}
          <section>
            <h3 className="section-title"><LayoutDashboard size={18} /> ATS Score Breakdown</h3>
            <div className="grid-metrics">
              <div className="metric-item">
                <div className="metric-header">
                  <span className="metric-label">Skill Match Score</span>
                  <span className="metric-value">{candidate.breakdown.skillsScore} / 50</span>
                </div>
                <div className="metric-bar-bg"><div className="metric-bar-fill" style={{ width: `${(candidate.breakdown.skillsScore / 50) * 100}%`, background: 'var(--primary)' }}></div></div>
              </div>
              <div className="metric-item">
                <div className="metric-header">
                  <span className="metric-label">Experience Score</span>
                  <span className="metric-value">{candidate.breakdown.expScore} / 25</span>
                </div>
                <div className="metric-bar-bg"><div className="metric-bar-fill" style={{ width: `${(candidate.breakdown.expScore / 25) * 100}%`, background: 'var(--primary)' }}></div></div>
              </div>
              <div className="metric-item">
                <div className="metric-header">
                  <span className="metric-label">Education Score</span>
                  <span className="metric-value">{candidate.breakdown.eduScore} / 10</span>
                </div>
                <div className="metric-bar-bg"><div className="metric-bar-fill" style={{ width: `${(candidate.breakdown.eduScore / 10) * 100}%`, background: 'var(--primary)' }}></div></div>
              </div>
              <div className="metric-item">
                <div className="metric-header">
                  <span className="metric-label">Certification Score</span>
                  <span className="metric-value">{candidate.breakdown.certScore} / 10</span>
                </div>
                <div className="metric-bar-bg"><div className="metric-bar-fill" style={{ width: `${(candidate.breakdown.certScore / 10) * 100}%`, background: 'var(--primary)' }}></div></div>
              </div>
              <div className="metric-item">
                <div className="metric-header">
                  <span className="metric-label">Resume Quality Score</span>
                  <span className="metric-value">{candidate.breakdown.qualityScore} / 5</span>
                </div>
                <div className="metric-bar-bg"><div className="metric-bar-fill" style={{ width: `${(candidate.breakdown.qualityScore / 5) * 100}%`, background: 'var(--primary)' }}></div></div>
              </div>
            </div>
          </section>

          {/* Section 4: Candidate Intelligence (Advanced Signals) */}
          {candidate.intelligence && (
            <section>
              <h3 className="section-title"><BarChart size={18} /> Candidate Intelligence</h3>

              {/* LinkedIn Profile Card */}
              <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
                {candidate.intelligence.linkedin_url ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: 48, height: 48, borderRadius: '8px', background: '#0a66c2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.2rem' }}>
                        in
                      </div>
                      <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          {candidate.intelligence.linkedin_username || 'LinkedIn Profile'}
                        </div>
                        <a href={candidate.intelligence.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                          {candidate.intelligence.linkedin_url.replace('https://www.', '')}
                        </a>
                      </div>
                    </div>
                    <a href={candidate.intelligence.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.5rem 1rem', fontSize: '0.85rem', background: '#0a66c2', color: '#fff', border: 'none', borderRadius: '8px' }}>
                      <ExternalLink size={16} /> View LinkedIn Profile
                    </a>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '8px', background: 'rgba(10, 102, 194, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a66c2', fontWeight: 700, fontSize: '1.2rem', marginBottom: '1rem' }}>
                      in
                    </div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No LinkedIn profile detected in resume.</h4>
                  </div>
                )}
              </div>

              {/* GitHub Stats Row or Fallback */}
              <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
                {candidate.intelligence.github_url ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {candidate.intelligence.github_avatar ? (
                          <img src={candidate.intelligence.github_avatar} alt="Avatar" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                            <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub" style={{ width: 24, height: 24, filter: 'grayscale(100%) opacity(0.7)' }} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub" style={{ width: 14, height: 14, filter: 'grayscale(100%) opacity(0.7)' }} />
                            {candidate.intelligence.github_username || 'GitHub Profile'}
                          </div>
                          {candidate.intelligence.github_url && (
                            <a href={candidate.intelligence.github_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                              {candidate.intelligence.github_url.replace('https://', '')}
                            </a>
                          )}
                        </div>
                      </div>
                      {candidate.intelligence.github_url && (
                        <a href={candidate.intelligence.github_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                          <ExternalLink size={16} /> View GitHub Profile
                        </a>
                      )}
                    </div>
                    {candidate.intelligence.github_data_missing ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--bg-color)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                        <ShieldAlert size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                        <div style={{ fontWeight: 500 }}>Profile detected but data unavailable</div>
                      </div>
                    ) : (
                      <>
                        <div className="grid-metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{candidate.intelligence.github_repo_count}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Repositories</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{candidate.intelligence.github_stars}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Stars Earned</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{candidate.intelligence.github_forks}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Forks</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{candidate.intelligence.github_commit_activity}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Commits (Ytd)</div>
                          </div>
                        </div>

                        {candidate.intelligence.languages_used && candidate.intelligence.languages_used.length > 0 && (
                          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Languages Identified on GitHub</div>
                            <div className="chip-container">
                              {candidate.intelligence.languages_used.map(lang => (
                                <span key={lang} className="chip" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>{lang}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', textAlign: 'center' }}>
                    <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub" style={{ width: 32, height: 32, filter: 'grayscale(100%) opacity(0.3)', marginBottom: '1rem' }} />
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No GitHub profile detected in the resume.</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '400px' }}>
                      We couldn't automatically find a GitHub link. You can manually enter their username to pull open-source intelligence.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '350px' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. torvalds"
                        value={manualGithub}
                        onChange={(e) => setManualGithub(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleManualGithubFetch()}
                        disabled={isFetchingGithub}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={handleManualGithubFetch}
                        disabled={isFetchingGithub || !manualGithub.trim()}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {isFetchingGithub ? <Loader2 size={16} className="spin" /> : 'Fetch Data'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* LeetCode Stats Card */}
              <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
                {candidate.intelligence.leetcode_url ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {candidate.intelligence.leetcode_avatar ? (
                          <img src={candidate.intelligence.leetcode_avatar} alt="LeetCode Avatar" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFA116' }} />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FFA116', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>
                            LC
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {candidate.intelligence.leetcode_username || 'LeetCode Profile'}
                          </div>
                          <a href={candidate.intelligence.leetcode_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                            {candidate.intelligence.leetcode_url.replace('https://', '')}
                          </a>
                        </div>
                      </div>
                      <a href={candidate.intelligence.leetcode_url} target="_blank" rel="noopener noreferrer" className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.5rem 1rem', fontSize: '0.85rem', background: '#FFA116', color: '#fff', border: 'none', borderRadius: '8px' }}>
                        <ExternalLink size={16} /> View LeetCode Profile
                      </a>
                    </div>

                    {candidate.intelligence.leetcode_data_missing ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--bg-color)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                        <ShieldAlert size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                        <div style={{ fontWeight: 500 }}>Profile detected but data unavailable</div>
                      </div>
                    ) : (
                      <>
                        {/* Total Solved + Ranking Row */}
                        <div className="grid-metrics" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '1rem' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{candidate.intelligence.leetcode_total_solved}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Solved</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#00b8a3' }}>{candidate.intelligence.leetcode_easy_solved}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Easy</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFA116' }}>{candidate.intelligence.leetcode_medium_solved}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Medium</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4743' }}>{candidate.intelligence.leetcode_hard_solved}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Hard</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{candidate.intelligence.leetcode_ranking ? `#${candidate.intelligence.leetcode_ranking.toLocaleString()}` : 'N/A'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Global Rank</div>
                          </div>
                        </div>

                        {/* Difficulty Breakdown Bars */}
                        {candidate.intelligence.leetcode_total_solved > 0 && (
                          <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Difficulty Breakdown</div>
                            <div style={{ display: 'flex', gap: '0.5rem', height: '12px', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg-color)' }}>
                              <div style={{ width: `${(candidate.intelligence.leetcode_easy_solved / candidate.intelligence.leetcode_total_solved) * 100}%`, background: '#00b8a3', borderRadius: '6px 0 0 6px', transition: 'width 0.5s ease' }}></div>
                              <div style={{ width: `${(candidate.intelligence.leetcode_medium_solved / candidate.intelligence.leetcode_total_solved) * 100}%`, background: '#FFA116', transition: 'width 0.5s ease' }}></div>
                              <div style={{ width: `${(candidate.intelligence.leetcode_hard_solved / candidate.intelligence.leetcode_total_solved) * 100}%`, background: '#ef4743', borderRadius: '0 6px 6px 0', transition: 'width 0.5s ease' }}></div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00b8a3', display: 'inline-block' }}></span> Easy</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFA116', display: 'inline-block' }}></span> Medium</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4743', display: 'inline-block' }}></span> Hard</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255, 161, 22, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFA116', fontWeight: 700, fontSize: '1rem', marginBottom: '1rem' }}>
                      LC
                    </div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No LeetCode profile detected in the resume.</h4>
                  </div>
                )}
              </div>

              {/* Candidate Evaluation Pipeline */}
              <div style={{ padding: '1.5rem', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <TrendingUp size={18} color="var(--primary)" />
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>AI Candidate Pipeline</h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{(candidate.intelligence.math_g / 100).toFixed(2)}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>GitHub Output</div>
                    <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '0.2rem' }}>w={(platformPreferences?.weights?.g / 100).toFixed(2) || '0.30'}</div>
                  </div>
                  <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{(candidate.intelligence.math_p / 100).toFixed(2)}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Project Match</div>
                    <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '0.2rem' }}>w={(platformPreferences?.weights?.p / 100).toFixed(2) || '0.25'}</div>
                  </div>
                  <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{(candidate.intelligence.math_q / 100).toFixed(2)}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Code Quality</div>
                    <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '0.2rem' }}>w={(platformPreferences?.weights?.q / 100).toFixed(2) || '0.15'}</div>
                  </div>
                  <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{(candidate.intelligence.math_l / 100).toFixed(2)}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>LeetCode Rank</div>
                    <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '0.2rem' }}>w={(platformPreferences?.weights?.l / 100).toFixed(2) || '0.10'}</div>
                  </div>
                  <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{(candidate.intelligence.math_r / 100).toFixed(2)}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Resume Trust</div>
                    <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '0.2rem' }}>w={(platformPreferences?.weights?.r / 100).toFixed(2) || '0.10'}</div>
                  </div>
                  <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{(candidate.intelligence.math_t / 100).toFixed(2)}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Trajectory</div>
                    <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '0.2rem' }}>w={(platformPreferences?.weights?.t / 100).toFixed(2) || '0.10'}</div>
                  </div>
                </div>

                <div style={{ background: 'var(--primary)', color: 'white', padding: '1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.95 }}>Final AI Evaluation</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '4px', opacity: 0.85 }}>Based on overall multi-platform candidate signals</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>{candidate.intelligence.math_P_hire}%</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '4px' }}>Hiring Probability</div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section 5: AI Recommendation */}
          <section>
            <h3 className="section-title"><Sparkles size={18} /> AI Hiring Recommendation</h3>
            <div className="ai-recommendation-box">
              {generateRecommendation()}
            </div>
          </section>

          {/* Section 5: Skill Analysis */}
          <section>
            <h3 className="section-title"><CheckCircle2 size={18} /> Detailed Skill Analysis</h3>
            <div className="card">
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Matched Skills</div>
                <div className="chip-container">
                  {candidate.foundSkills.length > 0 ? candidate.foundSkills.map(skill => (
                    <span key={skill} className="chip found"><Check size={12} /> {skill}</span>
                  )) : <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No required skills matched.</span>}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Missing Skills</div>
                <div className="chip-container">
                  {candidate.missingSkills.length > 0 ? candidate.missingSkills.map(skill => (
                    <span key={skill} className="chip missing"><X size={12} /> {skill}</span>
                  )) : <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>All core skills matched!</span>}
                </div>
              </div>
            </div>
          </section>

          {/* Section 6: Key Projects */}
          {candidate.personal_info?.projects && candidate.personal_info.projects.length > 0 && (
            <section>
              <h3 className="section-title"><Briefcase size={18} /> Identified Projects</h3>
              <div className="card">
                <ul style={{ paddingLeft: '1.5rem', margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {candidate.personal_info.projects.map((proj, idx) => (
                    <li key={idx} style={{ marginBottom: '0.5rem' }}>{proj}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Section 7: Resume Preview */}
          <section>
            <h3 className="section-title"><FileText size={18} /> Resume Preview</h3>
            <div className="resume-preview-container">
              {candidate.fileUrl && candidate.fileName.toLowerCase().endsWith('.pdf') ? (
                <iframe src={candidate.fileUrl} width="100%" height="100%" style={{ border: 'none' }} title="Resume PDF" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
                  <FileText size={48} />
                  <p>File preview not available for this format ({candidate.fileName})</p>
                  {candidate.fileUrl && (
                    <a href={candidate.fileUrl} download={candidate.fileName} className="btn btn-outline">
                      Download File Instead
                    </a>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
          {candidate.isShortlisted ? (
            <button className="btn" style={{ background: 'var(--danger)', color: 'white' }} onClick={() => onToggleStatus(candidate.id)}>
              <XCircle size={16} /> Reject Candidate
            </button>
          ) : (
            <button className="btn" style={{ background: 'var(--success)', color: 'white' }} onClick={() => onToggleStatus(candidate.id)}>
              <CheckCircle2 size={16} /> Shortlist Candidate
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ChipInput = ({ label, items, onChange, placeholder, isAiGenerated }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = inputValue.trim();
      if (val && !items.includes(val)) {
        onChange([...items, val]);
      }
      setInputValue('');
    }
  };

  const removeChip = (indexToRemove) => {
    onChange(items.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {isAiGenerated && <span className="ai-badge"><Sparkles size={10} /> AI Generated</span>}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="btn btn-outline"
            onClick={(e) => {
              e.preventDefault();
              if (inputValue.trim() && !items.includes(inputValue.trim())) {
                onChange([...items, inputValue.trim()]);
                setInputValue('');
              }
            }}
          >
            <Plus size={16} /> Add
          </button>
        </div>
        {items.length > 0 && (
          <div className="chip-container">
            {items.map((item, index) => (
              <div key={index} className="chip">
                {item}
                <button onClick={(e) => { e.preventDefault(); removeChip(index); }}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  // 1. Navigation State
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard', 'config', 'analytics', 'profile', 'preferences'
  const navigate = useNavigate();

  // 1.1 User Menu & Logout State
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('hrUser');
    localStorage.removeItem('userSession');
    sessionStorage.clear();
    setShowLogoutModal(false);
    navigate('/login', { replace: true });
  };

  // 2. Job Config State
  const [jobConfig, setJobConfig] = useState({
    title: 'Senior Frontend Developer',
    description: 'Looking for an experienced React developer to build modern web interfaces within an agile team.',
    skills: ['JavaScript', 'TypeScript', 'React', 'HTML', 'CSS', 'Redux', 'Webpack'],
    experience: 5,
    education: "Bachelor's Degree",
    certifications: ['AWS Developer Associate'],
    threshold: 70
  });

  // 2.1 Settings State: HR Profile
  const [hrProfile, setHrProfile] = useState({
    fullName: '',
    role: 'Recruiter',
    email: '',
    phone: '',
    companyName: '',
    industry: '',
    companySize: '',
    location: '',
    website: '',
    notifications: {
      newResumes: true,
      exceedsThreshold: true,
      shortlisted: false
    }
  });

  const [profileStatus, setProfileStatus] = useState({ loading: false, success: false, error: null });

  // Fetch HR Profile on Mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem('hrUser') || '{}');
        if (!storedUser?.email) return;

        const res = await fetch(`http://localhost:8000/auth/profile?email=${storedUser.email}`);
        if (res.ok) {
          const data = await res.json();
          setHrProfile(prev => ({
            ...prev,
            fullName: data.full_name || '',
            email: data.email || storedUser.email,
            phone: data.phone_number || '',
            role: data.role || 'Recruiter',
            companyName: data.company_name || '',
            industry: data.industry || '',
            companySize: data.company_size || '',
            location: data.location || '',
            website: data.company_website || ''
          }));
        } else {
          setHrProfile(prev => ({ ...prev, email: storedUser.email }));
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    };
    fetchProfile();
  }, []);

  const handleUpdateProfile = async () => {
    setProfileStatus({ loading: true, success: false, error: null });
    try {
      const storedUser = JSON.parse(localStorage.getItem('hrUser') || '{}');
      const emailToUse = storedUser?.email || hrProfile.email;

      const res = await fetch('http://localhost:8000/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailToUse,
          full_name: hrProfile.fullName,
          phone_number: hrProfile.phone,
          company_name: hrProfile.companyName,
          industry: hrProfile.industry,
          company_size: hrProfile.companySize,
          location: hrProfile.location,
          company_website: hrProfile.website
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update profile');
      }

      setProfileStatus({ loading: false, success: true, error: null });
      setTimeout(() => setProfileStatus(prev => ({ ...prev, success: false })), 3000);

      const fetchRes = await fetch(`http://localhost:8000/auth/profile?email=${emailToUse}`);
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        setHrProfile(prev => ({
          ...prev,
          fullName: data.full_name || '',
          phone: data.phone_number || '',
          companyName: data.company_name || '',
          industry: data.industry || '',
          companySize: data.company_size || '',
          location: data.location || '',
          website: data.company_website || ''
        }));
      }
    } catch (err) {
      setProfileStatus({ loading: false, success: false, error: err.message });
      setTimeout(() => setProfileStatus(prev => ({ ...prev, error: null })), 5000);
    }
  };

  // 2.2 Settings State: Platform Preferences
  const [platformPreferences, setPlatformPreferences] = useState({
    weights: {
      g: 30, // GitHub
      p: 25, // Projects
      q: 15, // Code Quality
      l: 10, // LeetCode
      r: 10, // Resume Trust
      t: 10  // Trajectory
    },
    shortlistThreshold: 70, // Synced to jobConfig optionally
    aiModel: {
      name: 'llama3:8b',
      engine: 'Ollama',
      temperature: 0.3,
      maxTokens: 2048
    },
    analysisToggles: {
      github: true,
      leetcode: true,
      linkedin: true,
      projects: true,
      certifications: true
    }
  });

  // 3. AI Generator State
  const [aiRoleInput, setAiRoleInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTags, setAiTags] = useState({ title: false, desc: false, skills: false, exp: false, edu: false, certs: false });

  // 4. Candidates State
  const [candidates, setCandidates] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc');
  const [minScoreFilter, setMinScoreFilter] = useState(0);
  const [isAnonymousMode, setIsAnonymousMode] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const preventBrowserDrop = (e) => e.preventDefault();
    window.addEventListener('dragover', preventBrowserDrop);
    window.addEventListener('drop', preventBrowserDrop);
    return () => {
      window.removeEventListener('dragover', preventBrowserDrop);
      window.removeEventListener('drop', preventBrowserDrop);
    };
  }, []);

  // --- Handlers ---
  const handleConfigChange = (name, value) => {
    setJobConfig(prev => ({ ...prev, [name]: value }));
    if (aiTags[name]) setAiTags(prev => ({ ...prev, [name]: false })); // remove AI tag if manually edited
  };

  const handleAiGenerate = async () => {
    if (!aiRoleInput.trim()) return;
    setIsGenerating(true);
    try {
      const config = await generateJobConfig(aiRoleInput);
      setJobConfig(prev => ({
        ...prev,
        title: config.job_title,
        description: config.job_description,
        skills: config.required_skills.split(',').map(s => s.trim()).filter(s => s),
        experience: config.minimum_experience,
        education: config.education_level,
        certifications: config.certifications ? config.certifications.split(',').map(s => s.trim()).filter(s => s) : []
      }));

      setAiTags({ title: true, desc: true, skills: true, exp: true, edu: true, certs: !!config.certifications });
      setAiRoleInput('');
    } catch (err) {
      alert(err.message || "Failed to generate configuration.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;
    setIsProcessing(true);

    try {
      const newCandidates = [];
      for (const file of files) {
        try {
          const text = await extractTextFromFile(file);
          // Pass platformPreferences to scoring engine so mathematical toggles/weights are used
          const analysis = await analyzeResume(text, jobConfig, platformPreferences);
          const name = file.name.replace(/\.[^/.]+$/, "");

          newCandidates.push({
            id: crypto.randomUUID(),
            name,
            fileName: file.name,
            fileUrl: URL.createObjectURL(file), // Store object URL for previewing
            ...analysis
          });
        } catch (err) {
          console.error(`Failed to process ${file.name}:`, err);
          alert(`Failed to process ${file.name}. Please ensure it is a valid PDF or DOCX file.`);
        }
      }
      setCandidates(prev => [...prev, ...newCandidates].sort((a, b) => b.score - a.score));
      setActiveView('dashboard'); // Auto-switch to dashboard on upload
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleShortlistStatus = (id) => {
    setCandidates(prev => prev.map(cand => cand.id === id ? { ...cand, isShortlisted: !cand.isShortlisted } : cand));
  };

  const removeCandidate = (id) => {
    setCandidates(prev => prev.filter(cand => cand.id !== id));
  };

  // --- Derived State & Charts ---
  const filteredAndSortedCandidates = [...candidates]
    .filter(cand => cand.score >= minScoreFilter)
    .sort((a, b) => sortOrder === 'desc' ? b.score - a.score : a.score - b.score);

  const getScoreDistribution = () => {
    const dist = [
      { name: '0-20', count: 0 }, { name: '21-40', count: 0 },
      { name: '41-60', count: 0 }, { name: '61-80', count: 0 }, { name: '81-100', count: 0 },
    ];
    candidates.forEach(cand => {
      if (cand.score <= 20) dist[0].count++;
      else if (cand.score <= 40) dist[1].count++;
      else if (cand.score <= 60) dist[2].count++;
      else if (cand.score <= 80) dist[3].count++;
      else dist[4].count++;
    });
    return dist;
  };

  const getSkillComparisonData = () => {
    return filteredAndSortedCandidates.slice(0, 5).map(cand => ({
      name: isAnonymousMode ? `C #${cand.id.substring(0, 4).toUpperCase()}` : cand.name.substring(0, 10) + '..',
      Exact: cand.breakdown.exactSkillsScore,
      Semantic: cand.breakdown.semanticSkillsScore
    }));
  };

  // Modal Derived State
  const activeCandidateProfile = candidates.find(c => c.id === selectedCandidateId);

  return (
    <div className="app-container"
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
    >
      {/* Global Drag Overlay */}
      {isDragOver && (
        <div
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleFileUpload({ target: { files: e.dataTransfer.files } });
            }
          }}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            background: 'rgba(79, 70, 229, 0.15)',
            backdropFilter: 'blur(4px)',
            border: '3px dashed var(--primary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease'
          }}>
          <div style={{ pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ background: 'var(--primary)', color: 'white', padding: '1.5rem', borderRadius: '50%', marginBottom: '1rem', boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4)' }}>
              <UploadCloud size={48} />
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>Drop Resumes to Upload</h2>
            <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Supports PDF and DOCX formats</p>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="top-navbar">
        <div className="logo-section">
          <div className="logo-icon"><Briefcase size={20} /></div>
          <span className="nav-title">Intelligent ATS Platform</span>
        </div>
        <div className="nav-right">
          <div className="search-bar">
            <Search size={16} color="var(--text-secondary)" />
            <input type="text" placeholder="Search candidates, roles..." />
          </div>
          <Bell className="nav-icon" size={20} />
          {/* User Avatar Dropdown */}
          <div style={{ position: 'relative' }}>
            <div className="avatar" onClick={() => setShowUserMenu(!showUserMenu)} style={{ cursor: 'pointer' }}>HR</div>
            {showUserMenu && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} onClick={() => setShowUserMenu(false)} />
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '220px', background: '#fff', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 12px 36px -8px rgba(0,0,0,0.15)', zIndex: 1000, overflow: 'hidden', animation: 'loginFadeIn 0.15s ease' }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{hrProfile.fullName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{hrProfile.email}</div>
                  </div>
                  <div style={{ padding: '0.35rem' }}>
                    <div onClick={() => { setActiveView('profile'); setShowUserMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <User size={16} color="var(--text-secondary)" /> Profile
                    </div>
                    <div onClick={() => { setActiveView('preferences'); setShowUserMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <Settings2 size={16} color="var(--text-secondary)" /> Settings
                    </div>
                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.25rem 0' }} />
                    <div onClick={() => { setShowUserMenu(false); setShowLogoutModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, color: '#ef4444', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <LogOut size={16} color="#ef4444" /> Logout
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="body-container">
        {/* Left Sidebar Navigation */}
        <aside className="left-sidebar">
          {/* Main Menu */}
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', padding: '0.5rem 1rem', letterSpacing: '0.05em' }}>
            Main Menu
          </div>
          <div
            className={`sidebar-item ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveView('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Pipeline Dashboard</span>
          </div>
          <div
            className={`sidebar-item ${activeView === 'config' ? 'active' : ''}`}
            onClick={() => setActiveView('config')}
          >
            <Settings2 size={18} />
            <span>Job Configuration</span>
          </div>
          <div
            className={`sidebar-item ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('analytics')}
          >
            <BarChart2 size={18} />
            <span>Candidate Analytics</span>
          </div>

          {/* Quick Actions */}
          <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', padding: '0.5rem 1rem', letterSpacing: '0.05em' }}>
            Quick Actions
          </div>
          <div className="sidebar-item" onClick={() => fileInputRef.current?.click()}>
            <UploadCloud size={18} />
            <span>Upload Resumes</span>
          </div>
          <div className="sidebar-item" onClick={() => { setActiveView('config'); setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100); }}>
            <Sparkles size={18} />
            <span>Generate Quick AI Job</span>
          </div>

          {/* Settings */}
          <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', padding: '0.5rem 1rem', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Settings
            </div>
            <div
              className={`sidebar-item ${activeView === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveView('profile')}
            >
              <User size={18} />
              <span>HR Profile</span>
            </div>
            <div
              className={`sidebar-item ${activeView === 'preferences' ? 'active' : ''}`}
              onClick={() => setActiveView('preferences')}
            >
              <Sliders size={18} />
              <span>Platform Preferences</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          {activeView === 'config' && (
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div className="page-header">
                <h1 className="page-title">Job Configuration Manager</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                  Define the parameters for the ATS scoring engine or let our AI assist you.
                </p>
              </div>

              {/* AI Job Generator Card */}
              <div className="card" style={{
                marginBottom: '2rem',
                border: '1px solid var(--accent-secondary)',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(79, 70, 229, 0.08) 100%)'
              }}>
                <div className="card-title">
                  <Sparkles size={20} color="var(--accent-secondary)" />
                  AI Job Configuration Assistant
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Machine Learning Engineer, Frontend Developer, Cloud Engineer, Data Scientist"
                      value={aiRoleInput}
                      onChange={(e) => setAiRoleInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiGenerate()}
                      style={{ background: 'white', borderColor: 'var(--accent-secondary)' }}
                    />
                    <p style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', marginTop: '0.5rem' }}>
                      The AI will completely auto-fill the forms below based on modern domain requirements.
                    </p>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleAiGenerate}
                    disabled={isGenerating || !aiRoleInput.trim()}
                    style={{
                      background: 'var(--primary)',
                      borderColor: 'var(--primary)',
                      color: 'white',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {isGenerating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                    {isGenerating ? 'Generating...' : 'Generate Configuration'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Card 1: Core Details */}
                <div className="card">
                  <div className="card-title"><FileText size={18} /> Core Details</div>
                  <div className="form-group">
                    <label className="form-label">
                      Job Title
                      {aiTags.title && <span className="ai-badge"><Sparkles size={10} /> AI Generated</span>}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={jobConfig.title}
                      onChange={(e) => handleConfigChange('title', e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">
                      Job Description
                      {aiTags.desc && <span className="ai-badge"><Sparkles size={10} /> AI Generated</span>}
                    </label>
                    <textarea
                      className="form-textarea"
                      value={jobConfig.description}
                      onChange={(e) => handleConfigChange('description', e.target.value)}
                    />
                  </div>
                </div>

                {/* Card 2: Requirements */}
                <div className="card">
                  <div className="card-title"><CheckCircle2 size={18} /> Requirements</div>

                  <div style={{ marginBottom: '1rem' }}>
                    <ChipInput
                      label="Required Skills"
                      items={jobConfig.skills}
                      onChange={(newSkills) => handleConfigChange('skills', newSkills)}
                      placeholder="Type skill & press Enter"
                      isAiGenerated={aiTags.skills}
                    />
                  </div>

                  <div style={{ marginBottom: 0 }}>
                    <ChipInput
                      label="Certifications (Optional)"
                      items={jobConfig.certifications}
                      onChange={(newCerts) => handleConfigChange('certifications', newCerts)}
                      placeholder="Type cert & press Enter"
                      isAiGenerated={aiTags.certs}
                    />
                  </div>
                </div>

                {/* Card 3: Hiring Criteria */}
                <div className="card">
                  <div className="card-title"><Crown size={18} /> Hiring Criteria</div>

                  <div className="grid-2" style={{ marginBottom: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        Minimum Experience (Years)
                        {aiTags.exp && <span className="ai-badge"><Sparkles size={10} /> AI Generated</span>}
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={jobConfig.experience}
                        onChange={(e) => handleConfigChange('experience', Number(e.target.value))}
                        min="0"
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        Education Level
                        {aiTags.edu && <span className="ai-badge"><Sparkles size={10} /> AI Generated</span>}
                      </label>
                      <select
                        className="form-select"
                        value={jobConfig.education}
                        onChange={(e) => handleConfigChange('education', e.target.value)}
                      >
                        <option value="">Any / Unspecified</option>
                        <option value="Associate's Degree">Associate's Degree</option>
                        <option value="Bachelor's Degree">Bachelor's Degree</option>
                        <option value="Master's Degree">Master's Degree</option>
                        <option value="Ph.D.">Ph.D. or Doctorate</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0, paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <label className="form-label">ATS Shortlisting Threshold (%)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={jobConfig.threshold}
                      onChange={(e) => handleConfigChange('threshold', Number(e.target.value))}
                      min="0" max="100"
                    />
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                      Candidates scoring below this threshold will automatically be moved to "Rejected" status in the pipeline.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'dashboard' && (
            <div
              style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', minHeight: '80vh' }}
            >
              <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 className="page-title">Candidate Pipeline Dashboard</h1>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Scoring against: <strong style={{ color: 'var(--primary)' }}>{jobConfig.title}</strong>
                    <span style={{ fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text-secondary)', textDecoration: 'underline' }} onClick={() => setActiveView('config')}>
                      (Edit Config)
                    </span>
                  </p>
                </div>
              </div>

              {/* Analytics Row */}
              {candidates.length > 0 && (
                <div className="grid-2" style={{ marginBottom: '2rem' }}>
                  <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                      Candidate Score Distribution
                    </h3>
                    <div style={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={getScoreDistribution()} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                          <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <RechartsTooltip cursor={{ fill: 'var(--bg-color)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }} />
                          <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={30} animationDuration={1000} />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                      Top Matches (Exact vs Semantic)
                    </h3>
                    <div style={{ height: 220 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={getSkillComparisonData()} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                          <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <RechartsTooltip cursor={{ fill: 'var(--bg-color)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                          <Bar dataKey="Exact" stackId="a" fill="var(--primary)" radius={[0, 0, 0, 0]} maxBarSize={30} animationDuration={1000} />
                          <Bar dataKey="Semantic" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={30} animationDuration={1000} />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Hidden File Input */}
              <input
                type="file"
                multiple
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                ref={fileInputRef}
              />

              {/* Dropzone / Upload Area */}
              {candidates.length === 0 && (
                <div
                  className="upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="upload-icon">
                    {isProcessing ? <Loader2 size={36} className="spin" /> : <UploadCloud size={36} />}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                      {isProcessing ? "Analyzing Resumes..." : "Drag & Drop Resume Files"}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                      Upload candidate resumes for instant ATS scoring
                    </p>
                    <div className="format-badges">
                      <span className="format-badge"><FileText size={12} /> PDF</span>
                      <span className="format-badge"><FileText size={12} /> DOCX</span>
                    </div>
                  </div>
                  <button
                    className="btn btn-primary"
                    disabled={isProcessing}
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    style={{ marginTop: '0.5rem' }}
                  >
                    <UploadCloud size={16} /> Upload Files
                  </button>
                </div>
              )}

              {/* Pipeline Candidates List */}
              {candidates.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={20} color="var(--primary)" /> Evaluated Candidates
                      <span style={{ fontSize: '0.85rem', background: '#eff6ff', color: 'var(--primary)', padding: '2px 8px', borderRadius: '12px' }}>
                        {filteredAndSortedCandidates.length}
                      </span>
                    </h2>

                    {/* Inline Controls */}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
                        <input type="checkbox" checked={isAnonymousMode} onChange={e => setIsAnonymousMode(e.target.checked)} />
                        Anonymous View
                      </label>
                      <div style={{ borderLeft: '1px solid var(--border-color)', height: '20px' }}></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <Filter size={14} color="var(--text-secondary)" />
                        Min Score:
                        <input type="number" value={minScoreFilter} onChange={e => setMinScoreFilter(Number(e.target.value))} style={{ width: '50px', padding: '0.2rem', borderRadius: '4px', border: '1px solid var(--border-color)', outline: 'none' }} min="0" max="100" />
                      </div>
                      <button
                        className="btn btn-outline"
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        style={{ padding: '0.35rem 0.75rem' }}
                      >
                        {sortOrder === 'desc' ? <ArrowDownAZ size={16} /> : <ArrowUpAZ size={16} />} Sort
                      </button>
                      <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem' }} onClick={() => fileInputRef.current?.click()}>
                        <Plus size={16} /> Add More
                      </button>
                    </div>
                  </div>

                  {/* Candidate Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredAndSortedCandidates.map((cand, index) => {
                      const isTop3 = sortOrder === 'desc' && index < 3;
                      // Color logic: Red = weak, Yellow = moderate, Green = strong
                      let pColor = 'var(--danger)';
                      let labelText = "Weak Match";
                      if (cand.score >= 80) {
                        pColor = 'var(--success)'; labelText = "Strong Match";
                      } else if (cand.score >= 50) {
                        pColor = 'var(--warning)'; labelText = "Moderate Match";
                      }

                      // Generate avatar color from name
                      const avatarColors = ['#4F46E5', '#14B8A6', '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4'];
                      const colorIndex = cand.name.charCodeAt(0) % avatarColors.length;
                      const initials = isAnonymousMode
                        ? '#'
                        : cand.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                      return (
                        <div key={cand.id} className={`candidate-card ${cand.isShortlisted ? 'shortlisted' : ''}`}>
                          {/* Left: Avatar */}
                          <div className="candidate-avatar" style={{ background: avatarColors[colorIndex] }}>
                            {initials}
                          </div>

                          {/* Center: Info + Skills */}
                          <div className="candidate-info">
                            <div className="candidate-header">
                              <div>
                                <div className="candidate-name">
                                  {isAnonymousMode ? `Candidate #${cand.id.substring(0, 6).toUpperCase()}` : cand.name}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                                  {isAnonymousMode ? "File Hidden" : cand.fileName}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button
                                  className="btn"
                                  style={{
                                    padding: '0.3rem 0.65rem',
                                    fontSize: '0.78rem',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    border: '1px solid var(--primary)',
                                    borderRadius: '6px'
                                  }}
                                  onClick={() => setSelectedCandidateId(cand.id)}
                                >
                                  View Profile
                                </button>
                                <button
                                  className="btn"
                                  style={{
                                    padding: '0.3rem 0.65rem',
                                    fontSize: '0.78rem',
                                    background: cand.isShortlisted ? 'rgba(34, 197, 94, 0.1)' : 'var(--success)',
                                    color: cand.isShortlisted ? '#166534' : 'white',
                                    border: cand.isShortlisted ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid transparent',
                                    borderRadius: '6px'
                                  }}
                                  onClick={() => toggleShortlistStatus(cand.id)}
                                >
                                  <CheckCircle2 size={13} /> {cand.isShortlisted ? 'Shortlisted' : 'Shortlist'}
                                </button>
                                <button
                                  className="btn"
                                  style={{
                                    padding: '0.3rem 0.65rem',
                                    fontSize: '0.78rem',
                                    background: 'transparent',
                                    color: 'var(--danger)',
                                    border: '1px solid var(--danger)',
                                    borderRadius: '6px'
                                  }}
                                  onClick={() => removeCandidate(cand.id)}
                                >
                                  <XCircle size={13} /> Remove
                                </button>
                              </div>
                            </div>

                            <div className="candidate-meta">
                              <div className="meta-item"><Briefcase size={13} /> {cand.experienceDetected} Years Exp</div>
                              <div className="meta-item"><GraduationCap size={13} /> {cand.education}</div>
                              {isTop3 && <div className="status-badge warning"><Crown size={11} /> Rank #{index + 1}</div>}
                              {cand.isShortlisted && <div className="status-badge success"><CheckCircle2 size={11} /> Shortlisted</div>}
                            </div>

                            <div className="chip-container">
                              {cand.foundSkills.slice(0, 6).map(skill => (
                                <span key={skill} className="chip found"><Check size={11} /> {skill}</span>
                              ))}
                              {cand.missingSkills.slice(0, 3).map(skill => (
                                <span key={skill} className="chip missing"><X size={11} /> {skill}</span>
                              ))}
                            </div>
                          </div>

                          {/* Right: Score Widget */}
                          <div className="score-widget">
                            <div className="score-value">{cand.score}<span> / 100</span></div>
                            <div className="score-progress-container">
                              <div className="score-progress-fill" style={{ width: `${cand.score}%`, background: pColor }}></div>
                            </div>
                            <div className="score-label" style={{ color: pColor }}>{labelText}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeView === 'analytics' && (
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              {/* Analytics Header */}
              <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart2 size={24} color="var(--primary)" /> Candidate Analytics
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', fontSize: '0.9rem', maxWidth: '500px' }}>
                    Insights from ATS resume screening and candidate ranking.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <select
                      className="form-select"
                      style={{ paddingRight: '2rem', fontSize: '0.85rem', minWidth: '180px' }}
                      value={jobConfig.title}
                      readOnly
                    >
                      <option>{jobConfig.title}</option>
                    </select>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.85rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: 'var(--surface)',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}>
                    <Calendar size={15} />
                    Last 30 Days
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              {/* Metrics Overview Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {/* Total Resumes */}
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', transition: 'all 0.2s ease', cursor: 'default' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(79, 70, 229, 0.08)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                      {candidates.length}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Total Resumes Uploaded</div>
                  </div>
                </div>

                {/* Shortlisted */}
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', transition: 'all 0.2s ease', cursor: 'default' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(34, 197, 94, 0.08)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                      {candidates.filter(c => c.isShortlisted).length}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Candidates Shortlisted</div>
                  </div>
                </div>

                {/* Average ATS Score */}
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', transition: 'all 0.2s ease', cursor: 'default' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(245, 158, 11, 0.08)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TrendingUp size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                      {candidates.length > 0 ? Math.round(candidates.reduce((sum, c) => sum + c.score, 0) / candidates.length) : 0}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Average ATS Score</div>
                  </div>
                </div>

                {/* Top Skill Match % */}
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', transition: 'all 0.2s ease', cursor: 'default' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(20, 184, 166, 0.08)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Target size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                      {candidates.length > 0
                        ? Math.round(Math.max(...candidates.map(c => c.foundSkills.length / (c.foundSkills.length + c.missingSkills.length || 1))) * 100)
                        : 0}%
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Top Skill Match %</div>
                  </div>
                </div>
              </div>

              {/* Charts */}
              {candidates.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                  <BarChart2 size={48} color="var(--border-color)" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No Analytics Data Yet</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Upload resumes from the Pipeline Dashboard to start generating analytics.
                  </p>
                </div>
              ) : (
                <div className="grid-2">
                  <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                      Score Distribution
                    </h3>
                    <div style={{ height: 240 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={getScoreDistribution()} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                          <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <RechartsTooltip cursor={{ fill: 'var(--bg-color)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }} />
                          <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={30} animationDuration={1000} />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="card">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                      Skill Match Comparison
                    </h3>
                    <div style={{ height: 240 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart data={getSkillComparisonData()} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                          <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                          <RechartsTooltip cursor={{ fill: 'var(--bg-color)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }} />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                          <Bar dataKey="Exact" stackId="a" fill="var(--primary)" radius={[0, 0, 0, 0]} maxBarSize={30} animationDuration={1000} />
                          <Bar dataKey="Semantic" stackId="a" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={30} animationDuration={1000} />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeView === 'profile' && (
            <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '3rem' }}>
              <div className="page-header">
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={24} color="var(--primary)" /> HR Profile
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                  Manage your personal information, organization details, and notification preferences.
                </p>
              </div>

              {/* Personal Details & Password Grid */}
              <div className="grid-2" style={{ marginBottom: '1.5rem' }}>

                {/* Personal Details */}
                <div className="card">
                  <h3 className="card-title">Personal Details</h3>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-input" value={hrProfile.fullName} onChange={e => setHrProfile({ ...hrProfile, fullName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" className="form-input" value={hrProfile.email} disabled style={{ background: 'var(--bg-color)', cursor: 'not-allowed', color: 'var(--text-secondary)' }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input type="text" className="form-input" value={hrProfile.phone} onChange={e => setHrProfile({ ...hrProfile, phone: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Role</label>
                    <select className="form-select" value={hrProfile.role} onChange={e => setHrProfile({ ...hrProfile, role: e.target.value })}>
                      <option value="Admin">Admin</option>
                      <option value="HR Manager">HR Manager</option>
                      <option value="Senior Recruiter">Senior Recruiter</option>
                      <option value="Recruiter">Recruiter</option>
                    </select>
                  </div>
                </div>

                {/* Password Management */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 className="card-title">Change Password</h3>
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <input type="password" className="form-input" placeholder="••••••••" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input type="password" className="form-input" placeholder="••••••••" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input type="password" className="form-input" placeholder="••••••••" />
                  </div>
                  <div style={{ marginTop: 'auto', textAlign: 'right' }}>
                    <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                      Update Password
                    </button>
                  </div>
                </div>
              </div>

              {/* Organization & Notifications Grid */}
              <div className="grid-2">

                {/* Organization Details */}
                <div className="card">
                  <h3 className="card-title">Organization Details</h3>
                  <div className="form-group">
                    <label className="form-label">Company Name</label>
                    <input type="text" className="form-input" value={hrProfile.companyName} onChange={e => setHrProfile({ ...hrProfile, companyName: e.target.value })} />
                  </div>
                  <div className="grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Industry</label>
                      <input type="text" className="form-input" value={hrProfile.industry} onChange={e => setHrProfile({ ...hrProfile, industry: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Company Size</label>
                      <select className="form-select" value={hrProfile.companySize} onChange={e => setHrProfile({ ...hrProfile, companySize: e.target.value })}>
                        <option value="1-10">1-10 employees</option>
                        <option value="11-50">11-50 employees</option>
                        <option value="51-200">51-200 employees</option>
                        <option value="201-500">201-500 employees</option>
                        <option value="501-1,000">501-1,000 employees</option>
                        <option value="1,000 - 5,000">1,000 - 5,000 employees</option>
                        <option value="5,000+">5,000+ employees</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input type="text" className="form-input" value={hrProfile.location} onChange={e => setHrProfile({ ...hrProfile, location: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Company Website</label>
                    <input type="url" className="form-input" value={hrProfile.website} onChange={e => setHrProfile({ ...hrProfile, website: e.target.value })} />
                  </div>
                </div>

                {/* Notification Preferences */}
                <div className="card">
                  <h3 className="card-title">Notification Preferences</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                    Control which events trigger email alerts to your address ({hrProfile.email}).
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <input
                        type="checkbox"
                        style={{ marginTop: '4px', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                        checked={hrProfile.notifications.newResumes}
                        onChange={e => setHrProfile({ ...hrProfile, notifications: { ...hrProfile.notifications, newResumes: e.target.checked } })}
                      />
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>New Resume Uploads</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Notify when a new batch of resumes finishes processing.</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <input
                        type="checkbox"
                        style={{ marginTop: '4px', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                        checked={hrProfile.notifications.exceedsThreshold}
                        onChange={e => setHrProfile({ ...hrProfile, notifications: { ...hrProfile.notifications, exceedsThreshold: e.target.checked } })}
                      />
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Candidates Exceed AI Threshold</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Notify immediately when an ATS score clears {jobConfig.threshold} / 100.</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <input
                        type="checkbox"
                        style={{ marginTop: '4px', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                        checked={hrProfile.notifications.shortlisted}
                        onChange={e => setHrProfile({ ...hrProfile, notifications: { ...hrProfile.notifications, shortlisted: e.target.checked } })}
                      />
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Candidate Shortlisted</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Receive a daily digest of candidates moved to the Shortlist status.</div>
                      </div>
                    </label>
                  </div>

                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      {profileStatus.success && <span style={{ color: 'var(--success)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}><CheckCircle2 size={16} /> Profile updated successfully</span>}
                      {profileStatus.error && <span style={{ color: 'var(--danger)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}><ShieldAlert size={16} /> {profileStatus.error}</span>}
                    </div>
                    <button className="btn btn-primary" onClick={handleUpdateProfile} disabled={profileStatus.loading} style={{ minWidth: '140px', display: 'flex', justifyContent: 'center' }}>
                      {profileStatus.loading ? <Loader2 size={16} className="spin" /> : 'Save Changes'}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeView === 'preferences' && (
            <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
              <div className="page-header">
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sliders size={24} color="var(--primary)" /> Platform Preferences
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                  Configure the underlying AI candidate evaluation engine and customize scoring behavior.
                </p>
              </div>

              <div className="grid-2" style={{ gap: '1.5rem', alignItems: 'start' }}>
                {/* Left Column: Weights & Toggles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                  {/* ATS Scoring Weights */}
                  <div className="card">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Activity size={18} /> ATS Scoring Weights
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                      Adjust the mathematical weights ($w$) used in the feature vector calculation $S = w \cdot x$. Ensure total equals 100%.
                    </p>

                    {Object.entries({
                      g: 'GitHub Score',
                      p: 'Project Relevance',
                      q: 'Code Quality',
                      l: 'LeetCode Score',
                      r: 'Resume Credibility',
                      t: 'Learning Trajectory'
                    }).map(([key, label]) => (
                      <div key={key} style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                          <span style={{ fontFamily: 'monospace', color: 'var(--primary)', fontWeight: 700 }}>{platformPreferences.weights[key]}%</span>
                        </div>
                        <input
                          type="range"
                          min="0" max="100"
                          value={platformPreferences.weights[key]}
                          onChange={(e) => setPlatformPreferences({
                            ...platformPreferences,
                            weights: { ...platformPreferences.weights, [key]: Number(e.target.value) }
                          })}
                          style={{ width: '100%', accentColor: 'var(--primary)' }}
                        />
                      </div>
                    ))}

                    <div style={{
                      marginTop: '1.5rem',
                      padding: '1rem',
                      background: Object.values(platformPreferences.weights).reduce((a, b) => a + b, 0) === 100 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: `1px solid ${Object.values(platformPreferences.weights).reduce((a, b) => a + b, 0) === 100 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Total Weight Sum:</span>
                      <span style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: Object.values(platformPreferences.weights).reduce((a, b) => a + b, 0) === 100 ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {Object.values(platformPreferences.weights).reduce((a, b) => a + b, 0)}%
                      </span>
                    </div>
                  </div>

                  {/* Resume Analysis Preferences */}
                  <div className="card">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Eye size={18} /> Analysis Toggles
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                      Enable or disable specific modules within the ATS pipeline. Disabled modules will default to 0 in the vector evaluation.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {Object.entries({
                        github: 'GitHub Data',
                        leetcode: 'LeetCode Data',
                        linkedin: 'LinkedIn Data',
                        projects: 'Project Extraction',
                        certifications: 'Certifications'
                      }).map(([key, label]) => (
                        <label key={key} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          cursor: 'pointer',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          background: platformPreferences.analysisToggles[key] ? 'rgba(79, 70, 229, 0.05)' : 'transparent',
                          border: platformPreferences.analysisToggles[key] ? '1px solid var(--primary)' : '1px solid var(--border-color)'
                        }}>
                          <input
                            type="checkbox"
                            checked={platformPreferences.analysisToggles[key]}
                            onChange={(e) => setPlatformPreferences({
                              ...platformPreferences,
                              analysisToggles: { ...platformPreferences.analysisToggles, [key]: e.target.checked }
                            })}
                            style={{ accentColor: 'var(--primary)' }}
                          />
                          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Model & Threshold Settings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                  {/* AI Model Settings */}
                  <div className="card">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Cpu size={18} /> AI Model Settings
                    </h3>

                    <div className="form-group">
                      <label className="form-label">Inference Engine</label>
                      <select
                        className="form-select"
                        value={platformPreferences.aiModel.engine}
                        onChange={(e) => setPlatformPreferences({ ...platformPreferences, aiModel: { ...platformPreferences.aiModel, engine: e.target.value } })}
                      >
                        <option value="Ollama">Ollama (Local Node)</option>
                        <option value="OpenAI">OpenAI API</option>
                        <option value="Anthropic">Anthropic API</option>
                        <option value="HuggingFace">HuggingFace Inference</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Active Model</label>
                      <input
                        type="text"
                        className="form-input"
                        value={platformPreferences.aiModel.name}
                        onChange={(e) => setPlatformPreferences({ ...platformPreferences, aiModel: { ...platformPreferences.aiModel, name: e.target.value } })}
                      />
                    </div>

                    <div className="grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Temperature: {platformPreferences.aiModel.temperature}</label>
                        <input
                          type="range"
                          min="0" max="1" step="0.1"
                          value={platformPreferences.aiModel.temperature}
                          onChange={(e) => setPlatformPreferences({ ...platformPreferences, aiModel: { ...platformPreferences.aiModel, temperature: Number(e.target.value) } })}
                          style={{ width: '100%', accentColor: 'var(--primary)' }}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Max Tokens</label>
                        <input
                          type="number"
                          className="form-input"
                          value={platformPreferences.aiModel.maxTokens}
                          onChange={(e) => setPlatformPreferences({ ...platformPreferences, aiModel: { ...platformPreferences.aiModel, maxTokens: Number(e.target.value) } })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shortlist Configuration */}
                  <div className="card">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={18} /> Shortlist Threshold
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                      Set the minimum baseline score. Candidates yielding a Final AI Evaluation (Hiring Probability) above this threshold will be flagged strongly.
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <input
                        type="number"
                        min="0" max="100"
                        value={platformPreferences.shortlistThreshold}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPlatformPreferences({ ...platformPreferences, shortlistThreshold: val });
                          setJobConfig(prev => ({ ...prev, threshold: val })); // Optional Sync
                        }}
                        style={{
                          width: '80px',
                          padding: '0.75rem',
                          fontSize: '1.5rem',
                          fontWeight: 700,
                          textAlign: 'center',
                          borderRadius: '8px',
                          border: '2px solid var(--primary)',
                          color: 'var(--primary)',
                          outline: 'none'
                        }}
                      />
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>/ 100 Score</div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Candidate Profile Modal */}
      {selectedCandidateId && activeCandidateProfile && (
        <CandidateModal
          candidate={activeCandidateProfile}
          onClose={() => setSelectedCandidateId(null)}
          onToggleStatus={toggleShortlistStatus}
          onUpdateCandidate={(id, updatedCandidate) => setCandidates(prev => prev.map(c => c.id === id ? updatedCandidate : c))}
          platformPreferences={platformPreferences}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={() => setShowLogoutModal(false)}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'loginFadeIn 0.2s ease' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogOut size={22} color="#ef4444" />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>Confirm Logout</h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
              Are you sure you want to log out of the Intelligent ATS Platform? You will need to sign in again to access your dashboard.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowLogoutModal(false)} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#fff', color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                Cancel
              </button>
              <button onClick={handleLogout} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.15s', boxShadow: '0 2px 8px -2px rgba(239,68,68,0.4)' }} onMouseEnter={e => e.currentTarget.style.background = '#dc2626'} onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
