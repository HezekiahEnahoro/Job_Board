from typing import Dict, Any
import os

def build_resume_html(
    profile: Dict,
    tailored_content: Dict,
    template: str = "modern"
) -> str:
    """
    Build HTML resume from profile and tailored content
    
    For now, we'll use HTML. Later can convert to PDF using WeasyPrint or ReportLab
    """
    
    name = profile.get("full_name", "")
    email = profile.get("email", "")
    phone = profile.get("phone", "")
    location = profile.get("location", "")
    linkedin = profile.get("linkedin_url", "")
    portfolio = profile.get("portfolio_url", "")
    
    summary = tailored_content.get("tailored_summary", "")
    skills = tailored_content.get("highlighted_skills", [])
    experience = tailored_content.get("reordered_experience", [])
    education = profile.get("education", [])
    
    # Build skills HTML
    matched_skills_html = "".join([f'<span class="skill matched">{skill}</span>' for skill in skills[:10]])
    other_skills_html = "".join([f'<span class="skill">{skill}</span>' for skill in skills[10:]])
    
    # Build experience HTML
    experience_html = ""
    for exp in experience:
        tech_html = ""
        if exp.get("technologies"):
            tech_items = "".join([f'<span class="tech">{tech}</span>' for tech in exp.get("technologies", [])])
            tech_html = f'<div class="technologies">{tech_items}</div>'
        
        achievements_html = ""
        if exp.get("achievements"):
            ach_items = "".join([f"<li>{ach}</li>" for ach in exp.get("achievements", [])])
            achievements_html = f'<ul>{ach_items}</ul>'
        
        desc_html = ""
        if exp.get("description"):
            desc_html = f'<p class="description">{exp.get("description")}</p>'
        
        location_text = f" • {exp.get('location')}" if exp.get('location') else ""
        
        experience_html += f"""
        <div class="experience-item">
            <div class="job-title">{exp.get('title', '')}</div>
            <div class="company">{exp.get('company', '')}</div>
            <div class="date-location">
                {exp.get('start_date', '')} - {exp.get('end_date', 'Present')}{location_text}
            </div>
            {desc_html}
            {achievements_html}
            {tech_html}
        </div>
        """
    
    # Build education HTML
    education_html = ""
    for edu in education:
        location_text = f" • {edu.get('location')}" if edu.get('location') else ""
        gpa_text = f" • GPA: {edu.get('gpa')}" if edu.get('gpa') else ""
        
        education_html += f"""
        <div class="education-item">
            <div class="job-title">{edu.get('degree', '')}</div>
            <div class="company">{edu.get('school', '')}</div>
            <div class="date-location">
                {edu.get('graduation_date', '')}{location_text}{gpa_text}
            </div>
        </div>
        """
    
    # Contact info
    phone_text = f" • {phone}" if phone else ""
    location_text = f" • {location}" if location else ""
    linkedin_html = f' • <a href="{linkedin}">LinkedIn</a>' if linkedin else ""
    portfolio_html = f' • <a href="{portfolio}">Portfolio</a>' if portfolio else ""
    
    # Summary section
    summary_section = f"""
    <div class="section">
        <h2>Professional Summary</h2>
        <p class="summary">{summary}</p>
    </div>
    """ if summary else ""
    
    # Skills section
    skills_section = f"""
    <div class="section">
        <h2>Skills</h2>
        <div class="skills">
            {matched_skills_html}
            {other_skills_html}
        </div>
    </div>
    """ if skills else ""
    
    # Experience section
    experience_section = f"""
    <div class="section">
        <h2>Experience</h2>
        {experience_html}
    </div>
    """ if experience else ""
    
    # Education section
    education_section = f"""
    <div class="section">
        <h2>Education</h2>
        {education_html}
    </div>
    """ if education else ""
    
    # Build final HTML
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            background: white;
        }}
        
        .header {{
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        
        h1 {{
            margin: 0;
            font-size: 32px;
            color: #1f2937;
        }}
        
        .contact {{
            margin-top: 10px;
            font-size: 14px;
            color: #6b7280;
        }}
        
        .contact a {{
            color: #2563eb;
            text-decoration: none;
        }}
        
        .section {{
            margin-bottom: 30px;
        }}
        
        h2 {{
            font-size: 20px;
            color: #2563eb;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }}
        
        .summary {{
            font-size: 15px;
            line-height: 1.8;
            color: #4b5563;
        }}
        
        .skills {{
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }}
        
        .skill {{
            display: inline-block;
            padding: 6px 12px;
            background: #eff6ff;
            color: #2563eb;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
        }}
        
        .skill.matched {{
            background: #dcfce7;
            color: #16a34a;
        }}
        
        .experience-item, .education-item {{
            margin-bottom: 20px;
        }}
        
        .job-title {{
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 3px;
        }}
        
        .company {{
            font-size: 15px;
            color: #2563eb;
            margin-bottom: 3px;
        }}
        
        .date-location {{
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 8px;
        }}
        
        .description {{
            font-size: 14px;
            color: #4b5563;
            margin-bottom: 8px;
        }}
        
        ul {{
            margin: 0;
            padding-left: 20px;
        }}
        
        li {{
            font-size: 14px;
            color: #4b5563;
            margin-bottom: 4px;
        }}
        
        .technologies {{
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 8px;
        }}
        
        .tech {{
            display: inline-block;
            padding: 3px 8px;
            background: #f3f4f6;
            color: #6b7280;
            border-radius: 4px;
            font-size: 12px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{name}</h1>
        <div class="contact">
            {email}{phone_text}{location_text}{linkedin_html}{portfolio_html}
        </div>
    </div>
    
    {summary_section}
    {skills_section}
    {experience_section}
    {education_section}
</body>
</html>
"""
    
    return html