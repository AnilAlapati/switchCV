import { PerformanceMonitor, Metric, MetricType } from './monitoring';


// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
    firestore: jest.fn(() => ({
        batch: jest.fn(() => ({
            set: jest.fn(),
            commit: jest.fn().mockResolvedValue(undefined),
        })),
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                collection: jest.fn(() => ({
                    doc: jest.fn(),
                })),
            })),
        })),
    })),
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
        // The exact implementation might vary slightly based on interpolation, 
        // but for simple nearest rank it should be close.
        // We'll implement nearest rank: index = ceil(0.95 * 100) - 1 = 94 -> value 95
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
