# Resume Template Selection Agent - Design Document

## Problem Statement

Selecting the right resume template is crucial for presenting a candidate's information effectively. A poor template choice can:

- Create awkward whitespace or cramped layouts
- Hide important information below the fold
- Mismatch the candidate's career level/industry expectations
- Fail ATS (Applicant Tracking System) parsing

## Research: Real-World Resume UI Best Practices

### 1. Content-to-Layout Relationship

| Content Profile               | Best Layout            | Why                                    |
| ----------------------------- | ---------------------- | -------------------------------------- |
| Dense text, long descriptions | Single-column wide     | Prevents cramped multi-column overflow |
| Minimal content (entry-level) | Creative/visual        | Fills space, shows personality         |
| Balanced sections             | Two-column traditional | Professional, scannable                |
| Project-heavy (portfolio)     | Grid/masonry           | Showcases work visually                |
| Executive/senior              | Traditional, dense     | Emphasizes experience depth            |

### 2. Career Level Patterns

| Level               | Primary Focus               | Secondary Focus        | Typical Layout           |
| ------------------- | --------------------------- | ---------------------- | ------------------------ |
| Fresh Grad/Intern   | Education, Projects, Skills | Internships            | Creative, Skills-forward |
| Junior (0-2 yrs)    | Experience, Skills          | Projects               | Standard two-column      |
| Mid-level (3-5 yrs) | Experience, Achievements    | Skills                 | Standard or Modern       |
| Senior (5-10 yrs)   | Impact, Leadership          | Architecture decisions | Executive or Standard    |
| Executive (10+ yrs) | Strategy, Org impact        | Board/C-suite          | Executive, single-column |

### 3. Industry-Specific Conventions

- **Tech/Engineering**: Clean, modern, skill tags prominent, GitHub/portfolio links
- **Product/Design**: Visual, creative, portfolio showcase
- **Finance/Consulting**: Conservative, traditional, achievement metrics
- **Academic/Research**: Publications section, education prominent
- **Startup**: Modern, personality-forward, diverse experience

### 4. Visual Balance Rules

```
Rule 1: The "Fold Rule"
- Critical info (name, title, contact, summary) must be above 600px
- Most impactful experience should be visible without scrolling

Rule 2: The "3-Second Rule"
- Recruiter should grasp candidate level in 3 seconds
- Template should highlight the strongest section first

Rule 3: The "Density Match Rule"
- Left column length ≈ Right column length (±20%)
- Avoid > 70% content on one side

Rule 4: The "Breathing Room Rule"
- Minimum 15% whitespace for readability
- Dense content needs more margins, not less
```

## Agent Architecture

### Input Analysis Module

```typescript
interface ContentAnalysis {
  // Quantitative metrics
  summaryWordCount: number;
  experienceCount: number;
  avgDescriptionLength: number;
  maxDescriptionLength: number;
  skillsCount: number;
  projectsCount: number;
  educationCount: number;
  certificationsCount: number;

  // Qualitative signals
  hasMetrics: boolean; // Contains numbers/percentages
  hasLeadershipSignals: boolean; // "led", "managed", "directed"
  hasTechnicalDepth: boolean; // Technical terms density
  hasCreativeSignals: boolean; // Design, creative, portfolio

  // Career signals
  yearsOfExperience: number; // Calculated from dates
  seniorityLevel: "entry" | "junior" | "mid" | "senior" | "executive";
  industryHint: string; // Inferred from content
}
```

### Template Scoring Module

Each template gets scored (0-100) on multiple dimensions:

```typescript
interface TemplateScore {
  templateId: string;
  scores: {
    contentFit: number; // Does content fill the layout well?
    visualBalance: number; // Is left/right balanced?
    careerMatch: number; // Does it match seniority level?
    industryMatch: number; // Does it match industry norms?
    readability: number; // Is it easy to scan?
    atsCompatibility: number; // Will ATS parse it correctly?
  };
  totalScore: number;
  confidence: number; // How confident is the recommendation?
  reasoning: string; // Human-readable explanation
}
```

### Decision Logic

```
1. ANALYZE content → ContentAnalysis
2. For each TEMPLATE:
   a. SIMULATE layout with content
   b. CALCULATE balance metrics
   c. SCORE on all dimensions
3. RANK templates by total score
4. Return TOP template with reasoning
```

## Template Characteristics (Our 4 Templates)

### standard-v1

- **Layout**: Two-column (60/40 split)
- **Best for**: Mid-level professionals, balanced content
- **Avoid when**: Very dense text, minimal content
- **ATS Score**: High (simple structure)

### modern-creative-v1

- **Layout**: Creative single-column with visual elements
- **Best for**: Entry-level, creative roles, minimal content
- **Avoid when**: Dense experience, executive roles
- **ATS Score**: Medium (some visual elements)

### executive-v1

- **Layout**: Single-column, content-dense, traditional
- **Best for**: Senior/executive, long descriptions, leadership
- **Avoid when**: Minimal content, entry-level
- **ATS Score**: High (traditional structure)

### masonry-v1

- **Layout**: Grid/card-based, project showcase
- **Best for**: Portfolio showcase, balanced projects/skills
- **Avoid when**: Text-heavy, few projects, executive roles
- **ATS Score**: Medium (grid layout parsing)

## Sample Scoring Matrix

| Resume Profile             | standard-v1 | modern-creative-v1 | executive-v1 | masonry-v1 |
| -------------------------- | ----------- | ------------------ | ------------ | ---------- |
| Fresh Grad (2 exp, 3 proj) | 65          | **85**             | 40           | 70         |
| SDE1 (1 exp, detailed)     | **80**      | 60                 | 55           | 65         |
| SDE2 (2 exp, 8 skills)     | **75**      | 55                 | 60           | 70         |
| Staff Eng (dense text)     | 60          | 40                 | **90**       | 45         |
| Principal (3 exp, long)    | 55          | 35                 | **95**       | 40         |
| EM (leadership focus)      | 65          | 45                 | **85**       | 50         |
| PM (creative, minimal)     | 60          | **80**             | 50           | 65         |
| CEO (executive brief)      | 45          | 40                 | **90**       | 35         |

## Implementation Phases

### Phase 1: Content Analyzer (This PR)

- Build content analysis functions
- Extract all metrics from resume data
- Detect career signals

### Phase 2: Template Scorer

- Implement scoring logic for each dimension
- Create template characteristic profiles
- Build scoring algorithm

### Phase 3: Agent Integration

- Create the selection agent
- Add reasoning/explanation output
- Integrate with demo-resumes and real resumes

### Phase 4: Learning Loop (Future)

- Track user overrides (when user changes template)
- Learn from patterns
- Improve scoring weights

## Success Metrics

1. **Visual Balance**: < 20% difference in column heights
2. **User Override Rate**: < 10% of users change the auto-selected template
3. **Above-fold Content**: Critical info visible without scroll
4. **ATS Parse Rate**: 95%+ of content correctly parsed

---

## Next Steps

1. Review this design
2. Implement content analyzer with sample data
3. Create visual comparison of agent recommendations
4. Validate with the 21 demo resumes
