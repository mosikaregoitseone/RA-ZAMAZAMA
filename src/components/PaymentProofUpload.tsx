'use client';

import { useEffect, useRef, useState } from 'react';
import { uploadPaymentProof, getTransactionDetails } from '../lib/transactionUtils';

interface PaymentProofUploadProps {
  transactionId: string;
  userId: string;
  userType: 'buyer' | 'seller';
  onUploadComplete?: () => void;
  onSellerConfirm?: () => void;
}

interface TransactionDetails {
  id: string;
  listing_price: number;
  listing_currency: string;
  buyer_id: string;
  seller_id: string;
  payment_status?: string;
  payment_proof_url?: string;
  seller_payment_confirmed?: boolean;
  listing?: { title: string };
  buyer?: { full_name: string };
  seller?: { full_name: string };
}

interface PaymentProofUploadResult {
  success: boolean;
  message: string;
  url?: string;
}

export function PaymentProofUpload({
  transactionId,
  userId,
  userType,
  onUploadComplete,
  onSellerConfirm,
}: PaymentProofUploadProps) {
  // ============================================
  // STATE
  // ============================================
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadMessageType, setUploadMessageType] = useState<'success' | 'error' | ''>('');
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragOverRef = useRef(false);

  // ============================================
  // LOAD TRANSACTION DATA
  // ============================================
  useEffect(() => {
    const loadTransaction = async () => {
      try {
        setLoading(true);
        
        // Check if this is a demo/sample transaction ID
        const isDemo = transactionId.startsWith('sample-');
        
        if (isDemo) {
          // Show mock data for demo purposes
          setTransaction({
            id: transactionId,
            listing_price: 299.99,
            listing_currency: 'ZAR',
            buyer_id: 'sample-buyer',
            seller_id: 'sample-seller',
            payment_status: 'unpaid',
            listing: { title: 'Demo Textbook' },
            buyer: { full_name: 'Sample Buyer' },
            seller: { full_name: 'Sample Seller' },
          });
          return;
        }
        
        const details = await getTransactionDetails(transactionId);

        if (!details) {
          setError('Transaction not found');
          return;
        }

        setTransaction(details);
      } catch (err) {
        console.error('Transaction load error:', err);
        setError('Failed to load transaction details');
      } finally {
        setLoading(false);
      }
    };

    loadTransaction();
  }, [transactionId]);

  // ============================================
  // FILE VALIDATION
  // ============================================
  const validateFile = (file: File): { valid: boolean; message?: string } => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        message: 'Invalid file type. Please upload JPG, PNG, WebP, or PDF only.',
      };
    }

    // Check file size (max 10MB for receipts)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        message: 'File is too large. Maximum size is 10MB.',
      };
    }

    // Check file name (no suspicious patterns)
    if (file.name.length > 255) {
      return {
        valid: false,
        message: 'File name is too long.',
      };
    }

    return { valid: true };
  };

  // ============================================
  // HANDLE FILE SELECT (CLICK)
  // ============================================
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      setUploadMessage(validation.message || 'Invalid file');
      setUploadMessageType('error');
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(selectedFile);
    setUploadMessageType('');
    setUploadMessage('');

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type === 'application/pdf') {
      setPreview('PDF');
    } else {
      setPreview(null);
    }
  };

  // ============================================
  // HANDLE DRAG & DROP
  // ============================================
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragOverRef.current = true;
  };

  const handleDragLeave = () => {
    dragOverRef.current = false;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragOverRef.current = false;

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    const validation = validateFile(droppedFile);
    if (!validation.valid) {
      setUploadMessage(validation.message || 'Invalid file');
      setUploadMessageType('error');
      return;
    }

    setFile(droppedFile);
    setUploadMessageType('');
    setUploadMessage('');

    // Create preview for images
    if (droppedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(droppedFile);
    } else if (droppedFile.type === 'application/pdf') {
      setPreview('PDF');
    } else {
      setPreview(null);
    }
  };

  // ============================================
  // HANDLE UPLOAD
  // ============================================
  const handleUpload = async () => {
    if (!file || !transaction) return;

    try {
      setUploading(true);
      setUploadMessage('');

      // ✅ FIXED: Pass object with correct parameter names
      const result: PaymentProofUploadResult = await uploadPaymentProof({
        transactionId,
        proofFile: file,
      });

      if (!result.success) {
        setUploadMessageType('error');
        setUploadMessage(result.message || 'Upload failed');
        return;
      }

      // Success
      setUploadMessageType('success');
      setUploadMessage('Payment proof uploaded successfully! ✅');
      setFile(null);
      setPreview(null);

      // Call optional callback
      if (onUploadComplete) {
        setTimeout(() => {
          onUploadComplete();
        }, 1500);
      }

      // Reset after 2 seconds
      setTimeout(() => {
        setFile(null);
        setPreview(null);
        setUploadMessage('');
      }, 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setUploadMessageType('error');
      setUploadMessage('Error uploading file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ============================================
  // HANDLE SELLER PAYMENT CONFIRMATION
  // ============================================
  const handleSellerConfirm = async () => {
    if (!transaction || userType !== 'seller') return;

    try {
      setConfirmingPayment(true);
      setUploadMessage('');

      // Call the confirmation API endpoint
      const result = await fetch('/api/transactions/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          userId,
        }),
      });

      const data = await result.json();

      if (!data.success) {
        setUploadMessageType('error');
        setUploadMessage(data.message || 'Failed to confirm payment');
        return;
      }

      setUploadMessageType('success');
      setUploadMessage('Payment confirmed! Transaction completed. ✅');

      if (onSellerConfirm) {
        setTimeout(() => {
          onSellerConfirm();
        }, 1500);
      }
    } catch (err) {
      console.error('Confirmation error:', err);
      setUploadMessageType('error');
      setUploadMessage('Error confirming payment. Please try again.');
    } finally {
      setConfirmingPayment(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin text-2xl">⏳</div>
          <span className="text-gray-600">Loading transaction details...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">❌</span>
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <p className="text-gray-600">No transaction data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {userType === 'buyer' ? '💳 Upload Payment Proof' : '✓ Confirm Payment Received'}
        </h2>
        <p className="text-gray-600">
          {userType === 'buyer'
            ? 'Upload proof of payment to complete the transaction'
            : 'Review and confirm the payment proof from buyer'}
        </p>
      </div>

      {/* TRANSACTION DETAILS */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
        <div>
          <div className="text-sm text-gray-600 font-semibold">Item</div>
          <div className="text-gray-900 font-semibold">{transaction.listing?.title}</div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600 font-semibold">Amount Due</div>
            <div className="text-2xl font-bold text-green-600">
              {transaction.listing_price} {transaction.listing_currency}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600 font-semibold">Payment Status</div>
            <div className={`text-sm font-bold mt-1 px-3 py-1 rounded inline-block ${
              transaction.payment_status === 'confirmed'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {transaction.payment_status === 'confirmed' ? '✅ Confirmed' : '⏳ Pending'}
            </div>
          </div>
        </div>
      </div>

      {/* BUYER SECTION - UPLOAD PROOF */}
      {userType === 'buyer' && transaction.payment_status !== 'confirmed' && (
        <>
          {/* INFO BOX */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">💡 What Payment Proof to Upload</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>✓ Bank transfer receipt or screenshot</li>
              <li>✓ Mobile money confirmation (Capitec, FNB, Standard Bank)</li>
              <li>✓ Payment app screenshot (PayPal, Stripe, etc.)</li>
              <li>✓ ATM or online banking transfer confirmation</li>
              <li>✓ Must show: Amount, Date, Transaction ID</li>
            </ul>
          </div>

          {/* FILE UPLOAD AREA */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
              dragOverRef.current ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="text-4xl">📸</div>

              {!file ? (
                <>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">Click to select or drag & drop</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Allowed: JPG, PNG, WebP, PDF (Max 10MB)
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 active:scale-95 transition-transform"
                  >
                    Select File
                  </button>
                </>
              ) : (
                <>
                  {/* FILE PREVIEW */}
                  {preview && preview !== 'PDF' ? (
                    <img
                      src={preview}
                      alt="Payment proof preview"
                      className="max-w-xs max-h-64 rounded border border-gray-200"
                    />
                  ) : preview === 'PDF' ? (
                    <div className="w-24 h-32 bg-red-100 rounded border border-red-300 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-1">📄</div>
                        <div className="text-xs font-semibold text-red-800">PDF</div>
                      </div>
                    </div>
                  ) : null}

                  {/* FILE INFO */}
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">Selected: {file.name}</p>
                    <p className="text-sm text-gray-600">
                      Size: {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  {/* CHANGE FILE BUTTON */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Change File
                  </button>
                </>
              )}
            </div>
          </div>

          {/* UPLOAD BUTTON */}
          {file && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                uploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
              }`}
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Uploading...
                </span>
              ) : (
                '💾 Upload Payment Proof'
              )}
            </button>
          )}

          {/* MESSAGES */}
          {uploadMessage && (
            <div
              className={`rounded-lg p-4 ${
                uploadMessageType === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">
                  {uploadMessageType === 'success' ? '✅' : '❌'}
                </span>
                <div>
                  <p className="font-semibold">
                    {uploadMessageType === 'success' ? 'Success!' : 'Error'}
                  </p>
                  <p className="text-sm mt-1">{uploadMessage}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* SELLER SECTION - REVIEW & CONFIRM */}
      {userType === 'seller' && transaction.payment_proof_url && !transaction.seller_payment_confirmed && (
        <>
          {/* PAYMENT PROOF DISPLAY */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <h3 className="font-semibold text-gray-900 mb-4">Payment Proof from Buyer</h3>

            {transaction.payment_proof_url.includes('image') ? (
              <img
                src={transaction.payment_proof_url}
                alt="Payment proof"
                className="max-w-full max-h-96 rounded border border-gray-200 mb-4"
              />
            ) : (
              <div className="bg-red-50 p-8 rounded border border-red-200 mb-4 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-2">📄</div>
                  <p className="text-red-700 font-semibold">PDF Document</p>
                  <a
                    href={transaction.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 hover:text-red-800 text-sm mt-2 underline"
                  >
                    Click to view PDF
                  </a>
                </div>
              </div>
            )}

            {/* SELLER REVIEW CHECKLIST */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3 mb-4">
              <h4 className="font-semibold text-gray-900">✓ Review Payment Details</h4>
              <div className="space-y-2 text-sm text-gray-700">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded">
                  <input type="checkbox" className="w-4 h-4" />
                  <span>Amount matches ({transaction.listing_price} {transaction.listing_currency})</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded">
                  <input type="checkbox" className="w-4 h-4" />
                  <span>Payment date is recent (today or yesterday)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded">
                  <input type="checkbox" className="w-4 h-4" />
                  <span>Transaction ID visible and legitimate</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded">
                  <input type="checkbox" className="w-4 h-4" />
                  <span>Payment method matches agreed upon</span>
                </label>
              </div>
            </div>
          </div>

          {/* CONFIRM BUTTON */}
          <button
            onClick={handleSellerConfirm}
            disabled={confirmingPayment}
            className={`w-full py-3 rounded-lg font-semibold transition-colors ${
              confirmingPayment
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
            }`}
          >
            {confirmingPayment ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Confirming...
              </span>
            ) : (
              '✓ Confirm Payment Received'
            )}
          </button>

          {/* DISPUTE BUTTON */}
          <button className="w-full py-2 px-4 border border-red-300 rounded-lg text-red-600 hover:bg-red-50 font-semibold">
            ⚠️ Payment Issue? Open Dispute
          </button>

          {/* MESSAGES */}
          {uploadMessage && (
            <div
              className={`rounded-lg p-4 ${
                uploadMessageType === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">
                  {uploadMessageType === 'success' ? '✅' : '❌'}
                </span>
                <div>
                  <p className="font-semibold">
                    {uploadMessageType === 'success' ? 'Success!' : 'Error'}
                  </p>
                  <p className="text-sm mt-1">{uploadMessage}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* COMPLETED STATE */}
      {transaction.seller_payment_confirmed && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">🎉</div>
            <div>
              <h3 className="font-bold text-green-900 text-lg">Transaction Complete!</h3>
              <p className="text-green-800 mt-2">
                Payment confirmed. Both buyer and seller can now rate each other.
              </p>
              <div className="mt-4 space-y-2 text-sm text-green-700">
                <p>✅ QR verification completed</p>
                <p>✅ Payment confirmed</p>
                <p>✅ Transaction closed</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INFO BOX */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 Payment Verification Process</h4>
        <ol className="space-y-2 text-sm text-blue-800">
          <li>
            <strong>Buyer:</strong> After meeting confirmed via QR, pay seller using agreed method
          </li>
          <li>
            <strong>Buyer:</strong> Upload proof of payment (bank receipt, screenshot, etc.)
          </li>
          <li>
            <strong>Seller:</strong> Review payment proof in transaction
          </li>
          <li>
            <strong>Seller:</strong> Confirm payment received
          </li>
          <li>
            <strong>Both:</strong> Rate each other, transaction complete
          </li>
        </ol>
      </div>
    </div>
  );
}
