"""
Reports Agent — AI report generation, goal-driven summaries.
Uses the existing Gemini chatbot infrastructure.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional
import json


class ReportsAgent:
    """Generates AI-powered business reports from agent context."""

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        context keys:
          goal             : str   — user's active goal (e.g. "Increase Sales 20%")
          pattern_result   : dict  — from PatternAgent
          prediction_result: dict  — from PredictionAgent
          decision_result  : dict  — from DecisionAgent
          org_name         : str
        """
        goal       = context.get("goal", "Improve overall business performance")
        pattern    = context.get("pattern_result", {})
        prediction = context.get("prediction_result", {})
        decisions  = context.get("decision_result", {})
        org_name   = context.get("org_name", "Your Organization")

        prompt = self._build_prompt(goal, pattern, prediction, decisions, org_name)
        response_text = self._call_ai(prompt)

        return {
            "goal":    goal,
            "report":  response_text,
            "prompt":  prompt[:200] + "...",  # truncated for debug
        }

    @staticmethod
    def _build_prompt(
        goal: str,
        pattern: Dict,
        prediction: Dict,
        decisions: Dict,
        org_name: str,
    ) -> str:
        anomaly_text   = json.dumps(pattern.get("anomalies", [])[:3], default=str)
        forecast_text  = json.dumps(prediction.get("forecast", {}), default=str)
        top_actions    = decisions.get("priority_queue", [])[:3]
        actions_text   = json.dumps(top_actions, default=str)
        return (
            f"You are the AI Co-Pilot for {org_name}. "
            f"The user's goal is: '{goal}'. "
            f"Pattern anomalies detected: {anomaly_text}. "
            f"Forecast: {forecast_text}. "
            f"Top recommended actions: {actions_text}. "
            f"Write a concise executive report (max 200 words) that:\n"
            f"1. Summarises what's happening\n"
            f"2. Explains what's predicted\n"
            f"3. Recommends the #1 action to take\n"
            f"Use plain language — no jargon. Be direct and action-oriented."
        )

    @staticmethod
    def _call_ai(prompt: str) -> str:
        try:
            import os
            from groq import Groq
            from dotenv import load_dotenv
            load_dotenv()
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                raise ValueError("GROQ_API_KEY not set")
            client = Groq(api_key=api_key)
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
            )
            return completion.choices[0].message.content or "Report generation returned empty response."
        except Exception as e:
            return (
                f"[AI report unavailable: {e}] "
                f"Based on the data, please review anomalies and take the recommended actions above."
            )
