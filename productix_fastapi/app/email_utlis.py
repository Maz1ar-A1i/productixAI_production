# email_utils.py
import os
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from typing import List
from dotenv import load_dotenv
import os

# load variables from .env
load_dotenv()

MAIL_USERNAME = os.getenv("EMAIL")
MAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
MAIL_FROM = MAIL_USERNAME
FRONTEND_VERIFY_URL = os.getenv("FRONTEND_VERIFY_URL", "http://localhost:5173/verify-result")  # frontend page or backend verify endpoint
BACKEND_VERIFY_ENDPOINT = os.getenv("BACKEND_VERIFY_ENDPOINT", "http://127.0.0.1:8000/verify-email")  # if you want backend to handle

conf = ConnectionConfig(
    MAIL_USERNAME=MAIL_USERNAME,
    MAIL_PASSWORD=MAIL_PASSWORD,
    MAIL_FROM=MAIL_FROM,
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=True,  
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)

async def send_verification_email(recipient: str, token: str):
    # Adjust link: use frontend to show a success page then call /verify-email backend,
    # or point directly to backend verify endpoint.
    verification_link = f"{BACKEND_VERIFY_ENDPOINT}?token={token}"
    html = f"""
    <p>Hi,</p>
    <p>Thank you for signing up. Please verify your email by clicking the link below:</p>
    <p><a href="{verification_link}">Verify email</a></p>
    <p>If the link doesn't work, copy/paste this URL in your browser:</p>
    <p>{verification_link}</p>
    """
    message = MessageSchema(
        subject="Verify your email",
        recipients=[recipient],
        body=html,
        subtype="html",
    )
    fm = FastMail(conf)
    await fm.send_message(message)
