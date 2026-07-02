'use client';

import { useEffect, useRef, useState } from 'react';
import { confirmQRScan, getTransactionDetails } from '../lib/transactionUtils';

interface TransactionQRCodeProps {
  transactionId: string;
  userId: string;
  userType: 'buyer' | 'seller';
  onConfirmed?: () => void;
}

interface TransactionDetails {
  id: string;
  status: string;
  qr_code: string;
  buyer_qr_confirmed: boolean;
  seller_qr_confirmed: boolean;
  qr_confirmation_deadline?: string;
  qr_confirmed_at?: string;
  listing_price: number;
  listing_currency: string;
  meetup_location?: string;
  meetup_date?: string;
  meetup_time?: string;
  buyer?: { full_name: string };
  seller?: { full_name: string };
  listing?: { title: string };
}

export function TransactionQRCode({
  transactionId,
  userId,
  userType,
  onConfirmed,
}: TransactionQRCodeProps) {
  // ============================================
  // STATE
  // ============================================
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [scanMessageType, setScanMessageType] = useState<'success' | 'error' | ''>('');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [qrExpired, setQrExpired] = useState(false);
  const [scannerMode, setScannerMode] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannerRef = useRef<any>(null);

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
            status: 'qr_confirmed',
            qr_code: 'QR_SAMPLE_DEMO_CODE',
            buyer_qr_confirmed: true,
            seller_qr_confirmed: true,
            qr_confirmation_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            qr_confirmed_at: new Date().toISOString(),
            listing_price: 299.99,
            listing_currency: 'ZAR',
            meetup_location: 'Campus Coffee Shop',
            meetup_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString(),
            meetup_time: '14:00',
            buyer: { full_name: 'Sample Buyer' },
            seller: { full_name: 'Sample Seller' },
            listing: { title: 'Demo Textbook' },
          });
          return;
        }
        
        const details = await getTransactionDetails(transactionId);

        if (!details) {
          // Retry once after a short delay in case of timing issue
          console.log('Transaction not found, retrying in 1 second...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const retryDetails = await getTransactionDetails(transactionId);
          if (!retryDetails) {
            setError('Transaction not found');
            return;
          }
          
          setTransaction(retryDetails);
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
  // GENERATE QR CODE ON CANVAS
  // ============================================
  useEffect(() => {
    if (!transaction?.qr_code || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        // Real QR generation via the `qrcode` npm package
        const QR = await import('qrcode');
        if (cancelled || !canvasRef.current) return;
        await QR.toCanvas(canvasRef.current, transaction.qr_code, {
          width: 240,
          margin: 2,
          errorCorrectionLevel: 'H',
          color: { dark: '#111111', light: '#FFFFFF' },
        });
        setCanvasReady(true);
      } catch (err) {
        console.error('QR generation error:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transaction?.qr_code]);

  // ============================================
  // COUNTDOWN TIMER
  // ============================================
  useEffect(() => {
    if (!transaction?.qr_confirmation_deadline) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const deadline = new Date(transaction.qr_confirmation_deadline!).getTime();
      const remaining = deadline - now;

      if (remaining <= 0) {
        setQrExpired(true);
        setTimeRemaining('Expired');
        clearInterval(interval);
        return;
      }

      const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((remaining / (1000 * 60)) % 60);
      const seconds = Math.floor((remaining / 1000) % 60);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [transaction?.qr_confirmation_deadline]);

  // ============================================
  // QR SCANNER INITIALIZATION
  // ============================================
  useEffect(() => {
    if (!scannerMode || !transaction) return;

    const initializeScanner = async () => {
      try {
        // Dynamically import html5-qrcode only when needed
        const { Html5QrcodeScanner } = await import('html5-qrcode');

        const scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            disableFlip: false,
            supportedScanTypes: [],
          },
          false
        );

        scanner.render(
          (decodedText: string) => {
            // QR code scanned successfully
            if (decodedText === transaction.qr_code) {
              handleConfirmQR();
              scanner.clear();
            } else {
              setScanMessageType('error');
              setScanMessage('Invalid QR code. This is not the correct transaction.');
            }
          },
          (errorMessage: string) => {
            // Scanning error - log silently
            console.log('Scan error:', errorMessage);
          }
        );

        scannerRef.current = scanner;
      } catch (err) {
        console.error('Scanner init error:', err);
        setScanMessageType('error');
        setScanMessage('Failed to initialize camera scanner. Please use manual confirmation instead.');
      }
    };

    initializeScanner();

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear().catch(() => {});
        } catch (e) {
          console.log('Scanner cleanup error:', e);
        }
      }
    };
  }, [scannerMode, transaction]);

  // ============================================
  // HANDLE QR CONFIRMATION
  // ============================================
  const handleConfirmQR = async () => {
    if (!transaction) return;

    try {
      setConfirming(true);
      setScanMessage('');
      setScanMessageType('');

      const result = await confirmQRScan({
        transactionId,
        userId,
        userType,
      });

      if (result.success) {
        setScanMessageType('success');
        setScanMessage(result.message);

        if (result.bothConfirmed) {
          setTransaction({
            ...transaction,
            buyer_qr_confirmed: true,
            seller_qr_confirmed: true,
          });
          setTimeout(() => {
            onConfirmed?.();
          }, 1500);
        } else {
          if (userType === 'buyer') {
            setTransaction({
              ...transaction,
              buyer_qr_confirmed: true,
            });
          } else {
            setTransaction({
              ...transaction,
              seller_qr_confirmed: true,
            });
          }
        }

        // Close scanner after success
        if (scannerRef.current) {
          try {
            scannerRef.current.clear().catch(() => {});
          } catch (e) {
            console.log('Scanner close error:', e);
          }
        }
        setScannerMode(false);
      } else {
        setScanMessageType('error');
        setScanMessage(result.message);
      }
    } catch (err) {
      setScanMessageType('error');
      setScanMessage(
        err instanceof Error ? err.message : 'Failed to confirm QR scan'
      );
    } finally {
      setConfirming(false);
    }
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading transaction...</div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (error || !transaction) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-red-800 font-semibold">Error</div>
        <div className="text-red-700 text-sm">{error || 'Transaction not found'}</div>
      </div>
    );
  }

  // ============================================
  // DETERMINE CONFIRMATION STATUS
  // ============================================
  const userConfirmed = userType === 'buyer' 
    ? transaction.buyer_qr_confirmed 
    : transaction.seller_qr_confirmed;

  const bothConfirmed = transaction.buyer_qr_confirmed && transaction.seller_qr_confirmed;

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Transaction Verification</h2>
        <p className="text-gray-600 text-sm mt-1">
          {bothConfirmed
            ? 'Both parties confirmed. Ready for payment.'
            : 'Scan QR code or confirm manually'}
        </p>
      </div>

      {/* TRANSACTION DETAILS */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Item:</span>
          <span className="font-semibold text-gray-900">{transaction.listing?.title}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Price:</span>
          <span className="font-semibold text-gray-900">
            {transaction.listing_price} {transaction.listing_currency}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Meetup Location:</span>
          <span className="font-semibold text-gray-900">{transaction.meetup_location || 'Not set'}</span>
        </div>
        {transaction.meetup_date && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Meetup Date:</span>
            <span className="font-semibold text-gray-900">{transaction.meetup_date}</span>
          </div>
        )}
      </div>

      {/* QR DISPLAY MODE */}
      {!scannerMode && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center gap-4">
          {/* QR CODE CANVAS */}
          <div className="bg-white p-4 rounded border-2 border-gray-200">
            <canvas
              ref={canvasRef}
              className="w-48 h-48 border border-gray-300"
            />
          </div>

          {/* QR CODE TEXT */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">QR Code:</p>
            <code className="bg-gray-100 px-3 py-2 rounded text-xs font-mono break-all max-w-xs">
              {transaction.qr_code}
            </code>
          </div>

          {/* TIMER */}
          {!bothConfirmed && !qrExpired && (
            <div className={`text-center p-3 rounded-lg ${
              timeRemaining.includes('h') || timeRemaining.includes('m')
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="text-xs text-gray-600 font-semibold">Time Remaining</div>
              <div className={`text-lg font-bold mt-1 ${
                timeRemaining.includes('h') || timeRemaining.includes('m')
                  ? 'text-blue-600'
                  : 'text-yellow-600'
              }`}>
                {timeRemaining}
              </div>
            </div>
          )}

          {qrExpired && (
            <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="text-sm font-semibold text-red-800">QR Code Expired</div>
              <div className="text-xs text-red-700 mt-1">Please create a new transaction</div>
            </div>
          )}
        </div>
      )}

      {/* QR SCANNER MODE */}
      {scannerMode && !userConfirmed && !qrExpired && (
        <div className="space-y-4">
          <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
            <div className="text-sm text-blue-900 font-semibold mb-3">
              📱 Point camera at QR code to scan
            </div>
            <div id="qr-reader" className="w-full"></div>
          </div>

          <button
            onClick={() => setScannerMode(false)}
            className="w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold"
          >
            Cancel Camera Scanner
          </button>
        </div>
      )}

      {/* CONFIRMATION STATUS */}
      <div className="space-y-3">
        {/* BUYER STATUS */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{transaction.buyer_qr_confirmed ? '✅' : '⏳'}</span>
            <div>
              <div className="font-semibold text-gray-900">Buyer</div>
              <div className="text-sm text-gray-600">{transaction.buyer?.full_name}</div>
            </div>
          </div>
          <span className="text-sm font-semibold text-gray-700">
            {transaction.buyer_qr_confirmed ? 'Confirmed' : 'Waiting'}
          </span>
        </div>

        {/* SELLER STATUS */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{transaction.seller_qr_confirmed ? '✅' : '⏳'}</span>
            <div>
              <div className="font-semibold text-gray-900">Seller</div>
              <div className="text-sm text-gray-600">{transaction.seller?.full_name}</div>
            </div>
          </div>
          <span className="text-sm font-semibold text-gray-700">
            {transaction.seller_qr_confirmed ? 'Confirmed' : 'Waiting'}
          </span>
        </div>
      </div>

      {/* MESSAGES */}
      {scanMessage && (
        <div
          className={`rounded-lg p-4 ${
            scanMessageType === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">
              {scanMessageType === 'success' ? '✅' : '❌'}
            </span>
            <div>
              <p className="font-semibold">
                {scanMessageType === 'success' ? 'Success!' : 'Error'}
              </p>
              <p className="text-sm mt-1">{scanMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      {!userConfirmed && !qrExpired && !scannerMode && (
        <div className="space-y-3">
          {/* SCAN WITH CAMERA BUTTON */}
          <button
            onClick={() => setScannerMode(true)}
            disabled={confirming}
            className={`w-full py-3 rounded-lg font-semibold transition-colors ${
              confirming
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
            }`}
          >
            📱 Scan QR Code with Camera
          </button>

          {/* MANUAL CONFIRM BUTTON */}
          <button
            onClick={handleConfirmQR}
            disabled={confirming}
            className={`w-full py-3 rounded-lg font-semibold transition-colors ${
              confirming
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
            }`}
          >
            {confirming ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Confirming...
              </span>
            ) : (
              `✓ Confirm ${userType === 'buyer' ? 'Buyer' : 'Seller'} Manually`
            )}
          </button>
        </div>
      )}

      {userConfirmed && !bothConfirmed && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-800 font-semibold mb-2">✅ Your QR Confirmed!</div>
          <p className="text-sm text-blue-700">
            Waiting for {userType === 'buyer' ? 'seller' : 'buyer'} to confirm...
          </p>
        </div>
      )}

      {bothConfirmed && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-800 font-semibold mb-2">🎉 Both Confirmed!</div>
          <p className="text-sm text-green-700">
            Meetup confirmed. Ready to proceed with payment.
          </p>
        </div>
      )}

      {qrExpired && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-semibold mb-2">⏰ QR Code Expired</div>
          <p className="text-sm text-red-700">
            This transaction QR code has expired. Please create a new transaction to continue.
          </p>
        </div>
      )}

      {/* INFO BOX */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 How QR Verification Works:</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>✓ Both buyer and seller meet at agreed location</li>
          <li>✓ Scan QR code with camera OR confirm manually</li>
          <li>✓ System confirms both are present at meetup</li>
          <li>✓ Prevents fraudulent completions</li>
          <li>✓ QR expires after 24 hours if not confirmed</li>
          <li>✓ Once confirmed, proceed with payment</li>
        </ul>
      </div>
    </div>
  );
}