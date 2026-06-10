package com.pigmypay.PSolutions.service;

import com.pigmypay.PSolutions.model.Customer;
import com.pigmypay.PSolutions.model.Loan;
import com.pigmypay.PSolutions.model.Transaction;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    @Value("${twilio.account.sid}")
    private String accountSid;

    @Value("${twilio.auth.token}")
    private String authToken;

    @Value("${twilio.whatsapp.number}")
    private String fromWhatsappNumber;

    // FIXED: graceful startup - don't crash if Twilio not configured
    private boolean twilioEnabled = false;

    @PostConstruct
    public void init() {
        if (isPlaceholder(accountSid) || isPlaceholder(authToken)) {
            System.out.println("⚠️  Twilio credentials not configured. WhatsApp notifications disabled.");
            System.out.println("    Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN env vars to enable.");
            twilioEnabled = false;
            return;
        }
        try {
            Twilio.init(accountSid, authToken);
            twilioEnabled = true;
            System.out.println("✅ Twilio WhatsApp Engine Initialized");
        } catch (Exception e) {
            System.err.println("❌ Twilio initialization failed: " + e.getMessage());
            twilioEnabled = false;
        }
    }

    private boolean isPlaceholder(String value) {
        return value == null || value.isEmpty() || value.startsWith("PLACEHOLDER");
    }

    public boolean isTwilioEnabled() {
        return twilioEnabled;
    }

    public boolean sendTestWhatsApp(String toPhone, String message) {
        if (!twilioEnabled) return false;
        try {
            String formattedPhone = toPhone.startsWith("+") ? toPhone : "+91" + toPhone;
            String toWhatsapp = "whatsapp:" + formattedPhone;
            Message.creator(
                    new PhoneNumber(toWhatsapp),
                    new PhoneNumber(fromWhatsappNumber),
                    message
            ).create();
            return true;
        } catch (Exception e) {
            System.err.println("❌ Twilio manual test failed: " + e.getMessage());
            return false;
        }
    }

    @Async
    public void sendWhatsAppReceipt(Transaction transaction) {
        if (!twilioEnabled) return;

        Customer customer = transaction.getCustomer();
        String rawPhone = customer.getPhoneNumber();

        if (rawPhone == null || rawPhone.isEmpty()) return;

        String formattedPhone = rawPhone.startsWith("+") ? rawPhone : "+91" + rawPhone;
        String toWhatsappNumber = "whatsapp:" + formattedPhone;
        String messageBody;

        try {
            if ("LOAN_REPAYMENT".equals(transaction.getTransactionCategory())) {
                Loan loan = transaction.getAssociatedLoan();
                String loanId = loan != null ? loan.getHqLoanId() : "N/A";
                messageBody = String.format(
                        "🟢 *PigmyPay Loan Receipt*\n\n" +
                                "Hello %s,\nEMI payment of *₹%s* received.\n\n" +
                                "📋 *A/C:* %s\n🏦 *Loan ID:* %s\n" +
                                "Collected by: %s\nThank you for using PigmyPay!",
                        customer.getName(), transaction.getAmount(),
                        customer.getAccountNumber(), loanId,
                        transaction.getAgent().getName()
                );
            } else {
                messageBody = String.format(
                        "🟢 *PigmyPay Savings Receipt*\n\n" +
                                "Hello %s,\nDeposit of *₹%s* received.\n\n" +
                                "📋 *A/C:* %s\n🏦 *Balance:* ₹%s\n" +
                                "Collected by: %s\nThank you for using PigmyPay!",
                        customer.getName(), transaction.getAmount(),
                        customer.getAccountNumber(), customer.getCurrentBalance(),
                        transaction.getAgent().getName()
                );
            }

            Message.creator(
                    new PhoneNumber(toWhatsappNumber),
                    new PhoneNumber(fromWhatsappNumber),
                    messageBody
            ).create();

        } catch (Exception e) {
            System.err.println("❌ Failed to send WhatsApp to " + rawPhone + ": " + e.getMessage());
        }
    }

    public boolean sendOTP(String toPhone, String otp) {
        String msg = "Your PigmyPay verification code is: *" + otp + "*. Expires in 5 minutes.";
        if (!twilioEnabled) {
            System.out.println("⏩ [DEV LOG] TWILIO DISABLED - OTP for phone " + toPhone + " is: " + otp);
            return true;
        }
        return sendTestWhatsApp(toPhone, msg);
    }
}