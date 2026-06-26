import os
from datetime import datetime
from openpyxl import Workbook

# ReportLab imports for PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

class ReportGenerator:
    
    @staticmethod
    def ensure_reports_directory():
        """Ensure report storage directory exists"""
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        reports_dir = os.path.join(base_dir, 'static', 'reports')
        os.makedirs(reports_dir, exist_ok=True)
        return reports_dir

    @classmethod
    def generate_shift_excel(cls, allocations, report_name):
        """Generates an Excel sheet for shift allocations and saves to disk"""
        reports_dir = cls.ensure_reports_directory()
        filepath = os.path.join(reports_dir, f"{report_name}.xlsx")

        wb = Workbook()
        ws = wb.active
        ws.title = "Shift Allocations"

        # Write Headers
        ws.append([
            'Date', 'Employee ID', 'Employee Name', 'Department', 
            'Job Role', 'Shift', 'Start Time', 'End Time'
        ])

        # Write Rows
        for alloc in allocations:
            ws.append([
                alloc.date.strftime('%Y-%m-%d'),
                alloc.employee_id,
                f"{alloc.employee.first_name} {alloc.employee.last_name}",
                alloc.employee.department.name if alloc.employee.department else 'N/A',
                alloc.employee.role_profile.name if alloc.employee.role_profile else 'N/A',
                alloc.shift.name,
                alloc.shift.start_time.strftime('%H:%M:%S'),
                alloc.shift.end_time.strftime('%H:%M:%S')
            ])

        wb.save(filepath)
        return filepath

    @classmethod
    def generate_shift_pdf(cls, allocations, report_name):
        """Generates a professional PDF for shift allocations and saves to disk"""
        reports_dir = cls.ensure_reports_directory()
        filepath = os.path.join(reports_dir, f"{report_name}.pdf")

        doc = SimpleDocTemplate(filepath, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
        story = []
        styles = getSampleStyleSheet()

        # Custom Styles
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#1E3A8A'),
            spaceAfter=15
        )
        meta_style = ParagraphStyle(
            'ReportMeta',
            parent=styles['Normal'],
            fontSize=10,
            leading=12,
            textColor=colors.HexColor('#4B5563'),
            spaceAfter=20
        )

        # Title Section
        story.append(Paragraph("Weekly Shift Allocation Report", title_style))
        story.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", meta_style))
        story.append(Spacer(1, 10))

        # Table Header
        table_data = [['Date', 'Emp ID', 'Name', 'Department', 'Shift']]
        for alloc in allocations:
            table_data.append([
                alloc.date.strftime('%Y-%m-%d'),
                alloc.employee_id,
                f"{alloc.employee.first_name} {alloc.employee.last_name}",
                alloc.employee.department.name if alloc.employee.department else 'N/A',
                alloc.shift.name
            ])

        # Table Styling
        t = Table(table_data, colWidths=[80, 80, 150, 140, 100])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E3A8A')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 10),
            ('BOTTOMPADDING', (0,0), (-1,0), 8),
            ('TOPPADDING', (0,0), (-1,0), 8),
            ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#F3F4F6')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F9FAFB')]),
            ('FONTSIZE', (0,1), (-1,-1), 9),
            ('BOTTOMPADDING', (0,1), (-1,-1), 6),
            ('TOPPADDING', (0,1), (-1,-1), 6),
        ]))

        story.append(t)
        doc.build(story)
        return filepath

    @classmethod
    def generate_attendance_excel(cls, records, report_name):
        """Generates an Excel sheet for attendance and saves to disk"""
        reports_dir = cls.ensure_reports_directory()
        filepath = os.path.join(reports_dir, f"{report_name}.xlsx")

        wb = Workbook()
        ws = wb.active
        ws.title = "Attendance Logs"

        # Write Headers
        ws.append(['Date', 'Employee ID', 'Employee Name', 'Clock In', 'Clock Out', 'Status'])

        # Write Rows
        for record in records:
            ws.append([
                record.date.strftime('%Y-%m-%d'),
                record.employee_id,
                f"{record.employee.first_name} {record.employee.last_name}",
                record.clock_in.strftime('%Y-%m-%d %H:%M:%S') if record.clock_in else 'N/A',
                record.clock_out.strftime('%Y-%m-%d %H:%M:%S') if record.clock_out else 'N/A',
                record.status.capitalize()
            ])

        wb.save(filepath)
        return filepath

    @classmethod
    def generate_attendance_pdf(cls, records, report_name):
        """Generates a professional PDF for attendance and saves to disk"""
        reports_dir = cls.ensure_reports_directory()
        filepath = os.path.join(reports_dir, f"{report_name}.pdf")

        doc = SimpleDocTemplate(filepath, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
        story = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#10B981'),
            spaceAfter=15
        )
        meta_style = ParagraphStyle(
            'ReportMeta',
            parent=styles['Normal'],
            fontSize=10,
            leading=12,
            textColor=colors.HexColor('#4B5563'),
            spaceAfter=20
        )

        story.append(Paragraph("Attendance History Report", title_style))
        story.append(Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", meta_style))
        story.append(Spacer(1, 10))

        table_data = [['Date', 'Emp ID', 'Name', 'Clock In', 'Clock Out', 'Status']]
        for r in records:
            table_data.append([
                r.date.strftime('%Y-%m-%d'),
                r.employee_id,
                f"{r.employee.first_name} {r.employee.last_name}",
                r.clock_in.strftime('%H:%M:%S') if r.clock_in else '-',
                r.clock_out.strftime('%H:%M:%S') if r.clock_out else '-',
                r.status.upper()
            ])

        t = Table(table_data, colWidths=[70, 70, 150, 90, 90, 80])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#10B981')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 10),
            ('BOTTOMPADDING', (0,0), (-1,0), 8),
            ('TOPPADDING', (0,0), (-1,0), 8),
            ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#F3F4F6')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5E7EB')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F9FAFB')]),
            ('FONTSIZE', (0,1), (-1,-1), 9),
            ('BOTTOMPADDING', (0,1), (-1,-1), 6),
            ('TOPPADDING', (0,1), (-1,-1), 6),
        ]))

        story.append(t)
        doc.build(story)
        return filepath
