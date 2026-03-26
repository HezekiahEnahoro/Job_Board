import re
from typing import Optional

# Keywords that indicate US-only remote positions
US_ONLY_KEYWORDS = [
    "remote (us)",
    "remote - us",
    "us remote",
    "united states only",
    "us only",
    "usa only",
    "remote within us",
    "remote in us",
    "us-based",
    "based in us",
    "must be located in us",
    "must be in us",
    "us citizen",
    "work authorization in us",
]

# Keywords that indicate worldwide/global remote
WORLDWIDE_KEYWORDS = [
    "worldwide",
    "global",
    "anywhere",
    "remote-first",
    "fully remote",
    "work from anywhere",
    "wfa",
    "remote (worldwide)",
    "remote - worldwide",
    "remote (global)",
    "international",
]

# EMEA/Europe indicators (good for your target audience)
EMEA_KEYWORDS = [
    "emea",
    "europe",
    "european",
    "eu",
    "africa",
    "middle east",
    "uk",
    "germany",
    "france",
    "netherlands",
    "spain",
    "portugal",
    "italy",
    "poland",
    "remote",  # Just "remote" with no qualifier
]


def is_worldwide_remote(location: Optional[str], description: Optional[str] = None) -> bool:
    """
    Check if a job is truly worldwide remote (not US-only)
    
    Returns:
        True if worldwide/EMEA remote
        False if US-only or unclear
    """
    if not location:
        return False
    
    location_lower = location.lower()
    desc_lower = (description or "").lower()
    
    # FIRST: Check if it's explicitly US-only (REJECT)
    for keyword in US_ONLY_KEYWORDS:
        if keyword in location_lower:
            return False
    
    # SECOND: Check for worldwide/global indicators (ACCEPT)
    for keyword in WORLDWIDE_KEYWORDS:
        if keyword in location_lower:
            return True
    
    # THIRD: Check for EMEA indicators (ACCEPT)
    for keyword in EMEA_KEYWORDS:
        if keyword in location_lower:
            return True
    
    # FOURTH: Check description for US-only requirements (REJECT)
    us_requirement_patterns = [
        r"must be (located|based|residing) in (the )?us",
        r"us work authorization required",
        r"authorized to work in (the )?us",
        r"us citizens only",
        r"only considering us-based",
    ]
    
    for pattern in us_requirement_patterns:
        if re.search(pattern, desc_lower):
            return False
    
    # FIFTH: If location just says "Remote" with no qualifier
    # Check description for worldwide/global indicators
    if location_lower.strip() in ["remote", "remote only", "fully remote"]:
        # If description mentions worldwide/global, accept
        for keyword in WORLDWIDE_KEYWORDS:
            if keyword in desc_lower:
                return True
        # If no qualifier, accept (most remote jobs are flexible)
        return True
    
    # DEFAULT: If uncertain, accept (to be inclusive)
    return True


def clean_location(location: str) -> str:
    """Clean up location strings for better filtering"""
    if not location:
        return location
    
    # Remove common noise
    location = re.sub(r'\(.*?\)', '', location)  # Remove parentheses content temporarily
    location = re.sub(r'\s+', ' ', location)  # Normalize whitespace
    
    return location.strip()