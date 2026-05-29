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

    @PostConstruct
    public void init() {
        Twilio.init(accountSid, authToken);
        System.out.println("✅ Twilio WhatsApp Engine Initialized");
    }

    @Async // Runs in the background
    public void sendWhatsAppReceipt(Transaction transaction) {
        Customer customer = transaction.getCustomer();
        String rawPhone = customer.getPhoneNumber();

        if (rawPhone == null || rawPhone.isEmpty()) return;

        String formattedPhone = rawPhone.startsWith("+") ? rawPhone : "+91" + rawPhone;
        String toWhatsappNumber = "whatsapp:" + formattedPhone;
        String messageBody;

        if (transaction.getTransactionCategory().equals("LOAN_REPAYMENT")) {
            Loan loan = transaction.getAssociatedLoan();
            messageBody = String.format(
                    "🟢 *PigmyPay Loan Receipt*\n\n" +
                            "Hello %s,\n" +
                            "We have received your EMI payment of *₹%s*.\n\n" +
                            "📋 *A/C:* %s\n" +
                            "🏦 *Loan ID:* %s\n\n" +
                            "Collected by Agent: %s\n" +
                            "Thank you for using PigmyPay!",
                    customer.getName(), transaction.getAmount(), customer.getAccountNumber(),
                    loan.getHqLoanId(), transaction.getAgent().getName()
            );
        } else {
            messageBody = String.format(
                    "🟢 *PigmyPay Savings Receipt*\n\n" +
                            "Hello %s,\n" +
                            "We have received your deposit of *₹%s*.\n\n" +
                            "📋 *A/C:* %s\n" +
                            "🏦 *Local Balance:* ₹%s\n\n" +
                            "Collected by Agent: %s\n" +
                            "Thank you for using PigmyPay!",
                    customer.getName(), transaction.getAmount(), customer.getAccountNumber(),
                    customer.getCurrentBalance(), transaction.getAgent().getName()
            );
        }

        try {
            Message.creator(new PhoneNumber(toWhatsappNumber), new PhoneNumber(fromWhatsappNumber), messageBody).create();
        } catch (Exception e) {
            System.err.println("❌ Failed to send WhatsApp: " + e.getMessage());
        }
    }
}