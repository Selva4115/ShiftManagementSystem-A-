import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import os
import threading
from app.backend.extensions import db
from app.backend.models.employee import Employee
from app.backend.models.shift import Shift, ShiftAllocation
from app.backend.models.user import User


class EmailService:
    
    @staticmethod
    def get_email_config():
        """Get email configuration from environment variables"""
        return {
            'smtp_server': os.environ.get('SMTP_HOST', os.environ.get('SMTP_SERVER', 'smtp.gmail.com')),
            'smtp_port': int(os.environ.get('SMTP_PORT', 587)),
            'smtp_username': os.environ.get('SMTP_USER', os.environ.get('SMTP_USERNAME', '')),
            'smtp_password': os.environ.get('SMTP_PASS', os.environ.get('SMTP_PASSWORD', '')),
            'from_email': os.environ.get('FROM_EMAIL', 'noreply@shiftmanagement.com'),
            'from_name': os.environ.get('FROM_NAME', 'Shift Management System')
        }
    
    @staticmethod
    def send_email(to_email, subject, html_content):
        """Send an email using SMTP"""
        config = EmailService.get_email_config()
        
        if not config['smtp_username'] or not config['smtp_password']:
            print(f"Email sending skipped - SMTP credentials not configured. To enable emails, set these environment variables:")
            print("  - SMTP_SERVER (default: smtp.gmail.com)")
            print("  - SMTP_PORT (default: 587)")
            print("  - SMTP_USERNAME")
            print("  - SMTP_PASSWORD")
            print("  - FROM_EMAIL (default: noreply@shiftmanagement.com)")
            print("  - FROM_NAME (default: Shift Management System)")
            return False
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{config['from_name']} <{config['from_email']}>"
            msg['To'] = to_email
            
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            with smtplib.SMTP(config['smtp_server'], config['smtp_port']) as server:
                server.starttls()
                server.login(config['smtp_username'], config['smtp_password'])
                server.send_message(msg)
            
            return True
        except Exception as e:
            print(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    @staticmethod
    def generate_shift_allocation_email(employee, allocations, period):
        """Generate HTML email content for shift allocation notification"""
        allocations_html = ""
        for alloc in allocations:
            shift = Shift.query.get(alloc.shift_id)
            if shift:
                allocations_html += f"""
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">{alloc.date.strftime('%A, %B %d, %Y')}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                        <span style="background-color: {shift.color_code}20; color: {shift.color_code}; padding: 4px 12px; border-radius: 4px; font-weight: 600;">
                            {shift.name}
                        </span>
                    </td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">{shift.start_time.strftime('%I:%M %p')} - {shift.end_time.strftime('%I:%M %p')}</td>
                </tr>
                """
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Shift Allocation Notification</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px;">📅 Shift Schedule Updated</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        Dear <strong>{employee.first_name} {employee.last_name}</strong>,
                    </p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        Your shift schedule for <strong>{period}</strong> has been updated. Please find your assigned shifts below:
                    </p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <thead>
                            <tr style="background-color: #f9fafb;">
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #374151;">Date</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #374151;">Shift</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #374151;">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allocations_html}
                        </tbody>
                    </table>
                    
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #92400e; font-size: 14px;">
                            <strong>⚠️ Important:</strong> Please review your schedule carefully. If you have any conflicts or concerns, contact your manager immediately.
                        </p>
                    </div>
                    
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                        You can view your complete schedule on the Shift Management System portal.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="#" style="background-color: #667eea; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                            View Full Schedule
                        </a>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                        This is an automated message. Please do not reply to this email.
                    </p>
                </div>
                <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px;">
                        © 2026 Shift Management System. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html_content
    
    @staticmethod
    def send_shift_allocation_notifications(start_date, end_date, period_name):
        """Send shift allocation notifications to all employees with allocations in the period"""
        # Check if SMTP is configured first to avoid unnecessary processing
        config = EmailService.get_email_config()
        if not config['smtp_username'] or not config['smtp_password']:
            print("Email notifications skipped - SMTP not configured")
            return {'sent': 0, 'failed': 0}
        
        # Get current app context
        from flask import current_app
        app = current_app._get_current_object()
        
        # Send emails in background thread to avoid blocking
        def send_emails_background():
            try:
                with app.app_context():
                    # Get all allocations for the period with employee data in one query
                    allocations = db.session.query(
                        ShiftAllocation, Employee, User
                    ).join(
                        Employee, ShiftAllocation.employee_id == Employee.id
                    ).outerjoin(
                        User, Employee.user_id == User.id
                    ).filter(
                        ShiftAllocation.date >= start_date,
                        ShiftAllocation.date <= end_date
                    ).all()
                    
                    # Group allocations by employee
                    employee_allocations = {}
                    for alloc, employee, user in allocations:
                        if not user or not user.email:
                            continue  # Skip employees without email
                        if alloc.employee_id not in employee_allocations:
                            employee_allocations[alloc.employee_id] = {
                                'employee': employee,
                                'user': user,
                                'allocations': []
                            }
                        employee_allocations[alloc.employee_id]['allocations'].append(alloc)
                    
                    # Send emails to each employee
                    sent_count = 0
                    failed_count = 0
                    
                    for emp_data in employee_allocations.values():
                        employee = emp_data['employee']
                        user = emp_data['user']
                        emp_allocations = emp_data['allocations']
                        
                        # Generate email content
                        html_content = EmailService.generate_shift_allocation_email(
                            employee, emp_allocations, period_name
                        )
                        
                        # Send email
                        subject = f"Your Shift Schedule - {period_name}"
                        if EmailService.send_email(user.email, subject, html_content):
                            sent_count += 1
                        else:
                            failed_count += 1
                    
                    print(f"Background email notifications completed: {sent_count} sent, {failed_count} failed")
            except Exception as e:
                print(f"Error in background email notifications: {str(e)}")
        
        # Start background thread
        thread = threading.Thread(target=send_emails_background)
        thread.daemon = True
        thread.start()
        
        return {'sent': 0, 'failed': 0, 'background': True}
    
    @staticmethod
    def send_manual_allocation_notification(employee, allocation, shift, action):
        """Send email notification for manual shift allocation changes"""
        config = EmailService.get_email_config()
        if not config['smtp_username'] or not config['smtp_password']:
            print("Email notification skipped - SMTP not configured")
            return False
        
        # Get current app context
        from flask import current_app
        app = current_app._get_current_object()
        
        # Send email in background thread to avoid blocking
        def send_email_background():
            try:
                with app.app_context():
                    # Get user associated with employee
                    user = User.query.filter_by(id=employee.user_id).first()
                    if not user or not user.email:
                        print(f"No email found for employee {employee.first_name} {employee.last_name}")
                        return
                    
                    # Generate HTML content for manual allocation
                    action_text = "assigned to" if action == "assigned" else "removed from"
                    shift_info = f"{shift.name} ({shift.start_time.strftime('%I:%M %p')} - {shift.end_time.strftime('%I:%M %p')})" if shift else "Off Duty"
                    
                    html_content = f"""
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Shift Allocation Update</title>
                    </head>
                    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 24px;">📅 Shift Schedule Updated</h1>
                            </div>
                            <div style="padding: 30px;">
                                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                                    Dear <strong>{employee.first_name} {employee.last_name}</strong>,
                                </p>
                                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                                    Your shift schedule has been updated. You have been {action_text} <strong>{shift_info}</strong> on <strong>{allocation.date.strftime('%A, %B %d, %Y')}</strong>.
                                </p>
                                
                                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                                        <strong>⚠️ Important:</strong> Please review your schedule carefully. If you have any conflicts or concerns, contact your manager immediately.
                                    </p>
                                </div>
                                
                                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                                    You can view your complete schedule on the Shift Management System portal.
                                </p>
                                
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="#" style="background-color: #667eea; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                                        View Full Schedule
                                    </a>
                                </div>
                                
                                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                                    This is an automated message. Please do not reply to this email.
                                </p>
                            </div>
                            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0; color: #6b7280; font-size: 12px;">
                                    © 2026 Shift Management System. All rights reserved.
                                </p>
                            </div>
                        </div>
                    </body>
                    </html>
                    """
                    
                    subject = f"Shift Schedule Update - {allocation.date.strftime('%B %d, %Y')}"
                    EmailService.send_email(user.email, subject, html_content)
                    print(f"Background email notification sent to {user.email}")
            except Exception as e:
                print(f"Error in background manual allocation notification: {str(e)}")
        
        # Start background thread
        thread = threading.Thread(target=send_email_background)
        thread.daemon = True
        thread.start()
        
        return True
