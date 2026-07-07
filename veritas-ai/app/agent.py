import os
from typing import Any
import re
import json
import logging
from pydantic import BaseModel, Field
from google.adk.agents import Agent
from google.adk.models import Gemini
from google.adk.workflow import Workflow, START, node, FunctionNode
from google.adk.events.event import Event
from google.adk.events.request_input import RequestInput
from google.adk.agents.context import Context
from google.genai import types

from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters

from app.config import config

# Set up logging for audit log
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("veritas-ai-audit")

# Pydantic models for structured agent I/O
class EmailAnalysis(BaseModel):
    category: str = Field(description="One of: Job-Related, Personal, Promos, Spam")
    summary: str = Field(description="A concise summary of the email")
    requires_reply: bool = Field(description="Whether the email requires a reply")
    suggested_reply: str = Field(description="Draft reply text if required, else empty string")

class CalendarSlot(BaseModel):
    title: str = Field(description="Title of the meeting")
    start_time: str = Field(description="Start time (e.g. YYYY-MM-DD HH:MM)")
    end_time: str = Field(description="End time (e.g. YYYY-MM-DD HH:MM)")
    action: str = Field(description="One of: create, update, delete")

class SearchQuery(BaseModel):
    app: str = Field(description="One of: gmail, calendar, drive, sheets, all")
    query: str = Field(description="The specific search terms or intent")

# ─── MCP TOOLSET CONNECTION ───
mcp_toolset = McpToolset(
    connection_params=StdioConnectionParams(
        server_params=StdioServerParameters(
            command="uv",
            args=["run", "python", "app/mcp_server.py"]
        )
    )
)

# Sub-Agents
email_agent = Agent(
    name="email_agent",
    model=Gemini(model=config.model),
    instruction="""You are an expert Email Triage agent. Analyze the email provided.
    Classify it into one of: Job-Related, Personal, Promos, Spam.
    Determine if a reply is needed and draft a contextual reply if so.
    Use the MCP tools for searching or sending emails when necessary.""",
    tools=[mcp_toolset],
    output_schema=EmailAnalysis,
    output_key="email_analysis"
)

calendar_agent = Agent(
    name="calendar_agent",
    model=Gemini(model=config.model),
    instruction="""You are an expert Calendar Scheduling agent. Parse the scheduling intent.
    Extract the title, start time, end time, and action requested.
    Use the MCP tools to check or create calendar events.""",
    tools=[mcp_toolset],
    output_schema=CalendarSlot,
    output_key="calendar_slot"
)

search_agent = Agent(
    name="search_agent",
    model=Gemini(model=config.model),
    instruction="""You are an expert Workspace Search agent. Parse the search request.
    Determine which application (gmail, calendar, drive, sheets, all) to search and format the search query.
    Use the MCP tools to find files, emails, or calendar info.""",
    tools=[mcp_toolset],
    output_schema=SearchQuery,
    output_key="search_query"
)


# ─── SECURITY CHECKPOINT NODE ───
def security_checkpoint(ctx: Context, node_input: types.Content) -> Event:
    """Scan input for PII, prompt injections, restricted terms, and audit log."""
    user_input = node_input.parts[0].text
    
    # 1. PII Scrubbing
    pii_patterns = {
        "email": r"[\w\.-]+@[\w\.-]+\.\w+",
        "ssn": r"\b\d{3}-\d{2}-\d{4}\b",
        "api_key": r"\bAIzaSy[A-Za-z0-9-_]{35}\b"
    }
    
    scrubbed_input = user_input
    for pii_type, pattern in pii_patterns.items():
        scrubbed_input = re.sub(pattern, f"[{pii_type.upper()}_REDACTED]", scrubbed_input)
        
    # 2. Injection Detection
    injection_keywords = ["ignore previous instructions", "system prompt", "jailbreak", "override settings"]
    has_injection = any(kw in user_input.lower() for kw in injection_keywords)
    
    # 3. Domain-Specific Rule: Credential & Financial Protection Block
    restricted_keywords = ["password", "credit card", "cvv", "private key"]
    has_restricted = any(kw in user_input.lower() for kw in restricted_keywords)
    
    # 4. Audit Log & Severity Calculation
    severity = "INFO"
    if has_injection or has_restricted:
        severity = "CRITICAL"
    elif scrubbed_input != user_input:
        severity = "WARNING"
        
    audit_record = {
        "session_id": ctx.session.id,
        "severity": severity,
        "pii_detected": scrubbed_input != user_input,
        "injection_detected": has_injection,
        "restricted_terms_detected": has_restricted,
        "message_length": len(user_input)
    }
    logger.info(f"AUDIT_LOG: {json.dumps(audit_record)}")
    
    if has_injection or has_restricted:
        # Route to security event block
        block_reason = "prompt injection detected" if has_injection else "restricted credential/financial request"
        return Event(output=f"🚨 SECURITY_EVENT_BLOCKED: Request rejected due to {block_reason}.", route="security_event")
        
    # Standard route
    # Re-wrap the scrubbed input back as types.Content for LLM node consumption
    content = types.Content(role="user", parts=[types.Part.from_text(text=scrubbed_input)])
    return Event(output=content, route="passed")


