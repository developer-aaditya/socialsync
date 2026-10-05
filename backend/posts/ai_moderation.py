import requests
import re
import logging
import os
from django.conf import settings

logger = logging.getLogger(__name__)

# Hugging Face API URL for the toxic content detection model
HF_API_URL = "https://router.huggingface.co/hf-inference/models/unitary/toxic-bert"
HF_API_FALLBACK_URL = "https://api-inference.huggingface.co/models/unitary/toxic-bert"

def get_hf_api_token():
    """Retrieve Hugging Face API Token from settings or environment variables."""
    token = getattr(settings, "HF_API_TOKEN", None)
    if not token or not str(token).strip():
        token = os.getenv("HF_API_TOKEN", None)
    if token and str(token).strip():
        return str(token).strip()
    return None

def check_content_toxicity(text):
    """
    Check if the given text is toxic using local keyword rules and Hugging Face API.
    Returns a tuple containing (is_toxic: bool, reason: str).
    """
    if not text or not text.strip():
        return False, ""  # Empty content is not toxic

    text_lower = text.lower()

    # Expanded list of prohibited words and roots for local fallback moderation
    prohibited_keywords = [
        "hate", "violence", "abuse", "threat", "harassment", "profanity",
        "idiot", "idiotic", "stupid", "dumb", "kill", "murder", "terrorist",
        "bitch", "bastard", "asshole", "fuck", "shit", "cunt", "dick", "whore",
        "slut", "nigger", "retard"
    ]

    for word in prohibited_keywords:
        # Check both word boundary match and direct substring match for key toxic terms
        if re.search(rf'\b{re.escape(word)}', text_lower):
            return True, f"Content contains prohibited keyword: '{word}'"

    hf_token = get_hf_api_token()
    if not hf_token:
        logger.warning(
            "Hugging Face AI Moderation skipped because HF_API_TOKEN is not configured in .env or settings."
        )
        return False, ""

    headers = {
        "Authorization": f"Bearer {hf_token}",
        "x-wait-for-model": "true",
        "Content-Type": "application/json"
    }

    endpoints = [HF_API_URL, HF_API_FALLBACK_URL]
    
    for url in endpoints:
        try:
            response = requests.post(
                url,
                headers=headers,
                json={"inputs": text},
                timeout=3.5
            )
            
            logger.warning(f"[AI Moderation] Hugging Face API response status: {response.status_code}")

            if response.status_code == 200:
                predictions = response.json()
                
                # toxic-bert returns a list or nested list of classification labels and scores
                if isinstance(predictions, list) and len(predictions) > 0:
                    scores = predictions[0] if isinstance(predictions[0], list) else predictions
                    
                    if isinstance(scores, list):
                        for item in scores:
                            if not isinstance(item, dict):
                                continue
                            label = item.get('label', '').lower()
                            value = item.get('score', 0)
                            
                            # If AI score for toxicity/hate_speech is above 50%
                            if label in ['toxic', 'severe_toxic', 'obscene', 'threat', 'insult', 'identity_hate'] and value > 0.50:
                                confidence = int(value * 100)
                                return True, f"AI Moderation Flagged: Excessive {label} content detected ({confidence}% confidence)."
                # Successful API response evaluated
                break

            elif response.status_code in [401, 403]:
                error_detail = ""
                try:
                    err_json = response.json()
                    error_detail = err_json.get('error', response.text)
                except Exception:
                    error_detail = response.text
                logger.error(f"Hugging Face API Error ({response.status_code}): {error_detail}")
                print(f"[AI Moderation] Hugging Face API Error (HTTP {response.status_code}): {error_detail}")
                break
            else:
                logger.warning(f"Hugging Face API returned HTTP {response.status_code}: {response.text}")

        except requests.exceptions.RequestException as e:
            logger.warning(f"Hugging Face AI Moderation API Exception for {url}: {e}")

    return False, ""