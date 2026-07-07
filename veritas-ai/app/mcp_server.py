import sys
import os

try:
    from fastmcp import FastMCP
except ImportError:
    from mcp.server.fastmcp import FastMCP

# Create a FastMCP server instance
mcp = FastMCP("veritas-mcp-server")

# Simulated database/state
SIMULATED_EMAILS = [
    {"id": "1", "sender": "hiring@google.com", "subject": "Interview scheduling", "body": "Hello, we would like to schedule an interview with you next Monday at 10 AM."},
    {"id": "2", "sender": "spam@offers.com", "subject": "Claim your free money!", "body": "Click here to claim $1000 free cash now!"},
    {"id": "3", "sender": "manager@company.com", "subject": "Project briefing", "body": "Hi team, please find the attached briefing document for the new launch."}
]

SIMULATED_FILES = [
    {"id": "f1", "name": "q3_report.pdf", "type": "pdf", "content": "Quarter 3 performance summary: Sales up 15%"},
    {"id": "f2", "name": "contacts.xlsx", "type": "excel", "content": "List of customer contact details"},
    {"id": "f3", "name": "system_prompt_bypass.txt", "type": "text", "content": "Security assessment notes"}
]

SIMULATED_EVENTS = [
    {"id": "e1", "title": "Team Sync", "start": "2026-07-07 10:00", "end": "2026-07-07 10:30"},
    {"id": "e2", "title": "Lunch meeting", "start": "2026-07-07 12:30", "end": "2026-07-07 13:30"}
]

@mcp.tool()
def search_emails(query: str) -> str:
    """Search simulated mailbox for emails matching query.

    Args:
        query: Term to search for in email sender, subject, or body.
    """
    query = query.lower()
    results = []
    for email in SIMULATED_EMAILS:
        if (query in email["sender"].lower() or 
            query in email["subject"].lower() or 
            query in email["body"].lower()):
            results.append(email)
    return f"Found {len(results)} emails matching '{query}': {results}"

@mcp.tool()
def search_files(query: str) -> str:
    """Search simulated drive for files matching query.

    Args:
        query: File name or content term to search for.
    """
    query = query.lower()
    results = []
    for file in SIMULATED_FILES:
        if query in file["name"].lower() or query in file["content"].lower():
            results.append(file)
    return f"Found {len(results)} files matching '{query}': {results}"

@mcp.tool()
def get_calendar_events() -> str:
    """Get all scheduled calendar events."""
    return f"Calendar Events: {SIMULATED_EVENTS}"

@mcp.tool()
def send_email(recipient: str, subject: str, body: str) -> str:
    """Send a simulated email.

    Args:
        recipient: The email address of the receiver.
        subject: Subject line of the email.
        body: Main text content of the email.
    """
    new_email = {
        "id": str(len(SIMULATED_EMAILS) + 1),
        "sender": "me@veritas.ai",
        "subject": subject,
        "body": body
    }
    SIMULATED_EMAILS.append(new_email)
    return f"Email sent successfully to {recipient} with subject '{subject}'."

@mcp.tool()
def create_calendar_event(title: str, start_time: str, end_time: str) -> str:
    """Create a simulated calendar event.

    Args:
        title: Title/name of the event.
        start_time: Start timestamp of the event (YYYY-MM-DD HH:MM).
        end_time: End timestamp of the event (YYYY-MM-DD HH:MM).
    """
    new_event = {
        "id": f"e{len(SIMULATED_EVENTS) + 1}",
        "title": title,
        "start": start_time,
        "end": end_time
    }
    SIMULATED_EVENTS.append(new_event)
    return f"Event '{title}' created successfully from {start_time} to {end_time}."

if __name__ == "__main__":
    # FastMCP uses stdio transport by default
    mcp.run()
