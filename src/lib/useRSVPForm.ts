import { useState } from 'react';
import { supabase } from './supabase';
import { RSVPData } from '../../types';
import { validatePhone, getRawPhone } from './phoneUtils';

interface RSVPFormData {
  name: string;
  phone: string;
  attending: boolean;
  guests: number;
  attending_sangeet: boolean;
  attending_reception: boolean;
  attending_muhurtha: boolean;
  side?: 'bride' | 'groom';
  ecoConsent: boolean;
}

interface UseRSVPFormReturn {
  formData: RSVPFormData;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isSuccess: boolean;
  updateField: (field: keyof RSVPFormData, value: any) => void;
  submitForm: () => Promise<void>;
  resetForm: () => void;
}

const initialFormData: RSVPFormData = {
  name: '',
  phone: '',
  attending: true,
  guests: 1,
  attending_sangeet: false,
  attending_reception: false,
  attending_muhurtha: false,
  side: undefined,
  ecoConsent: false,
};

export function useRSVPForm(): UseRSVPFormReturn {
  const [formData, setFormData] = useState<RSVPFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const updateField = (field: keyof RSVPFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user makes changes
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Please enter your name';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }

    // Validate phone
    const rawPhone = getRawPhone(formData.phone);
    if (!rawPhone) {
      newErrors.phone = 'Please enter your phone number';
    } else if (!validatePhone(rawPhone)) {
      newErrors.phone = 'Please enter a valid 10-digit mobile number';
    }

    // Validate event selection if attending
    if (formData.attending) {
      const hasEvent =
        formData.attending_sangeet ||
        formData.attending_reception ||
        formData.attending_muhurtha;
      if (!hasEvent) {
        newErrors.events = 'Please select at least one event';
      }

      // Validate Eco Consent
      if (!formData.ecoConsent) {
        newErrors.ecoConsent = 'Please agree to the eco-friendly pledge to proceed.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitForm = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const rawPhone = getRawPhone(formData.phone);
      // Note: ecoConsent is not stored in DB as per schema, but is a gate for submission
      const dataToSubmit: Omit<RSVPData, 'submittedAt'> = {
        name: formData.name.trim(),
        phone: rawPhone,
        attending: formData.attending,
        guests: formData.guests,
        attending_sangeet: formData.attending_sangeet,
        attending_reception: formData.attending_reception,
        attending_muhurtha: formData.attending_muhurtha,
        side: formData.side || undefined,
      };

      console.log('Submitting data:', dataToSubmit);
      const { error } = await supabase.from('rsvps').insert([dataToSubmit]);

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        setErrors({ submit: `Failed to submit RSVP: ${error.message}` });
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
    } catch (error) {
      console.error('Submit error:', error);
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setErrors({});
    setIsSubmitting(false);
    setIsSuccess(false);
  };

  return {
    formData,
    errors,
    isSubmitting,
    isSuccess,
    updateField,
    submitForm,
    resetForm,
  };
}
