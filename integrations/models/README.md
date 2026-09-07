# Model routing

Route by job. Free tiers stand up the loop; they do not run a company at 95% automation.

| File | Purpose |
|---|---|
| [router.yaml](./router.yaml) | Roles + department actor/verifier map |
| [catalog.yaml](./catalog.yaml) | Provider bases, model IDs, limits |
| [../litellm/config.yaml](../litellm/config.yaml) | Local OpenAI-compatible proxy |

## Week-1 combo

1. **Worker:** Gemini Flash-Lite  
2. **Planner / research:** Gemini Flash  
3. **Verifier:** Groq `openai/gpt-oss-120b` (different family)  
4. **Coder (when needed):** Mistral Codestral (free) / NIM Nemotron Super (trial)  
5. **Failover:** OpenRouter `:free` (prefer $10 top-up)

## Resolve

```bash
./scripts/resolve-model.sh market-research
./scripts/resolve-model.sh sales-outbound verifier
./scripts/resolve-model.sh eng-pr
```

## LiteLLM

```bash
cp .env.example .env   # fill GOOGLE_API_KEY + GROQ_API_KEY
pip install 'litellm[proxy]'
litellm --config integrations/litellm/config.yaml --port 4000
# Harness base_url: http://127.0.0.1:4000/v1
# Models: planner | worker | verifier | coder | thinker | failover
```

## Limits you will hit

Plan → tool → tool → verify is often **8–30 calls/task**. At ~1,500 RPD Gemini ≈ **50–150 agent tasks/day**, not six departments unattended.
