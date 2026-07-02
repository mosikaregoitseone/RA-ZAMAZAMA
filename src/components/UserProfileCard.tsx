'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getTrustScoreTier } from '../lib/trustScoreUtils';

interface UserProfileCardProps {
  userId: string;
  showTrustHistory?: boolean;
  compact?: boolean; // Compact mode for listing cards
}

export function UserProfileCard({ userId, showTrustHistory = false, compact = false }: UserProfileCardProps) {
  const [profile, setProfile] = useState<any>(null);
  const [trustScore, setTrustScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        // Get profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        // Get trust score
        const { data: scoreData } = await supabase
          .from('trust_scores')
          .select('*')
          .eq('user_id', userId)
          .single();

        setProfile(profileData);
        setTrustScore(scoreData);
        setLoading(false);
      } catch (err) {
        setError('Failed to load profile');
        setLoading(false);
      }
    };

    loadProfileData();
  }, [userId]);

  if (loading) {
    return <div style={{ color: '#6b7280' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: '#dc2626' }}>{error}</div>;
  }

  if (!profile) {
    return <div style={{ color: '#6b7280' }}>Profile not found</div>;
  }

  const tier = getTrustScoreTier(trustScore?.current_score || 50);

  if (compact) {
    // Compact mode for listing cards
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 0',
      }}>
        {/* Avatar */}
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: '#e5e7eb',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {profile.profile_picture_url ? (
            <img src={profile.profile_picture_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#d1d5db', color: 'white', fontSize: '20px', fontWeight: 'bold' }}>
              {profile.full_name?.charAt(0) || 'U'}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: '600',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '2px',
          }}>
            {profile.full_name}
           {profile.student_verified && (
  <span
    style={{
      fontSize: '12px',
      backgroundColor: '#dbeafe',
      color: '#1e40af',
      padding: '2px 6px',
      borderRadius: '4px',
      fontWeight: '500'
    }}
  >
    🎓 Student Verified
  </span>
)}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span>⭐ {(trustScore?.average_rating || 0).toFixed(1)}</span>
            <span>•</span>
            <span>{trustScore?.completed_transactions || 0} sales</span>
          </div>
        </div>

        {/* Trust Score Badge */}
        <div style={{
          padding: '6px 12px',
          backgroundColor: tier.color,
          color: tier.tier === 'Platinum' ? 'white' : '#000',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}>
          {tier.tier}
        </div>
      </div>
    );
  }

  // Full profile card
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb',
    }}>
      {/* Header with Avatar */}
      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '20px',
        alignItems: 'flex-start',
      }}>
        {/* Avatar */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          backgroundColor: '#e5e7eb',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {profile.profile_picture_url ? (
            <img src={profile.profile_picture_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#d1d5db', color: 'white', fontSize: '40px', fontWeight: 'bold' }}>
              {profile.full_name?.charAt(0) || 'U'}
            </div>
          )}
        </div>

        {/* Name & Verification */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            {profile.full_name}
            {profile.is_verified && (
              <span style={{
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
              }}>
                ✓ Verified
              </span>
            )}
          </div>
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>
            {profile.institution || 'No institution set'}
          </p>
          {profile.bio && (
            <p style={{ color: '#4b5563', fontSize: '14px', maxHeight: '100px', overflow: 'hidden' }}>
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      {/* Trust Score & Stats */}
      <div style={{
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '20px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '16px',
        }}>
          {/* Trust Score */}
          <div style={{ textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: tier.color === '#FFD700' ? '#FFD700' : tier.color === '#E5E4E2' ? '#9ca3af' : tier.color,
              marginBottom: '4px',
            }}>
              {trustScore?.current_score || 50}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
              Trust Score
            </div>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: 'white',
              backgroundColor: tier.color,
              padding: '4px 8px',
              borderRadius: '4px',
              marginTop: '8px',
              display: 'inline-block',
            }}>
              {tier.tier}
            </div>
          </div>

          {/* Rating */}
          <div style={{ textAlign: 'center', borderRight: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>
              {(trustScore?.average_rating || 0).toFixed(1)}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
              Rating
            </div>
            <div style={{ fontSize: '12px', marginTop: '8px' }}>
              ⭐⭐⭐⭐⭐
            </div>
          </div>

          {/* Transactions */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>
              {trustScore?.completed_transactions || 0}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
              Completed
            </div>
            <div style={{ fontSize: '12px', marginTop: '8px', color: '#6b7280' }}>
              Transactions
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Successful Sales</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>
            {trustScore?.successful_sales || 0}
          </div>
        </div>
        <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Successful Purchases</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#16a34a' }}>
            {trustScore?.successful_purchases || 0}
          </div>
        </div>
        <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Positive Reviews</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#d97706' }}>
            {trustScore?.positive_reviews || 0}
          </div>
        </div>
        <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Negative Reviews</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>
            {trustScore?.negative_reviews || 0}
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{
        padding: '12px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        borderLeft: '4px solid #2563eb',
      }}>
        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }}>
          Tier Description
        </div>
        <div style={{ fontSize: '14px', color: '#374151' }}>
          {tier.description}
        </div>
      </div>

      {/* Verification Status */}
      {profile.is_verified && profile.last_verification_date && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', fontSize: '12px', color: '#6b7280' }}>
          <div style={{ marginBottom: '8px' }}>
            <strong>Verification Status:</strong> Verified
          </div>
          <div>
            <strong>Verified on:</strong> {new Date(profile.last_verification_date).toLocaleDateString()}
          </div>
          <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#dcfce7', borderRadius: '6px', color: '#166534' }}>
            This user has completed face verification with biometric confirmation
          </div>
        </div>
      )}

      {!profile.is_verified && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', color: '#92400e', fontSize: '12px' }}>
          ⚠ This user has not completed identity verification yet
        </div>
      )}

      {/* Trust History Link */}
      {showTrustHistory && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
          <a href={`/profile/${userId}/trust-history`} style={{
            color: '#2563eb',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
          }}>
            View Trust Score History →
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * Verification Badge Component
 * Small badge to show on listings and search results
 */
export function VerificationBadge({ userId, isVerified, compact = false }: {
  userId: string;
  isVerified: boolean;
  compact?: boolean;
}) {
  if (!isVerified) {
    return null;
  }

  if (compact) {
    return (
      <span style={{
        display: 'inline-block',
        fontSize: '12px',
        backgroundColor: '#dbeafe',
        color: '#1e40af',
        padding: '2px 6px',
        borderRadius: '4px',
        fontWeight: '500',
        marginLeft: '4px',
      }}>
        ✓ Verified
      </span>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: '#dbeafe',
      border: '1px solid #93c5fd',
      borderRadius: '6px',
      color: '#1e40af',
      fontSize: '14px',
      fontWeight: '500',
    }}>
      <span style={{ fontSize: '16px' }}>✓</span>
      <span>Identity Verified</span>
    </div>
  );
}

/**
 * Trust Score Indicator
 * Visual indicator of trust score level
 */
export function TrustScoreIndicator({ score }: { score: number }) {
  const tier = getTrustScoreTier(score);
  const percentage = (score / 100) * 100;

  return (
    <div>
      {/* Bar */}
      <div style={{
        width: '100%',
        height: '8px',
        backgroundColor: '#e5e7eb',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: '8px',
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          backgroundColor: tier.color,
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Label */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'white',
          backgroundColor: tier.color,
          padding: '4px 12px',
          borderRadius: '4px',
          display: 'inline-block',
        }}>
          {tier.tier} ({score}/100)
        </span>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          {tier.description}

        </span>
      </div>
    </div>
  );
}
