import axios from 'axios';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000,
});

export const api = {
  // --- SYSTEM ---
  getHealth: async () => {
    const res = await client.get('/health');
    return res.data;
  },

  // --- VOICE ---
  getLanguages: async () => {
    const res = await client.get('/voice/languages');
    return res.data;
  },

  transcribeAudio: async (audioBlob, languageCode = 'indic-auto') => {
    const formData = new FormData();
    const isWebm = audioBlob.type && audioBlob.type.includes('webm');
    const filename = isWebm ? 'recording.webm' : 'recording.wav';
    formData.append('audio_file', audioBlob, filename);
    formData.append('language_code', languageCode);
    formData.append('format_type', 'codemix');

    const res = await client.post('/voice/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  synthesizeSpeech: async ({ text, language = 'hi-IN', voice, speed = 1.0 }) => {
    const res = await client.post('/voice/speak', {
      text,
      language,
      voice,
      speed,
    });
    return res.data;
  },

  // --- CHAT ---
  sendMessage: async ({
    conversationId,
    message,
    language = 'hi-IN',
    generateSpeech = false,
    documentContext = null,
  }) => {
    const res = await client.post('/chat/message', {
      conversation_id: conversationId,
      message,
      language,
      generate_speech: generateSpeech,
      document_context: documentContext,
    });
    return res.data;
  },

  getConversations: async (userId = 'default_user') => {
    const res = await client.get('/chat/conversations', { params: { user_id: userId } });
    return res.data;
  },

  getConversation: async (conversationId, userId = 'default_user') => {
    const res = await client.get(`/chat/conversations/${conversationId}`, { params: { user_id: userId } });
    return res.data;
  },

  deleteConversation: async (conversationId, userId = 'default_user') => {
    const res = await client.delete(`/chat/conversations/${conversationId}`, { params: { user_id: userId } });
    return res.data;
  },

  translateText: async ({ text, targetLanguage, tone = 'natural' }) => {
    const res = await client.post('/chat/translate', {
      text,
      target_language: targetLanguage,
      tone,
    });
    return res.data;
  },

  // --- DOCUMENTS ---
  uploadDocument: async (file, userId = 'default_user') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);

    const res = await client.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000,
    });
    return res.data;
  },

  getDocuments: async (userId = 'default_user') => {
    const res = await client.get('/documents', { params: { user_id: userId } });
    return res.data;
  },

  getDocument: async (documentId, userId = 'default_user') => {
    const res = await client.get(`/documents/${documentId}`, { params: { user_id: userId } });
    return res.data;
  },

  updateDocumentText: async (documentId, text, userId = 'default_user') => {
    const res = await client.put(`/documents/${documentId}/text`, {
      extracted_text: text,
    }, { params: { user_id: userId } });
    return res.data;
  },

  performDocumentAction: async ({
    documentId,
    action,
    question = null,
    targetLanguage = 'hi-IN',
    generateSpeech = false,
  }) => {
    const res = await client.post('/documents/action', {
      document_id: documentId,
      action,
      question,
      target_language: targetLanguage,
      generate_speech: generateSpeech,
    });
    return res.data;
  },

  deleteDocument: async (documentId, userId = 'default_user') => {
    const res = await client.delete(`/documents/${documentId}`, { params: { user_id: userId } });
    return res.data;
  },

  // --- TASKS ---
  getTasks: async (status = null, userId = 'default_user') => {
    const params = { user_id: userId };
    if (status) params.status = status;
    const res = await client.get('/tasks', { params });
    return res.data;
  },

  createTask: async (taskData) => {
    const res = await client.post('/tasks', taskData);
    return res.data;
  },

  updateTask: async (taskId, updates, userId = 'default_user') => {
    const res = await client.put(`/tasks/${taskId}`, updates, { params: { user_id: userId } });
    return res.data;
  },

  deleteTask: async (taskId, userId = 'default_user') => {
    const res = await client.delete(`/tasks/${taskId}`, { params: { user_id: userId } });
    return res.data;
  },

  extractTask: async (query, language = 'hi-IN') => {
    const res = await client.post('/tasks/extract', { query, language });
    return res.data;
  },
};
