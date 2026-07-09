'use client';

import { useState } from 'react';
import { createTransaction } from '../lib/transactionUtils';

interface MeetupLocationFormProps {
  listingId: string;
  listingPrice: number;
  listingTitle: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  onSuccess?: (transactionId: string) => void;
  onCancel?: () => void;
}

// Common meetup locations on campus
const COMMON_LOCATIONS = [
  'Main Campus - Coffee Shop',
  'Main Campus - Library Entrance',
  'Main Campus - Student Center',
  'Main Campus - Parking Lot A',
  'Main Campus - Gate 1',
  'North Campus - Auditorium',
  'North Campus - Sports Complex',
  'South Campus - Cafeteria',
  'South Campus - Main Hall',
  'Central Hub - Meeting Room',
  'Bookstore',
  'Gymnasium',
  'Science Building Entrance',
  'Arts Building Entrance',
  'Administration Building',
];

export function MeetupLocationForm({
  listingId,
  listingPrice,
  listingTitle,
  sellerId,
  sellerName,
  buyerId,
  onSuccess,
  onCancel,
}: MeetupLocationFormProps) {
  // Buyer's location
  const [buyerLocation, setBuyerLocation] = useState('');
  const [buyerDate, setBuyerDate] = useState('');
  const [buyerTime, setBuyerTime] = useState('');

  // Seller's location
  const [sellerLocation, setSellerLocation] = useState('');
  const [sellerDate, setSellerDate] = useState('');
  const [sellerTime, setSellerTime] = useState('');

  // Form state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState<'input' | 'review' | 'success'>('input');

  // CRITICAL FIX: Validate price before allowing transaction
  const validatedPrice = Number(listingPrice);
  const isPriceValid = !isNaN(validatedPrice) && validatedPrice > 0;

  // Validation
  const buyerLocationMatch = buyerLocation.toLowerCase().trim() === sellerLocation.toLowerCase().trim();
  const buyerTimeMatch = buyerTime === sellerTime || (!buyerTime && !sellerTime);
  const buyerDateMatch = buyerDate === sellerDate || (!buyerDate && !sellerDate);

  const allLocationsMatch = buyerLocationMatch && buyerTimeMatch && buyerDateMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // CRITICAL FIX: Check price validity FIRST
    if (!isPriceValid) {
      setError(`❌ Invalid listing price: ${listingPrice}. Price must be greater than 0.`);
      return;
    }

    // Validate buyer location
    if (!buyerLocation.trim()) {
      setError('Buyer location is required');
      return;
    }

    // Validate seller location
    if (!sellerLocation.trim()) {
      setError('Seller location is required');
      return;
    }

    // Check if locations match
    if (!buyerLocationMatch) {
      setError('❌ Locations must match! Both buyer and seller must agree on the meetup location.');
      return;
    }

    // Check if times match (if provided)
    if (buyerTime && sellerTime && !buyerTimeMatch) {
      setError('❌ Times must match! Both buyer and seller must agree on the time.');
      return;
    }

    // Check if dates match (if provided)
    if (buyerDate && sellerDate && !buyerDateMatch) {
      setError('❌ Dates must match! Both buyer and seller must agree on the date.');
      return;
    }

    // All validations passed
    setStep('review');
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // CRITICAL FIX: Final price validation before API call
      if (!isPriceValid) {
        setError(`Invalid listing price. Must be greater than 0.`);
        setLoading(false);
        return;
      }

      const result = await createTransaction({
        buyerId,
        sellerId,
        listingId,
        listingPrice: validatedPrice,
        meetupLocation: buyerLocation.trim(),
        meetupDate: buyerDate || undefined,
        meetupTime: buyerTime || undefined,
      });

      if (!result.success) {
        setError(result.message);
        setLoading(false);
        return;
      }

      setSuccess('✅ Transaction created successfully!');
      setStep('success');
      
      // Call callback after 2 seconds
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(result.transactionId!);
        }
      }, 2000);
    } catch (err) {
      setError('Failed to create transaction: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setLoading(false);
    }
  };

  // Step 1: Input locations
  if (step === 'input') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg border border-gray-200 shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Confirm Meetup Location</h2>
        <p className="text-gray-600 mb-6">
          Both buyer and seller must agree on the meetup location before proceeding.
        </p>

        {/* Listing Details */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Listing Details</h3>
          <p className="text-sm text-blue-800"><strong>Item:</strong> {listingTitle}</p>
          <p className="text-sm text-blue-800">
            <strong>Price:</strong> {validatedPrice} ZAR
            {!isPriceValid && <span className="text-red-600 ml-2">❌ Invalid</span>}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-semibold">{error}</p>
            </div>
          )}

          {/* Buyer Section */}
          <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <h3 className="font-bold text-green-900 mb-4">👤 Your Location (Buyer)</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Meetup Location *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="buyer-locations"
                    value={buyerLocation}
                    onChange={(e) => setBuyerLocation(e.target.value)}
                    placeholder="Enter or select a location..."
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                      buyerLocation && buyerLocationMatch
                        ? 'border-green-500 bg-green-50'
                        : buyerLocation && !buyerLocationMatch
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                    required
                  />
                  <datalist id="buyer-locations">
                    {COMMON_LOCATIONS.map((location) => (
                      <option key={location} value={location} />
                    ))}
                  </datalist>
                  {buyerLocation && buyerLocationMatch && (
                    <div className="absolute right-3 top-3 text-2xl">✅</div>
                  )}
                  {buyerLocation && !buyerLocationMatch && (
                    <div className="absolute right-3 top-3 text-2xl">⚠️</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={buyerDate}
                    onChange={(e) => setBuyerDate(e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                      buyerDate && buyerDateMatch
                        ? 'border-green-500 bg-green-50'
                        : buyerDate && !buyerDateMatch
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={buyerTime}
                    onChange={(e) => setBuyerTime(e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                      buyerTime && buyerTimeMatch
                        ? 'border-green-500 bg-green-50'
                        : buyerTime && !buyerTimeMatch
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seller Section */}
          <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
            <h3 className="font-bold text-purple-900 mb-4">👤 Seller's Location Preferences ({sellerName})</h3>
            <p className="text-sm text-purple-700 mb-4">
              This is what the seller ({sellerName}) suggested. Make sure your location matches!
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Seller's Meetup Location *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="seller-locations"
                    value={sellerLocation}
                    onChange={(e) => setSellerLocation(e.target.value)}
                    placeholder="Enter or select a location..."
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                      sellerLocation && buyerLocationMatch
                        ? 'border-green-500 bg-green-50'
                        : sellerLocation && !buyerLocationMatch
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                    required
                  />
                  <datalist id="seller-locations">
                    {COMMON_LOCATIONS.map((location) => (
                      <option key={location} value={location} />
                    ))}
                  </datalist>
                  {sellerLocation && buyerLocationMatch && (
                    <div className="absolute right-3 top-3 text-2xl">✅</div>
                  )}
                  {sellerLocation && !buyerLocationMatch && (
                    <div className="absolute right-3 top-3 text-2xl">❌</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={sellerDate}
                    onChange={(e) => setSellerDate(e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                      sellerDate && buyerDateMatch
                        ? 'border-green-500 bg-green-50'
                        : sellerDate && !buyerDateMatch
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">
                    Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={sellerTime}
                    onChange={(e) => setSellerTime(e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                      sellerTime && buyerTimeMatch
                        ? 'border-green-500 bg-green-50'
                        : sellerTime && !buyerTimeMatch
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Validation Status */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-3 text-gray-800">✓ Validation Status</h4>
            <div className="space-y-2 text-sm">
              <p className={isPriceValid ? 'text-green-700 font-semibold' : 'text-red-700'}>
                {isPriceValid ? '✅' : '❌'} Price valid ({validatedPrice} ZAR)
              </p>
              <p className={buyerLocationMatch ? 'text-green-700 font-semibold' : 'text-red-700'}>
                {buyerLocationMatch ? '✅' : '❌'} Locations match
              </p>
              {buyerDate && sellerDate && (
                <p className={buyerDateMatch ? 'text-green-700 font-semibold' : 'text-red-700'}>
                  {buyerDateMatch ? '✅' : '❌'} Dates match
                </p>
              )}
              {buyerTime && sellerTime && (
                <p className={buyerTimeMatch ? 'text-green-700 font-semibold' : 'text-red-700'}>
                  {buyerTimeMatch ? '✅' : '❌'} Times match
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!allLocationsMatch || !isPriceValid}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                allLocationsMatch && isPriceValid
                  ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {allLocationsMatch && isPriceValid ? '✓ Proceed to Confirm' : '⚠️ Locations & Price Must Be Valid'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Step 2: Review before creating
  if (step === 'review') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg border border-gray-200 shadow-lg">
        <h2 className="text-2xl font-bold mb-4">📋 Review Transaction Details</h2>

        <div className="space-y-4">
          {/* Listing */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">📦 Item</h3>
            <p className="text-blue-800">{listingTitle}</p>
            <p className="text-blue-800 font-bold">{validatedPrice} ZAR</p>
          </div>

          {/* Location */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">📍 Meetup Location</h3>
            <p className="text-green-800 font-bold text-lg">{buyerLocation}</p>
            {buyerDate && <p className="text-green-800">📅 Date: {buyerDate}</p>}
            {buyerTime && <p className="text-green-800">🕐 Time: {buyerTime}</p>}
          </div>

          {/* Participants */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2">👥 Participants</h3>
            <p className="text-purple-800">Seller: <strong>{sellerName}</strong></p>
          </div>

          {/* Success Message */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              ✓ Locations have been verified and match! You can now proceed to create the transaction and scan QR codes to confirm the meetup.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setStep('input')}
            className="flex-1 px-4 py-3 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400"
          >
            ← Back to Edit
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-3 rounded-lg font-semibold text-white transition-colors ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 cursor-pointer'
            }`}
          >
            {loading ? '⏳ Creating...' : '✓ Create Transaction'}
          </button>
        </div>
      </div>
    );
  }

  // Step 3: Success
  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg border border-green-200 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-green-600 mb-4">🎉 Success!</h2>
          <p className="text-gray-700 mb-4">
            Transaction created successfully!
          </p>
          <p className="text-gray-600 mb-6">
            You will be redirected shortly... Scan the QR code to confirm the meetup.
          </p>
          <div className="inline-block px-6 py-3 bg-green-100 rounded-lg">
            <p className="text-green-800 font-semibold">✓ Location Verified</p>
            <p className="text-green-700 text-sm">{buyerLocation}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}