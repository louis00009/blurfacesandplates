import React, { useState } from 'react';
import { SubscriptionPlan } from '../../types/payment';
import PricingPage from './PricingPage';
import CheckoutPage from './CheckoutPage';
import PaymentSuccessPage from './PaymentSuccessPage';

interface SubscriptionManagerProps {
  onClose: () => void;
}

type SubscriptionStep = 'pricing' | 'checkout' | 'success';

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState<SubscriptionStep>('pricing');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>();
  const [subscriptionId, setSubscriptionId] = useState<string>();

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setCurrentStep('checkout');
  };

  const handleBackToPricing = () => {
    setCurrentStep('pricing');
    setSelectedPlan(undefined);
  };

  const handlePaymentSuccess = (newSubscriptionId: string) => {
    setSubscriptionId(newSubscriptionId);
    setCurrentStep('success');
  };

  const handleClose = () => {
    setCurrentStep('pricing');
    setSelectedPlan(undefined);
    setSubscriptionId(undefined);
    onClose();
  };

  switch (currentStep) {
    case 'pricing':
      return (
        <PricingPage
          onSelectPlan={handleSelectPlan}
          onClose={handleClose}
        />
      );

    case 'checkout':
      return selectedPlan ? (
        <CheckoutPage
          selectedPlan={selectedPlan}
          onBack={handleBackToPricing}
          onClose={handleClose}
          onSuccess={handlePaymentSuccess}
        />
      ) : null;

    case 'success':
      return subscriptionId ? (
        <PaymentSuccessPage
          subscriptionId={subscriptionId}
          onClose={handleClose}
        />
      ) : null;

    default:
      return null;
  }
};

export default SubscriptionManager;