# Raw Demo: BSC Chain Scan With Skill++

This is a raw, privacy-safe demo transcript showing how Skill++ routes a BSC chain scan into a structured opportunity-discovery workflow.

No local username, absolute machine path, API key, private token, or private environment value is included.

## Target

```text
BNB Smart Chain
chainId: 56
```

## User

```text
Use Skill++ to scan BSC for on-chain opportunities.
```

## Command

```bash
skillpp scan 56 --dry-run
```

## Raw Skill++ Output

```text
{
  "command": "scan",
  "parsed": {
    "raw": "56",
    "type": "chain_id",
    "chainId": "56"
  }
}

DRY RUN MODE - no real API calls

Pipeline: Chain opportunity scan (P_CHAIN_SCAN)
   Steps: meme-rush -> crypto-market-rank -> risk-fusion -> opportunity-board

-- Step 1: meme-rush --
   PASS meme-rush: success

-- Step 2: crypto-market-rank --
   PASS crypto-market-rank: success

-- Step 3: risk-fusion --
   NOTE risk-fusion: text-based skill, AI executes by reading risk-fusion/SKILL.md

-- Step 4: opportunity-board --
   NOTE opportunity-board: text-based skill, AI executes by reading opportunity-board/SKILL.md

Handoff:
{
  "_meta": {
    "pipeline": "P_CHAIN_SCAN",
    "source": "skillpp-executor"
  },
  "input": {
    "raw": "56",
    "type": "chain_id",
    "chainId": "56"
  },
  "results": {
    "meme-rush": {
      "meme-rush": {
        "note": "[DRY-RUN] node skills/binance-web3/meme-rush/scripts/cli.mjs meme-rush",
        "skill": "meme-rush"
      },
      "topic-rush": {
        "note": "[DRY-RUN] node skills/binance-web3/meme-rush/scripts/cli.mjs topic-rush",
        "skill": "meme-rush"
      }
    },
    "crypto-market-rank": {
      "token-rank": {
        "note": "[DRY-RUN] node skills/binance-web3/crypto-market-rank/scripts/cli.mjs token-rank",
        "skill": "crypto-market-rank"
      },
      "smart-money-inflow": {
        "note": "[DRY-RUN] node skills/binance-web3/crypto-market-rank/scripts/cli.mjs smart-money-inflow",
        "skill": "crypto-market-rank"
      }
    },
    "risk-fusion": {
      "note": "text-based skill, AI executes by reading risk-fusion/SKILL.md",
      "skill": "risk-fusion"
    },
    "opportunity-board": {
      "note": "text-based skill, AI executes by reading opportunity-board/SKILL.md",
      "skill": "opportunity-board"
    }
  },
  "nextActions": [
    {
      "action": "Deep audit contract",
      "pipeline": "P_DEEP_AUDIT",
      "condition": "if source code available"
    },
    {
      "action": "Check smart money",
      "pipeline": "P_SMART_MONEY"
    },
    {
      "action": "View wallet holdings",
      "pipeline": "P_WALLET_XRAY",
      "condition": "if wallet address provided"
    }
  ]
}
```

## Demo Conversation

```text
User:
Use Skill++ to scan BSC for on-chain opportunities.

Skill++:
I detected a chain scan request.

Parsed input:
- Chain ID: 56
- Chain: BNB Smart Chain
- Input type: chain_id

Routing:
Selected pipeline: P_CHAIN_SCAN

Pipeline stages:
1. meme-rush
2. crypto-market-rank
3. risk-fusion
4. opportunity-board

Execution result:
- meme-rush prepared launch and topic discovery.
- crypto-market-rank prepared token ranking and smart-money inflow checks.
- risk-fusion is ready to merge ranking, activity, and risk signals.
- opportunity-board is ready to organize candidates into reviewable next steps.
```

```text
User:
Does Skill++ recommend what to buy?

Skill++:
No.

Skill++ does not turn a chain scan into a buy signal.

The chain scan workflow is designed to discover candidates, enrich them with market and activity data, filter obvious risk, and route promising or suspicious items into deeper review.

The next step is not blind execution.

The next step is structured review:
- audit a candidate contract with P_DEEP_AUDIT
- inspect wallet exposure with P_WALLET_XRAY
- check smart-money activity with P_SMART_MONEY
- discard candidates with weak evidence or high risk
```

```text
User:
Why is this useful?

Skill++:
Without Skill++, a user may ask an AI agent to "scan the chain" and receive a loose answer.

With Skill++, the request becomes a reusable workflow:

chainId 56
-> P_CHAIN_SCAN
-> meme-rush
-> crypto-market-rank
-> risk-fusion
-> opportunity-board
-> next route recommendation

The workflow keeps context instead of starting over.
It separates discovery from audit.
It prevents the agent from jumping directly from "found something" to "trade it."
```

## Demo Takeaway

```text
Skill++ treats chain scanning as structured discovery, not investment advice.

It routes a simple chain ID into a multi-skill workflow, preserves context with Handoff JSON, and recommends safer next steps before any risky action.
```

## Notes

- This demo uses dry-run mode, so no live API calls are made.
- The target chain is public BNB Smart Chain chainId `56`.
- This is a raw demo transcript, not a trading signal or recommendation.
- This output is for research and risk review only. It is not financial advice.
