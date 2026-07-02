'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { uploadStudentDocument } from '../services/verificationService';

type DocType = 'student_card' | 'registration_proof' | 'fee_statement';

interface DocumentUploadFormProps {
  userId: string;
  documentType: DocType;
  onUploadComplete?: () => void;
}

interface ExistingDoc {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  attempt_number: number;
  admin_notes?: string | null;
  uploaded_at: string;
  file_url: string;
}

const META: Record<DocType, { title: string; icon: string; description: string }> = {
  student_card: {
    title: 'Student Card',
    icon: '🪪',
    description: 'Clear photo of your valid student ID card',
  },
  registration_proof: {
    title: 'Registration Proof',
    icon: '📋',
    description: 'Current course registration document from your institution',
  },
  fee_statement: {
    title: 'Fee Statement',
    icon: '💳',
    description: 'Recent fee statement from your institution',
  },
};

export function DocumentUploadForm({ userId, documentType, onUploadComplete }: DocumentUploadFormProps) {
  const meta = META[documentType];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [existing, setExisting] = useState<ExistingDoc | null>(null);
  const [checking, setChecking] = useState(true);

  // Fetch the latest document of THIS type for THIS user (status-aware UI)
  const refreshStatus = async () => {
    setChecking(true);
    const { data } = await supabase
      .from('verification_documents')
      .select('id, status, attempt_number, admin_notes, uploaded_at, file_url')
      .eq('user_id', userId)
      .eq('document_type', documentType)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setExisting((data as ExistingDoc) || null);
    setChecking(false);
  };

  useEffect(() => { if (userId) refreshStatus(); /* eslint-disable-next-line */ }, [userId, documentType]);

  const pickFile = (selected?: File) => {
    if (!selected) return;
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selected.type)) {
      setMessageType('error'); setMessage('Invalid file type. JPG, PNG or PDF only.'); return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setMessageType('error'); setMessage('File is too large (max 5MB).'); return;
    }
    setFile(selected); setMessageType(''); setMessage('');
    if (selected.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(selected);
    } else { setPreview(null); }
  };

  const handleUpload = async () => {
    if (!file) { setMessageType('error'); setMessage('Please choose a file first'); return; }
    setLoading(true);
    const result = await uploadStudentDocument(userId, documentType, file);
    setLoading(false);
    setMessageType(result.success ? 'success' : 'error');
    setMessage(result.message);
    if (result.success) {
      setFile(null); setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await refreshStatus();
      onUploadComplete?.();
    }
  };

  // ---------- STATUS PANELS ----------
  if (checking) {
    return <div className="border rounded-lg p-4 text-sm text-gray-500">Checking {meta.title} status…</div>;
  }

  // Approved → no upload UI, just a confirmation
  if (existing?.status === 'approved') {
    return (
      <div className="bg-white border border-green-200 rounded-lg p-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{meta.icon}</span>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">{meta.title}</h3>
            <p className="text-sm text-green-700 font-medium">✅ Approved</p>
          </div>
        </div>
      </div>
    );
  }

  // Pending → no resubmit allowed (matches DB rule), friendly message
  if (existing?.status === 'pending') {
    return (
      <div className="bg-white border border-yellow-200 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{meta.icon}</span>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">{meta.title}</h3>
            <p className="text-sm text-yellow-700 font-medium">⏳ Awaiting admin review</p>
            <p className="text-xs text-gray-500 mt-1">
              Submitted {new Date(existing.uploaded_at).toLocaleDateString()} ·
              Attempt {existing.attempt_number}/5
            </p>
            <a href={existing.file_url} target="_blank" rel="noreferrer"
              className="text-xs text-blue-600 hover:underline mt-2 inline-block">
              View submitted document →
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Rejected OR not yet submitted → show upload UI
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{meta.icon}</span>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">{meta.title}</h3>
          <p className="text-sm text-gray-600">{meta.description}</p>
        </div>
      </div>

      {existing?.status === 'rejected' && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
          <p className="font-semibold text-red-800">❌ Previous submission rejected</p>
          {existing.admin_notes && (
            <p className="text-red-700 mt-1"><strong>Reason:</strong> {existing.admin_notes}</p>
          )}
          <p className="text-xs text-red-700 mt-1">You may resubmit (attempt {(existing.attempt_number ?? 0) + 1}/5).</p>
        </div>
      )}

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); pickFile(e.dataTransfer.files?.[0]); }}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition cursor-pointer"
      >
        <input
          ref={fileInputRef} type="file" accept="image/jpeg,image/png,application/pdf"
          onChange={(e) => pickFile(e.target.files?.[0] || undefined)}
          className="hidden" disabled={loading}
        />
        {preview ? (
          <img src={preview} alt="Preview" className="mx-auto max-h-40 rounded border" />
        ) : (
          <>
            <div className="text-3xl">📄</div>
            <p className="font-semibold text-gray-900 mt-2">Click to upload or drag &amp; drop</p>
            <p className="text-xs text-gray-500">JPG, PNG or PDF · Max 5MB</p>
          </>
        )}
      </div>

      {file && (
        <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
          <div className="text-sm">
            <p className="font-medium">📎 {file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
          </div>
          <button onClick={() => { setFile(null); setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
            className="text-sm text-red-600 hover:text-red-800 font-semibold">Remove</button>
        </div>
      )}

      {message && (
        <div className={`rounded p-3 text-sm ${
          messageType === 'success' ? 'bg-green-50 border border-green-200 text-green-800'
          : 'bg-red-50 border border-red-200 text-red-800'}`}>
          {message}
        </div>
      )}

      <button onClick={handleUpload} disabled={!file || loading}
        className={`w-full py-2.5 rounded-lg font-semibold transition ${
          !file || loading ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
        {loading ? 'Uploading…' : `Submit ${meta.title}`}
      </button>
    </div>
  );
}