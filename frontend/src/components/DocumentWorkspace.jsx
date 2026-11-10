import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  UploadCloud,
  FileText,
  FileCheck,
  Edit3,
  Sparkles,
  Volume2,
  VolumeX,
  Trash2,
  Calendar,
  IndianRupee,
  Clock,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  RotateCcw,
} from 'lucide-react';

export const DocumentWorkspace = () => {
  const { currentLanguage, isSpeaking, playAudio, stopSpeaking, showToast } = useApp();

  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [editableText, setEditableText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [activeAction, setActiveAction] = useState(null);
  const [isSavingText, setIsSavingText] = useState(false);

  const fileInputRef = useRef(null);

  // Load documents list
  const loadDocuments = async () => {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs || []);
      if (docs && docs.length > 0 && !selectedDoc) {
        // Automatically load first document
        handleSelectDocument(docs[0].document_id);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleSelectDocument = async (docId) => {
    try {
      const doc = await api.getDocument(docId);
      setSelectedDoc(doc);
      setEditableText(doc.extracted_text || '');
      setAnalysisResult(null);
      setActiveAction(null);
    } catch (err) {
      showToast('Could not fetch document details', 'error');
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(20);
    try {
      setUploadProgress(50);
      const res = await api.uploadDocument(file);
      setUploadProgress(90);
      showToast('Document uploaded and processed!', 'success');
      await loadDocuments();
      if (res && res.document_id) {
        handleSelectDocument(res.document_id);
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast(err.response?.data?.detail || 'Failed to process document upload.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSaveEditedText = async () => {
    if (!selectedDoc) return;
    setIsSavingText(true);
    try {
      await api.updateDocumentText(selectedDoc.document_id, editableText);
      setSelectedDoc((prev) => ({ ...prev, extracted_text: editableText }));
      showToast('Extracted text updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to save updated text', 'error');
    } finally {
      setIsSavingText(false);
    }
  };

  const handleDocumentAction = async (action, question = null) => {
    if (!selectedDoc) {
      showToast('Please select or upload a document first.', 'info');
      return;
    }

    setActiveAction(action);
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await api.performDocumentAction({
        documentId: selectedDoc.document_id,
        action,
        question: question || customQuestion,
        targetLanguage: currentLanguage,
        generateSpeech: true, // Use Timbre to read out result
      });

      setAnalysisResult(res);
      if (res.audio_base64) {
        playAudio(res.audio_base64);
      }
      showToast('Analysis completed!', 'success');
    } catch (err) {
      console.error('Document analysis error:', err);
      showToast(err.response?.data?.detail || 'Analysis failed. Please try again.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteDocument = async (e, docId) => {
    e.stopPropagation();
    try {
      await api.deleteDocument(docId);
      showToast('Document removed', 'info');
      if (selectedDoc?.document_id === docId) {
        setSelectedDoc(null);
        setEditableText('');
        setAnalysisResult(null);
      }
      await loadDocuments();
    } catch (err) {
      showToast('Failed to delete document', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-warm-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <FileCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-charcoal">Document Intelligence & OCR</h1>
          </div>
          <p className="text-xs text-charcoal-muted mt-0.5">
            PyMuPDF text extraction + OpenCV preprocessing & Tesseract OCR for bills, notices, and letters.
          </p>
        </div>

        {/* Upload Trigger Button */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e.target.files?.[0])}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.bmp"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-transform active:scale-95 disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Upload/List Column + Editor & Analysis Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Upload Area & Recent Documents */}
        <div className="lg:col-span-4 space-y-4">
          {/* Drag & Drop Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileUpload(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-warm-300 hover:border-primary/60 bg-white hover:bg-secondary/20 rounded-2xl p-6 text-center cursor-pointer transition-all card-soft group"
          >
            <div className="w-12 h-12 rounded-xl bg-warm-100 text-primary mx-auto flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-charcoal text-sm">
              Click or drag document here
            </h3>
            <p className="text-xs text-charcoal-muted mt-1">
              PDFs, Images, Bills, Bank Statements, Notices (up to 15MB)
            </p>
            {isUploading && (
              <div className="mt-4 space-y-1">
                <div className="w-full bg-warm-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-[11px] text-primary font-medium">
                  Extracting text with PyMuPDF & OCR...
                </span>
              </div>
            )}
          </div>

          {/* Uploaded Documents List */}
          <div className="card-soft rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-subtle mb-3">
              Your Documents ({documents.length})
            </h3>

            {documents.length === 0 ? (
              <p className="text-xs text-charcoal-subtle text-center py-6">
                No documents uploaded yet. Upload one above!
              </p>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {documents.map((doc) => {
                  const isSelected = selectedDoc?.document_id === doc.document_id;
                  return (
                    <div
                      key={doc.document_id}
                      onClick={() => handleSelectDocument(doc.document_id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-secondary/60 border-primary text-charcoal font-semibold shadow-sm'
                          : 'bg-warm-50 border-warm-200 text-charcoal-muted hover:bg-warm-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-primary' : 'text-charcoal-subtle'}`} />
                        <span className="truncate">{doc.filename}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {doc.file_type && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-warm-200 text-charcoal-muted">
                            {doc.file_type}
                          </span>
                        )}
                        <button
                          onClick={(e) => handleDeleteDocument(e, doc.document_id)}
                          className="p-1 text-charcoal-subtle hover:text-red-500 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (8 cols): Document Text Editor & Evon Actions */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedDoc ? (
            <div className="card-soft rounded-2xl p-12 text-center text-charcoal-muted flex flex-col items-center justify-center min-h-[420px]">
              <FileText className="w-12 h-12 text-charcoal-subtle mb-3" />
              <h3 className="text-base font-semibold text-charcoal">No Document Selected</h3>
              <p className="text-xs text-charcoal-muted max-w-sm mt-1">
                Upload a document on the left or select an existing one to examine details, verify extracted OCR text, and ask questions.
              </p>
            </div>
          ) : (
            <>
              {/* Document Info Banner & Editable Text Area */}
              <div className="card-soft rounded-2xl p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-warm-200 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-charcoal text-sm truncate max-w-xs">
                      {selectedDoc.filename}
                    </span>
                    {selectedDoc.ocr_applied ? (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        OCR Processed
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        Native Text (PyMuPDF)
                      </span>
                    )}
                  </div>

                  {/* Save Edited Text Button */}
                  <button
                    onClick={handleSaveEditedText}
                    disabled={isSavingText}
                    className="flex items-center gap-1.5 bg-warm-200 hover:bg-warm-300 text-charcoal px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    title="Save your manual corrections"
                  >
                    {isSavingText ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Save Text Changes</span>
                  </button>
                </div>

                {/* Editable Text Area */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-charcoal-muted mb-1 px-1">
                    <span>Extracted Document Text (Editable to correct OCR errors)</span>
                    <span>{editableText.length} characters</span>
                  </div>
                  <textarea
                    value={editableText}
                    onChange={(e) => setEditableText(e.target.value)}
                    rows={7}
                    placeholder="Extracted text will appear here. You can manually edit or correct any OCR mistakes before asking questions..."
                    className="w-full bg-warm-50 border border-warm-300 rounded-xl p-3 text-xs text-charcoal font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-inner"
                  />
                </div>

                {/* Document Action Buttons Grid */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-subtle block mb-2">
                    Instant AI Document Actions (Evon)
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'summarize', label: 'Summarize Document', icon: Sparkles },
                      { id: 'explain_simple', label: 'Explain in Simple Terms', icon: HelpCircle },
                      { id: 'extract_amounts', label: 'Extract Amounts & Charges', icon: IndianRupee },
                      { id: 'extract_dates', label: 'Extract Important Dates', icon: Calendar },
                      { id: 'extract_deadlines', label: 'Identify Deadlines', icon: Clock },
                      { id: 'translate', label: `Translate to ${currentLanguage}`, icon: FileCheck },
                    ].map((btn) => {
                      const Icon = btn.icon;
                      const isActive = activeAction === btn.id;
                      return (
                        <button
                          key={btn.id}
                          onClick={() => handleDocumentAction(btn.id)}
                          disabled={isAnalyzing}
                          className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium text-left transition-all border ${
                            isActive
                              ? 'bg-primary text-white border-primary shadow-sm'
                              : 'bg-white hover:bg-secondary/40 border-warm-300 text-charcoal hover:border-primary/40'
                          } disabled:opacity-50`}
                        >
                          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-primary'}`} />
                          <span className="truncate">{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Ask Custom Question about document */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (customQuestion.trim()) {
                        handleDocumentAction('ask_question', customQuestion);
                      }
                    }}
                    className="mt-3 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                      placeholder="Ask any specific question about this document..."
                      className="flex-1 bg-white border border-warm-300 rounded-xl px-3 py-2 text-xs text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <button
                      type="submit"
                      disabled={isAnalyzing || !customQuestion.trim()}
                      className="bg-primary hover:bg-primary-hover disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
                    >
                      {isAnalyzing && activeAction === 'ask_question' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>Ask</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* AI Analysis Result Display Card */}
              {(isAnalyzing || analysisResult) && (
                <div className="card-soft rounded-2xl p-5 border-primary/30 space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between pb-2 border-b border-warm-200">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h4 className="font-bold text-charcoal text-sm capitalize">
                        {analysisResult?.action?.replace('_', ' ') || 'Analyzing...'}
                      </h4>
                    </div>

                    {analysisResult && (
                      <div className="flex items-center gap-2">
                        {analysisResult.audio_base64 && (
                          <button
                            onClick={() => {
                              if (isSpeaking) stopSpeaking();
                              else playAudio(analysisResult.audio_base64);
                            }}
                            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
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
                      </div>
                    )}
                  </div>

                  {isAnalyzing ? (
                    <div className="py-8 flex flex-col items-center justify-center text-charcoal-muted space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <p className="text-xs font-medium">
                        Evon is grounding insights from your document...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Structured extraction highlights (Amounts / Due Dates) */}
                      {analysisResult?.structured_data && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {analysisResult.structured_data.total_amount && (
                            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
                              <span className="font-medium">Total Payable Amount:</span>
                              <span className="font-bold text-sm">
                                {analysisResult.structured_data.total_amount}
                              </span>
                            </div>
                          )}
                          {analysisResult.structured_data.due_date && (
                            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between">
                              <span className="font-medium">Due Date / Cut-off:</span>
                              <span className="font-bold text-sm">
                                {analysisResult.structured_data.due_date}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Main Analysis Output */}
                      <div className="whitespace-pre-wrap text-xs md:text-sm leading-relaxed text-charcoal font-sans bg-warm-50 p-4 rounded-xl border border-warm-200">
                        {analysisResult?.result_text}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
