import { useState, useCallback, useRef } from 'react';
import { quickVerifyChunk, verifyLLMOutput, VerificationResult } from './verificationAgent';

export interface VerificationOptions {
  enabled?: boolean;
  verifyMermaid?: boolean;
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

const emptyResult = (content: string): VerificationResult => ({
  isValid: true,
  correctedContent: content,
  issues: [],
  fixes: [],
  originalContent: content
});

export const useVerification = (options: VerificationOptions = {}) => {
  const { enabled = true, verifyMermaid = true, showWarnings = true, debounceMs = 500 } = options;
  const [verificationState, setVerificationState] = useState<VerificationState>({ isVerifying: false, hasIssues: false, issues: [], fixes: [], lastVerification: null });
  const [verifiedContent, setVerifiedContent] = useState('');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const verify = useCallback(async (content: string): Promise<VerificationResult> => {
    if (!enabled || !content.trim()) return emptyResult(content);
    setVerificationState((previous) => ({ ...previous, isVerifying: true }));
    try {
      const result = await verifyLLMOutput(content, { verifyMermaid });
      setVerificationState({ isVerifying: false, hasIssues: result.issues.length > 0, issues: result.issues, fixes: result.fixes, lastVerification: new Date() });
      setVerifiedContent(result.correctedContent);
      if (showWarnings && result.issues.length) console.warn('Verification issues found:', result.issues);
      return result;
    } catch (error) {
      const result = { ...emptyResult(content), isValid: false, issues: [`Verification failed: ${error}`] };
      setVerificationState((previous) => ({ ...previous, isVerifying: false, hasIssues: true, issues: result.issues }));
      return result;
    }
  }, [enabled, verifyMermaid, showWarnings]);

  const verifyDebounced = useCallback((content: string) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { void verify(content); }, debounceMs);
  }, [debounceMs, verify]);

  const quickVerify = useCallback((chunk: string) => enabled ? quickVerifyChunk(chunk) : { hasIssues: false, warnings: [] }, [enabled]);
  const reset = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setVerificationState({ isVerifying: false, hasIssues: false, issues: [], fixes: [], lastVerification: null });
    setVerifiedContent('');
  }, []);

  return { verify, verifyDebounced, quickVerify, reset, verificationState, verifiedContent };
};


export const useStreamingVerification = (options: VerificationOptions = {}) => {
  const [streamBuffer, setStreamBuffer] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const verification = useVerification(options);

  const processChunk = useCallback((chunk: string) => {
    setStreamBuffer((previous) => {
      const content = previous + chunk;
      verification.verifyDebounced(content);
      return content;
    });
    const result = verification.quickVerify(chunk);
    if (result.hasIssues) setWarnings((previous) => [...previous, ...result.warnings]);
  }, [verification]);

  const finalizeStream = useCallback(async () => {
    const result = await verification.verify(streamBuffer);
    setStreamBuffer('');
    setWarnings([]);
    return result;
  }, [streamBuffer, verification]);

  const resetStream = useCallback(() => {
    setStreamBuffer('');
    setWarnings([]);
    verification.reset();
  }, [verification]);

  return { processChunk, finalizeStream, resetStream, streamBuffer, warnings, verificationState: verification.verificationState, verifiedContent: verification.verifiedContent };
};
