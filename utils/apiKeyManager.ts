/**
 * API Key Manager
 * Manages user's Google Gemini API key and validation
 */

import { GoogleGenAI } from '@google/genai';
import { getSettings } from '../settings';

export interface ApiKeyValidation {
  isValid: boolean;
  error?: string;
  models?: string[];
}

/**
 * Available Gemini models for selection
 */
export const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)', description: 'Latest, fastest model' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Stable, high performance' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Fast, efficient' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable' },
  { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', description: 'For image generation' }
];

/**
 * Get the user's API key from settings
 */
export function getUserApiKey(): string {
  const settings = getSettings();
  return settings.geminiApiKey || '';
}

/**
 * Get the user's selected model from settings
 */
export function getUserModel(): string {
  const settings = getSettings();
  return settings.geminiModel || 'gemini-2.0-flash-exp';
}

/**
 * Validate API key by making a test request
 */
export async function validateApiKey(apiKey: string): Promise<ApiKeyValidation> {
  if (!apiKey || apiKey.trim() === '') {
    return {
      isValid: false,
      error: 'API key is required'
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // Try a simple test generation
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: 'Say "API key valid" if you can read this.',
    });

    const text = response.text || '';
    
    if (text.length > 0) {
      return {
        isValid: true,
        models: GEMINI_MODELS.map(m => m.id)
      };
    } else {
      return {
        isValid: false,
        error: 'Invalid response from API'
      };
    }
  } catch (error: any) {
    console.error('API key validation error:', error);
    
    // Parse error message
    let errorMessage = 'Invalid API key';
    if (error.message?.includes('API key not valid')) {
      errorMessage = 'Invalid API key. Please check your key and try again.';
    } else if (error.message?.includes('quota')) {
      errorMessage = 'API quota exceeded. Please check your Google AI Studio quota.';
    } else if (error.message?.includes('permission')) {
      errorMessage = 'API key does not have required permissions.';
    }

    return {
      isValid: false,
      error: errorMessage
    };
  }
}

/**
 * Check if user has configured an API key
 */
export function hasApiKey(): boolean {
  const apiKey = getUserApiKey();
  return apiKey !== null && apiKey.trim() !== '';
}
