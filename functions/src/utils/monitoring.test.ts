import { PerformanceMonitor, Metric, MetricType } from './monitoring';


const mockBatch = {
    set: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
};

const mockDoc = {
    collection: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
};

const mockCollection = {
    doc: jest.fn(),
    add: jest.fn().mockResolvedValue(undefined), // For alertManager
    where: jest.fn().mockReturnThis(), // Common patterns
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
};

// Circular dependencies in mocks (collection returns doc, doc returns collection)
mockCollection.doc.mockReturnValue(mockDoc);
mockDoc.collection.mockReturnValue(mockCollection);

const mockFirestoreInstance = {
    batch: jest.fn(() => mockBatch),
    collection: jest.fn(() => mockCollection),
};

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
    firestore: Object.assign(
        jest.fn(() => mockFirestoreInstance),
        {
            FieldValue: {
                arrayUnion: jest.fn(),
                serverTimestamp: jest.fn(),
            }
        }
    )
}));

// Mock Firebase Functions config
jest.mock('firebase-functions', () => ({
    config: jest.fn(() => ({
        monitoring: {
            p95_threshold: '2000'
        }
    })),
    logger: {
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    },
}));

describe('PerformanceMonitor P95 Calculation', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
        // Reset singleton instance if possible or just get the instance
        // Since it's a singleton, we might need to cast to any to access private methods for testing
        monitor = PerformanceMonitor.getInstance();
        // Clear metrics
        (monitor as any).metrics = [];
    });

    it('should calculate P95 correctly for a set of values', () => {
        // Create 100 metrics with values 1-100
        const metrics: Metric[] = Array.from({ length: 100 }, (_, i) => ({
            type: MetricType.FUNCTION_EXECUTION,
            name: 'test-function',
            value: i + 1,
            unit: 'ms',
            timestamp: Date.now(),
        }));

        // Access private method via casting
        const aggregated = (monitor as any).aggregateMetrics(metrics);

        expect(aggregated).toHaveLength(1);
        expect(aggregated[0].name).toBe('test-function');
        // P95 of 1-100 should be roughly 95
        expect(aggregated[0].p95).toBe(95);
    });

    it('should handle small datasets correctly', () => {
        const metrics: Metric[] = [
            { type: MetricType.FUNCTION_EXECUTION, name: 'small-test', value: 10, unit: 'ms', timestamp: Date.now() },
            { type: MetricType.FUNCTION_EXECUTION, name: 'small-test', value: 100, unit: 'ms', timestamp: Date.now() },
        ];

        const aggregated = (monitor as any).aggregateMetrics(metrics);

        // For 2 items, 95th percentile is the max
        expect(aggregated[0].p95).toBe(100);
    });

    it('should handle single value correctly', () => {
        const metrics: Metric[] = [
            { type: MetricType.FUNCTION_EXECUTION, name: 'single-test', value: 50, unit: 'ms', timestamp: Date.now() },
        ];

        const aggregated = (monitor as any).aggregateMetrics(metrics);

        expect(aggregated[0].p95).toBe(50);
    });
});

