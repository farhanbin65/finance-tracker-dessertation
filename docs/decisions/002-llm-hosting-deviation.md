# ADR-002: LLM Hosting — Deviation from Local Ollama to Groq API

**Status**: Accepted
**Date**: 2026-05-02
**Author**: Farhan Bin Hossain (B00970291)
**Supersedes**: Implicit assumption in AT2 §3.3.6 (Locally hosted Ollama LLM)

## Context

The AT2 Challenge Definition specified a locally hosted Large Language Model (LLM) via Ollama, running Llama 3 within the Flask backend, to satisfy the privacy-first architectural principle that no financial data is transmitted to third-party services.

During Sprint 0 (project foundation), the development environment was migrated from a local Windows laptop to GitHub Codespaces to address reproducibility concerns and to satisfy the COM668 module requirement that the submitted software remain in an executable state until graduation (Module Handbook §11). GitHub Codespaces provides 4-16 GB of RAM per container, with no GPU acceleration. Empirical testing established that Llama 3.2 3B requires approximately 3 GB of resident memory and produces sub-second responses only with GPU acceleration; on CPU, response times in the Codespaces environment exceeded 15 seconds per query, violating the AT2 non-functional requirement of real-time chatbot interaction.

## Options Considered

**Option A — Hybrid deployment.** Run Ollama locally on the developer's laptop and the remainder of the stack in Codespaces, connected via SSH tunnel. Preserves the original thesis verbatim but introduces operational friction during chatbot development sprints and creates a non-reproducible component for the AT3 demonstration.

**Option B — Smaller local model.** Use a sub-1B parameter model such as Phi-2 or TinyLlama within Codespaces. Performance acceptable but instruction-following accuracy below the threshold required for reliable intent parsing of natural-language expense logging.

**Option C — Hosted LLM API (Groq).** Use Groq's hosted Llama 3.1 8B inference for intent extraction only, with all financial data, predictions, and explanations remaining within the local backend.

## Decision

Option C was selected. The chatbot's role in the system is narrow: it converts natural-language utterances (e.g., *"I spent £15 on lunch"*) into structured intent objects (`{amount: 15, category: "food", description: "lunch"}`). Once parsed, all downstream processing — transaction storage, forecasting, anomaly detection, and explainability — occurs locally within the Flask backend on private data that is never transmitted externally.

## Consequences

### Architectural

The original "privacy-first local processing" thesis is refined to a **tiered privacy model**:

- **Tier 1 (Credentials)**: Never transmitted to any external service. Bcrypt-hashed locally.
- **Tier 2 (Financial records)**: Never transmitted to any external service. Stored in local MongoDB.
- **Tier 3 (Predictions and explanations)**: Generated locally by scikit-learn and SHAP within the Flask backend. Never transmitted.
- **Tier 4 (Natural-language utterances for intent parsing)**: Transmitted to Groq API only when the user actively uses the chatbot. The user can disable the chatbot from the security centre, in which case no data of any tier leaves the backend.

This positions FinSight closer to industry-standard hybrid privacy architectures (e.g., Apple Intelligence's Private Cloud Compute, Signal's metadata-resistant routing) than the original strict-local model and is more rigorously defensible under GDPR Article 5 (data minimisation): only the specific linguistic data required for the chatbot task is transmitted, and only when the user has explicitly opted in.

### Trade-offs Accepted

1. **Dependency on Groq's availability and policies.** Mitigated by (a) implementing a rule-based regex fallback parser so the chatbot remains functional if Groq is unavailable, and (b) requiring explicit user opt-in via a security setting.
2. **Loss of strict "no data leaves the device" claim.** Replaced by a more honest and granular privacy commitment, with a one-click user toggle that restores full local-only operation by disabling the chatbot.
3. **Marketing positioning.** Competitive comparison with Mint/YNAB/Monzo is reframed: FinSight differentiates on (a) tiered, user-controlled privacy, (b) explainable predictions, and (c) local processing of all financial data — not on absolute non-transmission.

### What This Strengthens

- **Engineering realism.** The new architecture is honest about the cost-benefit trade-off between privacy and chatbot quality, which is the actual state of the art in 2026.
- **User agency.** The privacy guarantee becomes user-configurable rather than a fixed system property — a stronger ethical position.
- **Reproducibility.** The full stack now runs identically in any environment with internet access, supporting the AT3 executable-state requirement.

## Verification

The deviation will be evidenced in AT4 §Critical Appraisal as a documented, evaluated, and justified plan deviation, consistent with the iterative nature of the chosen Scrum methodology, in which empirical findings during sprint execution legitimately revise earlier assumptions.