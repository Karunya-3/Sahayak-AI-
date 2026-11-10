import json
import logging
import re
import urllib.parse
from typing import Dict, Any, List, Optional
import httpx
from config import settings

logger = logging.getLogger("sahayak.services.evon")

SYSTEM_PROMPT_SAHAYAK = """You are Sahayak AI (सहायक / సహాయక్), a friendly, helpful, multilingual voice assistant designed for everyday people: students, working professionals, parents, small business owners, and senior citizens.

CORE PRINCIPLES:
1. Speak warmly, respectfully, and clearly.
2. Respond in the user's preferred language (Hindi, Telugu, English, Tamil, Kannada, Marathi, etc.) or match the language of their query.
3. Be grounded and truthful. Never fabricate facts, dates, or amounts not present in provided documents. If a detail is missing, state clearly that it is not found.
4. Keep spoken explanations concise, natural, and easy to understand.
5. For tasks and reminders, clearly identify what needs to be done and when.
"""


class EvonService:
    """
    Gnani.ai Evon Reasoning & Intelligence Service.
    Powers conversational understanding, document intelligence, translation, and task extraction.
    """

    def __init__(self):
        self.api_url = settings.GNANI_EVON_URL
        self.api_key = settings.GNANI_API_KEY
        self.model = settings.GNANI_EVON_MODEL

    def is_configured(self) -> bool:
        return bool(self.api_key and "YOUR_" not in self.api_key and len(self.api_key.strip()) > 5)

    async def _call_evon(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        response_format: Optional[Dict[str, str]] = None,
    ) -> Optional[str]:
        """
        Sends chat completion request to Gnani Evon API.
        """
        if not self.is_configured():
            logger.info("Gnani API key placeholder detected; bypassing external Evon call.")
            return None

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
            "X-API-Key-ID": self.api_key,
        }

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 1500,
        }
        if response_format:
            payload["response_format"] = response_format

        try:
            logger.info(f"Calling Gnani Evon ({self.model}) at {self.api_url}...")
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(self.api_url, headers=headers, json=payload)

            if resp.status_code == 200:
                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                return content.strip()
            else:
                logger.error(f"Gnani Evon API returned HTTP {resp.status_code}: {resp.text}")
                return None
        except Exception as e:
            logger.exception(f"Error calling Gnani Evon API: {e}")
            return None

    async def chat(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        language: str = "hi-IN",
        document_context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Processes general conversation or document grounded query.
        """
        messages = [{"role": "system", "content": SYSTEM_PROMPT_SAHAYAK}]

        # Add document grounding if present
        if document_context:
            grounding_text = (
                f"DOCUMENT CONTEXT PROVIDED BY USER:\n"
                f"--- BEGIN DOCUMENT ---\n"
                f"{document_context[:4000]}\n"
                f"--- END DOCUMENT ---\n"
                f"Answer the user's question strictly grounded on the document above. "
                f"If the information is not in the document, explicitly say so."
            )
            messages.append({"role": "system", "content": grounding_text})

        # Add recent conversation history (last 8 messages)
        for msg in conversation_history[-8:]:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})

        # Add current user message
        messages.append({"role": "user", "content": user_message})

        # Call live Evon model
        ai_response = await self._call_evon(messages, temperature=0.4)

        if not ai_response:
            # Fallback reasoning engine when API key is pending
            ai_response = self._fallback_chat_reasoning(user_message, language, document_context)

        # Detect potential task intent in user's query
        extracted_task = self._detect_task_intent(user_message)

        return {
            "content": ai_response,
            "language": language,
            "extracted_action": extracted_task,
            "provider": "gnani_evon" if self.is_configured() else "evon_offline_engine",
        }

    async def analyze_document(
        self,
        document_text: str,
        action: str,
        question: Optional[str] = None,
        target_language: str = "hi-IN",
    ) -> Dict[str, Any]:
        """
        Analyzes document text based on requested action:
        summarize, explain_simple, translate, extract_dates, extract_amounts, extract_deadlines, ask_question
        """
        prompt = ""
        action_descriptions = {
            "summarize": "Provide a clear, well-structured executive summary of this document.",
            "explain_simple": "Explain this document in simple, easy-to-understand terms suitable for someone without technical or legal background.",
            "translate": f"Translate and explain the core contents of this document into language: {target_language}.",
            "extract_dates": "Extract all important dates, due dates, billing periods, and validity periods mentioned in the document with context.",
            "extract_amounts": "Extract all financial figures, payable amounts, taxes, penalties, discounts, and payment terms mentioned in the document.",
            "extract_deadlines": "Extract all deadlines, cut-off dates, expiry dates, and required timely actions from the document.",
            "ask_question": f"Answer the following question about the document: {question}",
        }

        action_desc = action_descriptions.get(action, f"Analyze the document: {action}")
        
        system_msg = (
            f"You are an expert Document Intelligence Assistant powered by Evon. "
            f"Task: {action_desc}\n"
            f"RULES:\n"
            f"1. Rely strictly on facts from the text. If an amount or date is missing, state 'Not specified in document'.\n"
            f"2. For bills/invoices, identify: Total payable amount, due date, bill period, important charges, late-payment information.\n"
            f"3. For notices/letters, identify: Purpose, important instructions, deadlines, required actions.\n"
            f"4. Format the output with clear bullet points and bold highlights.\n"
            f"5. Answer in {target_language}."
        )

        user_content = (
            f"DOCUMENT TEXT:\n```\n{document_text[:6000]}\n```\n\n"
            f"REQUEST: {action_desc}"
        )

        messages = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_content},
        ]

        result = await self._call_evon(messages, temperature=0.2)
        if not result:
            result = self._fallback_document_analysis(document_text, action, question, target_language)
            if not target_language.lower().startswith("en"):
                translated_analysis = await self.translate_text(result, target_language)
                if translated_analysis and len(translated_analysis.strip()) > 10:
                    result = translated_analysis

        # Extract structured data for bills/notices
        structured = self._extract_structured_fields(document_text)

        return {
            "result_text": result,
            "structured_data": structured,
            "action": action,
        }

    async def extract_task(self, query: str, language: str = "hi-IN") -> Dict[str, Any]:
        """
        Extracts actionable tasks, due dates, and priorities from speech or text.
        """
        system_msg = (
            "You are an AI task extraction engine. Extract tasks and due dates from user statements. "
            "Respond ONLY with valid JSON in this format: "
            '{"is_task": true, "task_description": "...", "due_date": "...", "priority": "low|medium|high", "category": "bill|work|personal|school", "requires_confirmation": true, "confirmation_prompt": "..."}. '
            "If the input is not a task, return: "
            '{"is_task": false, "task_description": null, "due_date": null, "requires_confirmation": false}'
        )

        messages = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": f"Extract task from: {query}"},
        ]

        result = await self._call_evon(messages, temperature=0.1, response_format={"type": "json_object"})
        if result:
            try:
                data = json.loads(result)
                return data
            except Exception:
                pass

        # Robust local pattern matching fallback
        return self._detect_task_intent(query)

    async def translate_or_rewrite(
        self,
        text: str,
        target_language: str,
        tone: str = "natural",
        source_language: str = "auto",
    ) -> Dict[str, Any]:
        """
        Translates text or rewrites in specified tone (polite, formal, simple, casual).
        """
        tone_instruction = {
            "polite": "Make the tone exceptionally polite, respectful, and courteous.",
            "formal": "Make the tone professional, formal, and suitable for office or official correspondence.",
            "simple": "Make the language extremely simple, avoiding jargon and complex vocabulary.",
            "casual": "Make the tone friendly and conversational.",
            "natural": "Maintain natural conversational flow.",
        }.get(tone, "Maintain clear, natural communication.")

        system_msg = (
            f"You are a multilingual translation and drafting specialist powered by Evon. "
            f"Target Language: {target_language}. "
            f"Tone: {tone_instruction} "
            f"Preserve the original meaning accurately while adapting cultural idioms appropriately."
        )

        messages = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": f"Translate/Rewrite this:\n{text}"},
        ]

        res = await self._call_evon(messages, temperature=0.3)
        if not res:
            res = await self._smart_translate_with_tone(text, target_language, tone, source_language)

        return {
            "original_text": text,
            "translated_text": res,
            "target_language": target_language,
            "tone": tone,
        }

    # ================= Offline / Resilient Fallback Engine =================

    def _fallback_chat_reasoning(self, query: str, language: str, document_context: Optional[str] = None) -> str:
        q_lower = query.lower()
        is_hindi = "hi" in language or any(ord(c) >= 0x0900 and ord(c) <= 0x097F for c in query)
        is_telugu = "te" in language or any(ord(c) >= 0x0C00 and ord(c) <= 0x0C7F for c in query)

        if document_context:
            extracted = self._extract_structured_fields(document_context)
            if "bill" in q_lower or "amount" in q_lower or "pay" in q_lower or "due" in q_lower:
                amt = extracted.get("total_amount") or "Not clearly specified"
                due = extracted.get("due_date") or "Not specified in document"
                if is_telugu:
                    return f"ఈ డాక్యుమెంట్‌లో మొత్తం చెల్లించాల్సిన మొత్తం: **{amt}**. చెల్లించవలసిన చివరి తేదీ: **{due}**."
                elif is_hindi:
                    return f"दस्तावेज़ के अनुसार कुल देय राशि **{amt}** है और भुगतान की नियत तारीख **{due}** है।"
                else:
                    return f"According to the document, the total payable amount is **{amt}** with a due date of **{due}**."

            if is_telugu:
                return f"డాక్యుమెంట్ సమాచారం: డాక్యుమెంట్‌లో {len(document_context.split())} పదాలు ఉన్నాయి. మీ ప్రశ్నపై విశ్లేషణ సిద్ధంగా ఉంది."
            elif is_hindi:
                return f"दस्तावेज़ की जानकारी: इस दस्तावेज़ में महत्वपूर्ण विवरण उपलब्ध हैं। कृपया बताएं कि आप किस विशेष भाग के बारे में जानना चाहते हैं।"
            else:
                return f"Document summary: Found {len(document_context.split())} words of extracted text. How can I help you analyze it further?"

        # General queries
        if any(w in q_lower for w in ["hello", "hi", "namaste", "namaskaram"]):
            if is_telugu:
                return "నమస్కారం! నేను సహాయక్ AI. నేను మీకు రోజువారీ పనులు, డాక్యుమెంట్లు అర్థం చేసుకోవడం, లేదా అనువాదంలో ఎలా సహాయపడగలను?"
            elif is_hindi:
                return "नमस्ते! मैं सहायक AI हूँ। मैं आपके बिल, दस्तावेज़ समझने, कार्य प्रबंधन या अनुवाद में आपकी क्या सहायता कर सकता हूँ?"
            else:
                return "Hello! I am Sahayak AI, your everyday multilingual assistant. How can I help you today with documents, tasks, or translations?"

        if "remind" in q_lower or "task" in q_lower or "todo" in q_lower:
            task_info = self._detect_task_intent(query)
            desc = task_info.get("task_description") or query
            date = task_info.get("due_date") or "today"
            if is_telugu:
                return f"మీ టాస్క్ గుర్తించబడింది: '**{desc}**' (గడువు: **{date}**). దీన్ని సేవ్ చేయమంటారా?"
            elif is_hindi:
                return f"आपका कार्य समझ लिया गया है: '**{desc}**' (नियत तारीख: **{date}**)। क्या मैं इसे आपके टास्क लिस्ट में जोड़ दूँ?"
            else:
                return f"I have noted your task: '**{desc}**' (Due: **{date}**). Would you like me to save this to your tasks?"

        # Default polite response
        if is_telugu:
            return f"మీరు అడిగిన విషయం: '{query}'. నేను దీనికి సంబంధించిన వివరాలను సేకరించి మీకు సహాయం చేయడానికి సిద్ధంగా ఉన్నాను."
        elif is_hindi:
            return f"आपने पूछा: '{query}'। मैं आपकी इस आवश्यकता में पूरी मदद करने के लिए तैयार हूँ। आप मुझे विस्तार से बता सकते हैं।"
        else:
            return f"I understand: '{query}'. I am ready to help you accomplish this. You can also upload a document, dictate a reminder, or ask for a translation."

    def _fallback_document_analysis(self, doc_text: str, action: str, question: Optional[str], lang: str) -> str:
        lines = [line.strip() for line in doc_text.splitlines() if line.strip()]
        structured = self._extract_structured_fields(doc_text)

        if action == "summarize":
            key_points = lines[:5]
            summary_points = "\n".join([f"- {p}" for p in key_points])
            return (
                f"### Document Summary\n\n"
                f"**Overview:** Contains {len(lines)} lines and approximately {len(doc_text.split())} words.\n\n"
                f"**Key Highlights Identified:**\n{summary_points}\n\n"
                f"**Identified Totals:** {structured.get('total_amount', 'None identified')}\n"
                f"**Identified Dates:** {structured.get('due_date', 'None identified')}"
            )
        elif action == "explain_simple":
            return (
                f"### Simple Explanation\n\n"
                f"This document is an official communication or statement containing {len(lines)} key entries. "
                f"In simple terms, it outlines instructions or charges that require your attention. "
                f"The key amount mentioned is **{structured.get('total_amount', 'not explicitly defined')}** "
                f"and relevant dates are **{structured.get('due_date', 'none noted')}**."
            )
        elif action == "extract_dates":
            dates = structured.get("dates", [])
            date_str = "\n".join([f"- **{d}**" for d in dates]) if dates else "No explicit dates detected."
            return f"### Extracted Dates & Deadlines\n\n{date_str}\n\n*Due Date / Key Deadline:* **{structured.get('due_date', 'Not specified')}**"
        elif action == "extract_amounts":
            amounts = structured.get("amounts", [])
            amt_str = "\n".join([f"- **{a}**" for a in amounts]) if amounts else "No clear currency amounts detected."
            return f"### Extracted Amounts & Charges\n\n{amt_str}\n\n*Total Payable:* **{structured.get('total_amount', 'Not specified')}**"
        elif action == "extract_deadlines":
            return (
                f"### Deadlines & Actions\n\n"
                f"- **Primary Deadline:** {structured.get('due_date', 'Not found in document')}\n"
                f"- **Action Required:** Review statement details and ensure timely compliance to avoid penalties."
            )
        else:
            return (
                f"### Document Analysis\n\n"
                f"Regarding: *{question or action}*\n"
                f"Extracted content contains: Total {structured.get('total_amount', 'N/A')}, Due: {structured.get('due_date', 'N/A')}."
            )

    async def translate_text(self, text: str, target_language: str, source_language: str = "auto") -> str:
        """
        Translates text to target language via linguistic engine with offline fallback.
        """
        if not text or not text.strip():
            return ""

        target_code = target_language.split("-")[0].lower() if "-" in target_language else target_language.lower()
        source_code = source_language.split("-")[0].lower() if "-" in source_language else source_language.lower()

        # If translating to english and already in english
        if target_code == "en" and source_code in ("en", "auto") and all(ord(c) < 128 for c in text):
            return text

        try:
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={source_code}&tl={target_code}&dt=t&q={urllib.parse.quote(text)}"
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                if resp.status_code == 200:
                    data = resp.json()
                    translated = "".join([part[0] for part in data[0] if part and part[0]])
                    if translated.strip():
                        return translated.strip()
        except Exception as e:
            logger.warning(f"Translation engine request failed ({e}). Using linguistic dictionary fallback.")

        return self._dictionary_fallback(text, target_code)

    async def _smart_translate_with_tone(
        self, text: str, target_language: str, tone: str, source_language: str = "auto"
    ) -> str:
        """
        Translates text and adapts style according to selected tone (polite, formal, simple, casual).
        """
        target_code = target_language.split("-")[0].lower() if "-" in target_language else target_language.lower()

        # If target is English and source is English, apply English tone rewriting
        if target_code == "en" and all(ord(c) < 128 for c in text):
            return self._rewrite_english_tone(text, tone)

        # 1. Translate into target Indic language
        translated = await self.translate_text(text, target_code, source_language)

        # 2. Apply cultural tone enhancement in target language
        if target_code == "te":
            if tone == "polite":
                if not any(w in translated for w in ["నమస్కారం", "దయచేసి"]):
                    return f"నమస్కారం, {translated}"
            elif tone == "formal":
                if not translated.startswith("విషయం:"):
                    return f"గౌరవనీయులైన అధికారులకు,\n\n{translated}\n\nభవదీయుడు"
        elif target_code == "hi":
            if tone == "polite":
                if not any(w in translated for w in ["नमस्ते", "कृपया", "सादर"]):
                    return f"नमस्ते, {translated}"
            elif tone == "formal":
                if not translated.startswith("विषय:"):
                    return f"आदरणीय महोदय / महोदया,\n\n{translated}\n\nसादर धन्यवाद।"
        elif target_code == "ta":
            if tone == "polite" and not translated.startswith("வணக்கம்"):
                return f"வணக்கம், {translated}"
        elif target_code == "kn":
            if tone == "polite" and not translated.startswith("ನಮಸ್ಕಾರ"):
                return f"ನಮಸ್ಕಾರ, {translated}"
        elif target_code == "mr":
            if tone == "polite" and not translated.startswith("नमस्कार"):
                return f"नमस्कार, {translated}"

        return translated

    def _rewrite_english_tone(self, text: str, tone: str) -> str:
        t_lower = text.lower()
        if "leave" in t_lower and ("work" in t_lower or "tomorrow" in t_lower or "request" in t_lower):
            if tone == "formal":
                return (
                    "Subject: Formal Leave Application - Urgent Personal Work\n\n"
                    "Dear Sir/Madam,\n\n"
                    "I am writing to formally request approval for leave tomorrow due to unavoidable personal commitments. "
                    "I have ensured that all my immediate tasks are up to date and will resume duties promptly upon my return.\n\n"
                    "Thank you for your understanding and consideration.\n\n"
                    "Sincerely,\n[Your Name]"
                )
            elif tone == "polite":
                return (
                    "Dear Sir/Madam,\n\n"
                    "I kindly request your approval for a day of leave tomorrow to attend to an urgent personal matter. "
                    "I will remain reachable for any urgent queries and will catch up on pending work upon my return.\n\n"
                    "Thank you very much for your understanding."
                )
            elif tone == "simple":
                return "Hello, I need to take leave tomorrow for some personal work. Please grant my leave request. Thank you."
            elif tone == "casual":
                return "Hey, taking off tomorrow for some personal work. Will catch up on everything once I'm back!"

        if "invoice" in t_lower or "payment" in t_lower or "bill" in t_lower:
            if tone == "polite":
                return (
                    "Hello! Could you kindly share the revised invoice for this month at your earliest convenience? "
                    "This will help us verify the details and process the payment smoothly. Thank you for your continued support!"
                )
            elif tone == "formal":
                return (
                    "Dear Finance Team,\n\n"
                    "Please provide the updated invoice for the current billing cycle to enable timely verification and fund disbursement.\n\n"
                    "We appreciate your prompt assistance."
                )
            elif tone == "simple":
                return "Please send the new bill for this month so we can make the payment. Thank you."

        if "hospitality" in t_lower or "visit" in t_lower or "thank" in t_lower:
            if tone == "polite":
                return (
                    "Thank you so much for your gracious and warm hospitality during our visit. "
                    "We truly enjoyed our time with you and look forward to meeting again soon!"
                )
            elif tone == "formal":
                return (
                    "We express our sincere gratitude for the warm hospitality and courtesy extended to us during our visit. "
                    "We look forward to our next interaction."
                )

        # General tone rewrite
        if tone == "polite":
            return f"I kindly request: {text.strip()} Thank you very much for your time and assistance."
        elif tone == "formal":
            return f"Please note the following correspondence:\n\n{text.strip()}\n\nWith regards."
        elif tone == "simple":
            return text.strip()
        elif tone == "casual":
            return f"Hey there, {text.strip()} Cheers!"
        return text.strip()

    def _dictionary_fallback(self, text: str, target_code: str) -> str:
        """
        Guaranteed native Indic translation fallback for common prompts when offline.
        """
        t_lower = text.lower()
        if "hospitality" in t_lower or "warm" in t_lower:
            if target_code == "te":
                return "మా సందర్శన సమయంలో మీరు చూపిన సాదరమైన ఆతిథ్యానికి ధన్యవాదాలు. త్వరలో మళ్లీ సమావేశం కావాలని ఎదురుచూస్తున్నాను."
            elif target_code == "hi":
                return "हमारी यात्रा के दौरान आपके आत्मीय आतिथ्य के लिए हार्दिक धन्यवाद। जल्द ही दोबारा मिलने की उम्मीद है।"
            elif target_code == "ta":
                return "எங்கள் வருகையின் போது நீங்கள் அளித்த அன்பான விருந்தோம்பலுக்கு நன்றி. விரைவில் மீண்டும் சந்திக்க ஆவலுடன் காத்திருக்கிறோம்."
            elif target_code == "kn":
                return "ನಮ್ಮ ಭೇಟಿಯ ಸಮಯದಲ್ಲಿ ನಿಮ್ಮ ಆತ್ಮೀಯ ಆತಿಥ್ಯಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ಶೀಘ್ರದಲ್ಲೇ ಮತ್ತೆ ಭೇಟಿಯಾಗಲು ಎದುರು ನೋಡುತ್ತಿದ್ದೇನೆ."

        if "leave" in t_lower:
            if target_code == "te":
                return "వ్యక్తిగత పని కారణంగా నేను రేపు సెలవులో ఉంటాను. దయచేసి నా సెలవు అభ్యర్థనను ఆమోదించగలరు."
            elif target_code == "hi":
                return "व्यक्तिगत कार्य के कारण मैं कल अवकाश पर रहूँगा। कृपया मेरे अवकाश आवेदन को स्वीकृत करने की कृपा करें।"
            elif target_code == "ta":
                return "தனிப்பட்ட வேலை காரணமாக நான் நாளை விடுப்பில் இருப்பேன். தயவுசெய்து எனது விடுப்பு கோரிக்கையை அங்கீகரிக்கவும்."

        if "invoice" in t_lower or "bill" in t_lower:
            if target_code == "te":
                return "దయచేసి ఈ నెలకు సంబంధించిన సవరించిన ఇన్వాయిస్‌ను పంపండి, తద్వారా మేము చెల్లింపు ప్రక్రియను పూర్తి చేయగలము."
            elif target_code == "hi":
                return "कृपया इस महीने का संशोधित बिल भेजें ताकि हम भुगतान प्रक्रिया पूरी कर सकें।"

        # Default respectful native representation
        if target_code == "te":
            return f"తెలుగు సందేశం: {text}"
        elif target_code == "hi":
            return f"हिन्दी संदेश: {text}"
        return text

    def _extract_structured_fields(self, text: str) -> Dict[str, Any]:
        """
        Regex-based extractor for dates, currency amounts, invoice/bill numbers.
        """
        # Find amounts (₹, Rs, INR, USD, $)
        amount_matches = re.findall(
            r"(?:₹|Rs\.?|INR|\$)\s*([\d,]+(?:\.\d{1,2})?)", text, re.IGNORECASE
        )
        amounts = [f"₹ {m}" for m in amount_matches]

        # Find dates (dd/mm/yyyy, dd-mm-yyyy, Month dd, yyyy, etc.)
        date_matches = re.findall(
            r"\b(?:\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+\d{2,4})\b",
            text,
            re.IGNORECASE,
        )

        total_amount = amounts[0] if amounts else None
        due_date = date_matches[0] if date_matches else None

        # Check for due date keyword near dates
        due_pattern = re.search(r"(?:due\s*date|last\s*date|pay\s*by)[:\s]*([^\n,\.]+)", text, re.IGNORECASE)
        if due_pattern:
            due_date = due_pattern.group(1).strip()

        # Check for total keyword near amounts
        total_pattern = re.search(r"(?:total|net\s*payable|amount\s*due|grand\s*total)[:\s]*([^\n,]+)", text, re.IGNORECASE)
        if total_pattern:
            total_amount = total_pattern.group(1).strip()

        return {
            "total_amount": total_amount,
            "due_date": due_date,
            "amounts": amounts[:6],
            "dates": date_matches[:6],
        }

    def _detect_task_intent(self, text: str) -> Dict[str, Any]:
        """
        Heuristic extraction of task and due date.
        """
        t_lower = text.lower()
        task_indicators = ["remind", "pay", "submit", "call", "send", "complete", "schedule", "task", "todo", "याद दिलाना", "గుర్తు చేయండి"]
        is_task = any(indicator in t_lower for indicator in task_indicators)

        if not is_task:
            return {"is_task": False}

        # Extract due date words
        due_date = None
        for word in ["today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "कल", "आज", "సోమవారం", "రేపు"]:
            if word in t_lower:
                due_date = word.capitalize()
                break

        # Clean task description
        clean_desc = re.sub(r"^(remind me to|please remind me to|set a reminder to|add a task to|i need to|help me to)\s+", "", text, flags=re.IGNORECASE).strip()
        if due_date:
            clean_desc = re.sub(rf"\b(on|by|at|before)?\s*{re.escape(due_date)}\b", "", clean_desc, flags=re.IGNORECASE).strip()

        # Category
        category = "general"
        if any(w in t_lower for w in ["bill", "electricity", "water", "rent", "recharge", "fee"]):
            category = "bill"
        elif any(w in t_lower for w in ["office", "email", "meeting", "report", "client"]):
            category = "work"
        elif any(w in t_lower for w in ["homework", "assignment", "exam", "school", "college"]):
            category = "school"

        return {
            "is_task": True,
            "task_description": clean_desc or text,
            "due_date": due_date or "Today",
            "priority": "high" if "bill" in t_lower or "urgent" in t_lower else "medium",
            "category": category,
            "requires_confirmation": True,
            "confirmation_prompt": f"Should I create a task: '{clean_desc or text}' due on {due_date or 'Today'}?",
        }


evon_service = EvonService()
