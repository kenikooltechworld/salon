"""Customer welcome/setup email template."""
from __future__ import annotations

from html import escape

from jinja2 import Template, TemplateSyntaxError

DEFAULT_CUSTOMER_WELCOME_TEMPLATE = """
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, {{ primary_color }} 0%, {{ secondary_color }} 100%); padding: 40px 20px; text-align: center;">
    {% if logo_url %}<img src="{{ logo_url }}" alt="{{ business_name }}" style="max-width: 150px; margin-bottom: 20px;">{% endif %}
    <h1 style="color: white; margin: 0;">Welcome to {{ business_name }}!</h1>
  </div>
  <div style="padding: 40px 30px;">
    <p style="font-size: 18px; color: #1f2937;">Hi {{ customer_name }},</p>
    <p style="color: #4b5563; line-height: 1.8;">Your customer profile has been created. You can set up your portal access and book appointments online.</p>
    <div style="background-color: #f9fafb; border-left: 4px solid {{ primary_color }}; padding: 20px; margin: 25px 0;">
      <h3 style="margin-top: 0; color: #1f2937;">Your Profile Information</h3>
      <p style="color: #6b7280;"><strong>Name:</strong> {{ customer_name }}</p>
      <p style="color: #6b7280;"><strong>Email:</strong> {{ customer_email }}</p>
      <p style="color: #6b7280;"><strong>Phone:</strong> {{ customer_phone }}</p>
    </div>
    {% if setup_url %}
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0;">
      <h3 style="margin-top: 0; color: #92400e;">Set Up Your Customer Portal Access</h3>
      <p style="color: #78350f;">To access your customer portal and manage bookings, set your password:</p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="{{ setup_url }}" style="display: inline-block; background: #f59e0b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">Set Up Password</a>
      </div>
      <p style="color: #78350f; font-size: 14px;">This link expires in 7 days. If you need a new link, contact the salon.</p>
    </div>
    {% endif %}
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ booking_url }}" style="display: inline-block; background: {{ primary_color }}; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">Book an Appointment</a>
    </div>
    {% if business_address or business_phone or business_email %}
    <div style="background-color: #f9fafb; padding: 20px; margin: 25px 0;">
      <h3 style="margin-top: 0; color: #1f2937;">Salon Details</h3>
      {% if business_address %}<p style="color: #6b7280;">{{ business_address }}</p>{% endif %}
      {% if business_phone %}<p style="color: #6b7280;"><strong>Phone:</strong> {{ business_phone }}</p>{% endif %}
      {% if business_email %}<p style="color: #6b7280;"><strong>Email:</strong> {{ business_email }}</p>{% endif %}
    </div>
    {% endif %}
  </div>
  <div style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
    <p style="color: #6b7280; font-size: 14px;"><strong>{{ business_name }}</strong></p>
  </div>
</div>
"""


def render_customer_welcome_email(tenant: object, context: dict) -> str:
    settings = getattr(tenant, "settings", None) or {}
    custom = str(settings.get("customer_welcome_email_template") or "").strip()
    template_str = custom or DEFAULT_CUSTOMER_WELCOME_TEMPLATE
    safe_context = {k: (escape(str(v)) if isinstance(v, str) else v) for k, v in context.items()}
    try:
        return Template(template_str).render(**safe_context)
    except TemplateSyntaxError:
        return Template(DEFAULT_CUSTOMER_WELCOME_TEMPLATE).render(**safe_context)


def render_staff_welcome_email(*, business_name: str, logo_url: str | None, first_name: str, email: str, temp_password: str, role_names: list[str], login_url: str) -> str:
    logo_html = (
        f'<div style="text-align:center;margin-bottom:20px"><img src="{escape(logo_url)}" alt="{escape(business_name)}" style="max-width:150px;height:auto;display:inline-block" /></div>'
        if logo_url
        else ""
    )
    roles = ", ".join(role_names) if role_names else "Staff"
    return f"""
    <div style="font-family:Arial,sans-serif;background:#f6f7fb;padding:24px">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
        {logo_html}
        <h2 style="margin:0 0 16px;color:#111827">Welcome to {escape(business_name)}</h2>
        <p style="color:#374151">Hello {escape(first_name or "there")},</p>
        <p style="color:#374151">Your staff account has been created.</p>
        <p style="color:#374151"><strong>Email:</strong> {escape(email)}<br><strong>Temporary password:</strong> {escape(temp_password)}</p>
        <p style="color:#374151"><strong>Roles:</strong> {escape(roles)}</p>
        <p><a href="{escape(login_url)}" style="display:inline-block;padding:12px 18px;background:#0b6cfb;color:#fff;text-decoration:none;border-radius:8px">Log in to your account</a></p>
        <p style="color:#6b7280;font-size:13px">Please change your password after logging in.</p>
      </div>
    </div>
    """
