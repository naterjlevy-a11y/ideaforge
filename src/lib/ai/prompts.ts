import type { SectionType } from '@/types'

export const SYSTEM_PROMPT = `You are an expert software architect and product manager helping expand app ideas into comprehensive Technical Requirements Documents.

Rules:
- Be specific to THIS idea, never generic
- Every section must mention the actual idea/product by name
- Minimum 250 words per section
- Use markdown formatting (headers, bullets, tables where useful)
- Flag unrealistic scope honestly without dismissing the vision
- Do not hallucinate APIs, libraries, or services — if uncertain, say so
- Return structured JSON only when explicitly asked, markdown otherwise`

export const SECTION_PROMPTS: Record<SectionType, string> = {
  executive_summary: `Write a concise executive summary for this app idea. Cover:
- What the product does in 2-3 sentences
- The core problem it solves
- Who it's for
- The key differentiator vs. existing solutions
- The high-level technical approach`,

  problem_statement: `Write a detailed problem statement. Cover:
- The specific pain point this app addresses
- Who experiences this pain and how often
- Current (broken) workarounds people use
- The cost of not solving this (time, money, frustration)
- Why now is the right time to build this`,

  target_users: `Define the target user personas in detail. For each persona (2-3 max):
- Name and role
- Goals and motivations
- Current frustrations
- How they would use this app
- What success looks like for them
Also define an anti-persona (who this is NOT for).`,

  features_mvp: `List the MVP features — the absolute minimum needed to deliver core value. For each feature:
- Feature name
- What it does
- Why it's in the MVP (not V2)
- Any technical notes
Group by: Core / Supporting / Nice-to-have-but-cut`,

  features_v2: `List the V2+ features that make the product great but aren't needed at launch. For each:
- Feature name
- Why it's V2 (not MVP)
- What it unlocks for users
- Rough complexity estimate (low/medium/high)`,

  user_stories: `Write 10-15 user stories in the format "As a [user], I want [action] so that [outcome]."
Cover the full user journey: onboarding, core usage, advanced features, error cases.
Group by: Onboarding / Core Flow / Advanced / Edge Cases`,

  system_architecture: `Describe the system architecture. Cover:
- High-level component diagram (use ASCII or describe it)
- Frontend tech stack with justification
- Backend/API layer
- Database choice and why
- External services/APIs used
- How data flows through the system for the main use case
- Authentication approach`,

  data_model: `Define the data model. For each entity:
- Table/collection name
- Key fields with types and constraints
- Relationships to other entities
- Important indexes
- Any computed fields
Include a simple ER description.`,

  api_design: `Design the API. For each endpoint:
- Method + path
- Purpose
- Request body/params
- Response shape
- Auth required?
Group by resource. Include at least one example request/response.`,

  security: `Cover all security considerations:
- Authentication and authorization model
- What data is sensitive and how it's protected
- Input validation approach
- Rate limiting strategy
- Any third-party data privacy concerns
- GDPR/compliance considerations if applicable`,

  performance: `Define performance requirements and approach:
- Expected load (users, requests/day)
- Page load targets
- Database query optimization strategy
- Caching approach (if any)
- Known bottlenecks and mitigations`,

  error_handling: `Document error handling for the most important failure scenarios:
- What can go wrong at each layer (UI, API, DB, external services)
- How each error surfaces to the user
- Retry logic where applicable
- Monitoring/alerting approach`,

  deployment: `Describe the deployment architecture:
- Hosting platform and why
- Environments (dev/staging/prod)
- CI/CD approach
- Environment variable management
- How to deploy from scratch in 10 steps`,

  testing: `Define the testing strategy:
- Unit tests: what to cover and with what framework
- Integration tests: what flows to test
- E2E tests: the 5 most critical user journeys to test
- How to run tests locally`,

  roadmap: `Create a development roadmap with clear phases:
- Phase 1 (MVP): what ships first and when
- Phase 2: what makes it good
- Phase 3+: what makes it great
Include realistic time estimates for a solo developer.`,

  open_questions: `List the most important unresolved questions that need answers before or during development:
- Technical unknowns
- Product decisions not yet made
- Business/legal considerations
- Third-party dependencies to validate
Format as a numbered list with context for each question.`,

  sanity_check: `Perform a sanity check on the entire concept:
1. Technical feasibility (1-10): can a small team build this?
2. MVP scope (1-10): is the MVP achievably small?
3. Market timing: is there a real need now?
4. Identified risks (high/medium/low severity each)
5. What would make this fail — be honest
6. What would make this succeed`,

  next_steps: `List the 7 most important immediate next steps to start building this:
Format as a numbered actionable list. Be specific (not "set up project" but "run npx create-next-app@latest ideaforge --typescript --tailwind --app").
Order by dependency — earlier steps must be done first.`,
}

export function buildExpansionPrompt(
  title: string,
  rawInput: string,
  section: SectionType,
  existingContent: string | null,
  questionContext: string
): string {
  return `${SYSTEM_PROMPT}

## Idea
Title: ${title}
Description: ${rawInput}

${questionContext ? `## User Clarifications\n${questionContext}\n` : ''}
${existingContent ? `## Current Content (expand and improve this)\n${existingContent}\n` : ''}

## Your Task
${SECTION_PROMPTS[section]}

Write the full section now. Be specific to "${title}". Minimum 250 words.`
}

export function buildQuestionPrompt(title: string, rawInput: string, existingSections: string): string {
  return `${SYSTEM_PROMPT}

## Idea
Title: ${title}
Description: ${rawInput}

## Current TRD State
${existingSections}

## Your Task
Generate exactly 3 follow-up questions that would most improve the quality of this TRD.
Questions should be specific to THIS idea, not generic.
Each question should target a genuine ambiguity or missing decision.

Return ONLY valid JSON in this exact shape:
[
  { "question": "...", "context": "why this matters for the TRD" },
  { "question": "...", "context": "why this matters for the TRD" },
  { "question": "...", "context": "why this matters for the TRD" }
]`
}

export function buildFlowchartPrompt(title: string, architectureContent: string): string {
  return `${SYSTEM_PROMPT}

## Idea: ${title}
## Architecture Description
${architectureContent}

## Your Task
Generate a Mermaid flowchart showing the main system components and how data flows between them for the core user journey.

Rules:
- Use flowchart TD syntax
- Maximum 20 nodes — keep it readable
- Label each node clearly
- Show the path from user action to data storage and back
- Use subgraphs for logical groupings (Frontend, Backend, Database, External)

Return ONLY the raw Mermaid source code, no markdown fences, no explanation.`
}
