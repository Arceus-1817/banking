package com.pigmypay.PSolutions.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class SyncItemStatus {
    private String offlineAppTxId;
    private String status; // "SUCCESS" or "FAILED"
    private String errorMessage;
}