package com.pigmypay.PSolutions.dto;

import lombok.Data;
import java.util.ArrayList;
import java.util.List;

@Data
public class BatchSyncResponse {
    private int totalProcessed = 0;
    private int successCount = 0;
    private int failureCount = 0;
    private List<SyncItemStatus> results = new ArrayList<>();
}