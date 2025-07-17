// Mock data utilities for development mode
// This file provides mock data when backend APIs are not available

export const isDevelopmentMode = () => {
  return process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';
};

export const simulateApiCall = async <T>(data: T, delay: number = 500): Promise<T> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, delay));
  return data;
};

export const mockApiError = async (message: string, delay: number = 500): Promise<never> => {
  await new Promise(resolve => setTimeout(resolve, delay));
  throw new Error(message);
};

// Check if we should use mock data (when real API is not available)
export const shouldUseMockData = async (apiUrl: string): Promise<boolean> => {
  if (!isDevelopmentMode()) return false;
  
  try {
    const response = await fetch(apiUrl, { method: 'HEAD' });
    return !response.ok;
  } catch {
    return true; // Use mock data if API is not reachable
  }
};

export const mockTemplates = {
  email: [
    {
      id: '1',
      templateCode: 'welcome_email',
      name: 'Welcome Email',
      description: 'Welcome email for new users',
      subjectTemplate: 'Welcome to \{\{companyName\}\}!',
      htmlTemplate: `
        <h1>Welcome \{\{userName\}\}!</h1>
        <p>Thank you for joining \{\{companyName\}\}. We're excited to have you on board.</p>
        <p>Your subscription: \{\{planName\}\}</p>
        <p>Best regards,<br>The Team</p>
      `,
      textTemplate: 'Welcome \{\{userName\}\}! Thank you for joining \{\{companyName\}\}.',
      availableVariables: ['userName', 'companyName', 'planName'],
      sampleData: {
        userName: 'John Doe',
        companyName: 'AI Image Anonymizer',
        planName: 'Premium'
      },
      isActive: true,
      isSystemTemplate: true,
      category: 'notification' as const,
      priority: 1,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      updatedBy: 'system'
    },
    {
      id: '2',
      templateCode: 'payment_receipt',
      name: 'Payment Receipt',
      description: 'Email receipt for payments',
      subjectTemplate: 'Payment Receipt - \{\{amount\}\} \{\{currency\}\}',
      htmlTemplate: `
        <h2>Payment Receipt</h2>
        <p>Dear \{\{customerName\}\},</p>
        <p>Thank you for your payment of \{\{amount\}\} \{\{currency\}\} for \{\{planName\}\}.</p>
        <p>Transaction ID: \{\{transactionId\}\}</p>
        <p>Date: \{\{paymentDate\}\}</p>
      `,
      textTemplate: 'Payment Receipt - Thank you for your payment of \{\{amount\}\} \{\{currency\}\}.',
      availableVariables: ['customerName', 'amount', 'currency', 'planName', 'transactionId', 'paymentDate'],
      sampleData: {
        customerName: 'John Doe',
        amount: '24.95',
        currency: 'AUD',
        planName: '1-Year Access',
        transactionId: 'TXN123456',
        paymentDate: '2024-01-15'
      },
      isActive: true,
      isSystemTemplate: true,
      category: 'receipt' as const,
      priority: 2,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      updatedBy: 'system'
    }
  ],
  document: [
    {
      id: '1',
      templateCode: 'payment_receipt_pdf',
      name: 'Payment Receipt PDF',
      description: 'PDF receipt for payments',
      htmlTemplate: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h1 style="color: #1976d2;">Payment Receipt</h1>
          <p><strong>Receipt #:</strong> \{\{receiptNumber\}\}</p>
          <p><strong>Date:</strong> \{\{paymentDate\}\}</p>
          <p><strong>Customer:</strong> \{\{customerName\}\}</p>
          <p><strong>Email:</strong> \{\{customerEmail\}\}</p>
          <hr>
          <p><strong>Plan:</strong> \{\{planName\}\}</p>
          <p><strong>Amount:</strong> \{\{currency\}\} $\{\{amount\}\}</p>
          <p><strong>Payment Method:</strong> \{\{paymentMethod\}\}</p>
          <hr>
          <p>Thank you for your business!</p>
        </div>
      `,
      cssStyles: `
        body { font-family: Arial, sans-serif; }
        .header { background-color: #1976d2; color: white; padding: 20px; }
        .content { padding: 20px; }
      `,
      documentType: 'receipt' as const,
      pageSize: 'A4',
      orientation: 'portrait' as const,
      availableVariables: ['receiptNumber', 'paymentDate', 'customerName', 'customerEmail', 'planName', 'amount', 'currency', 'paymentMethod'],
      sampleData: {
        receiptNumber: 'RCP-2024-001',
        paymentDate: '2024-01-15',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        planName: '1-Year Access',
        amount: '24.95',
        currency: 'AUD',
        paymentMethod: 'Credit Card'
      },
      isActive: true,
      isSystemTemplate: true,
      includeLogo: true,
      includeCompanyDetails: true,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      updatedBy: 'system'
    }
  ]
};