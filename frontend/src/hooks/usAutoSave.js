import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for auto-saving form data to localStorage
 * @param {string} storageKey - Unique key for localStorage
 * @param {Object} initialData - Initial form data
 * @param {number} debounceDelay - Delay in ms before saving (default: 500ms)
 * @returns {Object} { formData, setFormData, saveStatus, clearDraft, loadDraft }
 */
const useAutoSave = (storageKey, initialData, debounceDelay = 500) => {
  const [formData, setFormData] = useState(initialData);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const [lastSaved, setLastSaved] = useState(null);
  const debounceTimerRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  // Load saved data from localStorage on mount
  useEffect(() => {
    const loadDraft = () => {
      try {
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          // Check if saved data has any values
          const hasValues = Object.values(parsedData).some(
            (value) => value !== '' && value !== null && value !== undefined
          );
          if (hasValues) {
            setFormData(parsedData);
            setSaveStatus('saved');
            console.log('📝 Draft loaded from localStorage');
          }
        }
      } catch (error) {
        console.error('Error loading draft:', error);
        setSaveStatus('error');
      }
    };

    loadDraft();
    isInitialLoadRef.current = false;
  }, [storageKey]);

  // Save to localStorage with debouncing
  const saveDraft = useCallback(
    (data) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Don't save if data is same as initial (empty form)
      const isInitialState = JSON.stringify(data) === JSON.stringify(initialData);
      if (isInitialState) {
        setSaveStatus('idle');
        return;
      }

      setSaveStatus('saving');

      debounceTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(data));
          setSaveStatus('saved');
          setLastSaved(new Date());
          console.log('💾 Draft auto-saved to localStorage');
        } catch (error) {
          console.error('Error saving draft:', error);
          setSaveStatus('error');
        }
      }, debounceDelay);
    },
    [storageKey, initialData, debounceDelay]
  );

  // Auto-save whenever formData changes
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    saveDraft(formData);
  }, [formData, saveDraft]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setSaveStatus('idle');
      setLastSaved(null);
      console.log('🗑️ Draft cleared from localStorage');
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, [storageKey]);

  // Load draft from localStorage
  const loadDraft = useCallback(() => {
    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setFormData(parsedData);
        setSaveStatus('saved');
        console.log('📝 Draft manually loaded');
        return parsedData;
      }
      return null;
    } catch (error) {
      console.error('Error loading draft:', error);
      setSaveStatus('error');
      return null;
    }
  }, [storageKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    formData,
    setFormData,
    saveStatus,
    lastSaved,
    clearDraft,
    loadDraft,
  };
};

export default useAutoSave;