---
title: "Teaching Codex How I Work"
date: 2026-07-23 20:50
summary: "A look at Personality Profiler, a Codex skill that analyzes recent conversations to infer working style and create a reusable personalization profile."
category: "Skills"
tags: ["codex", "personalization", "skills"]
type: "article"
status: "current"
---

## Why I built it

Every new conversation with an AI assistant starts from zero. The assistant does not know anything about the person it is working with.

Yet everyone works differently. Some users want concise answers and fast edits. Others want a plan before anything changes. Some prefer the assistant to challenge vague requirements early, while others mainly want steady execution once the goal is clear. When humans work together, they gradually learn each other’s preferences and adapt to them. With an AI assistant, that adaptation rarely happens on its own. Settings and custom instructions can help, but they require effort: reflecting on yourself, describing your preferences accurately, and keeping them up to date. In the end, the person is often the only one adapting to the assistant’s style.

But what if the assistant could infer personal traits from past interactions: how a user asks questions, responds to uncertainty, reacts to plans, gives feedback, requests detail, and manages tradeoffs? What if it could process those patterns and take them into account in future interactions? It would feel more like working with a colleague who has already known you for a few years.

That became the motivation for Personality Profiler.

## What it does

Personality Profiler is a Codex skill that analyzes recent Codex conversations, identifies your working style, and creates a reusable profile that Codex can use in future sessions. 

