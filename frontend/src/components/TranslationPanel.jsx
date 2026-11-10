import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { LANGUAGES } from './LanguageSelector';
import {
  Languages,
  Sparkles,
  Volume2,
  VolumeX,
  Copy,
  Send,
  Loader2,
  Check,
  RotateCcw,
  MessageSquare,
  Mail,
  Smile,
} from 'lucide-react';

export const TranslationPanel = () => {
  const { currentLanguage, isSpeaking, playAudio, stopSpeaking, showToast } = useApp();

  const [sourceText, setSourceText] = useState('');
  const [targetLang, setTargetLang] = useState(currentLanguage || 'te-IN');
  const [tone, setTone] = useState('polite'); // polite | formal | simple | casual
  const [isTranslating, setIsTranslating] = useState(false);
  const [resultText, setResultText] = useState('');
  const [audioBase64, setAudioBase64] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleTranslate = async (e) => {
    e?.preventDefault();
    if (!sourceText.trim()) return;

    setIsTranslating(true);
    setResultText('');
    setAudioBase64(null);

    try {
      const res = await api.translateText({
        text: sourceText.trim(),
        targetLanguage: targetLang,
        tone,
      });

      setResultText(res.translated_text);

      // Synthesize with Timbre
      try {
        const ttsRes = await api.synthesizeSpeech({
          text: res.translated_text.substring(0, 300),
          language: targetLang,
        });
        if (ttsRes.success && ttsRes.audio_base64) {
          setAudioBase64(ttsRes.audio_base64);
        }
      } catch (err) {
        console.warn('TTS on translation warning:', err);
      }

      showToast('Text translated and rewritten!', 'success');
    } catch (err) {
      console.error('Translation error:', err);
      showToast('Translation request failed', 'error');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    showToast('Copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyTemplate = (templateText, templateTone = 'polite', lang = 'en-IN') => {
    setSourceText(templateText);
    setTone(templateTone);
    setTargetLang(lang);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-warm-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Languages className="w-4 h-4" />
          </div>
          <h1 className="text-xl font-bold text-charcoal">Translation & Message Writing</h1>
        </div>
        <p className="text-xs text-charcoal-muted mt-0.5">
          Powered by Evon for linguistic nuance & Timbre for natural spoken output.
        </p>
      </div>

      {/* Quick Templates for Everyday Life */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-subtle block">
          Quick Everyday Prompts & Templates
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() =>
              handleApplyTemplate(
                'I will be on leave tomorrow due to personal work. Please approve my leave request.',
                'formal',
                'en-IN'
              )
            }
            className="p-2.5 rounded-xl bg-white border border-warm-200 hover:border-primary/40 text-left text-xs transition-colors flex items-center gap-2 card-soft"
          >
            <Mail className="w-4 h-4 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-charcoal">Formal Leave Request</p>
              <p className="text-[10px] text-charcoal-muted">Office / College leave</p>
            </div>
          </button>

          <button
            onClick={() =>
              handleApplyTemplate(
                'Please send the revised invoice for this month so that we can process the payment.',
                'polite',
                'hi-IN'
              )
            }
            className="p-2.5 rounded-xl bg-white border border-warm-200 hover:border-primary/40 text-left text-xs transition-colors flex items-center gap-2 card-soft"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-charcoal">Polite Invoice Request</p>
              <p className="text-[10px] text-charcoal-muted">Hindi WhatsApp message</p>
            </div>
          </button>

          <button
            onClick={() =>
              handleApplyTemplate(
                'Thank you for your warm hospitality during our visit. Looking forward to meeting again soon.',
                'polite',
                'te-IN'
              )
            }
            className="p-2.5 rounded-xl bg-white border border-warm-200 hover:border-primary/40 text-left text-xs transition-colors flex items-center gap-2 card-soft"
          >
            <Smile className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-charcoal">Courteous Greeting</p>
              <p className="text-[10px] text-charcoal-muted">Telugu polite message</p>
            </div>
          </button>
        </div>
      </div>

      {/* Main Translation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Input Text Card */}
        <div className="card-soft rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-subtle">
              Input Text
            </span>
            <button
              onClick={() => setSourceText('')}
              className="text-xs text-charcoal-subtle hover:text-charcoal"
            >
              Clear
            </button>
          </div>

          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={7}
            placeholder="Enter raw thoughts, complicated English text, or an email draft you wish to rewrite or translate..."
            className="w-full bg-warm-50 border border-warm-300 rounded-xl p-3 text-xs md:text-sm text-charcoal leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-inner"
          />

          {/* Tone Selector */}
          <div>
            <span className="text-[11px] font-semibold text-charcoal-muted block mb-1.5">
              Select Tone / Style
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-medium">
              {[
                { id: 'polite', label: 'Polite' },
                { id: 'formal', label: 'Formal' },
                { id: 'simple', label: 'Simple' },
                { id: 'casual', label: 'Casual' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTone(t.id)}
                  className={`py-2 px-2.5 rounded-xl text-center transition-all ${
                    tone === t.id
                      ? 'bg-primary text-white font-semibold shadow-sm'
                      : 'bg-white border border-warm-300 text-charcoal hover:bg-warm-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Language Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex-1">
              <span className="text-[11px] font-semibold text-charcoal-muted block mb-1">
                Target Language
              </span>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full bg-white border border-warm-300 text-charcoal text-xs font-medium rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.native} ({l.label})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:self-end">
              <button
                onClick={handleTranslate}
                disabled={isTranslating || !sourceText.trim()}
                className="w-full sm:w-auto bg-primary hover:bg-primary-hover disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-sm transition-transform active:scale-95 flex items-center justify-center gap-1.5"
              >
                {isTranslating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Rewrite & Translate</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Output Text Card */}
        <div className="card-soft rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-warm-200">
              <span className="text-xs font-bold uppercase tracking-wider text-charcoal-subtle">
                AI Output ({tone} • {LANGUAGES.find((l) => l.code === targetLang)?.label || targetLang})
              </span>

              {resultText && (
                <div className="flex items-center gap-2">
                  {audioBase64 && (
                    <button
                      onClick={() => {
                        if (isSpeaking) stopSpeaking();
                        else playAudio(audioBase64);
                      }}
                      className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Listen</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs text-charcoal-muted hover:text-charcoal p-1"
                    title="Copy output"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>

            {isTranslating ? (
              <div className="py-20 flex flex-col items-center justify-center text-charcoal-muted space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs font-medium">Adapting tone and translating with Evon...</p>
              </div>
            ) : resultText ? (
              <div className="mt-3 whitespace-pre-wrap text-xs md:text-sm leading-relaxed text-charcoal font-sans bg-warm-50 p-4 rounded-xl border border-warm-200 min-h-[220px]">
                {resultText}
              </div>
            ) : (
              <div className="py-20 text-center text-charcoal-subtle">
                <Languages className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-xs">
                  Your translated or rewritten message will appear here with natural tone adjustment.
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-warm-200 text-center">
            <span className="text-[11px] text-charcoal-subtle">
              Click 'Listen' to hear authentic pronunciation synthesized with Gnani Timbre
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