# ─── ORCHESTRATOR ROUTING NODE ───
def orchestrate_routing(node_input: types.Content) -> Event:
    """Inspects query text and routes to appropriate specialized agent."""
    text = node_input.parts[0].text.lower()
    
    if any(k in text for k in ["email", "mail", "inbox", "triage", "draft"]):
        return Event(output=node_input, route="email")
    elif any(k in text for k in ["calendar", "schedule", "meet", "slot", "booking"]):
        return Event(output=node_input, route="calendar")
    else:
        return Event(output=node_input, route="search")

# ─── HUMAN-IN-THE-LOOP REVIEW NODE ───
async def review_node(ctx: Context, node_input: dict) -> Event:
    """Pauses for human approval if modifying workspace state."""
    # Determine if this action requires approval
    # e.g., sending email, booking calendar, deleting files
    is_action = False
    action_desc = ""
    
    if "email_analysis" in ctx.state:
        analysis = ctx.state["email_analysis"]
        if analysis.get("requires_reply") and analysis.get("suggested_reply"):
            is_action = True
            action_desc = f"Send reply: '{analysis.get('suggested_reply')}'"
            
    elif "calendar_slot" in ctx.state:
        slot = ctx.state["calendar_slot"]
        if slot.get("action") in ["create", "update", "delete"]:
            is_action = True
            action_desc = f"{slot.get('action').capitalize()} event '{slot.get('title')}' at {slot.get('start_time')}"

    if not is_action:
        # No review required, pass straight through
        yield Event(output=node_input, route="passed")
        return


    # HITL Interrupt handling
    if not ctx.resume_inputs or "approval" not in ctx.resume_inputs:
        yield RequestInput(
            interrupt_id="approval",
            message=f"⚠️ Action Required: {action_desc}. Reply 'yes' to proceed, or 'no' to cancel."
        )
        return

    user_approval = ctx.resume_inputs["approval"].lower().strip()
    if user_approval == "yes":
        outcome = f"✅ Approved: {action_desc} has been scheduled/executed."
        yield Event(output=outcome, route="passed", state={"action_outcome": outcome})
    else:
        outcome = f"❌ Rejected: {action_desc} was cancelled by user."
        yield Event(output=outcome, route="passed", state={"action_outcome": outcome})

# ─── FINAL OUTPUT GENERATION ───
def final_node(ctx: Context, node_input: Any) -> Event:
    """Format the final workspace briefing or execution outcome."""
    outcome = ctx.state.get("action_outcome")
    if outcome:
        msg = outcome
    elif "email_analysis" in ctx.state:
        analysis = ctx.state["email_analysis"]
        msg = f"📧 **Email Triage Summary**:\n- **Category**: {analysis.get('category')}\n- **Summary**: {analysis.get('summary')}\n- **Suggested Reply**: {analysis.get('suggested_reply') or 'None'}"
    elif "calendar_slot" in ctx.state:
        slot = ctx.state["calendar_slot"]
        msg = f"📅 **Calendar Action Plan**:\n- **Title**: {slot.get('title')}\n- **Start**: {slot.get('start_time')}\n- **End**: {slot.get('end_time')}\n- **Action**: {slot.get('action')}"
    elif "search_query" in ctx.state:
        q = ctx.state["search_query"]
        msg = f"🔍 **Workspace Search Plan**:\n- **Target**: {q.get('app').upper()}\n- **Query**: {q.get('query')}"
    else:
        msg = str(node_input)
        
    yield Event(content=types.Content(role="model", parts=[types.Part.from_text(text=msg)]))
    yield Event(output=msg)

# ─── WORKFLOW DEFINITION ───
root_agent = Workflow(
    name="veritas_orchestrator",
    edges=[
        ('START', security_checkpoint),
        
        # Security routing
        (security_checkpoint, {
            "security_event": final_node,
            "passed": orchestrate_routing
        }),
        
        # Orchestrator routing to sub-agents
        (orchestrate_routing, {
            "email": email_agent,
            "calendar": calendar_agent,
            "search": search_agent
        }),
        
        # Sub-agents to HITL review node
        (email_agent, review_node),
        (calendar_agent, review_node),
        (search_agent, review_node),
        
        # Converging to final output
        (review_node, final_node)
    ]
)

app = root_agent

