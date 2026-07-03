'use client';



import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useUser from '../hooks/useUser';
import { supabase } from '../lib/supabase';

interface ReviewFormProps {
  transactionId: string;
  reviewedUserId: string;
  reviewedUserName: string;
  listingTitle: string;
  onReviewSubmitted?: () => void;
}

export default function ReviewForm({
  transactionId,
  reviewedUserId,
  reviewedUserName,
  listingTitle,
  onReviewSubmitted,
}: ReviewFormProps) {
  const router = useRouter();
  const { user } = useUser();
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['quality']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const categories = [
    { id: 'quality', label: 'Quality of Item' },
    { id: 'communication', label: 'Communication' },
    { id: 'timeliness', label: 'Timeliness' },
    { id: 'trust', label: 'Trust & Reliability' },
  ];

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user?.id) {
      setError('You must be logged in to submit a review');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Submit review
      const { error: reviewError } = await supabase.from('reviews').insert([
        {
          transaction_id: transactionId,
          reviewer_id: user.id,
          reviewed_user_id: reviewedUserId,
          rating,
          review_text: reviewText || null,
          is_positive: rating >= 4,
          category: selectedCategories[0] || 'quality',
        },
      ]);

      if (reviewError) throw reviewError;

      // Update trust score based on rating
      if (rating <= 2) {
        // Negative review
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('trust_score')
          .eq('id', reviewedUserId)
          .single();
        
        const newScore = Math.max(0, (profile?.trust_score || 50) - 5);
        await supabase
          .from('user_profiles')
          .update({ trust_score: newScore })
          .eq('id', reviewedUserId);
      } else if (rating >= 4) {
        // Positive review
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('trust_score')
          .eq('id', reviewedUserId)
          .single();
        
        const newScore = Math.min(100, (profile?.trust_score || 50) + 3);
        await supabase
          .from('user_profiles')
          .update({ trust_score: newScore })
          .eq('id', reviewedUserId);
      }

      setSuccess(true);
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/transactions');
      }, 2000);
    } catch (err) {
      console.error('Error submitting review:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-[#0b1a3a] rounded-lg max-w-md w-full border border-white/20 p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-400 mb-2">Review Submitted!</h2>
          <p className="text-white/70 mb-4">Thank you for your feedback. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-[#0b1a3a] rounded-lg max-w-2xl w-full border border-white/20 p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Leave a Review</h2>
          <p className="text-white/70">
            Help others by sharing your experience with {reviewedUserName}
          </p>
          <p className="text-sm text-white/50 mt-2">Item: {listingTitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded p-4 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Rating */}
          <div>
            <label className="block text-sm font-semibold mb-3">Your Rating</label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-4xl transition ${rating >= star ? 'text-yellow-400' : 'text-white/30'}`}
                >
                  ⭐
                </button>
              ))}
            </div>
            <p className="text-center text-white/60 mt-2">{rating}/5</p>
          </div>

          {/* Review Text */}
          <div>
            <label className="block text-sm font-semibold mb-2">Your Review (Optional)</label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share more details about your experience..."
              maxLength={500}
              rows={4}
              className="w-full px-4 py-3 bg-white/10 rounded border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40 resize-none"
            />
            <p className="text-xs text-white/50 mt-1">{reviewText.length}/500 characters</p>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-semibold mb-3">What was good? (Select all that apply)</label>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center gap-3 cursor-pointer p-3 rounded border border-white/20 hover:bg-white/5 transition"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                  <span className="text-sm">{cat.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Rating Guide */}
          <div className="bg-white/5 rounded p-4 space-y-2 text-sm">
            <p className="font-semibold text-white/80">Rating Guide:</p>
            <div className="space-y-1 text-white/60 text-xs">
              <p>⭐⭐⭐⭐⭐ Excellent - Highly recommend</p>
              <p>⭐⭐⭐⭐ Good - Would buy again</p>
              <p>⭐⭐⭐ Average - As described</p>
              <p>⭐⭐ Poor - Some issues</p>
              <p>⭐ Very Poor - Major problems</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition font-semibold disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}