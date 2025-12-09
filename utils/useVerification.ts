/**
 * React Hook for LLM Output Verification
 * Provides easy integration of verification agent in components
 */

import { useState, useCallback, useRef } from 'react';
import { verifyLLMOutput, quickVerifyChunk, VerificationResult } from './verificationAgent';

export interface VerificationOptions {
  enabled?: boolean;
  verifyMermaid?: boolean;
  verifyCode?: boolean;
  verifyMarkdown?: boolean;
  autoFix?: boolean;
  showWarnings?: boolean;
  debounceMs?: number;
}

export interface VerificationState {
  isVerifying: boolean;
  hasIssues: boolean;
  issues: string[];
  fixes: string[];
  lastVerification: Date | null;
}

/**
 * Hook for verifying LLM generated content
 */
export const useVerification = (apiKey: string, options: VerificationOptions = {}) => {
  const {
    enabled = true,
    verifyMermaid = true,
    verifyCode = true,
    verifyMarkdown = true,
    autoFix = true,
    showWarnings = true,
    debounceMs = 500
  } = options;

  const [verificationState, setVerificationState] = useState<VerificationState>({
    isVerifying: false,
    hasIssues: false,
    issues: [],
    fixes: [],
    lastVerification: null
  });

  const [verifiedContent, setVerifiedContent] = useState<string>('');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * Verify content with full AI validation
   */
  const verify = useCallback(async (content: string): Promise<VerificationResult> => {
    if (!enabled || !content.trim()) {
      return {
        isValid: true,
        correctedContent: content,
        issues: [],
        fixes: [],
        originalContent: content
      };
    }

    setVerificationState(prev => ({ ...prev, isVerifying: true }));

    try {
      const result = await verifyLLMOutput(content, apiKey, {
        verifyMermaid,
        verifyCode,
        verifyMarkdown,
        autoFix
      });

      setVerificationState({
        isVerifying: false,
        hasIssues: result.issues.length > 0,
        issues: result.issues,
        fixes: result.fixes,
        lastVerification: new Date()
      });

      setVerifiedContent(result.correctedContent);

      if (showWarnings && result.issues.length > 0) {
        console.warn('⚠️ Verification Issues Found:', result.issues);
      }

      if (result.fixes.length > 0) {
        console.info('✅ Auto-fixes Applied:', result.fixes);
      }

      return result;
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationState(prev => ({
        ...prev,
        isVerifying: false,
        hasIssues: true,
        issues: [`Verification failed: ${error}`]
      }));

      return {
        isValid: false,
        correctedContent: content,
        issues: [`Verification failed: ${error}`],
        fixes: [],
        originalContent: content
      };
    }
  }, [apiKey, enabled, verifyMermaid, verifyCode, verifyMarkdown, autoFix, showWarnings]);

  /**
   * Verify with debouncing (useful for streaming content)
   */
  const verifyDebounced = useCallback((content: string): void => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      verify(content);
    }, debounceMs);
  }, [verify, debounceMs]);

  /**
   * Quick verification for streaming chunks (no AI calls)
   */
  const quickVerify = useCallback((chunk: string): { hasIssues: boolean; warnings: string[] } => {
    if (!enabled) {
      return { hasIssues: false, warnings: [] };
    }

    const result = quickVerifyChunk(chunk);

    if (result.hasIssues && showWarnings) {
      console.warn('⚠️ Quick Verification Warnings:', result.warnings);
    }

    return result;
  }, [enabled, showWarnings]);

  /**
   * Reset verification state
   */
  const reset = useCallback(() => {
    setVerificationState({
      isVerifying: false,
      hasIssues: false,
      issues: [],
      fixes: [],
      lastVerification: null
    });
    setVerifiedContent('');
  }, []);

  return {
    verify,
    verifyDebounced,
    quickVerify,
    reset,
    verificationState,
    verifiedContent
  };
};

/**
 * Hook for real-time streaming verification
 */
export const useStreamingVerification = (apiKey: string, options: VerificationOptions = {}) => {
  const [streamBuffer, setStreamBuffer] = useState<string>('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const verification = useVerification(apiKey, options);

  /**
   * Process streaming chunk
   */
  const processChunk = useCallback((chunk: string) => {
    const newContent = streamBuffer + chunk;
    setStreamBuffer(newContent);

    // Quick verify for immediate feedback
    const quickResult = verification.quickVerify(chunk);
    if (quickResult.hasIssues) {
      setWarnings(prev => [...prev, ...quickResult.warnings]);
    }

    // Debounced full verification
    verification.verifyDebounced(newContent);
  }, [streamBuffer, verification]);

  /**
   * Finalize stream and run full verification
   */
  const finalizeStream = useCallback(async () => {
    const result = await verification.verify(streamBuffer);
    setStreamBuffer('');
    setWarnings([]);
    return result;
  }, [streamBuffer, verification]);

  /**
   * Reset stream
   */
  const resetStream = useCallback(() => {
    setStreamBuffer('');
    setWarnings([]);
    verification.reset();
  }, [verification]);

  return {
    processChunk,
    finalizeStream,
    resetStream,
    streamBuffer,
    warnings,
    verificationState: verification.verificationState,
    verifiedContent: verification.verifiedContent
  };
};