> **What is a skill?** Conceptually, a skill packages instructions and supporting resources into a reusable workflow that tells an agent how to perform a specific task. The main benefit of skills is that they are loaded on demand: only the name and description are loaded at first, and the agent reads the full `SKILL.md` when your request matches the description, so the context window does not get polluted. For more details, see the [Agent Skills documentation](https://agentskills.io/home).

Personality Profiler serves as a personalization layer: Codex uses the generated profile to adapt its responses to the way you naturally think, plan, and collaborate.

The profile is based on four traits from the [Big Five personality model](https://www.simplypsychology.org/big-five-personality.html):

* Openness — how curious you are, how much you enjoy experimenting, and how comfortable you are with new ideas
* Conscientiousness — how much you value structure, planning, accuracy, and follow-through
* Agreeableness — how you prefer to collaborate, communicate, and work with others
* Neuroticism — how you respond to uncertainty, pressure, and the need for reassurance

Each trait can lean high or low. Together, these combinations form 16 predefined working-style profiles.
The skill looks at patterns in your past conversations to estimate where you fall on each trait. It then assigns the predefined profile that best matches how you tend to work.

The generated profile can capture patterns such as:

* preferred level of detail
* preference for structure, exploration, or a mix of both
* decision-making style
* response to feedback and pushback
* attitude toward risk, planning, and priorities

Once created, the profile is picked up in future Codex sessions: its description tells Codex to apply it in every session, so personalization becomes part of the working environment across all your projects, rather than a prompt that has to be copied and pasted each time.


## How it works

Personality Profiler is packaged as a Codex skill. It runs locally, requires Python 3.10+, and uses existing Codex conversation history from `~/.codex` as the source material.

The part that matters for this workflow is the skill folder itself:

```text
personality-profiler/
|-- SKILL.md                     # Skill entry point and workflow instructions
|-- agents/                      # Agent metadata
|   `-- openai.yaml              
|-- assets/
|   `-- PROFILE_template.md      # Template for the profile skill
|-- references/
|   |-- fill-questionnaire.md    # Rules for answering questions from evidence
|   |-- profiles/                # Predefined profile definitions
|   |   |-- 1.md                 
|   |   |-- ...
|   |   `-- 16.md
|   `-- questionnaire/           # Scored question definitions
|       |-- Q1.md                
|       |-- ...
|       `-- Q21.md
|-- scripts/
|   |-- collect_conversations.py # Normalizes Codex logs into evidence JSON
|   |-- generate_profile_file.py # Orchestrates profile generation and output
|   |-- get_questionnaire.py     # Renders fillable questionnaire markdown
|   |-- questionnaire_loader.py  # Loads and validates question definitions
|   |-- submit_answers.py        # Parses answers, scores traits, selects profile
|   `-- write_profile_file.py    # Renders and writes the generated SKILL.md
`-- tests/
    `-- test_*.py               # Tests for collection, scoring, output, contracts
```

`SKILL.md` tells Codex how to run the skill. The scripts collect conversation evidence, render and score the questionnaire, and write the generated profile. The references provide the questionnaire rules, question definitions, and 16 profile options.

This keeps the main skill file small. Codex can start from a short set of instructions, then open references only when the workflow needs them.

When the skill runs, the process is:

1. `collect_conversations.py` reads the most recent Codex conversations and saves them as a temporary evidence file.
2. `get_questionnaire.py` loads the 21-question questionnaire.
3. Codex answers the questionnaire using evidence from the collected conversations, following the guidance in `references/fill-questionnaire.md`.
4. Codex passes the completed questionnaire to the profile generator.
5. `generate_profile_file.py` scores the answers with `submit_answers.py`, matches them to one of the 16 predefined profiles, writes the profile with `write_profile_file.py`, and prints a short summary.

At a high level, Personality Profiler follows five steps:

<figure class="workflow-diagram" aria-labelledby="personality-profiler-workflow">
  <div class="workflow-diagram-scroll">
    <img
      src="/images/personality-profiler-workflow-transparent.svg"
      alt="Personality Profiler turns recent Codex conversations into a reusable working-style profile in five steps. It saves observed interaction patterns as temporary evidence, loads the trait-based assessment, asks Codex to answer from the evidence and guidance, scores four traits and matches one of sixteen profiles, then writes the selected profile and presents a short summary."
    />
  </div>
  <figcaption id="personality-profiler-workflow">
    Personality Profiler architecture
  </figcaption>
</figure>

### Profile Definitions

I used the Big Five model as the starting point, but narrowed the interpretation to signals that matter when someone collaborates with an AI coding agent. I dropped Extraversion, since it carries almost no signal about how someone works with a coding agent. For each trait, I identified behaviors that suggest a lower or higher tendency. Combining four traits with two possible directions gives 16 working-style profiles.

The result should be read as a working-style profile for collaborating with an AI agent, not as a clinical personality assessment.

Each profile tells Codex how to adapt: when to give more structure, when to stay concise, when to surface risks, how much context to provide, and how to communicate progress.

For example, the profile definition starts with trait ranges and then provides concrete behavioral guidance:

```markdown
---
Openness: "51-100"
Conscientiousness: "51-100"
Agreeableness: "51-100"
Neuroticism: "51-100"
---

# Personality Profile - The Innovator

## Traits

### High Openness

You are highly curious, intellectually exploratory, and energized by
learning, novelty, and experimentation.

## Signals

### 1. High Openness

- You ask to use the latest models, technologies, or frameworks.
- You ask for several options and prefer learning by doing.
```

### Questionnaire

The questionnaire turns conversation evidence into a structured score. There are 21 questions: six for Openness and five for each of the remaining traits. Each question targets one trait, declares a `pole`, whether agreeing signals the high or the low side of that trait, and offers five answers from “Strongly agree” to “Strongly disagree”.

Here is one question from `references/questionnaire/Q1.md`:

```yaml
---
id: "Q1"
trait: "Openness"
pole: "high"
prompt: "The user likes exploring several possible approaches before deciding on one."
answer_1_label: "Strongly agree"
answer_1_points: 2
answer_2_label: "Agree"
answer_2_points: 1
answer_3_label: "Neutral"
answer_3_points: 0
answer_4_label: "Disagree"
answer_4_points: -1
answer_5_label: "Strongly disagree"
answer_5_points: -2
---
```

For a high-pole question like this one, the answers map to scores from `+2` down to `-2`. Low-pole questions are reverse-keyed, so agreeing counts against the trait. Here is `references/questionnaire/Q10.md`:

```yaml
---
id: "Q10"
trait: "Conscientiousness"
pole: "low"
prompt: "The user often jumps to a new thread or idea before finishing the current one."
answer_1_label: "Strongly agree"
answer_1_points: -2
answer_2_label: "Agree"
answer_2_points: -1
answer_3_label: "Neutral"
answer_3_points: 0
answer_4_label: "Disagree"
answer_4_points: 1
answer_5_label: "Strongly disagree"
answer_5_points: 2
---
```

Here “Strongly agree” scores `-2` instead of `+2`. This keeps the questionnaire measuring the underlying trait rather than agreement itself.

Scoring is deterministic. The points are summed per trait and normalized against the minimum and maximum possible sums for that trait:

```text
percentage = (raw - min) / (max - min) * 100
```

A trait at 50% or below is classified as low, and 51% or above as high. The four resulting poles select the matching profile from `references/profiles/`.

### Generated Profile

The profile generator fills `assets/PROFILE_template.md`. The template is also a valid Codex skill shape:

```markdown
---
name: user-profile
description: Apply this user's profile in every session.
---

# Profile Summary

Profile: {{profile_name}}

{{profile_description}}

## Trait Summary

- Openness: {{openness_percentage}}% ({{openness_pole}})
- Conscientiousness: {{conscientiousness_percentage}}% ({{conscientiousness_pole}})
- Agreeableness: {{agreeableness_percentage}}% ({{agreeableness_pole}})
- Neuroticism: {{neuroticism_percentage}}% ({{neuroticism_pole}})

{{profile_body}}
```

The generated profile is written into `~/.codex/skills/profile/SKILL.md`. Because the output is also a normal Codex skill, Codex can load it in future sessions and use it as guidance for how to collaborate with the user.

After generation, the user should start a new Codex session so the profile skill is loaded reliably. The profile is also easy to refresh later. Working style shifts as projects and habits evolve, or as someone's use of Codex matures. To regenerate the profile with newer conversation data, run:

```text
Use $personality-profiler skill to regenerate my profile
```

## My results

I ran the profiler on my own history. It classified me as The Innovator: Openness 62%, Conscientiousness 75%, Agreeableness 60%, Neuroticism 65%, all four traits leaning high. The generated profile describes someone who wants structured plans and detailed task breakdowns, likes exploring several options before committing, and double-checks assumptions when things feel uncertain. That is a fair description of how I actually work with Codex and a more honest one than anything I would have written about myself by hand.

## Conclusion

Personality Profiler shows the real potential of skills as a concept. A skill is not just a `SKILL.md` file with a few instructions: it can grow into something quite complex, and it is a powerful way to extend a coding agent's capabilities.

The code is available on [GitHub](https://github.com/Anastasiia-Selezen/personality-profiler). If you want Codex to learn how you work, you can install it with:

```text
npx skills add Anastasiia-Selezen/personality-profiler
```
