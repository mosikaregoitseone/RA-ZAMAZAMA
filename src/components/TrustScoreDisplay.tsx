'use client';

import { useEffect, useState } from 'react';
import { calculateTrustScore, getTrustScoreTier, getSellerLevel } from '../lib/trustScoreUtils';

interface TrustScoreDisplayProps {
  userId: string;
  showBreakdown?: boolean; // Show detailed factors
  size?: 'small' | 'medium' | 'large'; // Card size
}

interface TrustScoreData {
  email_verified?: number;
  documents_verified?: number;
  identity_verified?: number;
  transactions_count?: number;
  rating_average?: number;
  account_age_months?: number;
  no_disputes?: number;
  campus_verified?: number;
  score?: number;
  factors?: {
    email_verified: number;
    documents_verified: number;
    identity_verified: number;
    transactions_count: number;
    rating_average: number;
    account_age_months: number;
    no_disputes: number;
    campus_verified: number;
  };
}

export function TrustScoreDisplay({
  userId,
  showBreakdown = false,
  size = 'medium',
}: TrustScoreDisplayProps) {
  // ============================================
  // STATE
  // ============================================
  const [data, setData] = useState<TrustScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ============================================
  // LOAD TRUST SCORE DATA
  // ============================================
  useEffect(() => {
    const loadTrustScore = async () => {
      try {
        setLoading(true);
        const scoreData = await calculateTrustScore(userId);

        if (!scoreData) {
          setError('Could not calculate trust score');
          return;
        }

        setData(scoreData as unknown as TrustScoreData);
      } catch (err) {
        console.error('Trust score load error:', err);
        setError('Failed to load trust score');
      } finally {
        setLoading(false);
      }
    };

    loadTrustScore();
  }, [userId]);

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-gray-600">Loading trust score...</div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800 font-semibold">Error</div>
        <div className="text-red-700 text-sm">{error || 'Unable to load trust score'}</div>
      </div>
    );
  }

  // ============================================
  // GET TIER INFO
  // ============================================
  const score = ((data.score ?? 0) || ((data as any).total_score ?? 0)) || 50;
  const tier = getTrustScoreTier(score);
  
  // Get factors - handle both direct properties and nested factors object
  const factors = {
    email_verified: data.factors?.email_verified ?? data.email_verified ?? 0,
    documents_verified: data.factors?.documents_verified ?? data.documents_verified ?? 0,
    identity_verified: data.factors?.identity_verified ?? data.identity_verified ?? 0,
    transactions_count: data.factors?.transactions_count ?? data.transactions_count ?? 0,
    rating_average: data.factors?.rating_average ?? data.rating_average ?? 0,
    account_age_months: data.factors?.account_age_months ?? data.account_age_months ?? 0,
    no_disputes: data.factors?.no_disputes ?? data.no_disputes ?? 0,
    campus_verified: data.factors?.campus_verified ?? data.campus_verified ?? 0,
  };

  const sellerLevel = getSellerLevel(factors.transactions_count, score);

  // ============================================
  // SIZE CONFIGURATIONS
  // ============================================
  const sizeConfig = {
    small: {
      container: 'p-3',
      badge: 'w-16 h-16',
      badgeText: 'text-lg',
      scoreText: 'text-sm',
      tierText: 'text-xs',
    },
    medium: {
      container: 'p-6',
      badge: 'w-24 h-24',
      badgeText: 'text-3xl',
      scoreText: 'text-base',
      tierText: 'text-sm',
    },
    large: {
      container: 'p-8',
      badge: 'w-32 h-32',
      badgeText: 'text-5xl',
      scoreText: 'text-lg',
      tierText: 'text-base',
    },
  };

  const config = sizeConfig[size];

  // ============================================
  // SMALL SIZE (COMPACT)
  // ============================================
  if (size === 'small') {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 ${config.container}`}>
        <div className="flex items-center gap-3">
          {/* BADGE */}
          <div
            className={`${config.badge} rounded-full flex items-center justify-center text-white font-bold ${config.badgeText}`}
            style={{ backgroundColor: tier.color }}
          >
            {Math.round(score)}
          </div>

          {/* INFO */}
          <div>
            <div className={`font-bold text-gray-900 ${config.scoreText}`}>{tier.tier}</div>
            <div className={`text-gray-600 ${config.tierText}`}>{tier.description}</div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // MEDIUM & LARGE SIZE (FULL DISPLAY)
  // ============================================
  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${config.container} space-y-6`}>
      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Trust Score</h2>
        <p className="text-gray-600 text-sm mt-1">Your reputation on RA ZAMAZAMA</p>
      </div>

      {/* MAIN SCORE CARD */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-8">
        <div className="flex items-center justify-between gap-8">
          {/* LEFT: BADGE */}
          <div className="flex flex-col items-center">
            <div
              className={`${config.badge} rounded-full flex items-center justify-center text-white font-bold ${config.badgeText} shadow-lg`}
              style={{ backgroundColor: tier.color }}
            >
              {Math.round(score)}
            </div>
            <div className="text-xs text-gray-600 mt-2">out of 100</div>
          </div>

          {/* RIGHT: TIER INFO */}
          <div className="flex-1">
            <div className="mb-4">
              <h3 className={`font-bold text-gray-900 ${config.scoreText}`}>{tier.tier}</h3>
              <p className="text-gray-700 mt-1">{tier.description}</p>
            </div>

            {/* PROGRESS BAR */}
            <div className="space-y-2">
              <div className="w-full bg-gray-300 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${tier.percentage}%`,
                    backgroundColor: tier.color,
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-600">Progress to Platinum: {tier.percentage}%</div>
            </div>

            {/* SELLER LEVEL */}
            <div className="mt-4 bg-white rounded border border-gray-200 p-3">
              <div className="text-xs text-gray-600 font-semibold">SELLER LEVEL</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-gray-900">{sellerLevel}</span>
                <span className="text-lg">
                  {factors.transactions_count >= 50
                    ? '⭐⭐⭐⭐⭐'
                    : factors.transactions_count >= 20
                      ? '⭐⭐⭐⭐'
                      : factors.transactions_count >= 10
                        ? '⭐⭐⭐'
                        : factors.transactions_count >= 5
                          ? '⭐⭐'
                          : factors.transactions_count >= 1
                            ? '⭐'
                            : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TIER THRESHOLDS */}
      <div className="grid grid-cols-4 gap-3">
        <div className="text-center p-3 rounded border border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600 font-semibold">BRONZE</div>
          <div className="text-sm font-bold text-gray-900 mt-1">0-54</div>
        </div>
        <div className="text-center p-3 rounded border border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600 font-semibold">SILVER</div>
          <div className="text-sm font-bold text-gray-900 mt-1">55-69</div>
        </div>
        <div className="text-center p-3 rounded border border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600 font-semibold">GOLD</div>
          <div className="text-sm font-bold text-gray-900 mt-1">70-84</div>
        </div>
        <div className="text-center p-3 rounded border border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-600 font-semibold">PLATINUM</div>
          <div className="text-sm font-bold text-gray-900 mt-1">85-100</div>
        </div>
      </div>

      {/* BREAKDOWN (Optional) */}
      {showBreakdown && (
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900">Score Breakdown</h3>

          {/* FACTORS */}
          <div className="space-y-3">
            {/* Email Verified */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{factors.email_verified > 0 ? '✅' : '○'}</span>
                <span className="text-gray-700">Email Verified</span>
              </div>
              <span className="font-bold text-gray-900">+{factors.email_verified}</span>
            </div>

            {/* Documents Verified */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{factors.documents_verified > 0 ? '✅' : '○'}</span>
                <span className="text-gray-700">Documents Verified</span>
              </div>
              <span className="font-bold text-gray-900">+{factors.documents_verified}</span>
            </div>

            {/* Identity Verified */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{factors.identity_verified > 0 ? '✅' : '○'}</span>
                <span className="text-gray-700">Identity Verified</span>
              </div>
              <span className="font-bold text-gray-900">+{factors.identity_verified}</span>
            </div>

            {/* Transactions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{factors.transactions_count > 0 ? '✅' : '○'}</span>
                <span className="text-gray-700">
                  Transactions ({factors.transactions_count})
                </span>
              </div>
              <span className="font-bold text-gray-900">+{factors.transactions_count * 5}</span>
            </div>

            {/* Rating */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{factors.rating_average >= 4.5 ? '✅' : '○'}</span>
                <span className="text-gray-700">
                  Rating (
                  {factors.rating_average > 0
                    ? factors.rating_average.toFixed(1)
                    : 'No ratings'}
                  )
                </span>
              </div>
              <span className="font-bold text-gray-900">
                +{factors.rating_average >= 4.5 ? factors.rating_average : 0}
              </span>
            </div>

            {/* Account Age */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{factors.account_age_months >= 12 ? '✅' : '○'}</span>
                <span className="text-gray-700">Account Age ({factors.account_age_months}m)</span>
              </div>
              <span className="font-bold text-gray-900">+{factors.account_age_months}</span>
            </div>

            {/* No Disputes */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{factors.no_disputes > 0 ? '✅' : '○'}</span>
                <span className="text-gray-700">No Disputes</span>
              </div>
              <span className="font-bold text-gray-900">+{factors.no_disputes}</span>
            </div>

            {/* Campus Verified */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{factors.campus_verified > 0 ? '✅' : '○'}</span>
                <span className="text-gray-700">Campus Verified</span>
              </div>
              <span className="font-bold text-gray-900">+{factors.campus_verified}</span>
            </div>
          </div>

          {/* TOTAL */}
          <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
            <span className="font-bold text-gray-900">TOTAL SCORE</span>
            <span className="text-2xl font-bold text-blue-600">{Math.round(score)}/100</span>
          </div>
        </div>
      )}

      {/* INFO BOX */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 How to Increase Your Score:</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>✓ Verify your email and documents</li>
          <li>✓ Complete identity verification</li>
          <li>✓ Make successful transactions</li>
          <li>✓ Get positive reviews from buyers/sellers</li>
          <li>✓ Maintain your account for longer</li>
          <li>✓ Avoid disputes and scams</li>
        </ul>
      </div>
    </div>
  );
}