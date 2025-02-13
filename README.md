# Canvas LLM Builder - GitHub Coding Challenge

## Overview

Your task is to build a drag-and-drop state-based LLM builder where users can visually create AI agents with different conversational states. The system will allow users to define a global prompt, configure state-specific prompts, and define edges (transitions) between states.

The app should also feature a Test Mode where users can interact with their agent and see real-time state transitions.

### Features

### 1. Canvas-Based State Builder

Users can create and connect states using a drag-and-drop interface. This will look like boxes with lines between them.

Each state contains:

A name (unique identifier)

A prompt (state-specific instructions for the LLM)

Edges (defining transitions to other states based on user input)

There should be a dedicated Start State and End State.

### 2. Global Prompt

A single global prompt that provides overarching instructions for the agent.

### 3. State Transitions & Edges

Users should be able to define conditions for transitioning between states.

Transitions can be based on user responses, keywords, or other logic.

### 4. Test Mode

Users can test their AI agent directly from the UI.

The interface should show the agent's current state and transitions in real time.

There should be a Reset button to restart a test conversation at any time.

### 5. Persistent Agent Storage

Agents and their configurations (states, edges, and global prompt) should be saved to a PostgreSQL database.

The test conversations do not need to be saved.

### Tech Stack

Next.js (React frontend + API routes for backend logic) in TS

PostgreSQL (for storing agents and their states)

Drizzle (for database ORM)

Any library you woud like for the drag and drop canvas.

Any library you want to handle the AI conversation, either build a custom one or use something like LangGraph or another lib.

OpenAI API (or another LLM) for processing AI responses

Getting Started

1. Fork this Repo & Clone It
2. Create your entire app
3. Update the README with your approach and design
4. Host it on vercel
5. Don't commit your env secrets!


### Challenge Scope

Must-Have Features:

✅ Drag-and-drop state management canvas

✅ Global prompt

✅ State-specific prompts

✅ State transitions (edges)

✅ Test mode that displays AI responses as well as state transitions. 

Remember, with tool calls the AI might need to produce a few responses in a row (ie. agent transitions to another state and then responds to the question)

```
Example:
      - User: Hey, can you transfer me to a human?
      
      - Agent: [Tool call: transfer_to_a_human]
      
      - Agent: [Tool call result: success]
      
      - Agent: Yes, I'm transferring you now! Thank you
```

✅ You do not need to build generic tool calls, however, you might decide to implement the state transitions as tool calls (ie a tool called "transition_state")

✅ Persistent storage for agents (PostgreSQL)

✅ Reset button for clearing test conversations


Bonus Features (Stretch Goals):

💡 Add live edge highlighting (the test agent visually displays whats happening on the canvas)

💡 Make the LLM configurable

💡 Store test conversations

💡 Generic tool calls (able to add tools/functions to each state that can be called by the ai and do web requests)

### Example (from RetellAI)
<img width="1509" alt="Screenshot 2025-02-13 at 9 09 02 AM" src="https://github.com/user-attachments/assets/d6cd898b-6e4d-4e87-a615-5b9bf8d9d4fd" />
