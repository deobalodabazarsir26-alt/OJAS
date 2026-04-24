/**
 * Service for "sending" emails without any API keys.
 * In this environment, it triggers a custom 'system-email' event.
 */

export const emailService = {
  sendOTP: async (toEmail: string, toName: string, otp: string): Promise<boolean> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Dispatch a custom event that the UI can listen to
    const event = new CustomEvent('system-email', {
      detail: {
        to: toEmail,
        name: toName,
        subject: 'OJAS - OTP Verification',
        body: `Your OTP for OJAS registration is: ${otp}`,
        otp: otp
      }
    });
    
    window.dispatchEvent(event);
    console.log(`[MOCK EMAIL] To: ${toEmail}, OTP: ${otp}`);
    
    return true;
  }
};
