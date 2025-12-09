/**
 * Verification Status Badge Component
 * Shows real-time verification status and issues
 */

import React from 'react';
import { VerificationState } from '../utils/useVerification';

interface VerificationBadgeProps {
  verificationState: VerificationState;
  showDetails?: boolean;
  compact?: boolean;
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({ 
  verificationState, 
  showDetails = false,
  compact = false 
}) => {
  const { isVerifying, hasIssues, issues, fixes, lastVerification } = verificationState;

  if (!lastVerification && !isVerifying) {
    return null; // Don't show badge if never verified
  }

  // Verifying state
  if (isVerifying) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-blue-600 dark:text-blue-400`}>
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
        {!compact && <span className="font-medium">Verifying content...</span>}
      </div>
    );
  }

  // Verified with issues
  if (hasIssues && issues.length > 0) {
    return (
      <div className={`${compact ? 'inline-flex' : 'flex flex-col'} gap-2`}>
        <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-yellow-600 dark:text-yellow-400`}>
          <span className="material-symbols-outlined text-lg">warning</span>
          <span className="font-medium">
            {issues.length} issue{issues.length > 1 ? 's' : ''} found
            {fixes.length > 0 && ` (${fixes.length} fixed)`}
          </span>
        </div>
        
        {showDetails && !compact && (
          <div className="ml-6 space-y-1 text-xs">
            {issues.slice(0, 3).map((issue, idx) => (
              <div key={idx} className="text-gray-600 dark:text-gray-400">
                • {issue}
              </div>
            ))}
            {issues.length > 3 && (
              <div className="text-gray-500 dark:text-gray-500 italic">
                +{issues.length - 3} more...
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Verified successfully
  return (
    <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-green-600 dark:text-green-400`}>
      <span className="material-symbols-outlined text-lg">verified</span>
      <span className="font-medium">
        Content verified
        {fixes.length > 0 && ` (${fixes.length} fix${fixes.length > 1 ? 'es' : ''} applied)`}
      </span>
    </div>
  );
};

export default VerificationBadge;