describe('PerformanceMonitor Core', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
        monitor = PerformanceMonitor.getInstance();
        (monitor as any).metrics = [];
        (monitor as any).db = mockFirestoreInstance; // Use direct injection
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should record metrics', () => {
        monitor.record({
            type: MetricType.FUNCTION_EXECUTION,
            name: 'test',
            value: 100,
            unit: 'ms'
        });
        expect((monitor as any).metrics).toHaveLength(1);
    });

    it('should auto-flush when batch size reached', async () => {
        const flushSpy = jest.spyOn(monitor, 'flush').mockResolvedValue(undefined);

        // Batch size is 100
        for (let i = 0; i < 100; i++) {
            monitor.record({
                type: MetricType.FUNCTION_EXECUTION,
                name: 'test',
                value: i,
                unit: 'ms'
            });
        }

        expect(flushSpy).toHaveBeenCalled();
    });

    it('should measure async function execution', async () => {
        const fn = jest.fn().mockResolvedValue('result');
        const result = await monitor.measure('test-fn', fn);

        expect(result).toBe('result');
        expect(fn).toHaveBeenCalled();
        expect((monitor as any).metrics).toHaveLength(1);
        expect((monitor as any).metrics[0].name).toBe('test-fn');
    });

    it('should measure async function error', async () => {
        const error = new Error('test error');
        const fn = jest.fn().mockRejectedValue(error);

        await expect(monitor.measure('test-fn-error', fn)).rejects.toThrow(error);

        expect((monitor as any).metrics).toHaveLength(1);
        expect((monitor as any).metrics[0].metadata.success).toBe(false);
        expect((monitor as any).metrics[0].metadata.error).toBe('test error');
    });

    it('should flush metrics to Firestore', async () => {
        const errorSpy = jest.spyOn(require('firebase-functions').logger, 'error');
        monitor.record({ type: MetricType.FUNCTION_EXECUTION, name: 'test', value: 100, unit: 'ms' });

        await monitor.flush();

        expect(errorSpy).not.toHaveBeenCalled();

        expect(mockFirestoreInstance.batch).toHaveBeenCalled();
        expect(mockBatch.set).toHaveBeenCalled();
        expect(mockBatch.commit).toHaveBeenCalled();
        expect((monitor as any).metrics).toHaveLength(0);
    });

    it('should handle flush errors gracefully', async () => {
        monitor.record({ type: MetricType.FUNCTION_EXECUTION, name: 'test', value: 100, unit: 'ms' });

        // Temporarily make commit fail
        mockBatch.commit.mockRejectedValueOnce(new Error('Firestore Error'));

        await monitor.flush();

        // Metrics should be restored on error
        expect((monitor as any).metrics).toHaveLength(1);
    });
});

import { AlertManager, AlertSeverity } from './monitoring';

describe('AlertManager', () => {
    let alertManager: AlertManager;

    beforeEach(() => {
        alertManager = AlertManager.getInstance();
        (alertManager as any).db = mockFirestoreInstance; // Use direct injection
        jest.clearAllMocks();
    });

    it('should send alerts to Firestore and logger', async () => {
        const loggerSpy = jest.spyOn(require('firebase-functions').logger, 'info'); // AlertSeverity.INFO

        await alertManager.sendAlert(AlertSeverity.INFO, 'Test Alert', 'Test Message');

        expect(loggerSpy).toHaveBeenCalledWith(
            'Test Alert',
            expect.objectContaining({ message: 'Test Message' })
        );

        // Verify Firestore was traversed
        // alertManager calls db.collection("monitoring").doc("alerts").collection("active").add(...)
        expect(mockFirestoreInstance.collection).toHaveBeenCalledWith('monitoring');
        // Check the deep add call
        expect(mockCollection.add).toHaveBeenCalled();
    });

    it('should check error rates and alert if threshold exceeded', async () => {
        const sendAlertSpy = jest.spyOn(alertManager, 'sendAlert').mockResolvedValue(undefined);

        await alertManager.checkErrorRate('functionA', 20, 100, 0.1); // 20% > 10%

        expect(sendAlertSpy).toHaveBeenCalledWith(
            AlertSeverity.WARNING,
            expect.stringContaining('High error rate detected'),
            expect.any(String),
            expect.any(Object)
        );
    });

    it('should check P95 and alert if threshold exceeded', async () => {
        const sendAlertSpy = jest.spyOn(alertManager, 'sendAlert').mockResolvedValue(undefined);

        // Default threshold for function_execution is 500ms
        await alertManager.checkP95('testFunction', 600, 'function_execution');

        expect(sendAlertSpy).toHaveBeenCalledWith(
            AlertSeverity.WARNING,
            expect.stringContaining('High P95 latency detected'),
            expect.any(String),
            expect.any(Object)
        );
    });
});
