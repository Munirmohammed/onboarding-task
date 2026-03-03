export const sendMockSMS = async (phoneNumber: string, message: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // We print to console so you can see the OTP when testing!
      console.log(`\n[MOCK SMS GATEWAY] 📱 To: ${phoneNumber}`);
      console.log(`[MOCK SMS GATEWAY] ✉️  Message: "${message}"\n`);
      resolve({ status: 'delivered' });
    }, 200);
  });
};