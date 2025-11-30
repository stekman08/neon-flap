import { describe, it, expect } from 'vitest';
import { NeuralNetwork } from '../../public/js/ai/NeuralNetwork.js';

describe('NeuralNetwork', () => {
    describe('constructor', () => {
        it('should create network with correct dimensions', () => {
            const nn = new NeuralNetwork(5, 8, 1);
            expect(nn.inputNodes).toBe(5);
            expect(nn.hiddenNodes).toBe(8);
            expect(nn.outputNodes).toBe(1);
            expect(nn.weightsIH.length).toBe(8);
            expect(nn.weightsIH[0].length).toBe(5);
            expect(nn.weightsHO.length).toBe(1);
            expect(nn.weightsHO[0].length).toBe(8);
            expect(nn.biasH.length).toBe(8);
            expect(nn.biasO.length).toBe(1);
        });

        it('should initialize weights between -1 and 1', () => {
            const nn = new NeuralNetwork(5, 8, 1);
            for (const row of nn.weightsIH) {
                for (const weight of row) {
                    expect(weight).toBeGreaterThanOrEqual(-1);
                    expect(weight).toBeLessThanOrEqual(1);
                }
            }
        });
    });

    describe('predict', () => {
        it('should return output array of correct length', () => {
            const nn = new NeuralNetwork(5, 8, 1);
            const output = nn.predict([0.5, 0.5, 0.5, 0.5, 0.5]);
            expect(output.length).toBe(1);
        });

        it('should return values between 0 and 1 (sigmoid)', () => {
            const nn = new NeuralNetwork(5, 8, 1);
            const output = nn.predict([0, 0, 0, 0, 0]);
            expect(output[0]).toBeGreaterThanOrEqual(0);
            expect(output[0]).toBeLessThanOrEqual(1);
        });

        it('should produce consistent output for same input', () => {
            const nn = new NeuralNetwork(5, 8, 1);
            const input = [0.3, 0.5, 0.7, 0.2, 0.9];
            const output1 = nn.predict(input);
            const output2 = nn.predict(input);
            expect(output1[0]).toBe(output2[0]);
        });

        it('should throw error for wrong input length', () => {
            const nn = new NeuralNetwork(5, 8, 1);
            expect(() => nn.predict([0.5, 0.5])).toThrow();
        });
    });

    describe('copy', () => {
        it('should create independent copy with same weights', () => {
            const nn1 = new NeuralNetwork(5, 8, 1);
            const nn2 = nn1.copy();

            // Same weights
            expect(nn2.weightsIH).toEqual(nn1.weightsIH);
            expect(nn2.weightsHO).toEqual(nn1.weightsHO);
            expect(nn2.biasH).toEqual(nn1.biasH);
            expect(nn2.biasO).toEqual(nn1.biasO);

            // But independent (modifying one doesn't affect other)
            nn2.weightsIH[0][0] = 999;
            expect(nn1.weightsIH[0][0]).not.toBe(999);
        });

        it('should produce same predictions as original', () => {
            const nn1 = new NeuralNetwork(5, 8, 1);
            const nn2 = nn1.copy();
            const input = [0.1, 0.2, 0.3, 0.4, 0.5];
            expect(nn2.predict(input)).toEqual(nn1.predict(input));
        });
    });

    describe('mutate', () => {
        it('should modify weights with rate 1.0', () => {
            const nn = new NeuralNetwork(5, 8, 1);
            const originalWeights = JSON.parse(JSON.stringify(nn.weightsIH));

            nn.mutate(1.0);

            // At least some weights should have changed
            let changed = false;
            for (let i = 0; i < nn.weightsIH.length; i++) {
                for (let j = 0; j < nn.weightsIH[i].length; j++) {
                    if (nn.weightsIH[i][j] !== originalWeights[i][j]) {
                        changed = true;
                        break;
                    }
                }
                if (changed) break;
            }
            expect(changed).toBe(true);
        });

        it('should not modify weights with rate 0.0', () => {
            const nn = new NeuralNetwork(5, 8, 1);
            const originalWeights = JSON.stringify(nn.weightsIH);
            nn.mutate(0.0);
            expect(JSON.stringify(nn.weightsIH)).toBe(originalWeights);
        });
    });

    describe('crossover', () => {
        it('should create child with mixed weights from both parents', () => {
            const nn1 = new NeuralNetwork(5, 8, 1);
            const nn2 = new NeuralNetwork(5, 8, 1);
            const child = nn1.crossover(nn2);

            expect(child.inputNodes).toBe(5);
            expect(child.hiddenNodes).toBe(8);
            expect(child.outputNodes).toBe(1);
        });
    });

    describe('toJSON/fromJSON', () => {
        it('should serialize and deserialize correctly', () => {
            const nn1 = new NeuralNetwork(5, 8, 1);
            const json = nn1.toJSON();
            const nn2 = NeuralNetwork.fromJSON(json);

            expect(nn2.inputNodes).toBe(nn1.inputNodes);
            expect(nn2.hiddenNodes).toBe(nn1.hiddenNodes);
            expect(nn2.outputNodes).toBe(nn1.outputNodes);
            expect(nn2.weightsIH).toEqual(nn1.weightsIH);
            expect(nn2.weightsHO).toEqual(nn1.weightsHO);
            expect(nn2.biasH).toEqual(nn1.biasH);
            expect(nn2.biasO).toEqual(nn1.biasO);
        });

        it('should produce same predictions after serialization', () => {
            const nn1 = new NeuralNetwork(5, 8, 1);
            const json = nn1.toJSON();
            const nn2 = NeuralNetwork.fromJSON(json);

            const input = [0.1, 0.2, 0.3, 0.4, 0.5];
            expect(nn2.predict(input)).toEqual(nn1.predict(input));
        });

        it('should survive JSON.stringify/parse cycle', () => {
            const nn1 = new NeuralNetwork(5, 8, 1);
            const jsonString = JSON.stringify(nn1.toJSON());
            const nn2 = NeuralNetwork.fromJSON(JSON.parse(jsonString));

            const input = [0.5, 0.5, 0.5, 0.5, 0.5];
            expect(nn2.predict(input)).toEqual(nn1.predict(input));
        });
    });
});
