package com.pigmypay.PSolutions.service;

import com.pigmypay.PSolutions.model.CashSettlement;
import com.pigmypay.PSolutions.model.Transaction;
import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.CashSettlementRepository;
import com.pigmypay.PSolutions.repository.TransactionRepository;
import com.pigmypay.PSolutions.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class CashSettlementService {

    @Autowired private TransactionRepository transactionRepository;
    @Autowired private CashSettlementRepository settlementRepository;
    @Autowired private UserRepository userRepository;

    @Transactional
    public CashSettlement processAgentHandover(Long tenantId, Long managerId, Long agentId, BigDecimal actualCashCounted, String notes) {

        User manager = userRepository.findById(managerId).orElseThrow();
        User agent = userRepository.findById(agentId).orElseThrow();

        // 1. Find all physical cash currently sitting in the agent's pocket
        List<Transaction> unsettledTxns = transactionRepository.findByAgentIdAndSettlementStatus(agentId, "UNSETTLED");

        BigDecimal systemExpected = unsettledTxns.stream()
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 2. Create the Ledger Entry
        CashSettlement settlement = new CashSettlement();
        settlement.setTenant(manager.getTenant());
        settlement.setManager(manager);
        settlement.setAgent(agent);
        settlement.setSystemExpectedAmount(systemExpected);
        settlement.setActualHandoverAmount(actualCashCounted);
        settlement.setDiscrepancyAmount(actualCashCounted.subtract(systemExpected)); // Negative means short
        settlement.setManagerNotes(notes);

        // 3. Mark all those individual transactions as secure in the Branch Vault
        for (Transaction tx : unsettledTxns) {
            tx.setSettlementStatus("SETTLED");
        }

        transactionRepository.saveAll(unsettledTxns);
        return settlementRepository.save(settlement);
    }
}