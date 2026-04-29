"""
app/core/translate.py

Detect and translate non-English job descriptions to English using Groq.
Called during the Silver layer transformation — only fires if the description
is not already English, so English jobs have zero latency impact.
"""

import os
import logging
from groq import Groq

logger = logging.getLogger(__name__)

_client: Groq | None = None

def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    return _client


# Languages we leave alone — everything else gets translated
_ENGLISH_INDICATORS = {"english", "en", "eng"}

# Fast keyword check — if any of these appear in the first 300 chars,
# assume the description is already in English and skip translation
_ENGLISH_KEYWORDS = {
    "the", "and", "for", "with", "you", "are", "this", "that",
    "will", "have", "from", "your", "our", "we ", "be ", "to ",
    "of ", "in ", "is ", "it ", "as ", "at ", "by ", "an ",
}


def is_english(text: str) -> bool:
    if not text or len(text.strip()) < 20:
        return True
    
    sample = text[:500].lower()
    
    # German/French/Portuguese giveaways — if any appear, it's not English
    non_english_markers = [
        "und ", "der ", "die ", "das ", "ist ", "ein ", "eine ",  # German
        "für ", "mit ", "von ", "auf ", "bei ", "wir ", "sie ",   # German
        "les ", "des ", "est ", "que ", "une ", "dans ", "pour ",  # French
        "para ", "com ", "que ", "uma ", "não ", "são ", "pelo ",  # Portuguese
        "per ", "del ", "che ", "una ", "non ", "con ", "alla ",   # Italian
    ]
    
    for marker in non_english_markers:
        if marker in sample:
            return False
    
    return True


def translate_to_english(text: str, max_chars: int = 8000) -> str:
    """
    Translate text to English using Groq (llama-3.3-70b-versatile).
    Returns original text if:
    - Already English (fast heuristic)
    - Translation fails for any reason (fail-safe)

    Args:
        text:      The text to translate.
        max_chars: Truncate input to this length before sending to AI.
                   Job descriptions beyond 8000 chars are rarely useful anyway.
    """
    if not text or not text.strip():
        return text

    if is_english(text):
        return text

    logger.info(f"[Translate] Non-English text detected ({len(text)} chars) — translating...")

    truncated = text[:max_chars]

    try:
        response = _get_client().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a professional translator. "
                        "Translate the following job description to English. "
                        "Preserve formatting, bullet points, and structure. "
                        "Output ONLY the translated text — no explanations, no preamble."
                    ),
                },
                {"role": "user", "content": truncated},
            ],
            temperature=0.1,
            max_tokens=4000,
        )
        translated = response.choices[0].message.content.strip()
        logger.info(f"[Translate] ✅ Translated {len(text)} chars → {len(translated)} chars")
        return translated

    except Exception as e:
        # Never crash ingest because of translation failure
        logger.warning(f"[Translate] Failed — keeping original: {e}")
        return text


def translate_job(job: dict) -> dict:
    """
    Translate a job dict's description_text in-place if non-English.
    Returns the same dict (mutated) for easy pipeline use.

    Usage in your Silver layer:
        from app.core.translate import translate_job
        job = translate_job(job)
    """
    desc = job.get("description_text", "")
    if desc and not is_english(desc):
        job["description_text"] = translate_to_english(desc)
    return job