---
title: "Teaching Codex How I Work"
date: 2026-06-17 20:50
summary: "A look at Personality Profiler, a Codex skill that analyzes recent conversations to infer working style and create a reusable personalization profile."
category: "AI Tools"
tags: ["codex", "personalization", "skills", "ai-tools"]
type: "article"
status: "current"
---

## Why

Every person has their own preferences: what food they like, how they spend time with friends, their morning routine, their style of learning something new, and of course, how they work and communicate with other people.

When humans work or spend time with other people, they gradually learn each other’s preferences and adapt to them. Someone who prefers direct feedback may become frustrated by too much preamble, while someone else may appreciate more context before getting to the point. The same differences appear when people interact with AI assistants. Some users want concise answers and fast edits. Others want a plan before anything changes. Some prefer the assistant to challenge vague requirements early, while others mainly want steady execution once the goal is clear.

All of these preferences and behaviors together shape our personality. As a result, this also determines what a truly helpful response looks like.

In the AI era, everyone can have their own companion to work with, except that every new conversation starts from zero. The assistant does not know anything about the person.

This can be adjusted with settings or by curating a personal set of custom instructions. That is useful, but it requires effort: reflecting on yourself, knowing how to describe those preferences accurately, and updating them regularly.

In the end, the person is often the only one adapting to the assistant’s style.

But what if the assistant could infer personal traits from past interactions: how a user asks questions, responds to uncertainty, reacts to plans, gives feedback, requests detail, and manages tradeoffs? What if it could process those patterns and take them into account in future interactions?

It would feel more like chatting with a colleague who has already worked with you for a few years.

That became the motivation for Personality Profiler.

## What

Personality Profiler is a Codex skill that analyzes recent Codex conversations, identifies your working style, and creates a reusable profile that Codex can use in future sessions. 

---
what is a skill?

Conseptually Skill is a speciall format for reusable workflows. Whenewher you fill like the task is just your rutine, you might want to put it in the skill. 
from the technical point of view, a skill is a folder containing a SKILL.md file with metadata (name and description) and instructions that tell an agent how to perform a specific task. Skills can also bundle scripts, reference materials, templates, and other resources. 
This is a lightweight, open format for extending AI agent capabilities with specialized knowledge and workflows.
Skills are loaded on demand, so agent's context window doesn't get polluted with too much information, only metadata information (name and description) is loaded at first and only when agent sees that what you are asking him is corelates with description of the skill it will load full SKILL.md.  
you can fin more information [here](https://agentskills.io/home).



---

Personality Profiler serves as a personalization layer that helps Codex better understand your working style and adapt its responses to fit the way you naturally think, plan, and collaborate.

The profile is based on four traits from the Big Five personality model:

* Openness — how curious you are, how much you enjoy experimenting, and how comfortable you are with new ideas
* Conscientiousness — how much you value structure, planning, accuracy, and follow-through
* Agreeableness — how you prefer to collaborate, communicate, and work with others
* Neuroticism — how you respond to uncertainty, pressure, and the need for reassurance

Each trait can lean high or low. Together, these combinations form 16 predefined working-style profiles.
The skill looks at patterns in a user’s past conversations to estimate where they fall on each trait. It then assigns one of the pre-defined profiles that best matches how you tend to work.

The generated profile can capture patterns such as:

* preferred level of detail
* preference for structure, exploration, or a mix of both
* decision-making style
* response to feedback and pushback
* attitude toward risk, planning, and priorities

Once created, the profile can be loaded automatically in future Codex sessions. This makes personalization part of the working environment across all your projects, rather than a prompt that has to be copied and pasted each time.


## How - The implementation

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

The workflow can be represented as a stage-based schema that connects the skill folder to the runtime steps:

<figure class="workflow-diagram" aria-labelledby="personality-profiler-workflow">
  <div class="workflow-diagram-scroll">
    <img
      src="/images/personality-profiler-workflow.svg"
      alt="Stage-based workflow diagram for Personality Profiler. The user invokes the personality-profiler skill through SKILL.md. The collector reads Codex history from ~/.codex and writes /tmp/personality-evidence.json. The questionnaire stage loads references/questionnaire and uses references/fill-questionnaire.md to produce completed answers on stdin. The generator scores answers with submit_answers.py, matches references/profiles, applies the profile template, writes ~/.codex/skills/profile/SKILL.md, and prints a summary. A new Codex session loads the generated profile skill."
    />
  </div>
  <figcaption id="personality-profiler-workflow">
    Personality Profiler workflow
  </figcaption>
</figure>

### Profile Definitions

I used the Big Five model as the starting point, but narrowed the interpretation to signals that matter when someone collaborates with an AI coding agent. For each trait, I identified behaviors that suggest a lower or higher tendency. Combining four traits with two possible directions gives 16 working-style profiles.

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

The questionnaire turns conversation evidence into a structured score. Each question is connected to one of the traits and has five possible answers, from strongly low-leaning to strongly high-leaning. Those options map to scores from `-2` to `+2`.

The scores are summed per trait and converted into percentages. Once each trait is classified as high or low, the generator can select the matching profile from `references/profiles/`.

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

After generation, the user should start a new Codex session so the profile skill is loaded reliably. The profile is also easy to refresh later. Working style can change as projects change, habits change, or the way someone uses Codex becomes more mature. To regenerate the profile with newer conversation data, run:

```text
Use $personality-profiler skill to regenerate my profile
```
