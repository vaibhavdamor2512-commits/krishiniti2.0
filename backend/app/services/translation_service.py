MESSAGES = {
    "LOW_SOIL_MOISTURE": {"en": "Soil moisture is low. Irrigation may be required soon.", "hi": "मिट्टी में नमी कम है। जल्द सिंचाई की आवश्यकता हो सकती है।", "gu": "જમીનમાં ભેજ ઓછો છે. ટૂંક સમયમાં સિંચાઈની જરૂર પડી શકે છે.", "pa": "ਮਿੱਟੀ ਵਿੱਚ ਨਮੀ ਘੱਟ ਹੈ। ਜਲਦੀ ਸਿੰਚਾਈ ਦੀ ਲੋੜ ਪੈ ਸਕਦੀ ਹੈ।"},
    "DELAY_IRRIGATION": {"en": "Rain is expected. Consider delaying irrigation and monitor soil moisture.", "hi": "बारिश की संभावना है। सिंचाई में देरी करें और मिट्टी की नमी देखें।", "gu": "વરસાદની શક્યતા છે. સિંચાઈ મુલતવી રાખો અને જમીનની ભેજ તપાસો.", "pa": "ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ ਹੈ। ਸਿੰਚਾਈ ਦੇਰੀ ਨਾਲ ਕਰੋ ਅਤੇ ਮਿੱਟੀ ਦੀ ਨਮੀ ਵੇਖੋ।"},
}


def translate_code(code: str, language: str, fallback: str) -> str:
    return MESSAGES.get(code, {}).get(language, fallback)
